#!/usr/bin/env python3
"""beat_detect.py — onset/beat cue extraction with numpy only (no librosa).

Follows the music-cues schema popularized by the brag skill:
  { schemaVersion, source, duration, tempo,
    scoring: {intensityFormula, features, normalization, strongCueMinimumIntensity},
    beats: [{time, intensity, features:{onsetStrength, rms, bassEnergy}}] }

Method: STFT -> spectral flux onset envelope -> adaptive-threshold peaks ->
tempo estimate via autocorrelation of the envelope -> per-cue intensity 0..1
(robust-normalized with the 98th percentile, clamped).
Output: build/cues.json
"""
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 22050
HOP = 512
N_FFT = 1024
STRONG_MIN = 0.45


def load_mono(path: Path) -> np.ndarray:
    import subprocess
    raw = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", str(SR),
         "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def stft_mag(x: np.ndarray) -> np.ndarray:
    win = np.hanning(N_FFT).astype(np.float32)
    n = (len(x) - N_FFT) // HOP + 1
    frames = np.lib.stride_tricks.as_strided(
        x, shape=(n, N_FFT), strides=(x.strides[0] * HOP, x.strides[0])).copy()
    return np.abs(np.fft.rfft(frames * win, axis=1))


def onset_envelope(mag: np.ndarray) -> np.ndarray:
    diff = np.diff(mag, axis=0)
    flux = np.maximum(diff, 0).mean(axis=1)
    # local mean subtraction (adaptive whitening)
    kernel = np.hanning(9)
    kernel /= kernel.sum()
    loc = np.convolve(flux, kernel, mode="same")
    env = np.maximum(flux - loc, 0)
    return env


def estimate_tempo(env: np.ndarray) -> float:
    fps_env = SR / HOP
    ac = np.correlate(env - env.mean(), env - env.mean(), mode="full")[len(env) - 1:]
    lag_min = int(fps_env * 60 / 180)  # 180 bpm cap
    lag_max = int(fps_env * 60 / 60)   # 60 bpm floor
    if lag_max >= len(ac):
        return 100.0
    seg = ac[lag_min:lag_max]
    lag = lag_min + int(np.argmax(seg))
    return round(60.0 * fps_env / lag, 2)


def peak_pick(env: np.ndarray) -> np.ndarray:
    fps_env = SR / HOP
    # adaptive threshold: local median + delta over 0.6s window
    win = max(3, int(fps_env * 0.6) | 1)
    med = np.convolve(env, np.ones(win) / win, mode="same")
    peaks = []
    for i in range(1, len(env) - 1):
        if env[i] > env[i - 1] and env[i] >= env[i + 1] and env[i] > med[i] * 1.4 + env.std() * 0.15:
            if peaks and i - peaks[-1] < fps_env * 0.12:  # 120ms refractory
                if env[i] > env[peaks[-1]]:
                    peaks[-1] = i
            else:
                peaks.append(i)
    return np.array(peaks)


def main() -> None:
    audio = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "public" / "media" / "song.mp3")
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "public" / "build" / "cues.json"
    apath = Path(audio)
    if not apath.exists():
        raise SystemExit(f"audio not found: {apath}")

    x = load_mono(apath)
    mag = stft_mag(x)
    env = onset_envelope(mag)
    peaks = peak_pick(env)
    tempo = estimate_tempo(env)

    fps_env = SR / HOP
    times = peaks / fps_env
    on = env[peaks]
    rms = np.sqrt(np.convolve(x ** 2, np.ones(SR // 10) / (SR // 10), mode="same"))
    rms_v = np.array([rms[min(len(rms) - 1, int(t * SR))] for t in times])
    bass = mag[:, : max(2, int(2.0 / (SR / N_FFT)))].mean(axis=1)
    bass_v = np.array([bass[min(len(bass) - 1, p)] for p in peaks])

    def norm(v: np.ndarray) -> np.ndarray:
        hi = np.percentile(v, 98) or 1.0
        return np.clip(v / hi, 0, 1)

    on_n, rms_n, bass_n = norm(on), norm(rms_v), norm(bass_v)
    intensity = 0.55 * on_n + 0.25 * rms_n + 0.20 * bass_n

    beats = [
        {"time": round(float(t), 4), "intensity": round(float(i), 4),
         "features": {"onsetStrength": round(float(a), 4), "rms": round(float(b), 4),
                      "bassEnergy": round(float(c), 4)}}
        for t, i, a, b, c in zip(times, intensity, on_n, rms_n, bass_n)
    ]
    strong = sum(1 for b in beats if b["intensity"] >= STRONG_MIN)

    doc = {
        "schemaVersion": 1,
        "source": {"filename": apath.name},
        "duration": round(len(x) / SR, 2),
        "tempo": tempo,
        "analysis": {"sampleRate": SR, "hopLength": HOP, "nFft": N_FFT},
        "scoring": {
            "intensityFormula": "0.55*onset_strength + 0.25*rms + 0.20*bass_energy",
            "features": ["onset_strength", "rms", "bass_energy"],
            "normalization": "98th-percentile robust normalization to 0-1, clamped",
            "strongCueMinimumIntensity": STRONG_MIN,
            "strongCueCount": strong,
        },
        "beats": beats,
    }
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(doc, indent=1))
    print(f"tempo {tempo} bpm | {len(beats)} cues ({strong} strong) -> {out}")


if __name__ == "__main__":
    main()
