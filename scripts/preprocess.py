import argparse
import json
import os
from typing import Dict, List, Optional

import pandas as pd
import pyarrow.parquet as pq


# Map config taken from README "Maps & Minimaps" section.
# We transform world (x, z) to normalized minimap UV:
#   u = (x - origin_x) / scale
#   v = (z - origin_z) / scale
# Then flip vertical axis for top-left image origin:
#   y_norm = 1 - v
MAP_CONFIG = {
    "AmbroseValley": {"scale": 900.0, "origin_x": -370.0, "origin_z": -473.0},
    "GrandRift": {"scale": 581.0, "origin_x": -290.0, "origin_z": -290.0},
    "Lockdown": {"scale": 1000.0, "origin_x": -500.0, "origin_z": -500.0},
}

# Canonical, frontend-friendly event names.
EVENT_MAP = {
    "Position": "position",
    "BotPosition": "position",
    "Kill": "kill",
    "Killed": "death",
    "BotKill": "kill",
    "BotKilled": "death",
    "KilledByStorm": "storm_death",
    "Loot": "loot",
}


def decode_event(value) -> Optional[str]:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def infer_is_bot(user_id_value) -> bool:
    user_id = str(user_id_value) if user_id_value is not None else ""
    return user_id.isdigit()


def world_to_normalized_xy(x: float, z: float, map_id: str) -> Optional[Dict[str, float]]:
    config = MAP_CONFIG.get(map_id)
    if config is None:
        return None

    u = (x - config["origin_x"]) / config["scale"]
    v = (z - config["origin_z"]) / config["scale"]

    return {
        "x": float(max(0.0, min(1.0, u))),
        "y": float(max(0.0, min(1.0, 1.0 - v))),
    }


def collect_parquet_files(input_root: str) -> List[str]:
    files = []
    for root, _, filenames in os.walk(input_root):
        for filename in filenames:
            # Telemetry files are parquet but named with ".nakama-0" suffix.
            if filename.endswith(".nakama-0"):
                files.append(os.path.join(root, filename))
    return files


def load_all_data(file_paths: List[str]) -> pd.DataFrame:
    required_columns = ["user_id", "match_id", "map_id", "x", "z", "ts", "event"]
    frames = []
    schema_logged = False

    for path in file_paths:
        try:
            table = pq.read_table(path)
            df = table.to_pandas()

            if not schema_logged:
                print(f"[DEBUG] Inspecting parquet schema from: {path}")
                print(f"[DEBUG] Available columns: {list(df.columns)}")
                print("[DEBUG] Sample raw rows:")
                print(df.head(5))
                schema_logged = True

            missing = [c for c in required_columns if c not in df.columns]
            if missing:
                print(f"[WARN] Skipping {path}: missing columns {missing}")
                continue
            frames.append(df[required_columns].copy())
        except Exception as exc:
            print(f"[WARN] Skipping unreadable parquet file: {path} ({exc})")

    if not frames:
        return pd.DataFrame(columns=required_columns)

    return pd.concat(frames, ignore_index=True)


def normalize_relative_time(series: pd.Series) -> pd.Series:
    print("[DEBUG] Raw ts sample:")
    print(series.head())
    print(f"[DEBUG] Raw ts dtype: {series.dtype}")

    # README says ts is "timestamp (ms)" and represents elapsed time within the match.
    # Parquet may load that as datetime64[ms]/[us]/[ns], so scale based on the actual dtype unit.
    if pd.api.types.is_datetime64_any_dtype(series):
        dtype_str = str(series.dtype)
        if "[ms]" in dtype_str:
            divisor = 1_000.0
            unit_label = "milliseconds"
        elif "[us]" in dtype_str:
            divisor = 1_000_000.0
            unit_label = "microseconds"
        else:
            divisor = 1_000_000_000.0
            unit_label = "nanoseconds"

        normalized = series.astype("int64") / divisor
        print(f"[DEBUG] Converted datetime64 ts to relative seconds from {unit_label}.")
    else:
        numeric_series = pd.to_numeric(series, errors="coerce")
        normalized = numeric_series / 1_000.0
        print("[DEBUG] Converted numeric ts from milliseconds to seconds.")

    print("[DEBUG] Normalized time sample (seconds):")
    print(normalized.head())
    return normalized


