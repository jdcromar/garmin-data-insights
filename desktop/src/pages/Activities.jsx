import { useEffect, useState, useMemo } from "react";
import {
  ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "../api";
import { useUnits, useChartTheme } from "../SettingsContext";

const COLORS = ["#c8f135","#4a90d9","#ff4545","#7b61ff","#f39c12","#1abc9c","#e91e63"];

function fmtType(t) { return t ? t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—"; }

export default function Activities() {
  const [data, setData]             = useState([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const { metric, mToDist, distUnit, mToElev, elevUnit } = useUnits();
  const ct = useChartTheme();

  useEffect(() => {
    api.activities()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const enriched = useMemo(() => data.map(d => ({
    ...d,
    activity_type: fmtType(d.activity_type),
    distance:      +mToDist(d.distance_meters).toFixed(2),
    duration_min:  +(d.duration_secs / 60).toFixed(1),
    year:          new Date(d.start_time).getFullYear(),
  })), [data, metric]);

  const types = useMemo(() => ["All", ...new Set(enriched.map(d => d.activity_type).filter(Boolean)).values()].sort(), [enriched]);
  const years = useMemo(() => ["All", ...new Set(enriched.map(d => d.year)).values()].sort((a, b) => b - a), [enriched]);

  const filtered = useMemo(() => enriched
    .filter(d => typeFilter === "All" || d.activity_type === typeFilter)
    .filter(d => yearFilter === "All" || d.year === +yearFilter),
  [enriched, typeFilter, yearFilter]);

  const typeCounts = useMemo(() => {
    const m = {};
    filtered.forEach(d => { if (d.activity_type) m[d.activity_type] = (m[d.activity_type] || 0) + 1; });
    return Object.entries(m).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  if (loading) return <p className="loading">Loading…</p>;
  if (error)   return <p className="error">Error: {error}</p>;

  const totalDist = filtered.reduce((s, d) => s + d.distance, 0);
  const totalHrs  = filtered.reduce((s, d) => s + d.duration_min, 0) / 60;
  const totalCals = filtered.reduce((s, d) => s + (d.calories || 0), 0);

  const scatterData  = filtered.map(d => ({ x: new Date(d.start_time).getTime(), y: d.distance, type: d.activity_type }));
  const typeColorMap = {};
  [...new Set(filtered.map(d => d.activity_type).filter(Boolean))].forEach((t, i) => { typeColorMap[t] = COLORS[i % COLORS.length]; });

  return (
    <div>
      <h1>Activities</h1>

      <div className="filters">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          {years.map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Activities</div><div className="kpi-value">{filtered.length.toLocaleString()}</div></div>
        <div className="kpi"><div className="kpi-label">Total Distance</div><div className="kpi-value" style={{ color: "#c8f135" }}>{totalDist.toFixed(1)} <span style={{ fontSize: "1rem", color: "var(--muted)" }}>{distUnit}</span></div></div>
        <div className="kpi"><div className="kpi-label">Total Time</div><div className="kpi-value">{totalHrs.toFixed(1)} <span style={{ fontSize: "1rem", color: "var(--muted)" }}>hrs</span></div></div>
        <div className="kpi"><div className="kpi-label">Calories</div><div className="kpi-value" style={{ color: "#ff4545" }}>{totalCals.toLocaleString()}</div></div>
      </div>

      <div className="charts-row">
        <div className="card">
          <h2>Distance Over Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="x" type="number" domain={["auto", "auto"]}
                tickFormatter={v => new Date(v).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                tick={ct.axisTick} axisLine={false} tickLine={false} />
              <YAxis dataKey="y" tick={ct.axisTick} axisLine={false} tickLine={false} width={44} unit={" " + distUnit} />
              <CartesianGrid stroke={ct.gridColor} vertical={false} />
              <Tooltip {...ct.tooltip}
                formatter={(v, n) => [n === "y" ? v.toFixed(2) + " " + distUnit : v, n === "y" ? "Distance" : "Type"]}
                labelFormatter={() => ""} />
              <Scatter data={scatterData} shape={(props) => {
                const color = typeColorMap[props.type] || "#4a90d9";
                return <circle cx={props.cx} cy={props.cy} r={3} fill={color} fillOpacity={0.8} />;
              }} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Activities by Type</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeCounts} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 80 }}>
              <XAxis type="number" tick={ct.axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" tick={{ ...ct.axisTick, fill: "var(--sub)" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip {...ct.tooltip} />
              <Bar dataKey="count" radius={[0, 2, 2, 0]}
                shape={(props) => <rect x={props.x} y={props.y} width={props.width} height={props.height}
                  fill={COLORS[typeCounts.findIndex(t => t.type === props.type) % COLORS.length]} rx={2} />}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Activity Log</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Distance ({distUnit})</th>
                <th>Duration</th><th>Calories</th><th>Avg HR</th><th>Elevation ({elevUnit})</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.activity_id}>
                  <td>{new Date(d.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</td>
                  <td>{d.activity_type}</td>
                  <td>{d.distance ? d.distance.toFixed(2) : "—"}</td>
                  <td>{d.duration_min ? d.duration_min.toFixed(0) + " min" : "—"}</td>
                  <td>{d.calories ? d.calories.toLocaleString() : "—"}</td>
                  <td>{d.avg_hr ? Math.round(d.avg_hr) + " bpm" : "—"}</td>
                  <td>{d.elevation_gain ? Math.round(mToElev(d.elevation_gain)).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
