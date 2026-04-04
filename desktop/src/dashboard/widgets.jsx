import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useUnits, useChartTheme } from "../SettingsContext";

const LIME = "#c8f135", BLUE = "#4a90d9", RED = "#ff4545", PURPLE = "#7b61ff", ORANGE = "#f39c12";
const PALETTE = [LIME, BLUE, RED, PURPLE, ORANGE, "#00bcd4", "#ff6b9d", "#a8e6cf"];

function fmt(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function avg(arr) {
  const v = arr.filter(x => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function latestVal(arr, key) {
  return [...arr].reverse().find(d => d[key] != null)?.[key] ?? null;
}

// ── Shared components ─────────────────────────────────────────────────────────

function WTitle({ label, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
      <div style={{ fontSize: "0.6rem", letterSpacing: 2.5, textTransform: "uppercase", color: "var(--sub)", fontWeight: 700 }}>
        {label}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

function Empty({ msg = "No data synced yet" }) {
  return <div style={{ color: "var(--muted)", fontSize: "0.8rem", padding: "12px 0" }}>{msg}</div>;
}

function TrendBadge({ pct, inverse = false }) {
  if (pct == null) return null;
  const good = inverse ? pct < 0 : pct > 0;
  return (
    <span style={{ fontSize: "0.68rem", color: good ? LIME : RED, marginLeft: 6, fontWeight: 600 }}>
      {pct > 0 ? "↑" : "↓"}{Math.abs(pct)}%
    </span>
  );
}

function FilterBtns({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {options.map(([val, lab]) => (
        <button key={val} onClick={() => onChange(val)}
          style={{ padding: "2px 7px", borderRadius: 3, cursor: "pointer", fontSize: "0.68rem",
            border: `1px solid ${value === val ? LIME : "var(--border)"}`,
            background: value === val ? LIME + "22" : "transparent",
            color: value === val ? LIME : "var(--muted)" }}>
          {lab}
        </button>
      ))}
    </div>
  );
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KpiShell({ label, value, unit, color, sub, badge }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 5 }}>
      <div style={{ fontSize: "0.6rem", letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: 900, color, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: "0.85rem", color: "var(--sub)", marginLeft: 4 }}>{unit}</span>}
        {badge}
      </div>
      {sub && <div style={{ fontSize: "0.7rem", color: "var(--sub)" }}>{sub}</div>}
    </div>
  );
}

export function KpiSteps({ data }) {
  const val = latestVal(data.dailyStats, "steps");
  const avg7d = data.insights?.steps?.avg_7d;
  return <KpiShell label="Steps Today" value={val != null ? Math.round(val).toLocaleString() : "—"} color={LIME}
    badge={<TrendBadge pct={data.insights?.steps?.trend_pct} />}
    sub={avg7d != null ? `7d avg ${Math.round(avg7d).toLocaleString()}` : undefined} />;
}

export function KpiCalories({ data }) {
  const val = latestVal(data.dailyStats, "total_calories");
  return <KpiShell label="Calories" value={val != null ? Math.round(val).toLocaleString() : "—"} color={RED}
    badge={<TrendBadge pct={data.insights?.calories?.trend_pct} />}
    sub={data.insights?.calories?.avg_7d ? `7d avg ${Math.round(data.insights.calories.avg_7d).toLocaleString()}` : undefined} />;
}

export function KpiRhr({ data }) {
  const val = latestVal(data.dailyStats, "resting_hr");
  return <KpiShell label="Resting HR" value={val != null ? Math.round(val) : "—"} unit="bpm" color={BLUE}
    badge={<TrendBadge pct={data.insights?.resting_hr?.trend_pct} inverse />}
    sub={data.insights?.resting_hr?.avg_7d ? `7d avg ${Math.round(data.insights.resting_hr.avg_7d)} bpm` : undefined} />;
}

export function KpiAvgHr({ data }) {
  const val = latestVal(data.dailyStats, "avg_hr");
  return <KpiShell label="Avg HR" value={val != null ? Math.round(val) : "—"} unit="bpm" color={ORANGE} />;
}

export function KpiSleep({ data }) {
  const latest = [...(data.sleep || [])].reverse().find(d => d.duration_secs != null);
  const hrs = latest?.duration_secs ? (latest.duration_secs / 3600).toFixed(1) : null;
  const avgHrs = data.insights?.sleep?.avg_hrs_7d;
  return <KpiShell label="Sleep Last Night" value={hrs ?? "—"} unit="hrs" color={PURPLE}
    sub={[latest?.score ? `Score ${Math.round(latest.score)}` : null, avgHrs ? `7d avg ${avgHrs}h` : null].filter(Boolean).join(" · ")} />;
}

export function KpiHrv({ data }) {
  const latest = [...(data.hrv || [])].reverse().find(d => d.last_night_avg != null);
  const val = latest?.last_night_avg;
  return <KpiShell label="HRV" value={val != null ? Math.round(val) : "—"} unit="ms" color={LIME}
    sub={latest?.weekly_avg ? `7d avg ${Math.round(latest.weekly_avg)} ms` : undefined} />;
}

// ── Readiness ─────────────────────────────────────────────────────────────────

export function ReadinessCard({ data }) {
  const r = data.readiness;
  if (!r || r.composite == null) return <><WTitle label="Readiness" /><Empty /></>;
  const score = r.composite;
  const color = score >= 80 ? LIME : score >= 65 ? BLUE : score >= 45 ? ORANGE : RED;
  const R = 32, circ = 2 * Math.PI * R;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Readiness" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <svg width={80} height={80} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={40} cy={40} r={R} fill="none" stroke="var(--border)" strokeWidth={6} />
              <circle cx={40} cy={40} r={R} fill="none" stroke={color} strokeWidth={6}
                strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color }}>{score}</div>
            </div>
          </div>
          <div style={{ fontSize: "0.6rem", letterSpacing: 2, color: "var(--sub)", textTransform: "uppercase" }}>{r.label}</div>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[{ label: "HRV", val: r.hrv_score }, { label: "Sleep", val: r.sleep_score }, { label: "RHR", val: r.rhr_score }].map(({ label, val }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.6rem", color: "var(--muted)", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: val >= 65 ? LIME : val >= 45 ? ORANGE : RED }}>
                {val ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Personal Records ──────────────────────────────────────────────────────────

export function PersonalRecordsCard({ data }) {
  const r = data.records;
  const { mToDist, distUnit } = useUnits();
  if (!r) return <><WTitle label="Personal Records" /><Empty /></>;

  const items = [
    r.best_steps_days?.[0] && {
      label: "Best Step Day", value: Number(r.best_steps_days[0].steps).toLocaleString(),
      color: LIME, sub: new Date(r.best_steps_days[0].date).toLocaleDateString(),
    },
    r.longest_run && {
      label: "Longest Activity", value: `${mToDist(r.longest_run.distance_meters).toFixed(1)} ${distUnit}`,
      color: RED,
    },
    r.lowest_rhr && { label: "Lowest Resting HR", value: `${r.lowest_rhr.resting_hr} bpm`, color: BLUE },
    r.best_sleep_score && { label: "Best Sleep Score", value: Math.round(r.best_sleep_score.score), color: PURPLE },
    r.longest_session && {
      label: "Longest Session",
      value: `${(r.longest_session.duration_secs / 3600).toFixed(1)}h`,
      color: ORANGE,
    },
  ].filter(Boolean);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Personal Records" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", minHeight: 0 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--sub)" }}>{it.label}</span>
            <div>
              <span style={{ fontWeight: 700, color: it.color }}>{it.value}</span>
              {it.sub && <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: 6 }}>{it.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Steps Chart ───────────────────────────────────────────────────────────────

export function StepsChart({ data }) {
  const [filter, setFilter] = useState("all");
  const ct = useChartTheme();
  const ds = data.dailyStats || [];

  const plotData = useMemo(() => {
    if (!ds.length) return [];
    const now = new Date();
    const cutoffs = { "30d": 30, "90d": 90, "1y": 365 };
    const days = cutoffs[filter];
    if (!days) return ds;
    const cutoff = new Date(now - days * 86400000);
    return ds.filter(d => new Date(d.date) >= cutoff);
  }, [ds, filter]);

  const peak = plotData.length ? Math.max(...plotData.map(d => d.steps || 0)) : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Daily Steps" right={
        <FilterBtns options={[["30d","30d"],["90d","90d"],["1y","1y"],["all","All"]]} value={filter} onChange={setFilter} />
      } />
      {plotData.length ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plotData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={48} />
              <Tooltip {...ct.tooltip} labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => v ? v.toLocaleString() : "—"} />
              <Bar dataKey="steps" radius={[2,2,0,0]} isAnimationActive={false}
                shape={p => <rect x={p.x} y={p.y} width={p.width} height={p.height} fill={(p.steps||0) >= peak && peak > 0 ? RED : BLUE} rx={2} />}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty msg="Sync daily stats to see steps" />}
    </div>
  );
}

// ── Calories Chart ────────────────────────────────────────────────────────────

export function CaloriesChart({ data }) {
  const ct = useChartTheme();
  const chartData = (data.dailyStats || [])
    .filter(d => (d.total_calories || 0) <= 10000)
    .map(d => ({ date: d.date, "Active": d.active_calories, "Total": d.total_calories }));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Calories" />
      {chartData.length ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={48} />
              <CartesianGrid stroke={ct.gridColor} vertical={false} />
              <Tooltip {...ct.tooltip} labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => v ? v.toLocaleString() : "—"} />
              <Line type="monotone" dataKey="Active" stroke={BLUE} dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="Total" stroke={ORANGE} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty />}
    </div>
  );
}

