import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "../api";
import { useChartTheme } from "../SettingsContext";

function fmt(d) { return new Date(d).toLocaleDateString("en-US", {month:"short", day:"numeric"}); }

const CHART_DAYS = 180;

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

export default function Health() {
  const [sleep, setSleep] = useState([]);
  const [hrv, setHrv]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ct = useChartTheme();

  useEffect(() => {
    Promise.all([api.sleep(), api.hrv()])
      .then(([s, h]) => { setSleep(s); setHrv(h); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <HealthSkeleton />;
  if (error)   return <p className="error">Error: {error}</p>;

  const sleepAll = sleep.map(d => ({
    date: d.date,
    "Deep Sleep":  d.deep_secs  ? +(d.deep_secs  /3600).toFixed(2) : null,
    "REM Sleep":   d.rem_secs   ? +(d.rem_secs   /3600).toFixed(2) : null,
    "Light Sleep": d.light_secs ? +(d.light_secs /3600).toFixed(2) : null,
    score: d.score,
  }));
  const sleepData = sleepAll.slice(-CHART_DAYS);

  const avgSleep = sleep.length
    ? (sleep.reduce((s,d)=>s+(d.duration_secs||0),0)/sleep.length/3600).toFixed(1) : "—";
  const avgScore = sleep.length
    ? Math.round(sleep.reduce((s,d)=>s+(d.score||0),0)/sleep.filter(d=>d.score).length) : "—";
  const avgRem = sleep.length
    ? (sleep.reduce((s,d)=>s+(d.rem_secs||0),0)/sleep.length/3600).toFixed(1) : "—";

  const hrvAll = hrv.map(d => ({
    date: d.date,
    "Weekly Average":     d.weekly_avg,
    "Last Night Average": d.last_night_avg,
  }));
  const hrvData = hrvAll.slice(-CHART_DAYS);

  const avgWeeklyHrv = hrv.filter(d=>d.weekly_avg).length
    ? Math.round(hrv.reduce((s,d)=>s+(d.weekly_avg||0),0)/hrv.filter(d=>d.weekly_avg).length) : "—";
  const avgNightHrv = hrv.filter(d=>d.last_night_avg).length
    ? Math.round(hrv.reduce((s,d)=>s+(d.last_night_avg||0),0)/hrv.filter(d=>d.last_night_avg).length) : "—";

  return (
    <div>
      <h1>Health</h1>

      {sleep.length > 0 && <>
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Avg Sleep</div><div className="kpi-value" style={{color:"#7b61ff"}}>{avgSleep} <span style={{fontSize:"1rem",color:"#555"}}>hrs</span></div></div>
          <div className="kpi"><div className="kpi-label">Avg Sleep Score</div><div className="kpi-value">{avgScore}</div></div>
          <div className="kpi"><div className="kpi-label">Avg REM</div><div className="kpi-value" style={{color:"#4a90d9"}}>{avgRem} <span style={{fontSize:"1rem",color:"#555"}}>hrs</span></div></div>
        </div>

        <div className="card">
          <h2>Sleep Stages <span style={{fontSize:"0.7rem",fontWeight:400,color:"var(--muted)"}}>— last {CHART_DAYS} days</span></h2>
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
          <h2>Sleep Score <span style={{fontSize:"0.7rem",fontWeight:400,color:"var(--muted)"}}>— last {CHART_DAYS} days</span></h2>
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

      {hrv.length > 0 && <>
        <div className="kpi-grid" style={{marginTop:32}}>
          <div className="kpi"><div className="kpi-label">Avg Weekly HRV</div><div className="kpi-value">{avgWeeklyHrv} <span style={{fontSize:"1rem",color:"#555"}}>ms</span></div></div>
          <div className="kpi"><div className="kpi-label">Avg Last Night HRV</div><div className="kpi-value" style={{color:"#c8f135"}}>{avgNightHrv} <span style={{fontSize:"1rem",color:"#555"}}>ms</span></div></div>
        </div>

        <div className="card">
          <h2>HRV <span style={{fontSize:"0.7rem",fontWeight:400,color:"var(--muted)"}}>— last {CHART_DAYS} days</span></h2>
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
    </div>
  );
}
