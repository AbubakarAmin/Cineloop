#!/usr/bin/env python3
"""probe_media.py — inventory every file in media/ via ffprobe.

Outputs build/manifest.json:
  { "photo_01.jpg": {"type":"photo","width":3024,"height":4032}, ...,
    "song.mp3": {"type":"audio","duration":210.4,"title":"..."} }
Deterministic, no AI, fast. Photos get dimensions only; videos get duration+fps.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "public" / "media"
BUILD = ROOT / "public" / "build"
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".avif"}
VID_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
AUD_EXT = {".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac"}


def ffprobe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


def probe_one(path: Path) -> dict:
    ext = path.suffix.lower()
    info = ffprobe(path)
    streams = info.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if ext in AUD_EXT and video is None:
        return {"type": "audio", "duration": float(info["format"]["duration"]),
                "title": info["format"].get("tags", {}).get("title", path.stem)}
    rot = 0
    if video:
        sd = video.get("side_data_list") or []
        for d in sd:
            if "rotation" in d:
                rot = int(d["rotation"])
        w, h = int(video["width"]), int(video["height"])
        if rot in (90, -90, 270):
            w, h = h, w
        if ext in VID_EXT:
            return {"type": "video", "width": w, "height": h, "rotation": rot,
                    "duration": float(video.get("duration") or info["format"]["duration"]),
                    "fps": eval_fps(video.get("avg_frame_rate", "30/1"))}
        return {"type": "photo", "width": w, "height": h, "rotation": rot}
    raise SystemExit(f"Unknown media type: {path.name}")


def eval_fps(rate: str) -> float:
    try:
        num, den = rate.split("/")
        return round(int(num) / int(den), 3)
    except Exception:
        return 30.0


def main() -> None:
    BUILD.mkdir(exist_ok=True)
    manifest: dict[str, dict] = {}
    for p in sorted(MEDIA.iterdir()):
        if p.suffix.lower() in IMG_EXT | VID_EXT | AUD_EXT:
            try:
                manifest[p.name] = probe_one(p)
                print(f"  {p.name:40s} {manifest[p.name]['type']:6s} "
                      f"{manifest[p.name].get('width','')}x{manifest[p.name].get('height','')}"
                      f"{' %.1fs' % manifest[p.name]['duration'] if 'duration' in manifest[p.name] else ''}")
            except Exception as e:  # keep going, report at end
                print(f"  ! {p.name}: {e}", file=sys.stderr)
    (BUILD / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nwrote build/manifest.json ({len(manifest)} files)")


if __name__ == "__main__":
    main()
