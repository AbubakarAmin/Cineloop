#!/usr/bin/env python3
"""preset_dev.py — agent-facing preset development harness.

Commands:
  new <category> [--name "My Preset"]       scaffold a validated variant preset JSON to stdout
  validate <category> <file.json>           schema + range checks for a candidate preset
  show <category> <id>                      print a preset from the catalog
  stats                                     per-category counts + coverage report

Variant presets are pure JSON — an agent never needs to touch TS to add one.
If the preset introduces a new visual *kind*, preset_dev prints exactly which
renderer switch needs a new case (transitions.tsx / OverlayLayer.tsx).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRESETS = ROOT / "presets"

SCHEMAS = {
    "transitions": {"required": ["id", "name", "kind", "durBeats", "energy", "params"],
                    "ranges": {"durBeats": (0.2, 2.0), "energy": (0.0, 1.0)},
                    "kinds": ["dissolve", "whip", "leak_wipe", "zoom_punch", "glitch", "luma_fade",
                              "burn", "push", "blur_dissolve", "spin", "mask_wipe", "prismatic",
                              "heartbeat", "gate", "ink"]},
    "typography": {"required": ["id", "name", "font", "weight", "sizeFactor", "tracking",
                                "transform", "color", "keywords", "shadow", "entrance",
                                "align", "position", "backdrop"],
                   "ranges": {"sizeFactor": (0.4, 3.0), "tracking": (-0.03, 0.3), "weight": (100, 900)},
                   "kinds": None},
    "grades": {"required": ["id", "name", "energy", "filters", "tint", "lift", "vignette", "grain"],
               "ranges": {"energy": (0.0, 1.0), "vignette": (0.0, 0.8), "grain": (0.0, 0.3)},
               "kinds": None},
    "layouts": {"required": ["id", "name", "fit", "fill", "captionZone"],
                "ranges": {}, "kinds": None},
    "motion": {"required": ["id", "name", "kind", "scale", "pan", "rotate", "ease"],
               "ranges": {}, "kinds": ["zoom_pan"]},
    "overlays": {"required": ["id", "name", "gen", "z", "blend", "opacity", "params"],
                 "ranges": {"z": (30, 95), "opacity": (0.0, 1.0)},
                 "kinds": ["grain", "leak", "dust", "bokeh", "vignette_css", "halation_css",
                           "rain", "snow", "hearts", "sparkle", "paper", "scratches",
                           "prism", "confetti"]},
    "vibes": {"required": ["id", "name", "description", "defaults", "bpmHint"],
              "ranges": {}, "kinds": None},
}


def load_cat(cat):
    return json.loads((PRESETS / f"{cat}.json").read_text())


def validate(cat: str, preset: dict, quiet=False) -> list[str]:
    errs = []
    sc = SCHEMAS[cat]
    for k in sc["required"]:
        if k not in preset:
            errs.append(f"missing required field: {k}")
    for k, (lo, hi) in sc["ranges"].items():
        if k in preset and isinstance(preset[k], (int, float)) and not (lo <= preset[k] <= hi):
            errs.append(f"{k}={preset[k]} outside [{lo}, {hi}]")
    if sc["kinds"] and preset.get("kind") and preset["kind"] not in sc["kinds"]:
        errs.append(f"unknown kind '{preset['kind']}' — new kinds need a renderer case "
                    f"(TransitionBridge.tsx or OverlayLayer.tsx)")
    ids = {p["id"] for p in load_cat(cat)}
    if preset.get("id") in ids:
        errs.append(f"id '{preset['id']}' already exists in {cat}")
    if cat == "typography" and preset.get("font") not in {
            "manrope", "playfair", "playfair_italic", "caveat", "bebas", "cormorant", "space"}:
        errs.append("font must be one of the bundled families")
    if not quiet:
        for e in errs:
            print(f"  ✗ {e}")
        if not errs:
            print("  ✓ valid")
    return errs


def cmd_new(cat: str, name="My Preset"):
    stubs = {
        "transitions": {"id": "", "name": name, "kind": "dissolve", "durBeats": 0.75, "energy": 0.4,
                        "params": {}, "bestFor": "", "pairsWith": [], "notes": ""},
        "typography": {"id": "", "name": name, "font": "manrope", "weight": 700, "sizeFactor": 1.0,
                       "tracking": 0, "transform": "none", "color": "#f5efe6",
                       "keywords": {"style": "solid", "color": "#d4af7a"}, "shadow": "0 2px 18px rgba(0,0,0,0.45)",
                       "entrance": {"kind": "fade_up", "durF": 12, "risePx": 20},
                       "align": "center", "position": "lower_third", "backdrop": "none", "notes": ""},
        "grades": {"id": "", "name": name, "energy": 0.3,
                   "filters": {"brightness": 1.03, "contrast": 1.05, "saturate": 1.05},
                   "tint": {"color": "#ffb45e", "opacity": 0.06, "blend": "overlay"},
                   "lift": {"color": "#241a12", "opacity": 0.10}, "vignette": 0.2, "grain": 0.05, "notes": ""},
        "layouts": {"id": "", "name": name, "fit": "contain", "fill": "blur", "blurPx": 60,
                    "darkenFill": 0.45, "frame": None, "captionZone": "center", "notes": ""},
        "motion": {"id": "", "name": name, "kind": "zoom_pan", "scale": {"from": 1.05, "to": 1.18},
                   "pan": {"x": [0, 0], "y": [0, 0]}, "rotate": {"from": 0, "to": 0},
                   "ease": "easeOutCubic", "notes": ""},
        "overlays": {"id": "", "name": name, "gen": "bokeh", "z": 55, "blend": "screen",
                     "opacity": 0.4, "params": {}, "notes": ""},
        "vibes": {"id": "", "name": name, "description": "", "defaults": {}, "bpmHint": [85, 110], "notes": ""},
    }
    stub = stubs[cat]
    slug = name.lower().replace(" ", "_")[:24]
    stub["id"] = slug
    errs = validate(cat, stub, quiet=True)
    print(json.dumps(stub, indent=2))
    if errs:
        print(f"\n// NOTE: stub has {len(errs)} validation warning(s)", file=sys.stderr)
    print(f"\n// next: edit fields, then append to presets/{cat}.json (keep 15-count per category"
          f" unless expanding the catalog deliberately — update engine/checkPresets.ts targets)", file=sys.stderr)


def cmd_validate_file(cat: str, path: str):
    preset = json.loads(Path(path).read_text())
    errs = validate(cat, preset)
    sys.exit(1 if errs else 0)


def cmd_show(cat: str, pid: str):
    hit = next((p for p in load_cat(cat) if p["id"] == pid), None)
    print(json.dumps(hit, indent=2) if hit else f"not found: {pid}", file=sys.stderr)
    sys.exit(0 if hit else 1)


def cmd_stats():
    total = 0
    for cat in SCHEMAS:
        lst = load_cat(cat)
        total += len(lst)
        with_notes = sum(1 for p in lst if p.get("notes") or p.get("description") or p.get("bestFor"))
        bar = "█" * len(lst)
        print(f"  {cat:12s} {len(lst):3d}  {bar}  docs:{with_notes}/{len(lst)}")
    print(f"\n  total presets: {total}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    argv = sys.argv[1:]
    cmd, *rest = argv
    if cmd == "new" and rest:
        name = "My Preset"
        if "--name" in rest:
            i = rest.index("--name")
            name = rest[i + 1] if i + 1 < len(rest) else name
            rest = rest[:i] + rest[i + 2:]
        cmd_new(rest[0], name=name)
    elif cmd == "validate" and len(rest) == 2:
        cmd_validate_file(rest[0], rest[1])
    elif cmd == "show" and len(rest) == 2:
        cmd_show(rest[0], rest[1])
    elif cmd == "stats":
        cmd_stats()
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
