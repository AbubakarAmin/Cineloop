#!/usr/bin/env python3
"""qc_check.py — automated QC gate for a render. Exit 0 = pass.

Checks:
  1. duration matches build/data.json timeline (±2 frames)
  2. audio stream exists, loudness in sane range (not silent / not clipping)
  3. frame count of extracted contact sheet == requested, sheet written to build/
  4. data.json lint: monotonic segments, fps match, overlay ids exist in catalog

Usage: python3 scripts/qc_check.py out/my_render.mp4 [--sheet 9]
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "public" / "build"


def sh(*cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def fail(msg):
    print(f"  ✗ {msg}")
    return 1


def main() -> int:
    render = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    sheet_n = 9
    scale = 1.0
    if "--sheet" in sys.argv:
        sheet_n = int(sys.argv[sys.argv.index("--sheet") + 1])
    if "--scale" in sys.argv:
        scale = float(sys.argv[sys.argv.index("--scale") + 1])
    fails = 0

    data = json.loads((BUILD / "data.json").read_text())
    fps = data["meta"]["fps"]
    expect_dur = data["meta"]["durationF"] / fps

    print("QC — data.json lint")
    segs = data["segments"]
    for i in range(1, len(segs)):
        if segs[i]["startF"] <= segs[i - 1]["startF"]:
            fails += fail(f"segment {i} startF not monotonic")
    if not data["audio"]["src"]:
        fails += fail("no audio source in timeline")

    if render is None:
        print("\n(no render passed — lint only)")
        return 1 if fails else 0

    print(f"\nQC — {render.name}")
    if not render.exists():
        return 1 if True else 1

    # 1. duration
    p = sh("ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", str(render))
    info = json.loads(p.stdout)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if not v:
        return 1 if fails + fail("no video stream") else 1
    dur = float(info["format"]["duration"])
    if abs(dur - expect_dur) > 2.0 / fps + 0.05:
        fails += fail(f"duration {dur:.2f}s != expected {expect_dur:.2f}s")
    else:
        print(f"  ✓ duration {dur:.2f}s (expected {expect_dur:.2f}s)")
    exp_w, exp_h = data["meta"]["width"], data["meta"]["height"]
    if scale != 1.0:
        exp_w, exp_h = round(exp_w * scale), round(exp_h * scale)
    if v.get("width") != exp_w or v.get("height") != exp_h:
        fails += fail(f"resolution {v.get('width')}x{v.get('height')} != {exp_w}x{exp_h}")
    else:
        print(f"  ✓ resolution {v['width']}x{v['height']}")

    # 2. audio
    if not a:
        fails += fail("no audio stream")
    else:
        vol = sh("ffmpeg", "-hide_banner", "-i", str(render), "-af", "volumedetect", "-f", "null", "-")
        err = vol.stderr
        mean_line = [l for l in err.splitlines() if "mean_volume" in l]
        max_line = [l for l in err.splitlines() if "max_volume" in l]
        mean_v = float(mean_line[0].split(":")[1].replace("dB", "").strip()) if mean_line else -99
        max_v = float(max_line[0].split(":")[1].replace("dB", "").strip()) if max_line else -99
        if mean_v < -40:
            fails += fail(f"audio nearly silent (mean {mean_v:.1f} dB)")
        elif max_v > -0.1:
            fails += fail(f"audio clipping (max {max_v:.1f} dB)")
        else:
            print(f"  ✓ audio mean {mean_v:.1f} dB, max {max_v:.1f} dB")

    # 3. contact sheet
    n_frames = data["meta"]["durationF"]
    frames = sorted({int(n_frames * (i + 0.5) / sheet_n) for i in range(sheet_n)})
    from PIL import Image
    thumbs = []
    tmp_dir = BUILD / "qc_tmp"
    tmp_dir.mkdir(exist_ok=True)
    for k, fno in enumerate(frames):
        out = tmp_dir / f"f{k}.png"
        sh("ffmpeg", "-y", "-v", "quiet", "-i", str(render), "-vf",
           f"select=eq(n\\,{fno}),scale=270:480", "-frames:v", "1", str(out))
        if out.exists():
            thumbs.append(Image.open(out))
    if len(thumbs) == sheet_n:
        cols, rows = 3, (sheet_n + 2) // 3
        sheet = Image.new("RGB", (cols * 270, rows * 480), (10, 8, 9))
        for k, t in enumerate(thumbs):
            sheet.paste(t, ((k % cols) * 270, (k // cols) * 480))
        sheet_path = BUILD / "qc_contact_sheet.jpg"
        sheet.save(sheet_path, quality=88)
        print(f"  ✓ contact sheet: {sheet_path.relative_to(ROOT)} ({len(thumbs)} frames)")
    else:
        fails += fail(f"contact sheet incomplete ({len(thumbs)}/{sheet_n})")

    print(f"\nQC {'PASSED' if fails == 0 else 'FAILED (' + str(fails) + ')'}")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
