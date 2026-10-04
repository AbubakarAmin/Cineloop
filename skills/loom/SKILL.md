---
name: loom
description: Operate the Cineloom repo to produce music-synced photo/video films. Use when asked to create, edit, or restyle an edit in this project, or when edit_config.json / presets / timeline come up.
---

# /loom — Cineloom operator skill

## When to use
Any task that creates or modifies an edit, preset, timeline, or render inside the Cineloom repo.

## Prime directives
1. **Read before write.** `AGENTS.md`, `LEARNINGS.md` (if present), and `docs/PRESETS.md` craft rules.
2. **Config is the interface.** Express creative changes in `edit_config.json` (or a new config file per project: `configs/wedding.json`), never by patching `build/data.json`.
3. **Determinism is sacred.** No timestamps in creative output; use `det_rand`.
4. **QC gate or it didn't happen.** `python3 scripts/qc_check.py out/x.mp4` must exit 0 before presenting any render.

## Workflow

### New edit
1. Ensure media in `media/`, then `make timeline`.
2. Pick `style.vibe` (6 packs in `docs/PRESETS.md`); override individual presets where the media demands.
3. Write `lyrics` with explicit `start`/`end` (seconds) and 1–2 `keywords` per line; lines ≤ 5 words for Golden Retro.
4. `make preview` → sanity-check 3 segments at least (first, one accent, last).
5. `OUT=out/film.mp4 make render` → `qc` → report the contact sheet path.

### Restyle (same media, new look)
1. Change `style` block only; keep lyric timings.
2. `make timeline && make preview`.
3. Render + QC.

### New preset
Follow `AGENTS.md → Creating presets`. Always `validate` before appending; keep counts at 15 (or move the target consciously in `engine/checkPresets.ts`).

### Learn
After any human feedback: `feedback_loop.py rate …` then `learn`. Consult `recommend` when choosing for the next edit.

## Pitfalls (learned the hard way)
- **Duration mismatch QC fail** → a config `photos` entry whose file is missing from `media/`; the timeline builder errors or pads. Fix media, rebuild.
- **Beat snap too aggressive** (`strength` near 1 with sparse cues) → segments stretch to minSegSec; lower strength or raise `minSegSec`.
- **Video clips jitter on some machines** → prefer `muted: true` and `speed: 1.0`; OffthreadVideo + playbackRate ≠ 1 is the least tested path.
- **Grain missing** → overlay PNGs not generated; run `make graphics`.
- **Transitions clipped** → segment shorter than transition window; `build_timeline` clamps to `minSegSec`, but custom 0.25b transitions on 1.5s segments still pinch — lengthen segments or soften transition.

## Reference files
- `../../AGENTS.md` — hard rules
- `../../docs/PRESETS.md` — the 15-15 catalog deep chapter
- `../../docs/UPGRADE_PLAN.md` — why the architecture is what it is
