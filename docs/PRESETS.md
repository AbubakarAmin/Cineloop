# The 15-15 Gold-Standard Catalog

The soul of Cineloom. Every visual decision maps to one of six categories, each holding **exactly 15 hand-tuned presets** (plus 6 vibe packs that compose them). This document is the deep chapter: what each preset does, when to reach for it, and the craft rules that keep 90 options coherent.

**Design rules of the catalog**

1. **Fifteen is the budget.** A preset earns its slot by being *the best answer to a real situation*. Adding means replacing or expanding deliberately (update `engine/checkPresets.ts`).
2. **Every preset documents itself.** `notes` explain the craft; transitions carry `bestFor` + `pairsWith` + `energy` (0–1). Agents read these before choosing.
3. **Presets are data.** All 96 live as JSON in `presets/*.json` — Python (timeline) and TypeScript (render) consume the same files. No truth duplication.
4. **Energy coordinates the edit.** Transition energy should follow the song's cue intensity; catalog pairs are pre-screened to clash rarely.

---

## Transitions ×15  (`presets/transitions.json`)

| # | id | kind | dur | energy | reach for it when |
|---|----|------|-----|--------|-------------------|
| 1 | `film_dissolve` | dissolve | 1.0b | 0.2 | default emotional glue; slow verses |
| 2 | `whip_pan` | whip | 0.5b | 0.8 | geography matches; energy lifts |
| 3 | `light_leak_wipe` | leak_wipe | 1.0b | 0.5 | verse→chorus lift |
| 4 | `zoom_punch` | zoom_punch | 0.5b | 0.9 | downbeats, chorus hits |
| 5 | `glitch_cut` | glitch | 0.25b | 1.0 | Y2K/playful accent — never twice in a row |
| 6 | `luma_fade` | luma_fade | 0.75b | 0.25 | dreamy sections, openings |
| 7 | `film_burn` | burn | 0.75b | 0.7 | retro Super8 |
| 8 | `slide_push` | push | 0.5b | 0.6 | story progression |
| 9 | `blur_dissolve` | blur_dissolve | 1.0b | 0.2 | memory fades, **the final cut** |
| 10 | `spin_blur` | spin | 0.5b | 0.85 | once-per-edit playful accent |
| 11 | `mask_wipe` | mask_wipe | 0.5b | 0.45 | clean modern looks |
| 12 | `prismatic_shift` | prismatic | 0.5b | 0.75 | neon nights |
| 13 | `heartbeat_cut` | heartbeat | 0.75b | 0.55 | couple films — pulse lands on the cut |
| 14 | `film_gate` | gate | 0.5b | 0.5 | vintage threading |
| 15 | `ink_bleed` | ink | 1.0b | 0.4 | moody noir, title moments |

**Craft rules.** Energy budget per 8 bars: one ≥0.8 transition max. `dissolve` family (1,6,9) never alternates with itself more than twice. Directional transitions (2,8) keep direction consistent within a section. Accent transitions (5,10,12) appear at most twice per film.

## Typography ×15  (`presets/typography.json`)

Golden Retro (the house look: Manrope 800, rose-gold gradient keywords) · Midnight Serif (Playfair + gold glow) · Handwritten Love (Caveat) · Editorial Caps (Bebas, tracked) · Soft Sans · Cinema Title (Cormorant, letterboxed) · Neon Glow · Typewriter (caret reveal) · Karaoke Pop (word-by-word fill) · Stamp Tag (corner chip) · Vertical Side · Big Word (fullscreen single word) · Script Shadow · Paper Cut (torn strip) · Minimal Lower.

**Entrances available:** fade, fade_up, slide_up, blur_in, wobble_in, letter_cascade, flicker_in, typewriter(+caret), karaoke, stamp_in, slide_side, scale_in, drift_in. **Keyword treatments:** gradient / glow / solid / outline / color. **Backdrop:** none / letterbox / paper / chip.

**Craft rules.** One typography per film. Lyric lines ≤ 5 words read best in Golden Retro; Big Word requires ≤ 3. Karaoke Pop is the only style with time-dimmed future words.

## Grades ×15  (`presets/grades.json`)

Warm Film (house) · Golden Hour · Kodak Portra 400 · Teal & Orange · Faded Film · B&W Classic · B&W Noir · Sepia Years · Moonlight · Vintage 70s · Pastel Dream · Moody Forest · Cinema Blue · Sunbleached · Candlelight.

