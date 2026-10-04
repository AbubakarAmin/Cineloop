#!/usr/bin/env bash
# loom.sh — one command from assets to finished film.
#   ./loom.sh                full pipeline: probe -> beats -> graphics -> timeline -> render -> qc
#   ./loom.sh timeline       only rebuild build/data.json (fast, safe)
#   ./loom.sh preview        open Remotion Studio
#   ./loom.sh qc out/x.mp4   QC an existing render
set -euo pipefail
cd "$(dirname "$0")"

CMD="${1:-all}"

banner() { printf "\n\033[1;35m▸ %s\033[0m\n" "$1"; }

if [ "$CMD" = "preview" ]; then
  exec npx remotion studio --props=build/data.json
fi

if [ "$CMD" = "qc" ]; then
  exec python3 scripts/qc_check.py "${2:-out/film.mp4}"
fi

banner "probe media"
python3 scripts/probe_media.py

banner "detect beats"
python3 scripts/beat_detect.py

banner "generate graphics textures"
python3 scripts/graphics_gen.py

banner "build timeline"
python3 scripts/build_timeline.py

if [ "$CMD" = "timeline" ]; then
  echo "timeline only — open ./loom.sh preview to inspect"
  exit 0
fi

OUT="${OUT:-out/film.mp4}"
banner "render -> $OUT"
mkdir -p out
npx remotion render Loom "$OUT" --props=build/data.json

banner "quality check"
python3 scripts/qc_check.py "$OUT"

echo ""
echo "✔ done: $OUT"
