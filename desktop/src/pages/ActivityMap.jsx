import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from "react-leaflet";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { useUnits, useChartTheme } from "../SettingsContext";

// ── Type colors ───────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  running:             "#c8f135",
  trail_running:       "#8fc418",
  cycling:             "#4a90d9",
  indoor_cycling:      "#4a90d9",
  swimming:            "#50c878",
  open_water_swimming: "#50c878",
  walking:             "#f5a623",
  hiking:              "#e85d04",
  strength_training:   "#7b61ff",
  other:               "#888",
};

function typeColor(t) {
  if (!t) return TYPE_COLORS.other;
  const key = Object.keys(TYPE_COLORS).find(k =>
    t.toLowerCase().replace(/_/g, "").includes(k.replace(/_/g, ""))
  );
  return TYPE_COLORS[key] || TYPE_COLORS.other;
}

function fmtDuration(secs) {
  if (!secs) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtPace(speedMps, distUnit) {
  if (!speedMps || speedMps <= 0) return "—";
  const secsPerUnit = distUnit === "mi" ? 1609.344 / speedMps : 1000 / speedMps;
  const m = Math.floor(secsPerUnit / 60);
  const s = Math.round(secsPerUnit % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── FitBounds: pans/zooms map to fit the route ────────────────────────────────

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [40, 40] }
    );
  }, [points, map]);
  return null;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MapSkeleton() {
  return (
    <div style={{ margin: "-32px -40px", height: "100vh" }}>
      <div className="skeleton" style={{ height: "100%", borderRadius: 0 }} />
    </div>
  );
}

// ── Stats panel ───────────────────────────────────────────────────────────────

