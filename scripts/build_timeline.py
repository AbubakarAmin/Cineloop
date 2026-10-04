#!/usr/bin/env python3
"""build_timeline.py — the deterministic brain of Cineloom.

Reads:  edit_config.json + build/manifest.json + build/cues.json + presets/*.json
Writes: build/data.json  (the full timeline the Remotion composition renders)

Everything is pure functions over the inputs — same config always yields the
same timeline. Presets are resolved from the 15-15 catalog; vibe packs provide
coherent defaults; per-segment overrides in edit_config.json always win.
"""
import json
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "public" / "build"
PRESETS = ROOT / "presets"

FPS = None  # set from config


def load_presets(cat: str) -> list[dict]:
    return json.loads((PRESETS / f"{cat}.json").read_text())


def pmap(cat: str) -> dict:
    return {p["id"]: p for p in load_presets(cat)}


def det_rand(*parts) -> float:
    """Deterministic hash random 0..1 — stable across runs and machines."""
    h = hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()
    return int(h[:12], 16) / float(16 ** 12)


# ---------------------------------------------------------------- style resolve
def resolve_style(cfg: dict) -> dict:
    style = dict(cfg.get("style", {}))
    vibes = {v["id"]: v for v in load_presets("vibes")}
    pack_id = style.get("vibe")
    pack = vibes.get(pack_id)
    defaults = pack["defaults"] if pack else {}
    merged = {**defaults, **{k: v for k, v in style.items() if v is not None}}

    # transition may be: "id" | ["a","b"] (cycle) | {"pattern":[...]}
    tr = merged.get("transition", "film_dissolve")
    if isinstance(tr, dict):
        pattern = tr.get("pattern", ["film_dissolve"])
    elif isinstance(tr, list):
        pattern = tr
    else:
        pattern = [tr]
    accents = merged.get("transitionAccents", [])
    if isinstance(accents, str):
        accents = [accents]
    if not accents:
        accents = pattern

    overlays = merged.get("overlays", ["film_grain", "vignette_soft"])
    if isinstance(overlays, str):
        overlays = [overlays]

    return {
        "vibe": pack_id or "",
        "grade": merged.get("grade", "warm_film"),
        "typography": merged.get("typography", "golden_retro"),
        "layout": merged.get("layout", "contain_blur"),
        "layoutAccents": merged.get("layoutAccents", []),
        "motion": merged.get("motion", "slow_push"),
        "motionPool": merged.get("motionPool", None),
        "transitionPattern": pattern,
        "transitionAccents": accents,
        "accentEvery": int(merged.get("accentEvery", 4)),
        "overlays": overlays,
        "segBeats": merged.get("segBeats", None),
        "sfxPolicy": merged.get("sfxPolicy", "tasteful"),
    }


# ---------------------------------------------------------------- beat grid
def build_cut_times(cues: list[dict], duration: float, n_seg: int, strength: float,
                    seg_beats: float | None, bpm: float | None, min_seg: float) -> list[float]:
    """Return n_seg+1 boundary times [0, b1, ..., duration] snapped to strong cues."""
    strong = [c["time"] for c in cues if c["intensity"] >= 0.45]
    if not strong:
        strong = [c["time"] for c in cues]
    window = 0.14 + 0.5 * strength  # stronger snap -> wider search
    ideal = duration / n_seg

    if seg_beats and bpm:
        ideal = seg_beats * 60.0 / bpm

    bounds = [0.0]
    target = ideal
    while target < duration - min_seg:
        cand = min(strong, key=lambda t: abs(t - target))
        snapped = cand if abs(cand - target) <= window else target
        if snapped - bounds[-1] < min_seg:
            snapped = bounds[-1] + ideal
        if snapped < duration - min_seg * 0.5:
            bounds.append(round(snapped, 3))
        target += ideal
    bounds.append(round(duration, 3))
    # merge to exactly n_seg segments: drop middle bounds if too many
    while len(bounds) - 1 > n_seg:
        mid_gaps = [(bounds[i + 1] - bounds[i], i + 1) for i in range(1, len(bounds) - 2)]
        bounds.pop(min(mid_gaps)[1])
    return bounds


# ---------------------------------------------------------------- media helpers
def auto_layout(media: dict, canvas: tuple[int, int], style: dict, idx: int, accent_every: int) -> tuple[str, bool]:
    ar_media = media["width"] / media["height"]
    ar_canvas = canvas[0] / canvas[1]
    base = style["layout"]
    if media["type"] == "video" and base == "contain_blur":
        base = "contain_blur"  # works for video too
    is_accent = (idx % accent_every == 0) and style["layoutAccents"]
    if is_accent:
        pick = style["layoutAccents"][int(det_rand("layout", idx) * len(style["layoutAccents"]))]
        return pick, True
    # auto rule: portrait-ish media fills nicely; landscape gets blur fill
    if base == "auto":
        return ("cover_fill" if ar_media >= ar_canvas * 0.9 else "contain_blur"), False
    return base, False


