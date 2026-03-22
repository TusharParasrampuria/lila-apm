# LILA BLACK Match Visualizer

Interactive React + Leaflet app for exploring LILA BLACK match telemetry on minimap overlays.

## What This Repo Contains

- `src/` - React UI, filters, timeline playback, legend, and map layers
- `public/` - static assets served by Vite, including generated match JSON and minimaps for the published app
- `scripts/` - local Python utilities for preprocessing raw telemetry and syncing frontend-ready data
- `DATASET.md` - reference notes about the original telemetry dataset and map coordinate system

## Local Development

This project is intended to be run from WSL for Node work.

```bash
cd /mnt/c/Users/tusha/Downloads/job/lila-games/lila-apm
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Preview build locally:

```bash
npm run preview
```

## Data Pipeline

The deployed frontend reads pre-generated JSON from `public/data/` and `public/dataIndex.json`.

If you update the raw telemetry or regenerate match files locally:

```bash
./venv/bin/python scripts/preprocess.py
./venv/bin/python scripts/generate_public_data.py
```

Or just sync the published data index and copied JSON:

```bash
npm run data:sync
```

## Vercel Deployment

This repo is ready for Vercel as a Vite static app.

Build settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

`vercel.json` is included so these settings are explicit in the repo.

## Publishing Notes

- Large raw source folders such as `February_*`, `output/`, `minimaps/`, `venv/`, and `node_modules/` are ignored by Git.
- The app should be published with the generated frontend assets in `public/`, not the raw telemetry source folders.
- If you want to share the original dataset separately, keep using `DATASET.md` as the reference document.
