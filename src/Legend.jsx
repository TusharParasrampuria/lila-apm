function LegendItem({ color, label, gradient = null }) {
  return (
    <div className="legend-item">
      {gradient ? (
        <span
          className="legend-swatch legend-swatch-gradient"
          style={{ background: gradient }}
        />
      ) : (
        <span className="legend-swatch" style={{ backgroundColor: color }} />
      )}
      <span>{label}</span>
    </div>
  );
}

function MarkerLegendItem({ variant, label }) {
  return (
    <div className="legend-item">
      <span
        className={`legend-marker legend-marker-${variant}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}

export default function Legend({ showHeatmap }) {
  return (
    <aside className="legend">
      <div className="legend-title">Legend</div>
      <MarkerLegendItem variant="player" label="Player marker" />
      <MarkerLegendItem variant="bot" label="Bot marker" />
      <div className="legend-divider" />
      <LegendItem color="red" label="Kill" />
      <LegendItem color="black" label="Death" />
      <LegendItem color="yellow" label="Loot" />
      <LegendItem color="blue" label="Storm" />
      {showHeatmap && (
        <>
          <div className="legend-divider" />
          <LegendItem
            label="Low to High Activity"
            gradient="linear-gradient(90deg, hotpink 0%, purple 100%)"
          />
        </>
      )}
    </aside>
  );
}
