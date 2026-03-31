import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "../api";
import { useUnits, useChartTheme } from "../SettingsContext";

const LIME = "#c8f135", RED = "#ff4545", PURPLE = "#7b61ff", BLUE = "#4a90d9", ORANGE = "#f39c12";
const PALETTE = [LIME, RED, PURPLE, BLUE, ORANGE];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function SectionHeader({ label }) {
  return (
    <div style={{ margin: "36px 0 20px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 3, height: 14, background: LIME, borderRadius: 2 }} />
      <span style={{ fontSize: "0.6rem", letterSpacing: 5, color: LIME, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
    </div>
  );
}

const AVAIL_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export default function Compare() {
  const [selected, setSelected] = useState([2025, 2024]);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const { distUnit, elevUnit, mToDist, mToElev } = useUnits();
  const ct = useChartTheme();

  function toggleYear(yr) {
    setSelected(prev =>
      prev.includes(yr)
        ? prev.filter(y => y !== yr)
        : prev.length < 4 ? [...prev, yr].sort((a, b) => a - b) : prev
    );
  }

  useEffect(() => {
    if (selected.length < 2) { setData(null); return; }
    setLoading(true);
    api.wrappedMulti(selected)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selected]);

  const rows = data ? selected.map(yr => data[String(yr)]).filter(Boolean) : [];

  // Convert distance_mi → user-preferred unit
  const displayRows = rows.map(r => ({
    ...r,
    distance: r.distance_mi != null ? +mToDist(r.distance_mi * 1609.344).toFixed(1) : 0,
    elevation_ft: Math.round(mToElev(r.elevation_m || 0)),
  }));

  const summaryMetrics = [
    { key: "activities", label: "Activities",      color: BLUE },
    { key: "distance",   label: `Distance (${distUnit})`, color: LIME },
    { key: "hours",      label: "Hours Moving",    color: PURPLE },
    { key: "calories",   label: "Calories Burned", color: RED },
    { key: "total_steps",label: "Total Steps",     color: ORANGE },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Year Compare</h1>

      {/* Year selector chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {AVAIL_YEARS.map(yr => {
          const on = selected.includes(yr);
          const i  = selected.indexOf(yr);
          const color = on ? PALETTE[i % PALETTE.length] : "#333";
          return (
            <button key={yr} onClick={() => toggleYear(yr)}
              style={{ padding: "6px 16px", borderRadius: 20, border: `1px solid ${color}`,
                background: on ? color + "22" : "transparent",
                color: on ? color : "#666", cursor: "pointer", fontSize: "0.85rem", fontWeight: on ? 700 : 400 }}>
              {yr}
            </button>
          );
        })}
        <span style={{ fontSize: "0.75rem", color: "#444", alignSelf: "center", marginLeft: 8 }}>
          {selected.length < 2 ? "Pick at least 2 years" : selected.length >= 4 ? "Max 4 years" : ""}
        </span>
      </div>

      {loading && <p className="loading">Loading…</p>}
      {error   && <p className="error">Error: {error}</p>}

      {!loading && !error && rows.length >= 2 && (
        <>
          {/* Summary table */}
          <SectionHeader label="Summary" />
          <div className="card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--sub)", fontSize: "0.7rem", letterSpacing: 2, textTransform: "uppercase" }}>Metric</th>
                  {displayRows.map((r, i) => (
                    <th key={r.year} style={{ textAlign: "right", padding: "8px 12px", color: PALETTE[i % PALETTE.length], fontWeight: 700 }}>{r.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryMetrics.map(m => (
                  <tr key={m.key} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--sub)", fontSize: "0.8rem" }}>{m.label}</td>
                    {displayRows.map((r, i) => (
                      <td key={r.year} style={{ textAlign: "right", padding: "10px 12px", color: PALETTE[i % PALETTE.length], fontWeight: 600 }}>
                        {Number(r[m.key] ?? 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar charts for key metrics */}
          <SectionHeader label="Key Metrics" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {summaryMetrics.slice(0, 4).map(m => (
              <div className="card" key={m.key}>
                <h2 style={{ marginTop: 0, fontSize: "0.85rem", color: "var(--sub)" }}>{m.label}</h2>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={displayRows} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="year" tick={ct.axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={{ ...ct.axisTick, fontSize: 10 }} axisLine={false} tickLine={false} width={45} />
                    <Tooltip {...ct.tooltip} formatter={v => Number(v).toLocaleString()} />
                    <Bar dataKey={m.key} isAnimationActive={false} radius={[3, 3, 0, 0]}
                      shape={(props) => {
                        const idx = displayRows.findIndex(r => r.year === props.year);
                        return <rect x={props.x} y={props.y} width={props.width} height={props.height}
                          fill={PALETTE[idx >= 0 ? idx % PALETTE.length : 0]} rx={3} />;
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>

          {/* Sleep comparison */}
          {displayRows.some(r => r.avg_sleep_hrs) && (
            <>
              <SectionHeader label="Recovery" />
              <div className="card">
                <h2 style={{ marginTop: 0 }}>Avg Sleep per Night</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={displayRows} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="year" tick={ct.axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={40} unit=" h" />
                    <Tooltip {...ct.tooltip} formatter={v => v ? v + " hrs" : "—"} />
                    <Bar dataKey="avg_sleep_hrs" isAnimationActive={false} radius={[3, 3, 0, 0]}
                      shape={(props) => {
                        const idx = displayRows.findIndex(r => r.year === props.year);
                        return <rect x={props.x} y={props.y} width={props.width} height={props.height}
                          fill={PALETTE[idx >= 0 ? idx % PALETTE.length : 0]} rx={3} />;
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Elevation */}
          {displayRows.some(r => r.elevation_m > 0) && (
            <>
              <SectionHeader label="Elevation" />
              <div className="card">
                <h2 style={{ marginTop: 0 }}>Total Elevation Gain ({elevUnit})</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={displayRows} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="year" tick={ct.axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={55} />
                    <Tooltip {...ct.tooltip} formatter={v => Number(v).toLocaleString() + " " + elevUnit} />
                    <Bar dataKey="elevation_ft" isAnimationActive={false} radius={[3, 3, 0, 0]}
                      shape={(props) => {
                        const idx = displayRows.findIndex(r => r.year === props.year);
                        return <rect x={props.x} y={props.y} width={props.width} height={props.height}
                          fill={PALETTE[idx >= 0 ? idx % PALETTE.length : 0]} rx={3} />;
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}

      {!loading && !error && selected.length < 2 && (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px", color: "#555" }}>
          Select at least 2 years above to compare.
        </div>
      )}
    </div>
  );
}
