#!/usr/bin/env python3
"""feedback_loop.py — the self-improvement loop.

  rate <render.mp4> <1-5> [--preset transition:zoom_punch] [--note "..."] [--config edit_config.json]
      record a rating tied to the presets used by that render's timeline

  learn
      aggregate build/feedback.jsonl -> build/preset_scores.json
      (mean rating per preset + Bayesian shrinkage toward the global mean;
      low-N presets stay close to neutral so one bad rating can't ban a preset)

  recommend [--vibe romantic_nostalgia]
      print the current top-rated preset quintuple per category

build_timeline.py consults preset_scores.json when style is "auto":
top-scoring presets get priority in pools. Ratings + notes are also appended
to LEARNINGS.md so agents can read qualitative context, not just numbers.
"""
import json
import statistics
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "public" / "build"
FB = BUILD / "feedback.jsonl"
SCORES = BUILD / "preset_scores.json"
LEARNINGS = ROOT / "LEARNINGS.md"


def used_presets() -> dict[str, list[str]]:
    try:
        data = json.loads((BUILD / "data.json").read_text())
    except FileNotFoundError:
        return {}
    used = {
        "grades": [data["style"]["grade"]],
        "typography": [data["style"]["typography"]],
        "transitions": sorted({s["transitionIn"] for s in data["segments"] if s["transitionIn"]}),
        "layouts": sorted({s["layout"] for s in data["segments"]}),
        "motion": sorted({s["motion"] for s in data["segments"]}),
        "overlays": sorted({o["id"] for o in data["overlays"]}),
    }
    return used


def cmd_rate(render: str, score: int, preset_flag: str | None, note: str, config: str):
    used = used_presets()
    # normalize focus category to the plural catalog names
    CATS = {"grade": "grades", "transition": "transitions", "typography": "typography",
            "layout": "layouts", "motion": "motion", "overlay": "overlays"}
    if preset_flag:
        cat, _, pid = preset_flag.partition(":")
        preset_flag = f"{CATS.get(cat, cat)}:{pid}"
    entry = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "render": render,
        "score": score,
        "note": note,
        "config": config,
        "presets": used,
    }
    if preset_flag:
        _cat, _, pid = preset_flag.partition(":")
        entry["focus"] = {"category": _cat, "id": pid}
    BUILD.mkdir(exist_ok=True)
    with FB.open("a") as f:
        f.write(json.dumps(entry) + "\n")
    append_learning(entry)
    print(f"recorded rating {score}/5 for {render}")
    print("next: python3 scripts/feedback_loop.py learn")


def append_learning(entry: dict):
    if not LEARNINGS.exists():
        LEARNINGS.write_text("# LEARNINGS — auto-appended by feedback_loop.py\n\n")
    with LEARNINGS.open("a") as f:
        f.write(f"\n- `{entry['ts']}` rating **{entry['score']}/5** — `{entry['render']}`")
        if entry.get("focus"):
            f.write(f" (focus: {entry['focus']['category']}:{entry['focus']['id']})")
        if entry.get("note"):
            f.write(f' — "{entry["note"]}"')
        f.write("\n")


def cmd_learn():
    if not FB.exists():
        print("no feedback yet — rate a render first")
        return
    entries = [json.loads(l) for l in FB.read_text().splitlines() if l.strip()]
    global_mean = statistics.mean(e["score"] for e in entries)
    prior_n, prior_weight = 2.0, global_mean  # Bayesian shrinkage

    scores: dict[str, dict] = {}
    for e in entries:
        for cat, ids in e.get("presets", {}).items():
            for pid in ids:
                key = f"{cat}:{pid}"
                d = scores.setdefault(key, {"n": 0, "sum": 0.0, "notes": []})
                d["n"] += 1
                d["sum"] += e["score"]
                if e.get("note") and len(d["notes"]) < 3:
                    d["notes"].append(e["note"])
        if e.get("focus"):
            key = f'{e["focus"]["category"]}:{e["focus"]["id"]}'
            d = scores.setdefault(key, {"n": 0, "sum": 0.0, "notes": []})
            d["n"] += 2  # focus ratings weigh double
            d["sum"] += e["score"] * 2

    out = {}
    for key, d in sorted(scores.items()):
        mean = d["sum"] / d["n"]
        shrunk = (d["sum"] + prior_weight * prior_n) / (d["n"] + prior_n)
        out[key] = {"mean": round(mean, 3), "n": d["n"], "score": round(shrunk, 3),
                    "notes": d["notes"]}
    SCORES.write_text(json.dumps({"globalMean": round(global_mean, 3),
                                  "updated": datetime.now().isoformat(timespec="seconds"),
                                  "presets": out}, indent=1))
    top = sorted(out.items(), key=lambda kv: -kv[1]["score"])[:8]
    print(f"global mean {global_mean:.2f} across {len(entries)} ratings -> {SCORES.name}")
    print("top presets:")
    for key, d in top:
        print(f"  {d['score']:.2f}  {key}  (n={d['n']})")


def cmd_recommend():
    try:
        scores = json.loads(SCORES.read_text())["presets"]
    except FileNotFoundError:
        scores = {}
    best = {}
    for key, d in scores.items():
        cat, _, pid = key.partition(":")
        if cat not in best or d["score"] > best[cat][1]:
            best[cat] = (pid, d["score"])
    if not best:
        print("no learned scores yet; falling back to catalog defaults")
        return
    print("current learned favourites:")
    for cat, (pid, sc) in sorted(best.items()):
        print(f"  {cat:12s} {pid:22s} {sc:.2f}")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    if args[0] == "rate" and len(args) >= 3:
        render, score = args[1], int(args[2])
        note = args[args.index("--note") + 1] if "--note" in args else ""
        preset_flag = args[args.index("--preset") + 1] if "--preset" in args else None
        config = args[args.index("--config") + 1] if "--config" in args else "edit_config.json"
        cmd_rate(render, score, preset_flag, note, config)
    elif args[0] == "learn":
        cmd_learn()
    elif args[0] == "recommend":
        cmd_recommend()
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