def preprocess(df: pd.DataFrame) -> Dict[str, Dict[str, Dict]]:
    if df.empty:
        return {}

    # Treat ts as relative numeric time and remove invalid rows.
    df["t"] = normalize_relative_time(df["ts"])
    df = df.dropna(subset=["t", "match_id", "map_id", "user_id"])
    if df.empty:
        return {}

    # Normalize per match so each match starts at t=0.
    df["t"] = df["t"] - df.groupby("match_id")["t"].transform("min")
    df["t"] = df["t"].fillna(0).round(3)

    print("[DEBUG] Time delta summary:")
    print(df["t"].describe())
    print("[DEBUG] Raw/normalized t sample:")
    print(df[["ts", "t"]].head(10))

    match_duration = df.groupby("match_id")["t"].max().sort_values(ascending=False)
    print("[DEBUG] Match duration summary:")
    print(match_duration.describe())
    print("[DEBUG] Top 10 matches by duration:")
    print(match_duration.head(10))

    match_row_counts = df.groupby("match_id").size().sort_values(ascending=False)
    print("[DEBUG] Top 10 matches by row count:")
    print(match_row_counts.head(10))

    if not match_duration.empty:
        longest_match_id = match_duration.index[0]
        longest_match_rows = (
            df.loc[df["match_id"] == longest_match_id, ["match_id", "ts", "t", "user_id", "event"]]
            .sort_values("t")
            .head(20)
        )
        print(f"[DEBUG] Sample rows from longest-duration match: {longest_match_id}")
        print(longest_match_rows)

    df["event_raw"] = df["event"].apply(decode_event)
    df["event_type"] = df["event_raw"].map(EVENT_MAP)
    df["is_bot"] = df["user_id"].apply(infer_is_bot)

    unknown_events = sorted({e for e in df["event_raw"].dropna().unique() if e not in EVENT_MAP})
    for ev in unknown_events:
        print(f"[WARN] Unknown event type encountered (skipping): {ev}")

    # Keep only known events and valid coordinates.
    df = df.dropna(subset=["event_type", "x", "z"])
    if df.empty:
        return {}

    output: Dict[str, Dict[str, Dict]] = {}

    for _, row in df.sort_values(["map_id", "match_id", "t"]).iterrows():
        map_id = str(row["map_id"])
        match_id = str(row["match_id"])

        coords = world_to_normalized_xy(float(row["x"]), float(row["z"]), map_id)
        if coords is None:
            print(f"[WARN] Unknown map_id (skipping row): {map_id}")
            continue

        event_obj = {
            "t": float(row["t"]),
            "x": round(coords["x"], 6),
            "y": round(coords["y"], 6),
            "type": str(row["event_type"]),
            "is_bot": bool(row["is_bot"]),
            "player_id": str(row["user_id"]),
        }

        output.setdefault(map_id, {})
        output[map_id].setdefault(match_id, {"match_id": match_id, "map": map_id, "events": []})
        output[map_id][match_id]["events"].append(event_obj)

    return output


def write_output(grouped_data: Dict[str, Dict[str, Dict]], output_root: str) -> None:
    os.makedirs(output_root, exist_ok=True)

    # If a map/match has no events after filtering, no file is generated.
    # This keeps output compact and aligned with frontend usage.
    for map_id, matches in grouped_data.items():
        map_dir = os.path.join(output_root, map_id)
        os.makedirs(map_dir, exist_ok=True)

        for match_id, payload in matches.items():
            out_path = os.path.join(map_dir, f"match_{match_id}.json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))


def main():
    parser = argparse.ArgumentParser(description="Preprocess LILA BLACK parquet telemetry into frontend JSON.")
    parser.add_argument("--input", default=".", help="Root folder containing day folders and parquet files.")
    parser.add_argument("--output", default="output", help="Output folder for grouped JSON files.")
    args = parser.parse_args()

    parquet_files = collect_parquet_files(args.input)
    if not parquet_files:
        print("[INFO] No parquet-like files found.")
        return

    print(f"[INFO] Found {len(parquet_files)} files. Loading...")
    df = load_all_data(parquet_files)
    if df.empty:
        print("[INFO] No usable rows found.")
        return

    grouped = preprocess(df)
    if not grouped:
        print("[INFO] No events after filtering/normalization.")
        return

    write_output(grouped, args.output)
    total_matches = sum(len(v) for v in grouped.values())
    print(f"[INFO] Wrote {total_matches} match files to: {args.output}")


if __name__ == "__main__":
    main()
