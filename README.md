<div align="center">

# Cineloom

**Weave your memories into film.**

Music-synced photo & video edits from one config file — deterministic, agent-operable, yours.

</div>

---

Cineloom turns a folder of photos/videos and one song into a finished, beat-synced vertical film. No GUI, no black boxes: a JSON config describes *what*, a 96-preset catalog describes *how*, a Python pipeline computes *when*, and Remotion renders *beautifully*.

```
edit_config.json ─┐
media/           ─┼─→ probe_media → beat_detect → build_timeline ─→ build/data.json
song.mp3         ─┘        ffprobe      numpy cues      15-15 presets       │
                                                                              ▼
                                                   remotion render Loom ─→ out/film.mp4 ─→ qc_check
```

## Quickstart

```bash
npm install                 # remotion 4, react 18, typescript
./loom.sh                   # full pipeline: probe → beats → graphics → timeline → render → qc
# or step by step:
make timeline               # rebuild build/data.json only (fast)
make preview                # Remotion Studio at :3000
make render && make qc      # render + automated QC gate
```

## The config is the product

Everything about your film lives in `edit_config.json`:

```jsonc
{
  "project": { "aspect": "9:16", "resolution": [1080, 1920], "fps": 30 },
  "audio":   { "track": "media/song.mp3", "start": 14.0, "fadeIn": 0.6, "fadeOut": 1.8 },
  "beat_sync": { "enabled": true, "strength": 0.8 },
  "style":   { "vibe": "romantic_nostalgia" },      // one line = a coherent look…
  "photos":  [ {"file": "media/photo_01.jpg"}, "…" ],
  "clips":   [ {"file": "media/clip.mp4", "trimIn": 2.0, "speed": 1.0} ],
  "lyrics":  [ {"text": "hold on to my hand", "start": 24.8, "end": 28.2, "keywords": ["hold on"]} ],
  "end_card": { "title": "us, always", "date": "2026" }
}
```

…or override any of the 15-15 catalog picks individually (`grade`, `typography`, `transition`, `layout`, `motion`, `overlays`). Per-photo overrides always win.

## What's inside

| Directory | Role |
|---|---|
| `presets/` | **The 15-15 gold-standard catalog** — 15 transitions, 15 typography styles, 15 grades, 15 layouts, 15 motions, 15 overlays + 6 vibe packs. Pure JSON, shared by Python & TS. |
| `scripts/` | The deterministic pipeline (Python): probe, beat detection, timeline build, graphics generation, QC, agent tooling. |
| `engine/` | TypeScript core: schema, preset registry, fonts, math. |
| `components/` | Remotion renderers: MediaCard (photo+video), TransitionBridge (all 15), LyricTrack, OverlayLayer, GradeLayer, SfxLayer, EndCard. |
| `assets/` | Bundled OFL fonts, CC0 SFX library (Kenney), generated textures. |
| `docs/` | Deep chapters: [PRESETS.md](docs/PRESETS.md), [UPGRADE_PLAN.md](docs/UPGRADE_PLAN.md), [AGENT_LOOP.md](docs/AGENT_LOOP.md). |
| `AGENTS.md` | How AI agents operate this repo. |
| `skills/loom/` | The agent skill package. |

## Feature highlights

- **15-15 preset catalog** — 96 curated presets, each documented with `bestFor`/`pairsWith`/energy, enforced by `npm run presets:check`.
- **Video input** — clips with trim/speed/mute mix freely with photos; auto-trim picks the liveliest moment deterministically.
- **Beat-true cuts** — numpy onset detection produces a brag-compatible cue file; cuts snap to strong beats with tunable strength.
- **Graphics generation** — every overlay texture is procedurally synthesized (numpy+PIL); no binary asset dependencies.
- **Sound design** — CC0 impact library + tasteful-picking policy; hits land on cuts by transition energy.
- **Self-improvement loop** — `feedback_loop.py rate …` → learned per-preset scores → `auto` style prefers what *you* actually loved.
- **One-command rebrand** — the brand lives in `BRAND.json`; `python3 scripts/rebrand.py --name X` renames the product.

## Verify the catalog

```bash
npm run presets:check      # 15-15 counts, unique ids, docs present
python3 scripts/preset_dev.py stats
```

## License

MIT for the code. Fonts are SIL-OFL, SFX are CC0 (see LICENSE).
