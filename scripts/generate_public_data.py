import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT / "output"
PUBLIC_DATA_ROOT = ROOT / "public" / "data"
DATA_INDEX_PATH = ROOT / "public" / "dataIndex.json"
RAW_DAY_GLOB = "February_*"


def build_match_dates() -> dict[str, str]:
    match_dates: dict[str, str] = {}

    for day_dir in sorted(path for path in ROOT.glob(RAW_DAY_GLOB) if path.is_dir()):
        for raw_file in day_dir.glob("*.nakama-0"):
            parts = raw_file.name.split("_", 1)
            if len(parts) != 2:
                continue

            match_filename = f"match_{parts[1]}.json"
            match_dates.setdefault(match_filename, day_dir.name)

    return match_dates


def copy_match_files() -> dict[str, list[str]]:
    maps: dict[str, list[str]] = {}

    PUBLIC_DATA_ROOT.mkdir(parents=True, exist_ok=True)

    for map_dir in sorted(path for path in SOURCE_ROOT.iterdir() if path.is_dir()):
        destination_dir = PUBLIC_DATA_ROOT / map_dir.name
        if destination_dir.exists():
            shutil.rmtree(destination_dir)
        destination_dir.mkdir(parents=True, exist_ok=True)

        match_files = sorted(path.name for path in map_dir.glob("*.json"))
        for filename in match_files:
            shutil.copy2(map_dir / filename, destination_dir / filename)

        maps[map_dir.name] = match_files

    return maps


def write_data_index(maps: dict[str, list[str]], match_dates: dict[str, str]) -> None:
    dates = sorted(set(match_dates.values()))
    payload = {"maps": maps, "dates": dates, "matchDates": match_dates}
    DATA_INDEX_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    if not SOURCE_ROOT.exists():
        raise FileNotFoundError(f"Missing source directory: {SOURCE_ROOT}")

    maps = copy_match_files()
    match_dates = build_match_dates()
    write_data_index(maps, match_dates)

    total_matches = sum(len(matches) for matches in maps.values())
    print(f"Synced {total_matches} matches across {len(maps)} maps.")


if __name__ == "__main__":
    main()
