#!/usr/bin/env python3
"""rebrand.py — one-command rebranding. The brand lives in BRAND.json only.

  python3 scripts/rebrand.py --name "NewName" --tagline "..." --monogram "NN"

Every generated file (build/data.json meta.brand) and doc references derive
from BRAND.json at build time, so this is the ONLY place to touch.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "BRAND.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name")
    ap.add_argument("--tagline")
    ap.add_argument("--monogram")
    ap.add_argument("--version")
    args = ap.parse_args()

    brand = json.loads(BRAND.read_text())
    old = brand["name"]
    if args.name:
        brand["name"] = args.name
        brand["slug"] = re.sub(r"[^a-z0-9]+", "-", args.name.lower()).strip("-")
        brand["compositionId"] = "Loom"  # composition id is an API, keep stable
    if args.tagline:
        brand["tagline"] = args.tagline
    if args.monogram:
        brand["monogram"] = args.monogram
    if args.version:
        brand["version"] = args.version
    BRAND.write_text(json.dumps(brand, indent=2) + "\n")
    print(f"brand updated: {old} -> {brand['name']}")
    print("regenerated artifacts pick this up on the next `make timeline` / render.")


if __name__ == "__main__":
    main()
