import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "../api";
import { useChartTheme } from "../SettingsContext";

function fmt(d) { return new Date(d).toLocaleDateString("en-US", {month:"short", day:"numeric"}); }

// ── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonKpiGrid({ count = 3 }) {
  return (
    <div className="kpi-grid" style={{ marginBottom: 32 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="kpi" key={i}>
          <div className="skeleton skeleton-label" />
          <div className="skeleton skeleton-kpi" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCard({ height = 240 }) {
  return (
    <div className="card">
      <div className="skeleton skeleton-label" style={{ width: 120, marginBottom: 16 }} />
      <div className="skeleton skeleton-chart" style={{ height }} />
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div>
      <h1>Health</h1>
      <SkeletonKpiGrid count={3} />
      <SkeletonCard height={240} />
      <SkeletonCard height={200} />
      <SkeletonKpiGrid count={2} />
      <SkeletonCard height={220} />
    </div>
  );
}

// ── Range filter bar ─────────────────────────────────────────────────────────

function RangeBar({ years, mode, setMode, from, setFrom, to, setTo }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28, flexWrap:"wrap" }}>
      <select
        value={mode}
        onChange={e => setMode(e.target.value)}
        style={{
          background:"var(--surface)", color:"var(--text)",
          border:"1px solid var(--border)", borderRadius:4,
          padding:"6px 10px", fontSize:"0.85rem", cursor:"pointer",
        }}
      >
        <option value="all">All time</option>
        {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
        <option value="custom">Custom range</option>
      </select>

      {mode === "custom" && <>
        <input
          type="date" value={from} onChange={e => setFrom(e.target.value)}
          style={{
            background:"var(--surface)", color:"var(--text)",
            border:"1px solid var(--border)", borderRadius:4,
            padding:"6px 10px", fontSize:"0.85rem",
          }}
        />
        <span style={{ color:"var(--muted)", fontSize:"0.85rem" }}>to</span>
        <input
          type="date" value={to} onChange={e => setTo(e.target.value)}
          style={{
            background:"var(--surface)", color:"var(--text)",
            border:"1px solid var(--border)", borderRadius:4,
            padding:"6px 10px", fontSize:"0.85rem",
          }}
        />
      </>}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function filterByRange(rows, mode, from, to) {
  if (mode === "all") return rows;
  if (mode === "custom") {
    if (!from && !to) return rows;
    return rows.filter(r => (!from || r.date >= from) && (!to || r.date <= to));
  }
  // year mode
  return rows.filter(r => r.date.startsWith(mode));
}

function avg(arr, key, divisor = 1) {
  const valid = arr.filter(d => d[key]);
  if (!valid.length) return "—";
  return (valid.reduce((s, d) => s + d[key], 0) / valid.length / divisor).toFixed(1);
}

function avgInt(arr, key) {
  const valid = arr.filter(d => d[key]);
  if (!valid.length) return "—";
  return Math.round(valid.reduce((s, d) => s + d[key], 0) / valid.length);
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Health() {
  const [sleep, setSleep] = useState([]);
  const [hrv, setHrv]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const ct = useChartTheme();

  const [mode, setMode]   = useState("all");
  const [from, setFrom]   = useState("");
  const [to, setTo]       = useState("");

  useEffect(() => {
    Promise.all([api.sleep(), api.hrv()])
      .then(([s, h]) => { setSleep(s); setHrv(h); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const years = useMemo(() => {
    const set = new Set();
    sleep.forEach(d => set.add(d.date.slice(0, 4)));
    hrv.forEach(d => set.add(d.date.slice(0, 4)));
    return [...set].sort((a, b) => b - a);   // newest first
  }, [sleep, hrv]);

  const sleepFiltered = useMemo(() => filterByRange(sleep, mode, from, to), [sleep, mode, from, to]);
  const hrvFiltered   = useMemo(() => filterByRange(hrv,   mode, from, to), [hrv,   mode, from, to]);

  const sleepData = useMemo(() => sleepFiltered.map(d => ({
    date: d.date,
    "Deep Sleep":  d.deep_secs  ? +(d.deep_secs  /3600).toFixed(2) : null,
    "REM Sleep":   d.rem_secs   ? +(d.rem_secs   /3600).toFixed(2) : null,
    "Light Sleep": d.light_secs ? +(d.light_secs /3600).toFixed(2) : null,
    score: d.score,
  })), [sleepFiltered]);

  const hrvData = useMemo(() => hrvFiltered.map(d => ({
    date: d.date,
    "Weekly Average":     d.weekly_avg,
    "Last Night Average": d.last_night_avg,
  })), [hrvFiltered]);

  if (loading) return <HealthSkeleton />;
  if (error)   return <p className="error">Error: {error}</p>;

  const avgSleep    = avg(sleepFiltered,    "duration_secs", 3600);
  const avgScore    = avgInt(sleepFiltered, "score");
  const avgRem      = avg(sleepFiltered,    "rem_secs", 3600);
  const avgWeeklyHrv = avgInt(hrvFiltered,  "weekly_avg");
  const avgNightHrv  = avgInt(hrvFiltered,  "last_night_avg");

  return (
    <div>
      <h1>Health</h1>

      <RangeBar
        years={years}
        mode={mode} setMode={setMode}
        from={from} setFrom={setFrom}
        to={to}     setTo={setTo}
      />

      {sleepFiltered.length > 0 && <>
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Avg Sleep</div><div className="kpi-value" style={{color:"#7b61ff"}}>{avgSleep} <span style={{fontSize:"1rem",color:"#555"}}>hrs</span></div></div>
          <div className="kpi"><div className="kpi-label">Avg Sleep Score</div><div className="kpi-value">{avgScore}</div></div>
          <div className="kpi"><div className="kpi-label">Avg REM</div><div className="kpi-value" style={{color:"#4a90d9"}}>{avgRem} <span style={{fontSize:"1rem",color:"#555"}}>hrs</span></div></div>
        </div>

        <div className="card">
          <h2>Sleep Stages</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sleepData} margin={{top:8,right:8,bottom:0,left:0}}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={35} unit="h"/>
              <CartesianGrid stroke={ct.gridColor} vertical={false}/>
              <Tooltip {...ct.tooltip} labelFormatter={d=>new Date(d).toLocaleDateString()} formatter={v=>v?v.toFixed(1)+" hrs":"—"}/>
              <Bar dataKey="Deep Sleep"  stackId="s" fill="#1f3a6e" radius={[0,0,0,0]}/>
              <Bar dataKey="REM Sleep"   stackId="s" fill="#4a90d9"/>
              <Bar dataKey="Light Sleep" stackId="s" fill="#a8c8f0" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Sleep Score</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sleepData}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={35}/>
              <CartesianGrid stroke={ct.gridColor} vertical={false}/>
              <Tooltip {...ct.tooltip} labelFormatter={d=>new Date(d).toLocaleDateString()}/>
              <Line type="monotone" dataKey="score" stroke="#c8f135" dot={false} strokeWidth={1.5}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </>}

      {hrvFiltered.length > 0 && <>
        <div className="kpi-grid" style={{marginTop:32}}>
          <div className="kpi"><div className="kpi-label">Avg Weekly HRV</div><div className="kpi-value">{avgWeeklyHrv} <span style={{fontSize:"1rem",color:"#555"}}>ms</span></div></div>
          <div className="kpi"><div className="kpi-label">Avg Last Night HRV</div><div className="kpi-value" style={{color:"#c8f135"}}>{avgNightHrv} <span style={{fontSize:"1rem",color:"#555"}}>ms</span></div></div>
        </div>

        <div className="card">
          <h2>HRV</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hrvData}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={40} unit=" ms"/>
              <CartesianGrid stroke={ct.gridColor} vertical={false}/>
              <Tooltip {...ct.tooltip} labelFormatter={d=>new Date(d).toLocaleDateString()} formatter={v=>v?Math.round(v)+" ms":"—"}/>
              <Line type="monotone" dataKey="Weekly Average"     stroke="#c8f135" dot={false} strokeWidth={1.5}/>
              <Line type="monotone" dataKey="Last Night Average" stroke="#4a90d9" dot={false} strokeWidth={1.5}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </>}

      {sleepFiltered.length === 0 && hrvFiltered.length === 0 && (
        <p style={{ color:"var(--muted)", marginTop:40, textAlign:"center" }}>No data for this range.</p>
      )}
    </div>
  );
}
