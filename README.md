# LILA BLACK Match Visualizer

Interactive React + Leaflet app for replaying LILA BLACK match telemetry on top of minimap images. The app supports timeline playback, date filtering, multi-select filters for event types and actor types, distinct bot/player markers, path rendering, and a kill heatmap overlay.

## Tech Stack

- React 18
- Vite 5
- Leaflet + React Leaflet
- `leaflet.heat` for kill heatmaps
- Python 3.12 utilities for telemetry preprocessing
- PyArrow + pandas for parquet ingestion

## Repo Layout

- `src/` - UI, map rendering, dropdown filters, legend, and playback logic
- `public/data/` - generated per-match JSON files used by the frontend
- `public/minimaps/` - committed deployable minimap images
- `scripts/` - preprocessing and asset sync utilities
- `DATASET.md` - raw dataset and coordinate reference notes
- `ARCHITECTURE.md` - one-page system overview
- `INSIGHTS.md` - game observations backed by the processed data

## Requirements

- Node.js 18+
- npm 9+
- WSL recommended for Node commands in this workspace
- Python 3.12 with the local `venv/` if you want to regenerate data

## Local Setup

Install frontend dependencies:

```bash
npm install
```

Start the frontend locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Environment Variables

None required for the current app.

The project is fully static at runtime. All match data and minimaps are served from `public/`.

## Data Regeneration

Only needed if you want to rebuild the frontend-ready data from the raw telemetry folders.

Install Python dependencies inside the local venv if needed:

```bash
./venv/bin/pip install -r requirements.txt
```

Rebuild processed match files from the raw telemetry:

```bash
./venv/bin/python scripts/preprocess.py
```

Refresh the deployable frontend assets and index:

```bash
npm run data:sync
```

## Deployment

This repo is configured for Vercel as a Vite static app.

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Notes:

- `vercel.json` pins the build and output settings
- `.vercelignore` excludes Python and raw local-only artifacts from upload
- `public/minimaps/` and `public/data/` must be committed if you want the deployed app to show maps and match data

## Additional Docs

- `ARCHITECTURE.md`
- `INSIGHTS.md`
- `DATASET.md`
