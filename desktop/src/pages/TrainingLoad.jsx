import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from "recharts";
import { api } from "../api";
import { useChartTheme } from "../SettingsContext";

// ── Training stress model ─────────────────────────────────────────────────────
// Daily stress score = (duration_hrs) * (avg_hr / threshold_hr)^2 * 100
// threshold_hr estimated as 85% of global max HR
// ATL = 7-day EWA  (acute — how tired you are now)
// CTL = 42-day EWA (chronic — your fitness base)
// TSB = CTL - ATL  (form: positive = rested, negative = fatigued)

function ema(vals, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = null;
  for (const v of vals) {
    if (prev === null) { result.push(v); prev = v; }
    else { const e = v * k + prev * (1 - k); result.push(+e.toFixed(1)); prev = e; }
  }
  return result;
}

function buildDailyStress(activities, globalMaxHr) {
  const thresholdHr = globalMaxHr * 0.85;
  const byDate = {};
  activities.forEach(a => {
    const date = a.start_time.slice(0, 10);
    const hrs  = (a.duration_secs || 0) / 3600;
    const hrRatio = a.avg_hr ? (a.avg_hr / thresholdHr) : 0.6;
    const stress = hrs * hrRatio * hrRatio * 100;
    byDate[date] = (byDate[date] || 0) + stress;
  });
  return byDate;
}

function buildTimeSeries(activities, globalMaxHr) {
  const stressMap = buildDailyStress(activities, globalMaxHr);
  if (!activities.length) return [];

  // fill every day from first activity to today
  const dates = Object.keys(stressMap).sort();
  if (!dates.length) return [];
  const start = new Date(dates[0]);
  const end   = new Date();
  const allDates = [];
  const cur = new Date(start);
  while (cur <= end) {
    allDates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  const stressVals = allDates.map(d => stressMap[d] || 0);
  const ctlVals    = ema(stressVals, 42);
  const atlVals    = ema(stressVals, 7);

  return allDates.map((date, i) => ({
    date,
    stress: +stressVals[i].toFixed(1),
    CTL:    ctlVals[i],
    ATL:    atlVals[i],
    TSB:    +(ctlVals[i] - atlVals[i]).toFixed(1),
  }));
}

function fmt(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TLSkeleton() {
  return (
    <div>
      <h1>Training Load</h1>
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        {[0,1,2,3].map(i => <div className="kpi" key={i}><div className="skeleton skeleton-label" /><div className="skeleton skeleton-kpi" /></div>)}
      </div>
      <div className="card"><div className="skeleton" style={{ height: 280, borderRadius: 4 }} /></div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TrainingLoad() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const ct = useChartTheme();
  const [days, setDays]       = useState(180);

  useEffect(() => {
    api.activities()
      .then(a => { setActivities(a); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const globalMaxHr = useMemo(() => {
    const vals = activities.map(a => a.max_hr).filter(Boolean).sort((a, b) => a - b);
    if (!vals.length) return 190;
    return vals[Math.floor(vals.length * 0.95)] || vals[vals.length - 1];
  }, [activities]);

  const series   = useMemo(() => buildTimeSeries(activities, globalMaxHr), [activities, globalMaxHr]);
  const trimmed  = useMemo(() => series.slice(-days), [series, days]);

  if (loading) return <TLSkeleton />;
  if (error)   return <p className="error">Error: {error}</p>;
  if (!series.length) return <p style={{ color: "var(--muted)" }}>No activity data yet.</p>;

  const latest  = series[series.length - 1] || {};
  const ctl     = latest.CTL ?? "—";
  const atl     = latest.ATL ?? "—";
  const tsb     = latest.TSB ?? "—";
  const tsbLabel = typeof tsb === "number"
    ? tsb > 10 ? "Fresh" : tsb > 0 ? "Neutral" : tsb > -10 ? "Tired" : "Very Fatigued"
    : "—";
  const tsbColor = typeof tsb === "number"
    ? tsb > 10 ? "#c8f135" : tsb > 0 ? "#50c878" : tsb > -10 ? "#f5a623" : "#e85d04"
    : "var(--text)";

  return (
    <div>
      <h1>Training Load</h1>
      <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 24, marginTop: -12 }}>
        CTL = fitness base (42-day), ATL = fatigue (7-day), TSB = form (CTL − ATL).
      </p>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Fitness (CTL)</div>
          <div className="kpi-value" style={{ color: "#4a90d9" }}>{ctl}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Fatigue (ATL)</div>
          <div className="kpi-value" style={{ color: "#e85d04" }}>{atl}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Form (TSB)</div>
          <div className="kpi-value" style={{ color: tsbColor }}>{tsb}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Status</div>
          <div className="kpi-value" style={{ color: tsbColor, fontSize: "1.3rem" }}>{tsbLabel}</div>
        </div>
      </div>

      {/* Range picker */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[90, 180, 365, 0].map(d => (
          <button
            key={d}
            onClick={() => setDays(d || series.length)}
            style={{
              background: days === (d || series.length) ? "#c8f135" : "var(--surface)",
              color:       days === (d || series.length) ? "#000"    : "var(--text)",
              border: "1px solid var(--border)", borderRadius: 4,
              padding: "5px 12px", fontSize: "0.8rem", cursor: "pointer",
            }}
          >{d ? `${d}d` : "All"}</button>
        ))}
      </div>

      <div className="card">
        <h2>CTL · ATL · TSB</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trimmed} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tickFormatter={fmt} tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={35} />
            <CartesianGrid stroke={ct.gridColor} vertical={false} />
            <ReferenceLine y={0} stroke={ct.gridColor} strokeDasharray="4 2" />
            <Tooltip {...ct.tooltip} labelFormatter={d => new Date(d).toLocaleDateString()} formatter={v => v.toFixed(1)} />
            <Legend wrapperStyle={{ fontSize: "0.75rem", color: "var(--muted)" }} />
            <Line type="monotone" dataKey="CTL" stroke="#4a90d9" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="ATL" stroke="#e85d04" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="TSB" stroke="#c8f135" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
