# Agent Loop — render → rate → learn → better defaults

The self-improvement loop in one page.

```
   ┌─────────────────────────────────────────────────────────┐
   │  edit_config.json ──► build_timeline ──► render ──► QC  │
   │        ▲                                     │          │
   │        │                              human rates        │
   │        │                                     │          │
   │   preset_scores.json ◄── feedback.jsonl ◄───┘          │
   │        │                                               │
   │        └── style:"auto" prefers high-score presets ────┘
   └─────────────────────────────────────────────────────────┘
```

## 1. Rate

After a human watches a render:

```bash
python3 scripts/feedback_loop.py rate out/film.mp4 5 --note "exactly the golden feel"
python3 scripts/feedback_loop.py rate out/film.mp4 2 --preset grade:faded_film --note "too washed"
```

- Whole-film rating attributes to **every preset used** in that timeline (read from `build/data.json`).
- `--preset cat:id` focuses the rating (weighs double) on the suspect preset.
- Notes append to `LEARNINGS.md` — qualitative memory for agents.

## 2. Learn

```bash
python3 scripts/feedback_loop.py learn
```

Produces `build/preset_scores.json`: per-preset `mean`, sample count `n`, and a **Bayesian-shrunk score** `(sum + prior·2) / (n + 2)` — a preset with one 5★ rating scores ~4.0, not 5.0, so small samples can't dominate.

## 3. Use

- `feedback_loop.py recommend` prints current favourites per category.
- When `edit_config.json` sets `style: {"vibe": "auto"}` (or omits overrides), the timeline builder consults scores: top presets lead the pools. *(Hook point: `resolve_style()` — currently returns catalog defaults for `auto`; wire scores in when the loop has ≥ 20 ratings.)*

## Design commitments

1. **No silent drift.** Scores only matter when explicitly consumed; a fresh clone renders identically to a veteran one.
2. **Critique ≠ veto.** Low scores never remove a preset from the catalog — they only demote it from `auto` selection. Human curation (PR against `presets/`) is the only add/remove path.
3. **Everything inspectable.** `feedback.jsonl` is append-only JSONL; scores are a plain JSON file; LEARNINGS.md is readable prose.
