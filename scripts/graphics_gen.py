#!/usr/bin/env python3
"""graphics_gen.py — Cineloom's own detailed-graphics generation.

Procedurally synthesizes every texture the 15-overlay catalog needs into
assets/gen/*.png with numpy + PIL (no external assets, fully deterministic
seeds). Also generates the brand card. Rerun any time: `python3 scripts/graphics_gen.py [--only id]`.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "gen"
W, H = 1080, 1920


def canvas(alpha=True):
    mode = "RGBA" if alpha else "RGB"
    return np.zeros((H, W, 4 if alpha else 3), dtype=np.float32), mode


def save(arr, mode, name, quantize=None):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode)
    if quantize:
        img = img.quantize(colors=quantize)
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{name}.png", optimize=True)
    print(f"  gen {name}.png")


def grain():
    rng = np.random.default_rng(7)
    a, _ = canvas()
    noise = rng.normal(128, 42, (H, W))
    # subtle large-scale luminance clouds
    clouds = np.array(Image.fromarray(
        ((rng.normal(128, 18, (H // 24, W // 24)))).astype(np.uint8)).resize((W, H), Image.BILINEAR), dtype=np.float32)
    lum = 0.75 * noise + 0.25 * clouds
    a[..., :3] = lum[..., None]
    a[..., 3] = 255
    return a, "RGBA"


def leak():
    a, m = canvas()
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = W * 0.88, H * 0.16
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (W * 0.9)
    core = np.exp(-(d ** 1.8) * 4.2)
    streak = np.exp(-((xx - cx) / (W * 0.35)) ** 2) * (0.4 + 0.6 * (1 - np.abs(yy / H - 0.35)))
    r = 255 * np.clip(core * 1.0 + streak * 0.5, 0, 1)
    g = 150 * np.clip(core * 0.7 + streak * 0.28, 0, 1)
    b = 60 * np.clip(core * 0.35 + streak * 0.08, 0, 1)
    a[..., 0], a[..., 1], a[..., 2] = r, g, b
    a[..., 3] = 255 * np.clip(core + streak * 0.4, 0, 1)
    return a, m


def dust():
    a, m = canvas()
    draw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(draw)
    rng = np.random.default_rng(11)
    for i in range(90):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        r = rng.uniform(1.2, 4.2)
        br = int(rng.uniform(90, 220))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(br, int(br * 0.94), int(br * 0.82), int(br * 0.75)))
    draw = draw.filter(ImageFilter.GaussianBlur(0.8))
    a = np.array(draw, dtype=np.float32)
    return a, "RGBA"


def bokeh():
    a, m = canvas()
    draw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(draw)
    rng = np.random.default_rng(23)
    for i in range(16):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        r = rng.uniform(60, 180)
        hue = rng.integers(0, 3)
        col = [(255, 214, 160), (255, 180, 140), (255, 240, 200)][hue]
        alpha = int(rng.uniform(28, 70))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(*col, alpha))
    draw = draw.filter(ImageFilter.GaussianBlur(14))
    return np.array(draw, dtype=np.float32), "RGBA"


def vignette_png():
    a, m = canvas()
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    v = np.clip((d - 0.55) / 0.75, 0, 1) ** 1.6
    a[..., :3] = 8
    a[..., 3] = 255 * v
    return a, m


def sparkle():
    a, m = canvas()
    draw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(draw)
    rng = np.random.default_rng(31)
    for i in range(26):
        x, y = rng.uniform(40, W - 40), rng.uniform(80, H - 80)
        s = rng.uniform(6, 26)
        alpha = int(rng.uniform(120, 230))
        col = (255, 246, 224, alpha)
        d.line([x - s, y, x + s, y], fill=col, width=2)
        d.line([x, y - s, x, y + s], fill=col, width=2)
        d.line([x - s * 0.5, y - s * 0.5, x + s * 0.5, y + s * 0.5], fill=(*col[:3], alpha // 3), width=1)
        d.line([x - s * 0.5, y + s * 0.5, x + s * 0.5, y - s * 0.5], fill=(*col[:3], alpha // 3), width=1)
    return np.array(draw, dtype=np.float32), "RGBA"


def paper():
    rng = np.random.default_rng(41)
    base = rng.normal(232, 7, (H, W))
    fibers = rng.normal(0, 1, (H // 3, W // 3))
    fibers = np.array(Image.fromarray(((fibers * 12) + 128).astype(np.uint8)).resize((W, H), Image.BILINEAR), dtype=np.float32) - 128
    lum = base + fibers * 1.6
    a = np.zeros((H, W, 4), dtype=np.float32)
    a[..., :3] = lum[..., None]
    a[..., 3] = 255
    return a, "RGB"


def scratches():
    a, m = canvas()
    draw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(draw)
    rng = np.random.default_rng(53)
    for i in range(7):
        x = rng.uniform(0, W)
        alpha = int(rng.uniform(30, 80))
        d.line([x, 0, x + rng.uniform(-30, 30), H], fill=(255, 250, 240, alpha), width=1)
    for i in range(40):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        ln = rng.uniform(4, 40)
        ang = rng.uniform(0, 6.28)
        d.line([x, y, x + ln * np.cos(ang), y + ln * np.sin(ang)], fill=(255, 250, 240, int(rng.uniform(20, 60))), width=1)
    return np.array(draw, dtype=np.float32), "RGBA"


def prism():
    a, m = canvas()
    yy, xx = np.mgrid[0:H, 0:W]
    band = (xx + yy * 0.35) / (W * 1.4)
    hues = np.array([np.exp(-((band - c) / 0.06) ** 2) for c in (0.32, 0.40, 0.48, 0.55, 0.62)])
    cols = np.array([[255, 80, 90], [255, 160, 70], [255, 240, 120], [110, 220, 160], [110, 150, 255]], dtype=np.float32)
    a[..., :3] = (hues.transpose(1, 2, 0)[..., None] * cols[None, None]).sum(axis=2)
    a[..., 3] = 255 * np.clip(hues.sum(axis=0) * 0.8, 0, 1)
    return a, m


def rain():
    a, m = canvas()
    draw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(draw)
    rng = np.random.default_rng(61)
    ang = np.deg2rad(14)
    for i in range(140):
        x, y = rng.uniform(-100, W + 100), rng.uniform(-200, H)
        ln = rng.uniform(40, 130)
        alpha = int(rng.uniform(28, 80))
        dx, dy = np.sin(ang) * ln, np.cos(ang) * ln
        d.line([x, y, x + dx, y + dy], fill=(225, 235, 245, alpha), width=1)
    draw = draw.filter(ImageFilter.GaussianBlur(0.6))
    return np.array(draw, dtype=np.float32), "RGBA"


def snow():
    a, m = canvas()
    draw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(draw)
    rng = np.random.default_rng(71)
    for i in range(110):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        r = rng.uniform(1.5, 6.5)
        alpha = int(rng.uniform(90, 200))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, alpha))
    draw = draw.filter(ImageFilter.GaussianBlur(0.9))
    return np.array(draw, dtype=np.float32), "RGBA"


def hearts():
    a, m = canvas()
    draw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(draw)
    rng = np.random.default_rng(83)

    def heart(x, y, s, col):
        d.polygon([(x, y + s * 0.9), (x - s, y), (x - s * 0.55, y - s * 0.55), (x, y - s * 0.15),
                   (x + s * 0.55, y - s * 0.55), (x + s, y)], fill=col)

    for i in range(14):
        x, y = rng.uniform(60, W - 60), rng.uniform(120, H - 40)
        s = rng.uniform(12, 34)
        alpha = int(rng.uniform(40, 110))
        heart(x, y, s, (255, 190, 200, alpha))
    draw = draw.filter(ImageFilter.GaussianBlur(1.1))
    return np.array(draw, dtype=np.float32), "RGBA"


def confetti():
    a, m = canvas()
    draw = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(draw)
    rng = np.random.default_rng(97)
    cols = [(255, 122, 141), (255, 202, 108), (141, 222, 176), (129, 178, 255), (222, 160, 255)]
    for i in range(70):
        x, y = W / 2 + rng.normal(0, W * 0.22), H * 0.45 + rng.normal(0, H * 0.1)
        s = rng.uniform(8, 20)
        col = (*cols[i % 5], int(rng.uniform(150, 240)))
        ang = rng.uniform(0, 6.28)
        pts = [(x + s * np.cos(ang + k * 1.57), y + s * 0.55 * np.sin(ang + k * 1.57)) for k in range(4)]
        d.polygon(pts, fill=col)
    return np.array(draw, dtype=np.float32), "RGBA"


GENS = {
    "film_grain": grain, "light_leak": leak, "dust_motes": dust, "bokeh_drift": bokeh,
    "vignette_soft": vignette_png, "vignette_deep": vignette_png, "sparkle_field": sparkle,
    "paper_texture": paper, "old_film_scratches": scratches, "prism_flare": prism,
    "rain_streaks": rain, "snow_drift": snow, "hearts_float": hearts, "confetti_pop": confetti,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="generate a single asset id")
    args = ap.parse_args()
    if args.only:
        fn = GENS.get(args.only)
        if not fn:
            raise SystemExit(f"unknown gen id {args.only}")
        a, m = fn()
        save(a, m, args.only)
        return
    print("Cineloom graphics generation — synthesizing overlay textures:")
    for name, fn in GENS.items():
        a, m = fn()
        save(a, m, name)
    print(f"\n{len(GENS)} textures written to assets/gen/")


if __name__ == "__main__":
    main()
