import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useUnits, useChartTheme } from "../SettingsContext";

const LIME = "#c8f135", BLUE = "#4a90d9", RED = "#ff4545", PURPLE = "#7b61ff", ORANGE = "#f39c12";
const TEAL = "#00bcd4", PINK = "#ff6b9d";

function WTitle({ label, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexShrink: 0 }}>
      <div style={{ fontSize: "0.6rem", letterSpacing: 2.5, textTransform: "uppercase", color: "var(--sub)", fontWeight: 700 }}>{label}</div>
      {right && <div>{right}</div>}
    </div>
  );
}

function Empty({ msg = "No running data" }) {
  return <div style={{ color: "var(--muted)", fontSize: "0.8rem", padding: "12px 0" }}>{msg}</div>;
}

function fmtPace(minPerMi) {
  if (minPerMi == null) return "—";
  const mins = Math.floor(minPerMi);
  const secs = Math.round((minPerMi - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function fmtDuration(secs) {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDist(meters) {
  const mi = meters / 1609.34;
  return mi >= 10 ? mi.toFixed(1) : mi.toFixed(2);
}

// ── Weekly Summary ──────────────────────────────────────────────────────────

export function RunWeeklySummary({ data }) {
  const rd = data.running;
  if (!rd) return <><WTitle label="This Week" /><Empty /></>;
  const s = rd.weekly_summary;
  if (!s || !s.runs) return <><WTitle label="This Week" /><Empty msg="No runs this week" /></>;

  const stats = [
    { label: "Runs", value: s.runs, color: LIME },
    { label: "Distance", value: `${fmtDist(s.distance_m)} mi`, color: BLUE },
    { label: "Time", value: fmtDuration(s.duration_secs), color: ORANGE },
    { label: "Avg Pace", value: `${fmtPace(s.avg_pace_min_mi)} /mi`, color: PURPLE },
    { label: "Avg HR", value: s.avg_hr ? `${s.avg_hr} bpm` : "—", color: RED },
    { label: "Elevation", value: s.total_elevation ? `${Math.round(s.total_elevation)} ft` : "—", color: TEAL },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="This Week" />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8, alignContent: "center", minHeight: 0 }}>
        {stats.map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.55rem", color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── VO2 Max ─────────────────────────────────────────────────────────────────

export function RunVO2Max({ data }) {
  const ct = useChartTheme();
  const rd = data.running;
  if (!rd) return <><WTitle label="VO2 Max" /><Empty /></>;

  const current = rd.current_vo2max;
  const history = rd.vo2max_history || [];
  // Show last 30 data points for sparkline
  const sparkData = history.slice(-30);

  const rating = current >= 55 ? "Excellent" : current >= 50 ? "Good" : current >= 45 ? "Fair" : current ? "Developing" : null;
  const ratingColor = current >= 55 ? LIME : current >= 50 ? BLUE : current >= 45 ? ORANGE : RED;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="VO2 Max" />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: "2.2rem", fontWeight: 900, color: LIME, lineHeight: 1 }}>{current ?? "—"}</span>
        <span style={{ fontSize: "0.75rem", color: "var(--sub)" }}>ml/kg/min</span>
        {rating && <span style={{ fontSize: "0.65rem", fontWeight: 700, color: ratingColor, marginLeft: 4 }}>{rating}</span>}
      </div>
      {sparkData.length > 2 && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <LineChart data={sparkData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
              <Tooltip {...ct.tooltip} labelFormatter={d => d} formatter={v => [`${v} ml/kg/min`, "VO2 Max"]} />
              <Line type="monotone" dataKey="value" stroke={LIME} dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Running Records ─────────────────────────────────────────────────────────

export function RunRecords({ data }) {
  const rd = data.running;
  if (!rd || !rd.records) return <><WTitle label="Running PRs" /><Empty /></>;

  const rec = rd.records;
  const items = [
    rec.fastest_mile    && { label: "Mile",     pace: rec.fastest_mile.pace_min_mi,    date: rec.fastest_mile.date },
    rec.fastest_5k      && { label: "5K",       pace: rec.fastest_5k.pace_min_mi,      date: rec.fastest_5k.date },
    rec.fastest_10k     && { label: "10K",      pace: rec.fastest_10k.pace_min_mi,     date: rec.fastest_10k.date },
    rec.fastest_half    && { label: "Half",     pace: rec.fastest_half.pace_min_mi,    date: rec.fastest_half.date },
    rec.fastest_marathon && { label: "Marathon", pace: rec.fastest_marathon.pace_min_mi, date: rec.fastest_marathon.date },
    rec.longest_run     && { label: "Longest",  dist: rec.longest_run.distance_m,      date: rec.longest_run.date, dur: rec.longest_run.duration_secs },
  ].filter(Boolean);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Running PRs" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", minHeight: 0 }}>
        {items.map(it => (
          <div key={it.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--sub)" }}>{it.label}</span>
            <div>
              <span style={{ fontWeight: 700, color: LIME }}>
                {it.pace ? `${fmtPace(it.pace)} /mi` : `${fmtDist(it.dist)} mi`}
              </span>
              {it.dur && <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginLeft: 6 }}>{fmtDuration(it.dur)}</span>}
              <span style={{ fontSize: "0.6rem", color: "var(--muted)", marginLeft: 6 }}>{it.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Weekly Mileage Chart ────────────────────────────────────────────────────

export function RunWeeklyMileage({ data }) {
  const ct = useChartTheme();
  const rd = data.running;
  if (!rd) return <><WTitle label="Weekly Mileage" /><Empty /></>;

  const chartData = useMemo(() => {
    const wm = rd.weekly_mileage || [];
    return wm.slice(-26).map(w => ({
      week: w.week,
      miles: +(w.distance_m / 1609.34).toFixed(1),
    }));
  }, [rd.weekly_mileage]);

  if (!chartData.length) return <><WTitle label="Weekly Mileage" /><Empty /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Weekly Mileage" />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="week" tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={36} />
            <Tooltip {...ct.tooltip} formatter={v => [`${v} mi`, "Distance"]} />
            <Bar dataKey="miles" fill={BLUE} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Pace Trend Chart ────────────────────────────────────────────────────────

export function RunPaceTrend({ data }) {
  const ct = useChartTheme();
  const rd = data.running;
  if (!rd) return <><WTitle label="Pace Trend" /><Empty /></>;

  const chartData = useMemo(() => {
    return (rd.pace_trend || []).map(p => ({
      month: p.month,
      pace: p.avg_pace_min_mi ? +p.avg_pace_min_mi.toFixed(2) : null,
    }));
  }, [rd.pace_trend]);

  if (chartData.length < 2) return <><WTitle label="Pace Trend" /><Empty msg="Need more data" /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Pace Trend" right={<span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>min/mi (lower = faster)</span>} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="month" tick={ct.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={ct.axisTick} axisLine={false} tickLine={false} width={40} reversed />
            <CartesianGrid stroke={ct.gridColor} vertical={false} />
            <Tooltip {...ct.tooltip} formatter={v => [fmtPace(v) + " /mi", "Avg Pace"]} />
            <Line type="monotone" dataKey="pace" stroke={PURPLE} dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Running Dynamics ────────────────────────────────────────────────────────

export function RunDynamics({ data }) {
  const rd = data.running;
  if (!rd || !rd.dynamics_avg) return <><WTitle label="Running Dynamics" /><Empty /></>;

  const d = rd.dynamics_avg;
  const metrics = [
    { label: "Cadence", value: d.cadence ? `${Math.round(d.cadence)}` : "—", unit: "spm", color: LIME },
    { label: "GCT", value: d.ground_contact_time ? `${Math.round(d.ground_contact_time)}` : "—", unit: "ms", color: BLUE },
    { label: "Stride", value: d.stride_length ? `${(d.stride_length / 100).toFixed(2)}` : "—", unit: "m", color: ORANGE },
    { label: "Vert Osc", value: d.vertical_oscillation ? `${d.vertical_oscillation.toFixed(1)}` : "—", unit: "cm", color: PURPLE },
    { label: "Vert Ratio", value: d.vertical_ratio ? `${d.vertical_ratio.toFixed(1)}` : "—", unit: "%", color: RED },
    { label: "Power", value: d.power ? `${Math.round(d.power)}` : "—", unit: "W", color: TEAL },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Running Dynamics" right={<span style={{ fontSize: "0.55rem", color: "var(--muted)" }}>30-run avg</span>} />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8, alignContent: "center", minHeight: 0 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.5rem", color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: "0.5rem", color: "var(--sub)", marginTop: 1 }}>{m.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Training Effect Distribution ────────────────────────────────────────────

export function RunTrainingEffect({ data }) {
  const ct = useChartTheme();
  const rd = data.running;
  if (!rd || !rd.training_effects) return <><WTitle label="Training Effects" /><Empty /></>;

  const COLORS = {
    AEROBIC_BASE: BLUE,
    TEMPO: LIME,
    LACTATE_THRESHOLD: ORANGE,
    VO2MAX: RED,
    ANAEROBIC_CAPACITY: PURPLE,
    RECOVERY: TEAL,
  };
  const LABELS = {
    AEROBIC_BASE: "Base",
    TEMPO: "Tempo",
    LACTATE_THRESHOLD: "Threshold",
    VO2MAX: "VO2 Max",
    ANAEROBIC_CAPACITY: "Anaerobic",
    RECOVERY: "Recovery",
  };

  const pieData = Object.entries(rd.training_effects)
    .map(([k, v]) => ({ name: LABELS[k] || k, value: v, key: k }))
    .sort((a, b) => b.value - a.value);

  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Training Effects" right={<span style={{ fontSize: "0.55rem", color: "var(--muted)" }}>{total} runs</span>} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minHeight: 0 }}>
        <div style={{ width: "45%", height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius="40%" outerRadius="75%" isAnimationActive={false}>
                {pieData.map((d, i) => <Cell key={i} fill={COLORS[d.key] || "#888"} />)}
              </Pie>
              <Tooltip {...ct.tooltip} formatter={v => [v, "runs"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          {pieData.map(d => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.7rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[d.key] || "#888", flexShrink: 0 }} />
              <span style={{ color: "var(--sub)", flex: 1 }}>{d.name}</span>
              <span style={{ fontWeight: 700, color: "var(--text)" }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Race History ────────────────────────────────────────────────────────────

export function RunRaces({ data }) {
  const rd = data.running;
  if (!rd) return <><WTitle label="Races" /><Empty /></>;

  const races = rd.races || [];
  if (!races.length) return <><WTitle label="Races" /><Empty msg="No races tagged — mark runs as 'race' in Garmin Connect" /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Races" right={<span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{races.length} total</span>} />
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {races.slice().reverse().map(r => (
          <div key={r.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>{r.name || "Race"}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{r.date}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: LIME }}>{fmtDist(r.distance_m)} mi</div>
              <div style={{ fontSize: "0.6rem", color: "var(--sub)" }}>
                {fmtPace(r.pace_min_mi)} /mi · {fmtDuration(r.duration_secs)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Runs Table ───────────────────────────────────────────────────────

export function RunRecentRuns({ data }) {
  const rd = data.running;
  if (!rd) return <><WTitle label="Recent Runs" /><Empty /></>;

  const runs = rd.recent_runs || [];
  if (!runs.length) return <><WTitle label="Recent Runs" /><Empty /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Recent Runs" />
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", fontSize: "0.72rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--muted)", fontSize: "0.6rem", letterSpacing: 1, textTransform: "uppercase" }}>
              <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>Date</th>
              <th style={{ textAlign: "right", padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>Dist</th>
              <th style={{ textAlign: "right", padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>Pace</th>
              <th style={{ textAlign: "right", padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>HR</th>
              <th style={{ textAlign: "right", padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>TE</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "5px 6px", color: "var(--sub)" }}>{r.date?.slice(0, 10)}</td>
                <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600, color: BLUE }}>{fmtDist(r.distance_m)} mi</td>
                <td style={{ padding: "5px 6px", textAlign: "right", color: LIME }}>{fmtPace(r.pace_min_mi)}</td>
                <td style={{ padding: "5px 6px", textAlign: "right", color: RED }}>{r.avg_hr ?? "—"}</td>
                <td style={{ padding: "5px 6px", textAlign: "right", color: ORANGE }}>{r.aerobic_te ? r.aerobic_te.toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Monthly Summary Card ────────────────────────────────────────────────────

export function RunMonthlySummary({ data }) {
  const rd = data.running;
  if (!rd) return <><WTitle label="This Month" /><Empty /></>;
  const s = rd.monthly_summary;
  if (!s || !s.runs) return <><WTitle label="This Month" /><Empty msg="No runs this month" /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="This Month" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: "2rem", fontWeight: 900, color: BLUE, lineHeight: 1 }}>{fmtDist(s.distance_m)}</span>
          <span style={{ fontSize: "0.8rem", color: "var(--sub)" }}>miles</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: "0.72rem", color: "var(--sub)" }}>
          <span><b style={{ color: "var(--text)" }}>{s.runs}</b> runs</span>
          <span><b style={{ color: "var(--text)" }}>{fmtDuration(s.duration_secs)}</b> total</span>
          <span><b style={{ color: "var(--text)" }}>{fmtPace(s.avg_pace_min_mi)}</b> /mi avg</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: "0.72rem", color: "var(--sub)" }}>
          {s.avg_hr && <span>Avg HR <b style={{ color: RED }}>{s.avg_hr}</b></span>}
          {s.total_elevation > 0 && <span>Elevation <b style={{ color: TEAL }}>{Math.round(s.total_elevation)} ft</b></span>}
        </div>
      </div>
    </div>
  );
}

// ── Year-to-Date Summary ────────────────────────────────────────────────────

export function RunYearlySummary({ data }) {
  const rd = data.running;
  if (!rd) return <><WTitle label="Year to Date" /><Empty /></>;
  const s = rd.yearly_summary;
  if (!s || !s.runs) return <><WTitle label="Year to Date" /><Empty msg="No runs this year" /></>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <WTitle label="Year to Date" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: "2rem", fontWeight: 900, color: LIME, lineHeight: 1 }}>{fmtDist(s.distance_m)}</span>
          <span style={{ fontSize: "0.8rem", color: "var(--sub)" }}>miles</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: "0.72rem", color: "var(--sub)", flexWrap: "wrap" }}>
          <span><b style={{ color: "var(--text)" }}>{s.runs}</b> runs</span>
          <span><b style={{ color: "var(--text)" }}>{fmtDuration(s.duration_secs)}</b></span>
          <span><b style={{ color: "var(--text)" }}>{fmtPace(s.avg_pace_min_mi)}</b> /mi</span>
          {s.total_calories > 0 && <span><b style={{ color: RED }}>{Math.round(s.total_calories).toLocaleString()}</b> cal</span>}
        </div>
      </div>
    </div>
  );
}