function StatsPanel({ activity, route, loading, onClose, distUnit, mToDist, mToElev, elevUnit, ct }) {
  const chartData = useMemo(() => {
    if (!route?.points?.length) return [];
    // Sample every ~10 points and build pace + HR series by distance
    const pts = route.points.filter((p, i) => i % 8 === 0 && p.spd > 0.5 && p.dist != null);
    return pts.map(p => ({
      dist:  +(mToDist(p.dist)).toFixed(2),
      pace:  p.spd > 0 ? +(1000 / p.spd / 60).toFixed(2) : null,  // min/km raw, convert below
      paceDisp: p.spd > 0 ? parseFloat(fmtPace(p.spd, distUnit).replace(":", ".")) : null,
      hr:    p.hr ? Math.round(p.hr) : null,
      elev:  p.elev != null ? +mToElev(p.elev).toFixed(0) : null,
    }));
  }, [route, mToDist, mToElev, distUnit]);

  const pts = route?.points || [];
  const hrVals  = pts.map(p => p.hr).filter(Boolean);
  const spdVals = pts.map(p => p.spd).filter(v => v > 0.3);
  const elevVals = pts.map(p => p.elev).filter(v => v != null);

  const avgHr  = hrVals.length  ? Math.round(hrVals.reduce((a,b) => a+b,0) / hrVals.length) : null;
  const maxHr  = hrVals.length  ? Math.round(Math.max(...hrVals)) : null;
  const avgSpd = spdVals.length ? spdVals.reduce((a,b) => a+b,0) / spdVals.length : null;
  const elevGain = elevVals.length > 1
    ? Math.round(mToElev(elevVals.reduce((gain, e, i) => {
        if (i === 0) return gain;
        const diff = e - elevVals[i-1];
        return diff > 0 ? gain + diff : gain;
      }, 0)))
    : null;

  const row = (label, value) => (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.07)",
      fontSize: "0.82rem",
    }}>
      <span style={{ color: "#888" }}>{label}</span>
      <span style={{ fontWeight: 700, color: "#e2e2e2" }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: 300,
      zIndex: 1000,
      background: "rgba(12,12,12,0.94)", backdropFilter: "blur(10px)",
      borderLeft: "1px solid rgba(255,255,255,0.1)",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: typeColor(activity.activity_type), marginBottom: 2 }}>
            {(activity.activity_type || "Activity").replace(/_/g, " ")}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#666" }}>{activity.start_time?.slice(0, 10)}</div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "#666", cursor: "pointer",
          fontSize: "1.2rem", lineHeight: 1, padding: 0, marginTop: 2,
        }}>×</button>
      </div>

      {loading && (
        <div style={{ padding: 20, color: "#666", fontSize: "0.85rem", textAlign: "center" }}>
          Loading route…
        </div>
      )}

      {!loading && route && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ marginTop: 12 }}>
            {activity.distance_meters && row("Distance", `${mToDist(activity.distance_meters).toFixed(2)} ${distUnit}`)}
            {activity.duration_secs   && row("Duration", fmtDuration(activity.duration_secs))}
            {avgSpd  && row("Avg Pace", `${fmtPace(avgSpd, distUnit)} /${distUnit}`)}
            {avgHr   && row("Avg HR",   `${avgHr} bpm`)}
            {maxHr   && row("Max HR",   `${maxHr} bpm`)}
            {elevGain != null && row("Elevation Gain", `${elevGain.toLocaleString()} ${elevUnit}`)}
          </div>

          {/* Pace chart */}
          {chartData.some(d => d.paceDisp) && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: 2, textTransform: "uppercase", color: "#666", marginBottom: 8 }}>
                Pace / {distUnit}
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="dist" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} unit={` ${distUnit}`} />
                  <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} width={28} reversed />
                  <CartesianGrid stroke="#1a1a1a" vertical={false} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 4 }}
                    labelStyle={{ color: "#888" }}
                    itemStyle={{ color: "#e2e2e2" }}
                    formatter={v => v ? `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2,"0")}/${distUnit}` : "—"}
                    labelFormatter={d => `${d} ${distUnit}`}
                  />
                  <Line type="monotone" dataKey="paceDisp" stroke="#c8f135" dot={false} strokeWidth={1.5} connectNulls name="Pace" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* HR chart */}
          {chartData.some(d => d.hr) && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: 2, textTransform: "uppercase", color: "#666", marginBottom: 8 }}>
                Heart Rate
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="dist" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} unit={` ${distUnit}`} />
                  <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <CartesianGrid stroke="#1a1a1a" vertical={false} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 4 }}
                    labelStyle={{ color: "#888" }}
                    itemStyle={{ color: "#e2e2e2" }}
                    formatter={v => v ? `${v} bpm` : "—"}
                    labelFormatter={d => `${d} ${distUnit}`}
                  />
                  <Line type="monotone" dataKey="hr" stroke="#e85d04" dot={false} strokeWidth={1.5} connectNulls name="HR" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Elevation chart */}
          {chartData.some(d => d.elev != null) && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: 2, textTransform: "uppercase", color: "#666", marginBottom: 8 }}>
                Elevation ({elevUnit})
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="dist" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} unit={` ${distUnit}`} />
                  <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                  <CartesianGrid stroke="#1a1a1a" vertical={false} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 4 }}
                    labelStyle={{ color: "#888" }}
                    itemStyle={{ color: "#e2e2e2" }}
                    formatter={v => `${v} ${elevUnit}`}
                    labelFormatter={d => `${d} ${distUnit}`}
                  />
                  <Line type="monotone" dataKey="elev" stroke="#4a90d9" dot={false} strokeWidth={1.5} connectNulls name="Elev" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ActivityMap() {
  const [locations, setLocations]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [filter, setFilter]         = useState("all");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo,   setDateTo]       = useState("");
  const [selected, setSelected]     = useState(null);  // clicked activity
  const [route, setRoute]           = useState(null);  // fetched route data
  const [routeLoading, setRouteLoading] = useState(false);
  const { mToDist, distUnit, mToElev, elevUnit } = useUnits();
  const ct = useChartTheme();

  useEffect(() => {
    api.locations()
      .then(d => { setLocations(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const types = useMemo(() => {
    const s = new Set(locations.map(l => l.activity_type).filter(Boolean));
    return [...s].sort();
  }, [locations]);

  const filtered = useMemo(() => locations.filter(l => {
    if (filter !== "all" && l.activity_type !== filter) return false;
    const d = l.start_time?.slice(0, 10) || "";
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    return true;
  }), [locations, filter, dateFrom, dateTo]);

  const center = useMemo(() => {
    if (!filtered.length) return [39.5, -98.35];
    const lats = filtered.map(l => l.lat).sort((a, b) => a - b);
    const lngs = filtered.map(l => l.lng).sort((a, b) => a - b);
    return [lats[Math.floor(lats.length / 2)], lngs[Math.floor(lngs.length / 2)]];
  }, [filtered]);

  const handleMarkerClick = useCallback((loc) => {
    setSelected(loc);
    setRoute(null);
    setRouteLoading(true);
    api.activityRoute(loc.activity_id)
      .then(r => { setRoute(r); setRouteLoading(false); })
      .catch(() => setRouteLoading(false));
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
    setRoute(null);
  }, []);

  const routePoints = route?.points || [];

  if (loading) return <MapSkeleton />;
  if (error)   return <p className="error">Error: {error}</p>;

  if (!locations.length) return (
    <div>
      <h1>Activity Map</h1>
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "var(--muted)", marginBottom: 12 }}>No GPS start points found.</p>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
          Garmin stores start coordinates in activity data. Make sure your activities
          are synced and your device records GPS.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ margin: "-32px -40px", height: "100vh", position: "relative" }}>

      {/* Filter overlay (top-left) */}
      <div style={{ position: "absolute", top: 16, left: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          background: "rgba(18,18,18,0.88)", backdropFilter: "blur(6px)",
          border: "1px solid var(--border)", borderRadius: 6,
          padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", fontWeight: 600 }}>
              {filtered.length} Activities
            </span>
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); handleClose(); }}
              style={{
                background: "#1a1a1a", color: "#e2e2e2",
                border: "1px solid #333", borderRadius: 4,
                padding: "4px 8px", fontSize: "0.78rem", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              <option value="all">ALL TYPES</option>
              {types.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666", minWidth: 28 }}>From</span>
            <input
              type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); handleClose(); }}
              style={{ background: "#1a1a1a", color: "#e2e2e2", border: "1px solid #333", borderRadius: 4, padding: "3px 6px", fontSize: "0.75rem", colorScheme: "dark" }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#666", minWidth: 28 }}>To</span>
            <input
              type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); handleClose(); }}
              style={{ background: "#1a1a1a", color: "#e2e2e2", border: "1px solid #333", borderRadius: 4, padding: "3px 6px", fontSize: "0.75rem", colorScheme: "dark" }}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              style={{ background: "none", border: "none", color: "#888", fontSize: "0.72rem", cursor: "pointer", textAlign: "left", padding: 0, letterSpacing: "0.05em" }}
            >
              ✕ Clear dates
            </button>
          )}
        </div>

        {/* Legend */}
        <div style={{
          background: "rgba(18,18,18,0.88)", backdropFilter: "blur(6px)",
          border: "1px solid var(--border)", borderRadius: 6,
          padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5,
        }}>
          {Object.entries(TYPE_COLORS).filter(([k]) => k !== "other").map(([k, c]) => (
            <div key={k} style={{ display: "flex", gap: 7, alignItems: "center", fontSize: "0.68rem", color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
              {k.replace(/_/g, " ")}
            </div>
          ))}
        </div>

        {selected && (
          <div style={{
            background: "rgba(18,18,18,0.88)", backdropFilter: "blur(6px)",
            border: "1px solid var(--border)", borderRadius: 6,
            padding: "7px 12px", fontSize: "0.72rem", color: "#888",
          }}>
            Click map to deselect
          </div>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route polyline */}
        {routePoints.length > 0 && (
          <>
            <Polyline
              positions={routePoints.map(p => [p.lat, p.lng])}
              pathOptions={{ color: typeColor(selected?.activity_type), weight: 3, opacity: 0.9 }}
            />
            <FitBounds points={routePoints} />
          </>
        )}

        {/* Activity markers */}
        {filtered.map(loc => (
          <CircleMarker
            key={loc.activity_id}
            center={[loc.lat, loc.lng]}
            radius={selected?.activity_id === loc.activity_id ? 8 : 5}
            pathOptions={{
              color:       typeColor(loc.activity_type),
              fillColor:   typeColor(loc.activity_type),
              fillOpacity: selected?.activity_id === loc.activity_id ? 1 : 0.7,
              weight:      selected?.activity_id === loc.activity_id ? 2 : 1,
            }}
            eventHandlers={{ click: () => handleMarkerClick(loc) }}
          />
        ))}
      </MapContainer>

      {/* Stats panel (right side) */}
      {selected && (
        <StatsPanel
          activity={selected}
          route={route}
          loading={routeLoading}
          onClose={handleClose}
          distUnit={distUnit}
          mToDist={mToDist}
          mToElev={mToElev}
          elevUnit={elevUnit}
          ct={ct}
        />
      )}
    </div>
  );
}
