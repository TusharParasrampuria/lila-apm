import { useEffect } from "react";
import { ImageOverlay, MapContainer, useMap } from "react-leaflet";
import L, { CRS } from "leaflet";
import "leaflet.heat";

const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;
const MAX_PATH_POINTS = 500;
const PLAYER_PATH_COLORS = [
  "#e63946",
  "#1d3557",
  "#2a9d8f",
  "#f4a261",
  "#6a4c93",
  "#ff006e",
  "#3a86ff",
  "#8338ec",
  "#ffbe0b",
  "#fb5607",
  "#43aa8b",
  "#577590",
];

/**
 * Bounds passed to ImageOverlay / map (CRS.Simple: [lat,lng] = [y,x] in pixels).
 * Note: Leaflet builds LatLngBounds by min/max of the two corners, so
 * [[H,0],[0,W]] and [[0,0],[H,W]] are the SAME axis-aligned rectangle —
 * corner order alone does not flip Y.
 *
 * Default L.CRS.Simple uses transformation (1,0,-1,0), which negates Y vs a
 * top-left image origin. We extend Simple with (1,0,1,0) so normalized
 * y (already corrected in preprocessing) maps to the minimap without an
 * extra vertical flip. Marker math stays [y_pixel, x_pixel] unchanged.
 */
const BOUNDS = [
  [IMAGE_HEIGHT, 0],
  [0, IMAGE_WIDTH],
];

const CRS_MINIMAP = L.extend({}, CRS.Simple, {
  transformation: L.transformation(1, 0, 1, 0),
});

/** Event type → stroke/fill color (minimal styling for canvas). */
function getColor(type) {
  switch (type) {
    case "kill":
      return "red";
    case "death":
      return "black";
    case "loot":
      return "yellow";
    case "storm":
    case "storm_death":
      return "blue";
    default:
      return "green";
  }
}

/**
 * Build movement paths: group position events by player, sort by t, polyline if ≥2 points.
 */
function limitPoints(points, maxPoints) {
  if (points.length <= maxPoints) return points;

  const stride = Math.ceil(points.length / maxPoints);
  const limited = [];

  for (let i = 0; i < points.length; i += stride) {
    limited.push(points[i]);
  }

  const lastPoint = points[points.length - 1];
  if (limited[limited.length - 1] !== lastPoint) {
    limited.push(lastPoint);
  }

  return limited;
}

function getPlayerColor(playerId) {
  let hash = 0;

  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0;
  }

  return PLAYER_PATH_COLORS[hash % PLAYER_PATH_COLORS.length];
}

function buildPlayerPaths(events) {
  /** @type {Record<string, typeof events>} */
  const playerEventsMap = {};
  /** @type {Record<string, boolean>} */
  const playerBotMap = {};

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.type !== "position" || !event.player_id) continue;

    if (!playerEventsMap[event.player_id]) {
      playerEventsMap[event.player_id] = [];
      playerBotMap[event.player_id] = !!event.is_bot;
    }

    playerEventsMap[event.player_id].push(event);
  }

  const paths = [];

  for (const playerId of Object.keys(playerEventsMap)) {
    const playerEvents = [...playerEventsMap[playerId]];
    if (playerEvents.length < 2) continue;

    playerEvents.sort((a, b) => a.t - b.t);

    const limitedEvents = limitPoints(playerEvents, MAX_PATH_POINTS);
    const points = limitedEvents.map((event) => {
      const x_pixel = event.x * IMAGE_WIDTH;
      const y_pixel = event.y * IMAGE_HEIGHT;
      return [y_pixel, x_pixel];
    });

    if (points.length < 2) continue;

    paths.push({
      latlngs: points,
      player_id: playerId,
      is_bot: playerBotMap[playerId],
      color: getPlayerColor(playerId),
    });
  }

  return paths;
}

function buildKillHeatPoints(events) {
  const points = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.type !== "kill") continue;

    const x_pixel = event.x * IMAGE_WIDTH;
    const y_pixel = event.y * IMAGE_HEIGHT;
    points.push([y_pixel, x_pixel, 1]);
  }

  return points;
}

/**
 * Draws player paths (polylines) + event markers with Leaflet API only.
 */
function CanvasMarkersLayer({ events, pathEvents, showHeatmap }) {
  const map = useMap();

  useEffect(() => {
    const layerGroup = L.layerGroup().addTo(map);

    const paths = buildPlayerPaths(pathEvents);
    for (let p = 0; p < paths.length; p++) {
      const { latlngs, is_bot, color, player_id } = paths[p];
      L.polyline(latlngs, {
        color,
        weight: is_bot ? 1 : 2,
        opacity: is_bot ? 0.55 : 0.8,
        dashArray: is_bot ? "4 4" : null,
        interactive: false,
      })
        .bindTooltip(`Player: ${player_id}${is_bot ? " (bot)" : ""}`)
        .addTo(layerGroup);
    }

    let heatLayer = null;

    if (showHeatmap) {
      const heatPoints = buildKillHeatPoints(events);
      if (heatPoints.length > 0) {
        heatLayer = L.heatLayer(heatPoints, {
          radius: 25,
          blur: 20,
          maxZoom: 1,
          gradient: {
            0.1: "hotpink",
            1.0: "purple",
          },
        }).addTo(layerGroup);
      }
    } else {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const x_pixel = event.x * IMAGE_WIDTH;
        const y_pixel = event.y * IMAGE_HEIGHT;

        const color = getColor(event.type);
        L.circleMarker([y_pixel, x_pixel], {
          radius: 2,
          color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 0,
          interactive: false,
        }).addTo(layerGroup);
      }
    }

    return () => {
      if (heatLayer) {
        layerGroup.removeLayer(heatLayer);
      }
      map.removeLayer(layerGroup);
    };
  }, [map, events, pathEvents, showHeatmap]);

  return null;
}

export default function MapView({
  minimapUrl,
  events,
  pathEvents = events,
  showHeatmap = false,
}) {
  return (
    <MapContainer
      crs={CRS_MINIMAP}
      bounds={BOUNDS}
      maxBounds={BOUNDS}
      preferCanvas
      style={{ height: "100%", width: "100%" }}
      zoom={0}
      minZoom={-2}
      maxZoom={4}
      scrollWheelZoom
    >
      <ImageOverlay url={minimapUrl} bounds={BOUNDS} />
      <CanvasMarkersLayer
        events={events}
        pathEvents={pathEvents}
        showHeatmap={showHeatmap}
      />
    </MapContainer>
  );
}
