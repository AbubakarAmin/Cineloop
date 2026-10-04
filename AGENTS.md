# AGENTS.md — operating Cineloom

You are operating **Cineloom**, a deterministic music-video factory. Read this before touching anything.

## Mental model

```
edit_config.json  (intent)  ──►  build/data.json  (plan)  ──►  out/film.mp4  (artifact)
        ▲ presets/ (how: 96 presets)      ▲ cues from media analysis
```

- The **plan is data**. Never hand-edit `build/data.json` — edit `edit_config.json` and rebuild.
- The **render is dumb**. Components make zero creative decisions.
- Same config ⇒ same film. If you can't reproduce it, you broke determinism.

## Standard loop

```bash
make timeline                 # probe → beats → data.json   (fast, no render)
make preview                  # Remotion Studio :3000 — visually inspect before rendering
make render && make qc        # render + QC gate (duration/audio/lint/contact sheet)
```

QC failing ⇒ fix config or pipeline; never ship on a red QC.

## Choosing presets

1. Read `docs/PRESETS.md` (deep chapter) — every preset documents `bestFor`/`energy`/`pairsWith`.
2. Start from a **vibe pack** in `edit_config.json` (`style.vibe`), then override per need.
3. Craft rules are in the catalog doc — respect energy budgets and accent frequency.
4. `python3 scripts/preset_dev.py show <cat> <id>` prints any preset.

## Creating presets

Variant presets are pure JSON — you never need TS:

```bash
python3 scripts/preset_dev.py new transitions --name "Velvet Fade" > cand.json
# edit cand.json, then:
python3 scripts/preset_dev.py validate transitions cand.json
# append to presets/transitions.json (respect the 15-count; update engine/checkPresets.ts if growing)
npm run presets:check
```

A brand-new visual *kind* requires a renderer case in `TransitionBridge.tsx` or `OverlayLayer.tsx` — the validator tells you. Graphics textures for new overlays go in `scripts/graphics_gen.py`.

## Self-improvement loop

```bash
python3 scripts/feedback_loop.py rate out/film.mp4 4 --note "leak too strong at chorus"
python3 scripts/feedback_loop.py learn        # Bayesian per-preset scores
python3 scripts/feedback_loop.py recommend    # what to use next time
```

Read `LEARNINGS.md` before starting a new edit — it is the qualitative memory.

## Hard rules

- Don't edit `build/` or `out/` contents by hand; they are disposable artifacts.
- Don't add npm/python deps without a failed attempt using what's bundled first.
- Fonts: only the 7 bundled OFL families (`engine/fonts.ts`). SFX: only `assets/sfx/` (CC0).
- `BRAND.json` is the only place with the product name. Rename via `scripts/rebrand.py`.
- Keep `npm run presets:check` and `npx tsc` green at all times.