def motion_for(idx: int, style: dict, media: dict) -> str:
    pool = style.get("motionPool")
    if pool:
        return pool[idx % len(pool)]
    return style["motion"]


def sfx_pick(energy: float, policy: str, idx: int) -> str | None:
    if policy == "off":
        return None
    rate = {"tasteful": 0.55, "energetic": 0.3, "sparse": 0.75, "off": 1.1}[policy]
    if energy < 0.55 and policy != "energetic":
        return None
    if det_rand("sfx", idx) < rate:
        return None
    if energy > 0.8:
        return "impact/impactSoft_heavy_003.ogg"
    return "impact/impactSoft_medium_001.ogg"


def auto_keywords(text: str) -> list[str]:
    words = [w.strip(".,!?;:") for w in text.split()]
    cand = [w for w in words if len(w) >= 5]
    if not cand:
        return []
    return [max(cand, key=len)]


# ---------------------------------------------------------------- main
def main() -> None:
    cfg_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "edit_config.json"
    cfg = json.loads(cfg_path.read_text())
    manifest = json.loads((BUILD / "manifest.json").read_text())
    cues_doc = json.loads((BUILD / "cues.json").read_text())
    brand = json.loads((ROOT / "BRAND.json").read_text())

    proj = cfg["project"]
    fps = int(proj.get("fps", 30))
    canvas = tuple(proj.get("resolution", [1080, 1920]))
    ar = proj.get("aspect", "9:16")
    if "x" in str(ar):
        a, b = ar.split("x")
        canvas = (int(a), int(b))

    style = resolve_style(cfg)
    transitions = pmap("transitions")
    overlays_cat = pmap("overlays")
    grades = pmap("grades")

    # ---- duration
    audio_info = manifest.get(cfg["audio"]["track"].split("/")[-1], {})
    track_dur = audio_info.get("duration", 300.0)
    start = float(cfg["audio"].get("start", 0.0))
    dur_cfg = cfg["audio"].get("duration")
    media_entries = cfg.get("photos", []) + cfg.get("clips", [])
    n_seg = len(media_entries)
    if dur_cfg:
        duration = float(dur_cfg)
    else:
        seg_beats = style["segBeats"] or 4
        bpm = cues_doc.get("tempo") or 100
        duration = min(n_seg * seg_beats * 60.0 / bpm, track_dur - start - 0.5)
    duration = min(duration, track_dur - start)

    # ---- segments
    bs = cfg.get("beat_sync", {})
    strength = float(bs.get("strength", 0.8)) if bs.get("enabled", True) else 0.0
    min_seg = float(bs.get("minSegSec", 1.4))
    bounds = build_cut_times(cues_doc["beats"], duration, n_seg, strength,
                             style["segBeats"], cues_doc.get("tempo"), min_seg)
    if len(bounds) - 1 != n_seg:
        bounds = [round(i * duration / n_seg, 3) for i in range(n_seg)] + [round(duration, 3)]

    segments, sfx_hits = [], []
    accent_every = max(2, style["accentEvery"])
    for i, entry in enumerate(media_entries):
        fname = Path(entry["file"]).name
        media = manifest.get(fname)
        if not media:
            raise SystemExit(f"media missing from manifest: {fname}")
        item = {
            "src": f"media/{fname}", "type": media["type"],
            "width": media["width"], "height": media["height"],
        }
        if media["type"] == "video":
            item.update({
                "durationSec": media["duration"], "fps": media.get("fps", 30),
                "trimInSec": float(entry.get("trimIn", 0.0)),
                "trimOutSec": float(entry.get("trimOut", 0.0)) or None,
                "speed": float(entry.get("speed", 1.0)),
                "muted": bool(entry.get("muted", True)),
            })
            if item["trimOutSec"] is None:
                item["trimOutSec"] = None
        if media.get("rotation"):
            item["rotation"] = media["rotation"]

        t_in = bounds[i]
        t_out = bounds[i + 1]
        seg_len = t_out - t_in

        # video auto-trim: if clip too short, loop point chosen deterministically
        if media["type"] == "video" and not entry.get("trimIn"):
            avail = media["duration"] - 0.5
            if avail > seg_len * 1.5:
                item["trimInSec"] = round(0.2 + det_rand("trim", fname) * (avail - seg_len), 2)

        layout_id, is_accent = auto_layout(media, canvas, style, i, accent_every)
        tr_id = (style["transitionPattern"][0] if i == 0 else
                 (style["transitionAccents"][i % len(style["transitionAccents"])]
                  if i % accent_every == 0 else
                  style["transitionPattern"][i % len(style["transitionPattern"])]))
        tr = transitions.get(tr_id) or transitions["film_dissolve"]
        energy = tr.get("energy", 0.5)

        seg = {
            "index": i,
            "media": item,
            "startF": int(round(t_in * fps)),
            "durF": int(round((t_out - t_in) * fps)),
            "layout": layout_id,
            "layoutAccent": is_accent,
            "motion": motion_for(i, style, media),
            "transitionIn": tr_id if i > 0 else "",
            "transitionDurF": int(round(tr["durBeats"] * fps)) if i > 0 else 0,
            "beatAnchored": bs.get("enabled", True),
        }
        hit = sfx_pick(energy, style["sfxPolicy"], i) if i > 0 else None
        if hit:
            seg["sfx"] = hit
            sfx_hits.append({"frame": seg["startF"], "file": hit, "gain": round(0.4 + energy * 0.2, 2)})
        segments.append(seg)

    # enforce monotonic frames
    for i in range(1, len(segments)):
        if segments[i]["startF"] <= segments[i - 1]["startF"]:
            segments[i]["startF"] = segments[i - 1]["startF"] + max(8, segments[i - 1]["durF"] // 2)

    # ---- lyrics
    lyrics = []
    for line in cfg.get("lyrics", []):
        text = line["text"]
        kws = line.get("keywords") or auto_keywords(text)
        lyrics.append({
            "text": text,
            "keywords": kws,
            "startF": int(round(line["start"] * fps)),
            "endF": int(round(line["end"] * fps)),
        })

    # ---- overlays
    overlays = []
    for ov in style["overlays"]:
        if isinstance(ov, str):
            overlays.append({"id": ov, "opacity": 1.0})
        else:
            overlays.append({"id": ov["id"], "opacity": float(ov.get("opacity", 1.0)),
                             "params": ov.get("params", {})})
    # ensure grain exists (house signature) unless vibe says otherwise
    if not any(o["id"] in ("film_grain", "paper_texture") for o in overlays):
        if grades[style["grade"]].get("grain", 0) > 0.03:
            overlays.append({"id": "film_grain", "opacity": 0.8})

    # ---- end card
    ec = cfg.get("end_card")
    end_card = None
    if ec:
        tail = float(ec.get("dur", 4.0))
        end_card = {
            "title": ec.get("title", ""),
            "subtitle": ec.get("subtitle"),
            "date": ec.get("date"),
            "monogram": ec.get("monogram", brand["monogram"]),
            "startF": int(round((duration - tail) * fps)),
            "durF": int(round(tail * fps)),
            "bgSrc": segments[-1]["media"]["src"] if segments else None,
        }

    data = {
        "meta": {
            "generator": brand["slug"], "brand": brand["name"],
            "version": brand["version"],
            "builtAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
            "fps": fps, "width": canvas[0], "height": canvas[1],
            "durationF": int(round(duration * fps)),
            "sourceConfig": cfg_path.name,
        },
        "audio": {
            "src": cfg["audio"]["track"],
            "startSec": start,
            "fadeIn": float(cfg["audio"].get("fadeIn", 0.6)),
            "fadeOut": float(cfg["audio"].get("fadeOut", 1.8)),
            "bpm": cues_doc.get("tempo"),
            "cues": [{"t": c["time"], "intensity": c["intensity"]} for c in cues_doc["beats"]],
        },
        "style": {
            "vibe": style["vibe"], "grade": style["grade"],
            "typography": style["typography"],
            "transitionPattern": style["transitionPattern"],
            "accentEvery": accent_every,
        },
        "segments": segments,
        "lyrics": lyrics,
        "overlays": overlays,
        "sfx": sfx_hits,
        "endCard": end_card,
    }

    BUILD.mkdir(exist_ok=True)
    (BUILD / "data.json").write_text(json.dumps(data, indent=1))

    # human summary
    lines = [
        f"timeline: {duration:.2f}s @ {fps}fps = {data['meta']['durationF']} frames",
        f"vibe={style['vibe'] or '-'} grade={style['grade']} type={style['typography']}",
        f"segments={len(segments)} lyrics={len(lyrics)} overlays={len(overlays)} sfx={len(sfx_hits)}",
        "-" * 64,
    ]
    for s in segments:
        lines.append(
            f"  #{s['index']:02d} {s['startF']/fps:6.2f}s +{s['durF']/fps:5.2f}s "
            f"{Path(s['media']['src']).name:16s} {s['layout']:16s} {s['motion']:16s} "
            f"in:{s['transitionIn'] or '-'}")
    (BUILD / "summary.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\nwrote build/data.json")


if __name__ == "__main__":
    main()
