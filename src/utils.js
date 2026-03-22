export const EVENT_COLORS = {
  kill: "red",
  death: "black",
  loot: "yellow",
  storm: "blue",
  storm_death: "blue",
  position: "green",
};

export function normalizedToPixel(xNorm, yNorm, width, height) {
  return {
    x: xNorm * width,
    y: yNorm * height,
  };
}

export function mapIdToMinimapPath(mapId) {
  if (!mapId) return null;
  if (mapId === "Lockdown") return `/minimaps/${mapId}_Minimap.jpg`;
  return `/minimaps/${mapId}_Minimap.png`;
}

export function getMatchId(filename) {
  return filename
    .replace(".json", "")
    .split(".")[0]
    .replace("match_", "");
}
