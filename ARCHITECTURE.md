# Architecture

## What I Built and Why

I built a static telemetry replay tool with React, Vite, Leaflet, and a small Python preprocessing layer.

- React + Vite: fast iteration, simple static deployment, and minimal runtime overhead
- Leaflet + React Leaflet: strong fit for image-based map overlays, pan/zoom, and custom layers
- `leaflet.heat`: lightweight kill heatmap support without adding a heavier geospatial stack
- Python + PyArrow + pandas: the raw data is parquet-like telemetry, so Python is the fastest path to reliable ingestion and normalization

This split keeps the deployed app static and simple while moving the heavier data wrangling into offline preprocessing.

## Data Flow

1. Raw match telemetry lives in `February_*` folders as parquet files with `.nakama-0` suffixes.
2. `scripts/preprocess.py` reads every file, decodes events, normalizes timestamps per match, maps world coordinates into normalized minimap coordinates, and writes one JSON file per match into `output/<map>/`.
3. `scripts/generate_public_data.py` copies those JSON files into `public/data/`, builds `public/dataIndex.json`, and copies minimaps into `public/minimaps/`.
4. At runtime, the React app fetches `dataIndex.json`, lets the user choose a map, date, and match, then fetches the selected match JSON.
5. The UI filters events by time, event type, and actor type, then renders paths, markers, and the optional kill heatmap.

## Coordinate Mapping Approach

This was the trickiest part because the telemetry is in game-world coordinates, while the UI uses 1024x1024 minimap images.

For each map I used three config values from the dataset notes:

- `scale`
- `origin_x`
- `origin_z`

Then I converted world coordinates `(x, z)` into normalized UV values:

```text
u = (x - origin_x) / scale
v = (z - origin_z) / scale
```

Because image origin is top-left but game space grows upward in the opposite direction, I flipped the vertical axis:

```text
y_norm = 1 - v
```

The preprocessing step stores normalized values in `[0, 1]`, and the frontend turns them into image pixels:

```text
x_pixel = x_norm * 1024
y_pixel = y_norm * 1024
```

In Leaflet, I used `CRS.Simple` plus a custom transformation so the already-corrected top-left image coordinates are not flipped a second time.

## Assumptions Made

- `ts` is relative match time, not wall-clock time, so each match is normalized to start at `t = 0`
- `y` in the raw data is elevation only, so the 2D visualization ignores it
- `BotPosition` was mapped into the same `position` frontend type so bots and players can share path rendering
- Unknown event types are skipped rather than guessed
- Match date is inferred from the raw folder (`February_10` through `February_14`) during asset sync

## Tradeoffs

| Area | Considered | Chosen | Why |
|---|---|---|---|
| Runtime data format | Read parquet in-browser vs preprocess to JSON | Preprocess to JSON | Static deploys are simpler and faster |
| Mapping precision | Full GIS-style calibration vs config-based linear transform | Config-based transform | Good enough for minimap replay and much faster to implement |
| Rendering | Draw everything as markers vs mix of paths, markers, and heatmap | Mixed layers | Better readability and performance |
| Bot visibility | Treat bots and humans the same vs separate visual identity | Separate marker shapes | Makes AI behavior distinguishable during replay |
| Deployment | Server-backed API vs static assets in `public/` | Static assets | Easier GitHub/Vercel publishing |
| Event filtering | Filter only markers vs filter all visible events | Filter visible event set | Keeps playback logic consistent across markers and heatmap |