// ── HR Chart ──────────────────────────────────────────────────────────────────

export function HrChart({ data }) {
  const ct = useChartTheme();
  const chartData = (data.dailyStats || []).map(d => ({
    date: d.date, "Resting": d.resting_hr, "Average": d.avg_hr,
  }));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Heart Rate" />
      {chartData.length ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={40} />
              <CartesianGrid stroke={ct.gridColor} vertical={false} />
              <Tooltip {...ct.tooltip} labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => v ? Math.round(v) + " bpm" : "—"} />
              <Line type="monotone" dataKey="Resting" stroke={RED} dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="Average" stroke={LIME} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty />}
    </div>
  );
}

// ── Year-over-Year Steps ──────────────────────────────────────────────────────

export function YoySteps({ data }) {
  const ct = useChartTheme();
  const yoyMap = {};
  (data.dailyStats || []).forEach(d => {
    const yr = new Date(d.date).getFullYear();
    if (!yoyMap[yr]) yoyMap[yr] = { sum: 0, n: 0 };
    if (d.steps) { yoyMap[yr].sum += d.steps; yoyMap[yr].n++; }
  });
  const chartData = Object.entries(yoyMap).sort(([a],[b]) => a - b)
    .map(([yr, v]) => ({ year: yr, "Avg Steps": v.n ? Math.round(v.sum / v.n) : 0 }));

  if (chartData.length < 2) return <><WTitle label="Year-over-Year · Avg Daily Steps" /><Empty msg="Need 2+ years of data" /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Year-over-Year · Avg Daily Steps" />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 18, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="year" tick={ct.axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={50} />
            <Tooltip {...ct.tooltip} formatter={v => v.toLocaleString()} />
            <Bar dataKey="Avg Steps" fill={LIME} radius={[3,3,0,0]} isAnimationActive={false}
              shape={p => (
                <g>
                  <rect x={p.x} y={p.y} width={p.width} height={p.height} fill={LIME} rx={3} />
                  <text x={p.x + p.width / 2} y={p.y - 5} textAnchor="middle" fill="var(--sub)" fontSize={10} fontWeight={600}>
                    {Number(p["Avg Steps"]).toLocaleString()}
                  </text>
                </g>
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Step Milestones ───────────────────────────────────────────────────────────

export function StepMilestones({ data }) {
  const [period, setPeriod] = useState("year");
  const ds = data.dailyStats || [];
  const now = new Date();

  const filtered = useMemo(() => {
    if (period === "30d")  return ds.filter(d => new Date(d.date) >= new Date(now - 30 * 86400000));
    if (period === "90d")  return ds.filter(d => new Date(d.date) >= new Date(now - 90 * 86400000));
    if (period === "year") return ds.filter(d => new Date(d.date).getFullYear() === now.getFullYear());
    return ds;
  }, [ds, period]);

  const milestones = [
    { label: "5k+",  threshold: 5000,  color: LIME },
    { label: "10k+", threshold: 10000, color: BLUE },
    { label: "20k+", threshold: 20000, color: ORANGE },
    { label: "30k+", threshold: 30000, color: RED },
  ].map(m => ({ ...m, count: filtered.filter(d => (d.steps || 0) >= m.threshold).length }));

  const PERIODS = [["30d","30d"],["90d","90d"],["year","Year"],["all","All"]];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Step Milestones" right={
        <select value={period} onChange={e => setPeriod(e.target.value)}
          style={{ background: "var(--bg)", color: "var(--sub)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 4px", fontSize: "0.68rem" }}>
          {PERIODS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      } />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, alignItems: "center", minHeight: 0 }}>
        {milestones.map(m => (
          <div key={m.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.count}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: 3 }}>{m.label} days</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Weekly Summary ────────────────────────────────────────────────────────────

export function WeeklySummary({ data }) {
  const { mToDist, distUnit } = useUnits();
  const now = new Date();
  const cutoff = new Date(now - 7 * 86400000);

  const stats = (data.dailyStats || []).filter(d => new Date(d.date) >= cutoff);
  const acts  = (data.activities  || []).filter(a => new Date(a.start_time) >= cutoff);
  const sleep = (data.sleep       || []).filter(s => new Date(s.date) >= cutoff);

  const rows = [
    { label: "Workouts",     value: acts.length, unit: "sessions",  color: BLUE },
    { label: "Avg Steps",    value: avg(stats.map(d => d.steps)) != null ? Math.round(avg(stats.map(d => d.steps))).toLocaleString() : "—", unit: "/day", color: LIME },
    { label: "Distance",     value: mToDist(acts.reduce((s,a) => s + (a.distance_meters||0), 0)).toFixed(1), unit: distUnit, color: ORANGE },
    { label: "Active Cal",   value: Math.round(stats.reduce((s,d) => s + (d.active_calories||0), 0)).toLocaleString(), unit: "kcal", color: RED },
    { label: "Avg Sleep",    value: avg(sleep.map(s => s.duration_secs ? s.duration_secs/3600 : null)) != null ? avg(sleep.map(s => s.duration_secs ? s.duration_secs/3600 : null)).toFixed(1) : "—", unit: "hrs/night", color: PURPLE },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Last 7 Days" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", minHeight: 0 }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--sub)" }}>{row.label}</span>
            <span>
              <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
              <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginLeft: 4 }}>{row.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Monthly Summary ───────────────────────────────────────────────────────────

export function MonthlySummary({ data }) {
  const { mToDist, distUnit } = useUnits();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const stats = (data.dailyStats || []).filter(d => d.date.startsWith(monthStr));
  const acts  = (data.activities  || []).filter(a => a.start_time.startsWith(monthStr));
  const sleep = (data.sleep       || []).filter(s => s.date.startsWith(monthStr));

  const avgSleep = avg(sleep.map(s => s.duration_secs ? s.duration_secs / 3600 : null));

  const rows = [
    { label: "Workouts",   value: acts.length, unit: "sessions", color: BLUE },
    { label: "Total Steps", value: stats.reduce((s,d) => s + (d.steps||0), 0).toLocaleString(), unit: "steps", color: LIME },
    { label: `Distance`, value: mToDist(acts.reduce((s,a) => s + (a.distance_meters||0), 0)).toFixed(1), unit: distUnit, color: ORANGE },
    { label: "Avg Sleep",  value: avgSleep != null ? avgSleep.toFixed(1) : "—", unit: "hrs/night", color: PURPLE },
    { label: "Active Cal", value: Math.round(stats.reduce((s,d) => s + (d.active_calories||0), 0)).toLocaleString(), unit: "kcal", color: RED },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label={`${MONTHS[now.getMonth()]} Summary`} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", minHeight: 0 }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--sub)" }}>{row.label}</span>
            <span>
              <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
              <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginLeft: 4 }}>{row.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Breakdown ────────────────────────────────────────────────────────

export function ActivityBreakdown({ data }) {
  const [period, setPeriod] = useState("all");
  const ct = useChartTheme();
  const now = new Date();

  const acts = useMemo(() => {
    const all = data.activities || [];
    const cutoffs = { "30d": 30, "90d": 90, "1y": 365 };
    const days = cutoffs[period];
    if (!days) return all;
    return all.filter(a => new Date(a.start_time) >= new Date(now - days * 86400000));
  }, [data.activities, period]);

  const typeMap = {};
  acts.forEach(a => { const t = a.activity_type || "unknown"; typeMap[t] = (typeMap[t] || 0) + 1; });
  const pieData = Object.entries(typeMap).sort((a,b) => b[1]-a[1]).slice(0, 8)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Activity Breakdown" right={
        <FilterBtns options={[["30d","30d"],["90d","90d"],["1y","1y"],["all","All"]]} value={period} onChange={setPeriod} />
      } />
      {pieData.length ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minHeight: 0 }}>
          <div style={{ width: "50%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius="35%" outerRadius="72%">
                  {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip {...ct.tooltip} formatter={v => [v, "activities"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 4 }}>
            {pieData.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                <span style={{ fontSize: "0.7rem", color: "var(--sub)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <Empty msg="No activities found" />}
    </div>
  );
}

// ── Long Run Progression ──────────────────────────────────────────────────────

export function LongRunProgression({ data }) {
  const ct = useChartTheme();
  const { mToDist, distUnit } = useUnits();

  const runs = useMemo(() => {
    return (data.activities || [])
      .filter(a => (a.activity_type || "").toLowerCase().includes("run") && (a.distance_meters || 0) > 0)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map(a => ({ date: a.start_time.slice(0, 10), dist: +mToDist(a.distance_meters).toFixed(2) }));
  }, [data.activities, mToDist]);

  if (!runs.length) return <><WTitle label="Run Distance Progression" /><Empty msg="No running activities found" /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Run Distance Progression" />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={runs} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={45} unit={` ${distUnit}`} />
            <CartesianGrid stroke={ct.gridColor} vertical={false} />
            <Tooltip {...ct.tooltip} labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => [`${v} ${distUnit}`, "Distance"]} />
            <Line type="monotone" dataKey="dist" stroke={LIME} dot={{ r: 2, fill: LIME }} strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Cumulative Mileage ────────────────────────────────────────────────────────

export function CumulativeMileage({ data }) {
  const ct = useChartTheme();
  const { mToDist, distUnit } = useUnits();
  const curYear = new Date().getFullYear();
  const prevYear = curYear - 1;

  const { chartData } = useMemo(() => {
    const byDoy = { [curYear]: {}, [prevYear]: {} };
    (data.activities || []).forEach(a => {
      const d = new Date(a.start_time);
      const yr = d.getFullYear();
      if (yr !== curYear && yr !== prevYear) return;
      const doy = Math.floor((d - new Date(yr, 0, 0)) / 86400000);
      byDoy[yr][doy] = (byDoy[yr][doy] || 0) + (a.distance_meters || 0);
    });

    const todayDoy = Math.floor((new Date() - new Date(curYear, 0, 0)) / 86400000);
    const maxDoy = Math.max(todayDoy, ...Object.keys(byDoy[prevYear]).map(Number).filter(n => n > 0), 10);

    let cum_cur = 0, cum_prev = 0;
    const chartData = [];
    for (let doy = 1; doy <= maxDoy; doy++) {
      cum_cur  += byDoy[curYear][doy]  || 0;
      cum_prev += byDoy[prevYear][doy] || 0;
      chartData.push({
        doy,
        [curYear]:  doy <= todayDoy ? +mToDist(cum_cur).toFixed(1)  : undefined,
        [prevYear]: +mToDist(cum_prev).toFixed(1),
      });
    }
    return { chartData };
  }, [data.activities, mToDist, curYear, prevYear]);

  if (!chartData.length) return <><WTitle label={`Cumulative Distance`} /><Empty /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label={`Cumulative Distance · ${curYear} vs ${prevYear}`} right={
        <div style={{ display: "flex", gap: 12 }}>
          {[{ yr: curYear, color: LIME, dash: false }, { yr: prevYear, color: BLUE, dash: true }].map(({ yr, color, dash }) => (
            <div key={yr} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 14, height: 2, background: color, opacity: dash ? 0.6 : 1, borderBottom: dash ? "1px dashed" : "none" }} />
              <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{yr}</span>
            </div>
          ))}
        </div>
      } />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="doy" tick={ct.axisTick} axisLine={false} tickLine={false} interval={30}
              tickFormatter={doy => new Date(curYear, 0, Number(doy)).toLocaleDateString("en-US", { month: "short" })} />
            <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={50} unit={` ${distUnit}`} />
            <CartesianGrid stroke={ct.gridColor} vertical={false} />
            <Tooltip {...ct.tooltip}
              formatter={(v, name) => [v != null ? `${v} ${distUnit}` : "—", name]}
              labelFormatter={doy => new Date(curYear, 0, Number(doy)).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
            <Line type="monotone" dataKey={curYear}  stroke={LIME} dot={false} strokeWidth={2} isAnimationActive={false} connectNulls={false} />
            <Line type="monotone" dataKey={prevYear} stroke={BLUE} dot={false} strokeWidth={1.5} strokeDasharray="5 3" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Best Performances ─────────────────────────────────────────────────────────

export function BestPerformances({ data }) {
  const [tab, setTab] = useState("steps");
  const { mToDist, distUnit } = useUnits();

  const topSteps = useMemo(() =>
    [...(data.dailyStats || [])].filter(d => d.steps).sort((a,b) => b.steps - a.steps).slice(0, 10),
    [data.dailyStats]);
  const topActs = useMemo(() =>
    [...(data.activities || [])].filter(a => a.distance_meters).sort((a,b) => b.distance_meters - a.distance_meters).slice(0, 10),
    [data.activities]);
  const topSleep = useMemo(() =>
    [...(data.sleep || [])].filter(s => s.score).sort((a,b) => b.score - a.score).slice(0, 10),
    [data.sleep]);

  const Row = ({ rank, left, right, color }) => (
    <div style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border)", gap: 6 }}>
      <span style={{ fontSize: "0.65rem", color: "var(--muted)", width: 22, flexShrink: 0 }}>#{rank}</span>
      <span style={{ fontSize: "0.73rem", color: "var(--sub)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{left}</span>
      <span style={{ fontWeight: 700, color, fontSize: "0.85rem", flexShrink: 0 }}>{right}</span>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Best Performances" />
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexShrink: 0 }}>
        {[["steps","Top Steps"],["activities","Top Activities"],["sleep","Best Sleep"]].map(([val, lab]) => (
          <button key={val} onClick={() => setTab(val)}
            style={{ padding: "3px 9px", borderRadius: 3, cursor: "pointer", fontSize: "0.7rem", border: `1px solid ${tab===val ? LIME : "var(--border)"}`,
              background: tab===val ? LIME+"22" : "transparent", color: tab===val ? LIME : "var(--muted)" }}>
            {lab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {tab === "steps"      && topSteps.map((d,i) => <Row key={d.date} rank={i+1} left={new Date(d.date).toLocaleDateString()} right={d.steps.toLocaleString()} color={LIME} />)}
        {tab === "activities" && topActs.map((a,i)  => <Row key={a.activity_id} rank={i+1} left={`${(a.activity_type||"").replace(/_/g," ")} · ${new Date(a.start_time).toLocaleDateString()}`} right={`${mToDist(a.distance_meters).toFixed(1)} ${distUnit}`} color={RED} />)}
        {tab === "sleep"      && topSleep.map((s,i)  => <Row key={s.date} rank={i+1} left={new Date(s.date).toLocaleDateString()} right={`${Math.round(s.score)} · ${s.duration_secs ? (s.duration_secs/3600).toFixed(1)+"h" : ""}`} color={PURPLE} />)}
      </div>
    </div>
  );
}

// ── Body Battery ──────────────────────────────────────────────────────────────

export function BodyBatteryChart({ data }) {
  const ct = useChartTheme();
  const [days, setDays] = useState(90);
  const now = new Date();

  const chartData = useMemo(() =>
    (data.bodyBattery || [])
      .filter(d => new Date(d.date) >= new Date(now - days * 86400000))
      .map(d => ({ date: d.date, High: d.high_value, Low: d.low_value })),
    [data.bodyBattery, days]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Body Battery" right={
        <FilterBtns options={[[30,"30d"],[90,"90d"]]} value={days} onChange={v => setDays(Number(v))} />
      } />
      {chartData.length ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
              <CartesianGrid stroke={ct.gridColor} vertical={false} />
              <Tooltip {...ct.tooltip} labelFormatter={d => new Date(d).toLocaleDateString()} />
              <Line type="monotone" dataKey="High" stroke={LIME} dot={false} strokeWidth={1.5} isAnimationActive={false} />
              <Line type="monotone" dataKey="Low"  stroke={RED}  dot={false} strokeWidth={1.5} strokeDasharray="4 2" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty msg="Sync body battery data first" />}
    </div>
  );
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const WIDGET_REGISTRY = [
  // Metrics
  { id: "kpi_steps",     title: "Steps Today",       category: "Metrics",     desc: "Today's step count with 7-day trend",           defaultW: 3,  defaultH: 2, minW: 2, minH: 2, component: KpiSteps },
  { id: "kpi_calories",  title: "Calories",           category: "Metrics",     desc: "Today's calorie burn with trend",               defaultW: 3,  defaultH: 2, minW: 2, minH: 2, component: KpiCalories },
  { id: "kpi_rhr",       title: "Resting HR",         category: "Metrics",     desc: "Latest resting heart rate",                     defaultW: 3,  defaultH: 2, minW: 2, minH: 2, component: KpiRhr },
  { id: "kpi_avg_hr",    title: "Average HR",         category: "Metrics",     desc: "Latest average heart rate",                     defaultW: 3,  defaultH: 2, minW: 2, minH: 2, component: KpiAvgHr },
  { id: "kpi_sleep",     title: "Sleep",              category: "Metrics",     desc: "Last night's sleep duration and score",         defaultW: 3,  defaultH: 2, minW: 2, minH: 2, component: KpiSleep },
  { id: "kpi_hrv",       title: "HRV",                category: "Metrics",     desc: "Last night's HRV reading",                      defaultW: 3,  defaultH: 2, minW: 2, minH: 2, component: KpiHrv },
  // Charts
  { id: "steps_chart",          title: "Daily Steps",           category: "Charts",      desc: "Bar chart of daily step counts",                    defaultW: 12, defaultH: 5, minW: 5, minH: 3, component: StepsChart },
  { id: "calories_chart",       title: "Calories Chart",        category: "Charts",      desc: "Active vs total calories over time",                defaultW: 6,  defaultH: 4, minW: 4, minH: 3, component: CaloriesChart },
  { id: "hr_chart",             title: "Heart Rate Chart",      category: "Charts",      desc: "Resting and average HR over time",                  defaultW: 6,  defaultH: 4, minW: 4, minH: 3, component: HrChart },
  { id: "yoy_steps",            title: "Year-over-Year Steps",  category: "Charts",      desc: "Average daily steps by year",                       defaultW: 12, defaultH: 4, minW: 5, minH: 3, component: YoySteps },
  { id: "body_battery_chart",   title: "Body Battery",          category: "Charts",      desc: "Daily body battery high and low",                   defaultW: 6,  defaultH: 4, minW: 4, minH: 3, component: BodyBatteryChart },
  { id: "long_run_progression", title: "Run Progression",       category: "Charts",      desc: "Running distance over time",                        defaultW: 8,  defaultH: 4, minW: 5, minH: 3, component: LongRunProgression },
  { id: "cumulative_mileage",   title: "Cumulative Distance",   category: "Charts",      desc: "YTD distance vs same period last year",             defaultW: 12, defaultH: 4, minW: 6, minH: 3, component: CumulativeMileage },
  { id: "activity_breakdown",   title: "Activity Breakdown",    category: "Charts",      desc: "Pie chart of activity types",                       defaultW: 6,  defaultH: 4, minW: 4, minH: 3, component: ActivityBreakdown },
  // Summaries & Health
  { id: "readiness_card",    title: "Readiness",          category: "Health",      desc: "Composite readiness score from HRV, sleep, RHR",  defaultW: 6,  defaultH: 3, minW: 4, minH: 3, component: ReadinessCard },
  { id: "personal_records",  title: "Personal Records",   category: "Health",      desc: "All-time personal bests",                         defaultW: 6,  defaultH: 3, minW: 4, minH: 3, component: PersonalRecordsCard },
  { id: "weekly_summary",    title: "Weekly Summary",     category: "Summaries",   desc: "Last 7 days at a glance",                         defaultW: 6,  defaultH: 3, minW: 3, minH: 3, component: WeeklySummary },
  { id: "monthly_summary",   title: "Monthly Summary",    category: "Summaries",   desc: "This month's totals",                             defaultW: 6,  defaultH: 3, minW: 3, minH: 3, component: MonthlySummary },
  { id: "step_milestones",   title: "Step Milestones",    category: "Summaries",   desc: "Count of 5k / 10k / 20k / 30k step days",        defaultW: 6,  defaultH: 2, minW: 3, minH: 2, component: StepMilestones },
  { id: "best_performances", title: "Best Performances",  category: "Summaries",   desc: "Top 10 step days, distances, sleep scores",       defaultW: 6,  defaultH: 5, minW: 4, minH: 4, component: BestPerformances },
];
