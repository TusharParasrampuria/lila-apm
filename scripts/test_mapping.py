import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.image as mpimg


EVENT_STYLE = {
    "position": {"color": "lime", "label": "Position"},
    "kill": {"color": "red", "label": "Kills"},
    "death": {"color": "black", "label": "Deaths"},
    "loot": {"color": "yellow", "label": "Loot"},
    "storm_death": {"color": "blue", "label": "Storm"},
}


def find_first_json(output_dir: Path) -> Path:
    files = sorted(output_dir.rglob("match_*.json"))
    if not files:
        raise FileNotFoundError(f"No match JSON files found in: {output_dir}")
    return files[0]


def find_minimap(map_id: str, minimaps_dir: Path) -> Path:
    candidates = [
        minimaps_dir / f"{map_id}_Minimap.png",
        minimaps_dir / f"{map_id}_Minimap.jpg",
        minimaps_dir / f"{map_id}_Minimap.jpeg",
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(f"No minimap image found for map '{map_id}' in: {minimaps_dir}")


def load_match_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Visual test for world->minimap coordinate mapping.")
    parser.add_argument("--json", default=None, help="Path to a processed match JSON file.")
    parser.add_argument("--output-dir", default="output", help="Directory containing processed JSON output.")
    parser.add_argument("--minimaps-dir", default="minimaps", help="Directory containing minimap images.")
    parser.add_argument("--max-points", type=int, default=500, help="Plot up to this many events.")
    parser.add_argument(
        "--include-position",
        action="store_true",
        help="Include movement/position events in the scatter plot.",
    )
    parser.add_argument(
        "--invert-y",
        action="store_true",
        help="Invert Y when converting normalized coordinates: y_px = H - (y * H)",
    )
    parser.add_argument(
        "--invert-x",
        action="store_true",
        help="Invert X when converting normalized coordinates: x_px = W - (x * W)",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    minimaps_dir = Path(args.minimaps_dir)
    json_path = Path(args.json) if args.json else find_first_json(output_dir)

    payload = load_match_json(json_path)
    match_id = payload.get("match_id", "unknown_match")
    map_id = payload.get("map", "unknown_map")
    events = payload.get("events", [])

    minimap_path = find_minimap(map_id, minimaps_dir)
    image = mpimg.imread(minimap_path)
    image_height, image_width = image.shape[0], image.shape[1]

    # By default we focus on sparse signal events (combat/loot/storm).
    # Use --include-position to also overlay dense movement samples.
    allowed_types = {"kill", "death", "loot", "storm_death"}
    if args.include_position:
        allowed_types.add("position")
    filtered = [e for e in events if e.get("type") in allowed_types][: args.max_points]

    xs, ys, colors = [], [], []
    for event in filtered:
        x_norm = event.get("x")
        y_norm = event.get("y")
        if x_norm is None or y_norm is None:
            continue

        x_px = image_width - (float(x_norm) * image_width) if args.invert_x else float(x_norm) * image_width
        y_px = image_height - (float(y_norm) * image_height) if args.invert_y else float(y_norm) * image_height

        xs.append(x_px)
        ys.append(y_px)
        colors.append(EVENT_STYLE[event["type"]]["color"])

    plt.figure(figsize=(10, 10))
    plt.imshow(image)
    plt.scatter(xs, ys, c=colors, s=12, alpha=0.85)
    plt.title(f"Match: {match_id} | Map: {map_id} | Points: {len(xs)}")

    legend_order = ["position", "kill", "death", "loot", "storm_death"]
    legend_handles = []
    for event_type in legend_order:
        if event_type in allowed_types:
            style = EVENT_STYLE[event_type]
            legend_handles.append(mpatches.Patch(color=style["color"], label=style["label"]))
    plt.legend(handles=legend_handles, loc="upper right")

    # Keep plot coordinates aligned to image pixel space.
    plt.xlim(0, image_width)
    plt.ylim(image_height, 0)
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()
