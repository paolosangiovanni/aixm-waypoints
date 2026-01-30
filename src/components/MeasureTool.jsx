import { useMemo, useState } from "react";
import { Polyline, Tooltip, Marker } from "react-leaflet";
import L from "leaflet";
import "./MeasureTool.css";

const UOM = {
  km: { label: "Km", factor: 1 / 1000, decimals: 2 },
  ft: { label: "ft", factor: 3.28084, decimals: 0 }, // cambiato da "Piedi" a "ft"
  nm: { label: "NM", factor: 1 / 1852, decimals: 2 },
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MeasureTool({ waypoints }) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [unit, setUnit] = useState("km");

  const sortedWaypoints = useMemo(() => {
    return [...waypoints].sort((a, b) =>
      a._preview.designator.localeCompare(b._preview.designator)
    );
  }, [waypoints]);

  const from = waypoints.find(w => w.id === fromId);
  const to = waypoints.find(w => w.id === toId);

  const distanceMeters = useMemo(() => {
    if (!from || !to) return null;
    return haversine(
      from._preview.lat,
      from._preview.lon,
      to._preview.lat,
      to._preview.lon
    );
  }, [from, to]);

  const distanceKm = distanceMeters ? distanceMeters / 1000 : null;

  const distance =
    distanceMeters !== null
      ? (distanceMeters * UOM[unit].factor).toFixed(UOM[unit].decimals)
      : null;

  const swapPoints = () => {
    setFromId(toId);
    setToId(fromId);
  };

  // Calcolo punto medio
  const midpoint =
    from && to
      ? [
          (from._preview.lat + to._preview.lat) / 2,
          (from._preview.lon + to._preview.lon) / 2,
        ]
      : null;

  // Funzione helper per tooltip
  const getTooltipDistance = () => {
    if (!distanceMeters) return "";
    return (distanceMeters * UOM[unit].factor).toFixed(UOM[unit].decimals) + " " + UOM[unit].label;
  };

  return (
    <>
      {/* TOOL UI */}
      <div className="measure-box">
        <h3>📏 Misura distanza</h3>

        {/* Select Punto A */}
        <select value={fromId} onChange={e => setFromId(e.target.value)}>
          <option value="">Punto A</option>
          {sortedWaypoints.map(w => (
            <option key={w.id} value={w.id}>
              {w._preview.designator}
            </option>
          ))}
        </select>

        {/* Select Punto B */}
        <select value={toId} onChange={e => setToId(e.target.value)}>
          <option value="">Punto B</option>
          {sortedWaypoints.map(w => (
            <option key={w.id} value={w.id} disabled={w.id === fromId}>
              {w._preview.designator}
            </option>
          ))}
        </select>

        <div className="measure-row">
          <select value={unit} onChange={e => setUnit(e.target.value)}>
            {Object.entries(UOM).map(([k, u]) => (
              <option key={k} value={k}>
                {u.label}
              </option>
            ))}
          </select>

          <button
            className="swap-btn"
            onClick={swapPoints}
            disabled={!from || !to}
            title="Inverti A ↔ B"
          >
            ↔
          </button>
        </div>

        {/* Messaggio di errore se stessi punti */}
        {from && to && from.id === to.id && (
          <div className="measure-error">
            ⚠️ Seleziona due punti diversi
          </div>
        )}

        {/* Risultato distanza */}
        {distance && from && to && from.id !== to.id && (
          <div className="measure-result">
            {distance} {UOM[unit].label}
          </div>
        )}
      </div>

      {/* POLYLINE + TOOLTIP tramite marker invisibile */}
      {from && to && from.id !== to.id && (
        <>
          <Polyline
            positions={[
              [from._preview.lat, from._preview.lon],
              [to._preview.lat, to._preview.lon],
            ]}
            color="#0c965f"
            weight={2}       // spessore minimo
            dashArray="5,5"  // linea tratteggiata
          />
          {midpoint && (
            <Marker
              position={midpoint}
              icon={L.divIcon({ className: "invisible-marker" })}
              interactive={false}
            >
              <Tooltip permanent direction="center" className="distance-tooltip">
                {getTooltipDistance()}
              </Tooltip>
            </Marker>
          )}
        </>
      )}
    </>
  );
}
