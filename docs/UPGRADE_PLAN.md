# Upgrade Plan — Research Findings → Shipped Roadmap

Status legend: ✅ shipped in v1.0 · 🔜 designed, next up · 💡 idea bank

This document merges the competitor research pass with the upgrade plan it produced. It is the record of *why the codebase looks the way it does*.

---

## 1. Research sources

**a) `latent-spaces/brag` (studied in depth)** — a Hyperframes-based launch-video skill. Power tools extracted:

- **Pre-analyzed music-cue files.** Per-track JSON: `{schemaVersion, tempo, beats:[{time, intensity, features:{onsetStrength, localOnsetContrast, rms, bassEnergy}}]}`, robust-normalized to 0–1 at the 98th percentile. → **Shipped as** `scripts/beat_detect.py` (numpy STFT spectral-flux, same schema, no librosa dependency) feeding `build/data.json` cues. Cut snapping + `beat_pulse` motion + SFX gains all consume it.
- **SFX sound-design policy.** Sounds characterized by brightness / highFrequencyRisk / envelopeShape, with a use-case→file pick table ("tasteful by default, bright only as tiny accents"). → **Shipped as** the bundled CC0 Kenney library (`assets/sfx/`) + `sfxPolicy` (tasteful/energetic/sparse/off) + energy-gated impact picking in `build_timeline.py`.
- **Storyboard → brief → validate → render loop** with timestamped outputs. → **Informs** `loom.sh` stage separation and the QC gate.

**b) Web-competitor sweep** (Remotion-based editors, open-source auto-editors):

- **OpenReel Video**: auto-generate markers synced to music; **audio ducking** when dialog plays. → Markers = our cue grid (✅). Ducking = 🔜 `scripts/mix_audio.py` when clip audio is kept (designed: sidechain-compress music under clip audio via ffmpeg `sidechaincompress`).
- **Autonomous-video-pipeline writeups (pravda.systems et al.)**: the winning pattern is a *deterministic plan file* rendered by a dumb executor; ffmpeg flag pitfalls (`-r` padding, fps mismatch) are where afternoons die. → **Architecture confirmed**: `build/data.json` is the single plan; the render step never makes creative decisions. QC duration check guards the classic drift bug (✅).
- **Agent-first editors (Repo Radar et al.)**: agents need *validation harnesses*, not just CLIs. → **Shipped as** `preset_dev.py` (schema+range+kind validation with pointer to the exact renderer switch needing a case) and `engine/checkPresets.ts` (catalog invariants).

**c) Commercial pattern capture** (CapCut/VN-style): template packs = our vibe packs; karaoke captions = Karaoke Pop; date stamps = Stamp Tag; "one-tap magic" = `style: {vibe}` in one line.

## 2. The roadmap (as approved)

| # | Upgrade | Status |
|---|---------|--------|
| 1 | ★ **Preset catalog "15-15"** — 15 gold presets × 6 categories + 6 vibe packs, catalog validator, deep doc | ✅ 96 presets, `presets:check`, `docs/PRESETS.md` |
| 2 | **Video input support** — ffprobe inventory, trim/speed/mute, OffthreadVideo path, deterministic auto-trim | ✅ `probe_media.py` + `MediaCard` video branch |
| 3 | **Agent-created presets + self-improvement** — variant presets as JSON, dev harness, feedback loop with Bayesian scores, LEARNINGS.md | ✅ `preset_dev.py`, `feedback_loop.py` |
| 4 | **Own detailed-graphics generation** — procedural textures, zero binary dependencies | ✅ `graphics_gen.py` (14 texture generators) |
| 5 | **Competitor power tools** — music-cue schema, SFX policy, markers, deterministic-plan architecture | ✅ (ducking 🔜) |
| 6 | **Study latent-spaces/brag** | ✅ (§1a) |
| 7 | **Major rebranding — explicitly last** | ✅ executed as final step: LoverCut → **Cineloom**, brand isolated in `BRAND.json`, `scripts/rebrand.py` one-command rename |

## 3. Idea bank (next horizons, unprioritized)

- Face-aware focus points (onnx face detect → `focus` per photo)
- `mix_audio.py` sidechain ducking for clips that keep audio
- Lyric auto-timing from LRC files (`--lrc song.lrc`)
- Multi-track audio (VO + music) with per-track fades
- Remotion `@remotion/transitions` audit — replace hand-rolled kinds only where visual parity is proven
- Thumbnail/poster generator from the QC contact sheet (pick frame, overlay title)
- Web review page: render 3 vibe previews at 360p, pick one, re-render hero
