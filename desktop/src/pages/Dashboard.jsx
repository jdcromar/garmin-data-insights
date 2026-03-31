import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { api } from "../api";
import { useUnits, useChartTheme } from "../SettingsContext";

const LIME = "#c8f135", BLUE = "#4a90d9", RED = "#ff4545", PURPLE = "#7b61ff";

function fmt(d) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function TrendBadge({ pct, inverse = false }) {
  if (pct == null) return null;
  const good = inverse ? pct < 0 : pct > 0;
  const color = good ? LIME : RED;
  const arrow = pct > 0 ? "↑" : "↓";
  return (
    <span style={{ fontSize: "0.7rem", color, marginLeft: 6, fontWeight: 600 }}>
      {arrow}{Math.abs(pct)}%
    </span>
  );
}

function ReadinessRing({ score, label }) {
  if (score == null) return null;
  const color = score >= 80 ? LIME : score >= 65 ? BLUE : score >= 45 ? "#f39c12" : RED;
  const r = 32, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={80} height={80} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={40} cy={40} r={r} fill="none" stroke="#1e1e1e" strokeWidth={6} />
        <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ marginTop: -60, textAlign: "center", pointerEvents: "none" }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{score}</div>
      </div>
      <div style={{ marginTop: 24, fontSize: "0.7rem", letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]         = useState([]);
  const [insights, setInsights] = useState(null);
  const [records, setRecords]   = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [view, setView]         = useState("all");
  const [year, setYear]         = useState(null);
  const [month, setMonth]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [error, setError]       = useState(null);

  function fetchAll() {
    return Promise.all([
      api.dailyStats(),
      api.insights().catch(() => null),
      api.records().catch(() => null),
      api.readiness().catch(() => null),
    ]).then(([d, ins, rec, rdy]) => {
      setData(d);
      setInsights(ins);
      setRecords(rec);
      setReadiness(rdy);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }

  useEffect(() => { fetchAll(); }, []);

  async function syncToday() {
    setSyncing(true);
    const today = todayStr();
    try {
      await api.sync(today, today);
      await fetchAll();
    } finally {
      setSyncing(false);
    }
  }

  const { mToDist, distUnit } = useUnits();
  const ct = useChartTheme();

  if (loading) return <p className="loading">Loading…</p>;
  if (error)   return <p className="error">Error: {error}</p>;
  if (!data.length) return <p className="loading">No data. Sync first.</p>;

  const latest  = [...data].reverse().find(d => d.steps != null || d.total_calories != null) || data[data.length - 1];
  const fmtKpi  = (val) => val != null ? Math.round(val).toLocaleString() : "—";
  const years   = [...new Set(data.map(d => new Date(d.date).getFullYear()))].sort((a, b) => b - a);
  const months  = year
    ? [...new Set(data.filter(d => new Date(d.date).getFullYear() === year).map(d => new Date(d.date).getMonth() + 1))].sort((a, b) => a - b)
    : [];

  let plotData = data;
  if (view === "year" && year)  plotData = data.filter(d => new Date(d.date).getFullYear() === year);
  if (view === "month" && year && month)
    plotData = data.filter(d => { const dt = new Date(d.date); return dt.getFullYear() === year && dt.getMonth() + 1 === month; });

  const peakSteps = Math.max(...plotData.map(d => d.steps || 0));
  const top10Threshold = plotData.length > 0
    ? [...plotData].sort((a, b) => (b.steps || 0) - (a.steps || 0)).slice(0, 10).at(-1)?.steps || 0
    : 0;

  const yearBoundaries = view === "all"
    ? years.slice(0, -1).map(y => `${y + 1}-01-01`).filter(d => plotData.some(r => r.date >= d))
    : [];

  const calData = data
    .filter(d => (d.total_calories || 0) <= 10000)
    .map(d => ({ date: d.date, "Active Calories": d.active_calories, "Total Calories": d.total_calories }));

  const hrData = data.map(d => ({
    date: d.date,
    "Resting Heart Rate": d.resting_hr,
    "Average Heart Rate": d.avg_hr,
  }));

  // YoY — avg steps per year
  const yoyMap = {};
  data.forEach(d => {
    const yr = new Date(d.date).getFullYear();
    if (!yoyMap[yr]) yoyMap[yr] = { count: 0, sum: 0 };
    if (d.steps) { yoyMap[yr].sum += d.steps; yoyMap[yr].count++; }
  });
  const yoyData = Object.entries(yoyMap).sort(([a], [b]) => a - b)
    .map(([yr, v]) => ({ year: yr, "Avg Steps": v.count ? Math.round(v.sum / v.count) : 0 }));

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <button className="btn" onClick={syncToday} disabled={syncing}
          style={{ fontSize: "0.8rem", padding: "7px 18px" }}>
          {syncing ? "Syncing…" : "Sync Today"}
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Steps
            {insights && <TrendBadge pct={insights.steps?.trend_pct} />}
          </div>
          <div className="kpi-value">{fmtKpi(latest.steps)}</div>
          {insights && <div style={{ fontSize: "0.7rem", color: "#555", marginTop: 4 }}>7d avg {fmtKpi(insights.steps?.avg_7d)}</div>}
        </div>
        <div className="kpi">
          <div className="kpi-label">Calories
            {insights && <TrendBadge pct={insights.calories?.trend_pct} />}
          </div>
          <div className="kpi-value" style={{ color: RED }}>{fmtKpi(latest.total_calories)}</div>
          {insights && <div style={{ fontSize: "0.7rem", color: "#555", marginTop: 4 }}>7d avg {fmtKpi(insights.calories?.avg_7d)}</div>}
        </div>
        <div className="kpi">
          <div className="kpi-label">Resting HR
            {insights && <TrendBadge pct={insights.resting_hr?.trend_pct} inverse />}
          </div>
          <div className="kpi-value">{fmtKpi(latest.resting_hr)} <span style={{ fontSize: "1rem", color: "#555" }}>bpm</span></div>
          {insights && <div style={{ fontSize: "0.7rem", color: "#555", marginTop: 4 }}>7d avg {insights.resting_hr?.avg_7d ? Math.round(insights.resting_hr.avg_7d) + " bpm" : "—"}</div>}
        </div>
        <div className="kpi">
          <div className="kpi-label">Avg HR</div>
          <div className="kpi-value">{fmtKpi(latest.avg_hr)} <span style={{ fontSize: "1rem", color: "#555" }}>bpm</span></div>
        </div>
      </div>

      {/* Readiness + PRs row */}
      {(readiness || records) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Readiness */}
          {readiness && (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <ReadinessRing score={readiness.composite} label={readiness.label} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.65rem", letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>Readiness</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "HRV", val: readiness.hrv_score },
                    { label: "Sleep", val: readiness.sleep_score },
                    { label: "RHR", val: readiness.rhr_score },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div style={{ fontSize: "0.65rem", color: "#555", letterSpacing: 1 }}>{label}</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: val >= 65 ? LIME : val >= 45 ? "#f39c12" : RED }}>
                        {val ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Personal Records */}
          {records && (
            <div className="card">
              <div style={{ fontSize: "0.65rem", letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 12 }}>Personal Records</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {records.best_steps_days?.slice(0, 1).map(r => (
                  <div key={r.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>Best Step Day</span>
                    <span style={{ fontWeight: 700, color: LIME }}>{Number(r.steps).toLocaleString()} <span style={{ color: "#555", fontSize: "0.75rem" }}>{new Date(r.date).toLocaleDateString()}</span></span>
                  </div>
                ))}
                {records.longest_run && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>Longest Activity</span>
                    <span style={{ fontWeight: 700, color: RED }}>{mToDist(records.longest_run.distance_meters).toFixed(1)} {distUnit}</span>
                  </div>
                )}
                {records.lowest_rhr && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>Lowest Resting HR</span>
                    <span style={{ fontWeight: 700, color: BLUE }}>{records.lowest_rhr.resting_hr} bpm</span>
                  </div>
                )}
                {records.best_sleep_score && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>Best Sleep Score</span>
                    <span style={{ fontWeight: 700, color: PURPLE }}>{Math.round(records.best_sleep_score.score)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Steps chart */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Daily Steps</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {["all", "year", "month"].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "5px 14px", borderRadius: 4, border: "1px solid",
                  borderColor: view === v ? LIME : "#333",
                  background: view === v ? LIME + "22" : "transparent",
                  color: view === v ? LIME : "#888", cursor: "pointer", fontSize: "0.8rem" }}>
                {v === "all" ? "All Time" : v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
            {(view === "year" || view === "month") && (
              <select value={year || ""} onChange={e => { setYear(+e.target.value); setMonth(null); }}>
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {view === "month" && year && (
              <select value={month || ""} onChange={e => setMonth(+e.target.value)}>
                <option value="">Month</option>
                {months.map(m => <option key={m} value={m}>{MONTH_NAMES[m - 1]}</option>)}
              </select>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={plotData} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={50} />
            <Tooltip {...ct.tooltip}
              labelFormatter={d => new Date(d).toLocaleDateString()}
              formatter={v => v ? v.toLocaleString() : "—"}
            />
            {yearBoundaries.map(d => (
              <ReferenceLine key={d} x={d} stroke="rgba(150,150,150,0.4)" strokeDasharray="4 3" />
            ))}
            <Bar dataKey="steps" radius={[2, 2, 0, 0]} fill={BLUE} isAnimationActive={false}
              shape={(props) => {
                const steps = props.steps || 0;
                const isPeak  = steps >= peakSteps && peakSteps > 0;
                const isTop10 = steps >= top10Threshold && top10Threshold > 0 && steps > 0;
                return (
                  <g>
                    <rect x={props.x} y={props.y} width={props.width} height={props.height}
                      fill={isPeak ? RED : BLUE} rx={2} />
                    {isTop10 &&
                      <text x={props.x + props.width / 2} y={props.y - 5}
                        textAnchor="middle" fill="#ccc" fontSize={9} fontWeight={600}>
                        {steps.toLocaleString()}
                      </text>
                    }
                  </g>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Calories + HR */}
      <div className="charts-row">
        <div className="card">
          <h2>Calories Burned</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={calData}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={45} />
              <CartesianGrid stroke={ct.gridColor} vertical={false} />
              <Tooltip {...ct.tooltip} labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => v ? v.toLocaleString() : "—"} />
              <Line type="monotone" dataKey="Active Calories" stroke="#4a90d9" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="Total Calories"  stroke="#f39c12" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Heart Rate</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hrData}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={40} />
              <CartesianGrid stroke={ct.gridColor} vertical={false} />
              <Tooltip {...ct.tooltip} labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => v ? Math.round(v) + " bpm" : "—"} />
              <Line type="monotone" dataKey="Resting Heart Rate" stroke="#ff4545" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="Average Heart Rate" stroke="#c8f135" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-over-Year */}
      {yoyData.length >= 2 && (
        <div className="card">
          <h2>Year-over-Year · Avg Daily Steps</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yoyData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="year" tick={ct.axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={50} />
              <Tooltip {...ct.tooltip} formatter={v => v.toLocaleString()} />
              <Bar dataKey="Avg Steps" fill={LIME} radius={[3, 3, 0, 0]} isAnimationActive={false}
                shape={(props) => (
                  <g>
                    <rect x={props.x} y={props.y} width={props.width} height={props.height} fill={LIME} rx={3} />
                    <text x={props.x + props.width / 2} y={props.y - 6}
                      textAnchor="middle" fill="#ccc" fontSize={10} fontWeight={600}>
                      {Number(props["Avg Steps"]).toLocaleString()}
                    </text>
                  </g>
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
