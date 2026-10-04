# Cineloom — developer + agent entry points

PHONY: all timeline render qc preview typecheck presets-check graphics clean

all: timeline render qc

timeline:
	python3 scripts/probe_media.py
	python3 scripts/beat_detect.py
	python3 scripts/build_timeline.py

graphics:
	python3 scripts/graphics_gen.py

render:
	mkdir -p out
	npx remotion render Loom out/film.mp4 --props=build/data.json

qc:
	python3 scripts/qc_check.py out/film.mp4

preview:
	npx remotion studio

typecheck:
	npx tsc

presets-check:
	npx tsx engine/checkPresets.ts

clean:
	rm -rf build/*.tmp.json out/*