Each grade = CSS filter chain + tint (blend mode) + shadow-lift + vignette + grain. **Craft rule:** grades are global (one per film) — per-shot grading only via `layoutAccents`. Warmth families (Warm Film, Golden Hour, Candlelight, Vintage 70s) pair with gold typography; cool families demand white or outline text.

## Layouts ×15  (`presets/layouts.json`)

Contain+Blur Fill (house) · Cover Fill · Dynamic Blur Fill · Cinema Bars · Polaroid · Floating Card · Split Diptych · Triptych Stack · Corner Collage · Side Text Panel · Inset Matte · Full-Bleed Tilt · Filmstrip · Soft Edge · Arch Frame.

**Auto rule (when `layout:"auto"` or unset):** media aspect ≥ canvas aspect → `cover_fill`; otherwise → `contain_blur`. Accent layouts (layoutAccents in the vibe) fire every Nth segment — never twice consecutively. Portrait phone photos love Cover Fill; landscape scans love Contain+Blur.

## Motion ×15  (`presets/motion.json`)

Reveal Zoom (house: 1.95→1.10) · Slow Push · Pull Back · Drift Left/Right · Tilt Up/Down · Breathe · Beat Pulse (cues-driven scale bumps) · Parallax Ken · Whip Reveal · Rotate Drift · Dolly Push+Pan · Handheld Float · Settle+Still.

**Craft rules.** Consecutive segments alternate horizontal direction. `beat_pulse` requires a cue file. Hold ≤ 5s: calmer motions (`breathe`, `settle_still`); ≥ 5s: `reveal_zoom` or `dolly_push_pan`. The final segment under lyrics wants `settle_still`.

## Overlays ×15  (`presets/overlays.json`)

Film Grain (animated, 12fps regen) · Light Leak · Dust Motes · Bokeh Drift · Vignette Soft/Deep · Halation Bloom · Rain Streaks · Snow Drift · Hearts Float · Sparkle Field · Paper Texture · Old Film Scratches · Prism Flare · Confetti Pop (one-shot burst).

**Own graphics generation:** every texture is synthesized by `scripts/graphics_gen.py` (numpy+PIL, deterministic seeds) into `assets/gen/*.png`. Components prefer the PNG and fall back to CSS/SVG. Adding an overlay = new `gen` id here + a `graphics_gen` function + an `OverlayLayer` case.

**Craft rules.** Max 3 overlays concurrently. Grain is house law (auto-appended unless a matte texture exists). Weather (rain/snow) + grain + vignette is the ceiling.

## Vibe packs ×6  (`presets/vibes.json`)

| pack | transition | typography | grade | layout | motion | overlays |
|------|-----------|------------|-------|--------|--------|----------|
| `romantic_nostalgia` | film_dissolve (+heartbeat_cut) | golden_retro | warm_film | contain_blur | reveal_zoom | grain, vignette, leak |
| `wedding_elegance` | luma_fade | midnight_serif | golden_hour | arch_frame | slow_push | grain, bokeh, vignette |
| `travel_adventure` | mask_wipe (+zoom_punch) | editorial_caps | teal_orange | cover_fill | dolly_push_pan | grain, vignette |
| `retro_super8` | film_burn (+film_gate) | script_shadow | vintage_70s | film_bars | handheld_float | grain, scratches, leak, dust |
| `y2k_cam` | glitch_cut (+prismatic) | neon_glow | pastel_dream | full_bleed_tilt | whip_reveal | sparkle, grain |
| `moody_noir` | ink_bleed (+blur_dissolve) | cinema_title | bw_noir | film_bars | settle_still | vignette_deep, grain, paper |

A vibe is a *starting point*, never a cage — any field in `edit_config.json` overrides it.

---

## Governance for agents

```bash
npm run presets:check                      # counts/ids/docs invariant (15-15 + 6)
python3 scripts/preset_dev.py stats        # coverage report
python3 scripts/preset_dev.py new transitions --name "Velvet Fade"
python3 scripts/preset_dev.py validate transitions cand.json
python3 scripts/feedback_loop.py learn     # which presets humans actually loved
```

The catalog's count targets live in `engine/checkPresets.ts`. To grow deliberately, bump the target there **and** add the presets in the same PR — the check fails otherwise. Ratings from `feedback_loop.py` feed `build/preset_scores.json`; an `auto` style prefers high-score presets. That is the self-improvement loop: *render → rate → learn → better defaults*.
