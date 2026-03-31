import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie,
} from "recharts";
import { api } from "../api";
import { useUnits, useChartTheme } from "../SettingsContext";

const LIME="#c8f135", RED="#ff4545", PURPLE="#7b61ff";
const fmtType = (t) => t ? t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—";
const COLORS=[LIME,RED,PURPLE,"#4a90d9","#f39c12","#1abc9c"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function SectionHeader({label}) {
  return (
    <div className="section-header">
      <div className="bar"/><div className="lbl">{label}</div><div className="line"/>
    </div>
  );
}

export default function Wrapped() {
  const [yearSel, setYearSel] = useState(new Date().getFullYear());
  const [wrapped, setWrapped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const { metric, mToDist, mToElev, distUnit, marathonDist, earthCirc } = useUnits();
  const ct = useChartTheme();

  useEffect(() => {
    setLoading(true);
    api.wrapped(yearSel)
      .then(d => { setWrapped(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [yearSel]);

  const computed = useMemo(() => {
    if (!wrapped) return null;
    const acts = wrapped.activities.map(a => ({
      ...a,
      dist:         mToDist(a.distance_meters || 0),
      duration_hrs: a.duration_secs / 3600,
      month:        MONTHS[new Date(a.start_time).getMonth()],
      weekday:      DAYS[(new Date(a.start_time).getDay()+6)%7],
    }));

    const n      = acts.length;
    const dist   = acts.reduce((s,a)=>s+a.dist,0);
    const hrs    = acts.reduce((s,a)=>s+a.duration_hrs,0);
    const cals   = acts.reduce((s,a)=>s+(a.calories||0),0);
    const elevM  = acts.reduce((s,a)=>s+(a.elevation_gain||0),0);
    const elev   = mToElev(elevM);

    const monthCounts = MONTHS.map(m=>({ month:m, Count: acts.filter(a=>a.month===m).length }));
    const dayCounts   = DAYS.map(d=>({ day:d, Count: acts.filter(a=>a.weekday===d).length }));

    const typeMap = {};
    acts.forEach(a=>{ if(a.activity_type) { const k=fmtType(a.activity_type); typeMap[k]=(typeMap[k]||0)+a.dist; }});
    const typeData = Object.entries(typeMap).map(([name,value],i)=>({name, value:+value.toFixed(1), fill:COLORS[i%COLORS.length]}));

    const stats      = wrapped.stats;
    const totalSteps = stats.reduce((s,d)=>s+(d.steps||0),0);
    const avgSteps   = stats.length ? Math.round(totalSteps/stats.length) : 0;
    const bestSteps  = Math.max(...stats.map(d=>d.steps||0));

    const sleepArr = wrapped.sleep;
    const avgSleep = sleepArr.length ? (sleepArr.reduce((s,d)=>s+(d.duration_secs||0),0)/sleepArr.length/3600).toFixed(1) : null;
    const avgScore = sleepArr.filter(d=>d.score).length ? Math.round(sleepArr.reduce((s,d)=>s+(d.score||0),0)/sleepArr.filter(d=>d.score).length) : null;

    const tagline = n >= 100 ? `${n} workouts. Every one counted.`
                 : n >= 50  ? `${n} workouts. Consistent.`
                 :             `${n} workouts. You showed up.`;

    const longestDist = acts.length ? Math.max(...acts.map(a=>a.dist)) : 0;

    // Everest height in same unit
    const everestHeight = metric ? 8849 : 8849 * 3.28084;

    return { n, dist, hrs, cals, elevM, elev, everestHeight,
             monthCounts, dayCounts, typeData,
             totalSteps, avgSteps, bestSteps, avgSleep, avgScore, tagline,
             longestDist };
  }, [wrapped, metric]);

  return (
    <div>
      <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:32}}>
        <h1 style={{margin:0}}>Wrapped</h1>
        <select value={yearSel} onChange={e=>setYearSel(+e.target.value)}>
          {[2026,2025,2024,2023,2022,2021,2020].map(y=><option key={y}>{y}</option>)}
        </select>
      </div>

      {loading && <p className="loading">Loading…</p>}
      {error   && <p className="error">Error: {error}</p>}

      {!loading && !error && computed && <>
        {/* Hero */}
        <div className="wrapped-hero">
          <div className="eyebrow">Your {yearSel} in Motion</div>
          <div className="year">{yearSel}</div>
          <div className="tagline">{computed.tagline}</div>
        </div>

        {/* Numbers */}
        <SectionHeader label="The Numbers" />
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Activities</div><div className="kpi-value">{computed.n.toLocaleString()}</div></div>
          <div className="kpi"><div className="kpi-label">{distUnit === "mi" ? "Miles" : "Kilometers"} Covered</div><div className="kpi-value" style={{color:LIME}}>{computed.dist.toFixed(1)}</div></div>
          <div className="kpi"><div className="kpi-label">Hours Moving</div><div className="kpi-value">{computed.hrs.toFixed(1)}</div></div>
          <div className="kpi"><div className="kpi-label">Calories Burned</div><div className="kpi-value" style={{color:RED}}>{Math.round(computed.cals).toLocaleString()}</div></div>
        </div>

        {/* Scale */}
        <SectionHeader label="Scale" />
        <div className="scale-grid">
          <div className="scale-cell">
            <div className="val">{(computed.dist / marathonDist).toFixed(1)}×</div>
            <div className="lbl">marathon equivalent</div>
          </div>
          <div className="scale-cell red">
            <div className="val">{(computed.elev / computed.everestHeight).toFixed(2)}×</div>
            <div className="lbl">times up Everest</div>
          </div>
          <div className="scale-cell purple">
            <div className="val">{(computed.dist / earthCirc).toFixed(4)}×</div>
            <div className="lbl">laps around Earth</div>
          </div>
        </div>

        {/* Patterns */}
        <SectionHeader label="Your Patterns" />
        <div className="charts-row">
          <div className="card">
            <h2>Activities by Month</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={computed.monthCounts}>
                <XAxis dataKey="month" tickFormatter={m=>m.slice(0,3)} tick={ct.axisTick} axisLine={false} tickLine={false}/>
                <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={30}/>
                <Tooltip {...ct.tooltip}/>
                <Bar dataKey="Count" fill={LIME} radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2>Favourite Day</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={computed.dayCounts}>
                <XAxis dataKey="day" tickFormatter={d=>d.slice(0,3)} tick={ct.axisTick} axisLine={false} tickLine={false}/>
                <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={30}/>
                <Tooltip {...ct.tooltip}/>
                <Bar dataKey="Count" fill={PURPLE} radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown + Records */}
        <SectionHeader label="Breakdown & Records" />
        <div className="charts-row">
          <div className="card">
            <h2>Activity Breakdown</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={computed.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                     innerRadius={60} outerRadius={90} paddingAngle={3}
                     label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                     labelLine={{stroke: ct.gridColor}}>
                </Pie>
                <Tooltip {...ct.tooltip} formatter={v=>v.toFixed(1)+" "+distUnit}/>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2>Personal Records</h2>
            <div className="records-list">
              {[
                {label:"Longest Activity",  value: computed.longestDist.toFixed(1), unit: distUnit, color:LIME},
                {label:"Peak Calorie Burn", value: Math.max(...wrapped.activities.map(a=>a.calories||0)).toLocaleString(), unit:"kcal", color:RED},
                {label:"Longest Session",   value: Math.max(...wrapped.activities.map(a=>a.duration_secs/3600)).toFixed(1), unit:"hrs", color:PURPLE},
              ].map(r => (
                <div className="record-row" key={r.label}>
                  <div className="rlabel">{r.label}</div>
                  <div className="rvalue" style={{color:r.color}}>{r.value}<span className="runit">{r.unit}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps */}
        <SectionHeader label="Daily Grind" />
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Total Steps</div><div className="kpi-value">{computed.totalSteps.toLocaleString()}</div></div>
          <div className="kpi"><div className="kpi-label">Daily Average</div><div className="kpi-value" style={{color:LIME}}>{computed.avgSteps.toLocaleString()}</div></div>
          <div className="kpi"><div className="kpi-label">Best Day</div><div className="kpi-value" style={{color:RED}}>{computed.bestSteps.toLocaleString()}</div></div>
        </div>

        {/* Sleep */}
        {computed.avgSleep && <>
          <SectionHeader label="Recovery" />
          <div className="kpi-grid">
            <div className="kpi"><div className="kpi-label">Avg Sleep</div><div className="kpi-value" style={{color:PURPLE}}>{computed.avgSleep} <span style={{fontSize:"1rem",color:"var(--muted)"}}>hrs</span></div></div>
            <div className="kpi"><div className="kpi-label">Avg Sleep Score</div><div className="kpi-value">{computed.avgScore}</div></div>
          </div>
        </>}

        <div style={{marginTop:80,paddingTop:28,borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:"0.55rem",letterSpacing:5,color:"var(--border)",textTransform:"uppercase"}}>Garmin Wrapped · {yearSel}</span>
          <span style={{fontSize:"0.55rem",letterSpacing:5,color:"var(--border)",textTransform:"uppercase"}}>Keep Moving</span>
        </div>
      </>}
    </div>
  );
}
