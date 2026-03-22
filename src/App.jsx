import { useEffect, useMemo, useState } from "react";
import Legend from "./Legend";
import MapView from "./MapView";
import { getMatchId, mapIdToMinimapPath } from "./utils";

const DATA_INDEX_URL = "/dataIndex.json";
const STRETCHED_MATCH_DURATION = 60;
const EVENT_FILTERS = [
  { key: "position", label: "Position" },
  { key: "kill", label: "Kills" },
  { key: "death", label: "Deaths" },
  { key: "loot", label: "Loot" },
  { key: "storm_death", label: "Storm" },
];

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildDefaultFilters() {
  return {
    position: true,
    kill: true,
    death: true,
    loot: true,
    storm_death: true,
  };
}

export default function App() {
  const [mapsIndex, setMapsIndex] = useState(null);
  const [matchDates, setMatchDates] = useState({});
  const [indexError, setIndexError] = useState("");

  const [selectedMap, setSelectedMap] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMatch, setSelectedMatch] = useState("");

  const [events, setEvents] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [maxTime, setMaxTime] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [eventFilters, setEventFilters] = useState(buildDefaultFilters);

  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const res = await fetch(DATA_INDEX_URL);
        if (!res.ok) throw new Error(`Failed to load ${DATA_INDEX_URL}`);
        const data = await res.json();
        if (cancelled) return;
        const maps = data.maps || {};
        const nextMatchDates = data.matchDates || {};
        setMapsIndex(maps);
        setMatchDates(nextMatchDates);
        const mapIds = Object.keys(maps);
        if (mapIds.length === 0) throw new Error("dataIndex.json has no maps");
        const firstMap = mapIds[0];
        setSelectedMap(firstMap);
      } catch (e) {
        if (!cancelled) setIndexError(e.message || "Failed to load data index");
      }
    }
    loadIndex();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapOptions = mapsIndex ? Object.keys(mapsIndex) : [];
  const allMatchOptions = mapsIndex && selectedMap ? mapsIndex[selectedMap] || [] : [];
  const dateOptions = useMemo(() => {
    if (!allMatchOptions.length) return [];
    return [...new Set(allMatchOptions.map((match) => matchDates[match]).filter(Boolean))];
  }, [allMatchOptions, matchDates]);
  const matchOptions = useMemo(() => {
    if (!selectedDate) return allMatchOptions;
    return allMatchOptions.filter((match) => matchDates[match] === selectedDate);
  }, [allMatchOptions, matchDates, selectedDate]);

  useEffect(() => {
    if (!mapsIndex || !selectedMap) return;
    setSelectedDate((prev) => {
      if (!prev) return "";
      return dateOptions.includes(prev) ? prev : "";
    });
  }, [mapsIndex, selectedMap, dateOptions]);

  useEffect(() => {
    if (!matchOptions.length) {
      setSelectedMatch("");
      return;
    }

    setSelectedMatch((prev) => (matchOptions.includes(prev) ? prev : matchOptions[0]));
  }, [matchOptions]);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setMaxTime(0);
  }, [selectedMatch, setCurrentTime, setIsPlaying, setMaxTime]);

  useEffect(() => {
    if (selectedMatch) return;
    setEvents([]);
    setMatchInfo(null);
    setLoadError("");
    setMatchLoading(false);
  }, [selectedMatch]);

  useEffect(() => {
    if (!selectedMap || !selectedMatch) return;
    setMatchLoading(true);
    setLoadError("");
    let cancelled = false;
    async function loadMatch() {
      try {
        const url = `/data/${selectedMap}/${selectedMatch}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load ${url}`);
        const data = await res.json();
        if (cancelled) return;
        setMatchInfo({ match_id: data.match_id, map: data.map });
        const nextEvents = Array.isArray(data.events) ? data.events : [];
        console.log("Sample events:", nextEvents.slice(0, 5));
        setEvents(nextEvents);
        setLoadError("");
      } catch (e) {
        if (!cancelled) setLoadError(e.message || "Failed to load match");
      } finally {
        if (!cancelled) setMatchLoading(false);
      }
    }
    loadMatch();
    return () => {
      cancelled = true;
    };
  }, [selectedMap, selectedMatch]);

  const minimapUrl = useMemo(() => mapIdToMinimapPath(matchInfo?.map), [matchInfo]);
  const scaledEventTime = useMemo(() => {
    if (maxTime <= 0) return 0;
    return (currentTime / STRETCHED_MATCH_DURATION) * maxTime;
  }, [currentTime, maxTime]);
  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        if (event.t > scaledEventTime) return false;
        return !!eventFilters[event.type];
      }),
    [events, scaledEventTime, eventFilters]
  );

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);

    if (events.length === 0) {
      setMaxTime(0);
      return;
    }

    const timedEvents = events.filter((event) => Number.isFinite(event.t));
    const nextMaxTime = timedEvents.length
      ? Math.max(...timedEvents.map((event) => event.t))
      : 0;

    setMaxTime(nextMaxTime);

    if (nextMaxTime <= 0) {
      console.warn("Timeline maxTime is invalid for this match.", {
        nextMaxTime,
        sampleEvents: events.slice(0, 5),
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isPlaying) return;
    if (maxTime <= 0) {
      console.warn("Playback blocked because maxTime is not valid.", { maxTime });
      setIsPlaying(false);
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentTime((time) => {
        if (time >= STRETCHED_MATCH_DURATION) {
          window.clearInterval(interval);
          setIsPlaying(false);
          return STRETCHED_MATCH_DURATION;
        }
        return Math.min(time + 0.1, STRETCHED_MATCH_DURATION);
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [isPlaying, maxTime]);

  if (indexError) {
    return <div className="status">{indexError}</div>;
  }

  if (!mapsIndex || !selectedMap) {
    return <div className="status">Loading data index...</div>;
  }

  return (
    <div className="app">
      <header className="toolbar">
        <label>
          Map{" "}
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
          >
            {mapOptions.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date{" "}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">All Dates</option>
            {dateOptions.map((date) => (
              <option key={date} value={date}>
                {date.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Match{" "}
          <select
            value={selectedMatch}
            onChange={(e) => setSelectedMatch(e.target.value)}
            disabled={!matchOptions.length}
          >
            {matchOptions.map((name) => (
              <option key={name} value={name}>
                {getMatchId(name)}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle-inline">
          <input
            type="checkbox"
            checked={showHeatmap}
            onChange={(e) => setShowHeatmap(e.target.checked)}
          />
          Show Kill Heatmap
        </label>
        <div className="filter-group">
          {EVENT_FILTERS.map((filter) => (
            <label key={filter.key} className="toggle-inline">
              <input
                type="checkbox"
                checked={eventFilters[filter.key]}
                onChange={(e) =>
                  setEventFilters((current) => ({
                    ...current,
                    [filter.key]: e.target.checked,
                  }))
                }
              />
              {filter.label}
            </label>
          ))}
        </div>
      </header>
      <main className="map-area">
        {matchLoading && <div className="status">Loading match...</div>}
        {!matchLoading && loadError && <div className="status">{loadError}</div>}
        {!matchLoading && !loadError && !matchOptions.length && (
          <div className="status">No matches available for this date.</div>
        )}
        {!matchLoading && !loadError && minimapUrl && (
          <>
            <MapView
              key={`${selectedMap}/${selectedMatch}`}
              minimapUrl={minimapUrl}
              events={visibleEvents}
              pathEvents={visibleEvents}
              showHeatmap={showHeatmap}
            />
            <Legend showHeatmap={showHeatmap} />
          </>
        )}
        {!matchLoading && !loadError && !minimapUrl && (
          <div className="status">Unknown map in match file.</div>
        )}
      </main>
      <footer className="timeline-controls">
        <button
          type="button"
          className="timeline-button"
          onClick={() => {
            if (currentTime >= STRETCHED_MATCH_DURATION) {
              setCurrentTime(0);
            }
            setIsPlaying((playing) => !playing);
          }}
          disabled={!events.length}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div className="timeline-slider-wrap">
          <input
            className="timeline-slider"
            type="range"
            min={0}
            max={STRETCHED_MATCH_DURATION}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentTime(Number(e.target.value));
            }}
            disabled={!events.length}
          />
          <div className="timeline-meta">
            <span>Time: {formatTime(currentTime)}</span>
            <span>Max: {formatTime(STRETCHED_MATCH_DURATION)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
