import { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import { useUnits } from "../SettingsContext";
import {
  THEMES, ALL_SECTIONS,
  AllStatsCard, HeroCard, ActivityCard,
  StepsCard, ScaleCard, ConsistencyCard,
} from "../components/ShareCards";

const LIME = "#c8f135";

const fmtType = t => t ? t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—";
const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ── Theme swatch ──────────────────────────────────────────────────────────────

function ThemeSwatch({ theme, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      background: "none", border: "none", cursor: "pointer", padding: 0,
    }}>
      <div style={{
        width: 52, height: 36, borderRadius: 4, overflow: "hidden",
        background: theme.bg,
        border: active ? `2px solid ${LIME}` : "2px solid transparent",
        boxShadow: active ? `0 0 0 1px ${LIME}` : "0 0 0 1px #2a2a2a",
        position: "relative",
        transition: "box-shadow 0.15s",
      }}>
        {/* Mini accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: theme.bar }} />
        {/* Two color dots */}
        <div style={{ position: "absolute", bottom: 6, left: 8, display: "flex", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.a1 }} />
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.a2 }} />
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.a3 }} />
        </div>
      </div>
      <span style={{ fontSize: "0.65rem", color: active ? LIME : "var(--sub)",
        letterSpacing: 1, fontWeight: active ? 700 : 400 }}>
        {theme.name}
      </span>
    </button>
  );
}

// ── Section toggle ────────────────────────────────────────────────────────────

function SectionToggle({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
      padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <div onClick={onChange} style={{
        width: 18, height: 18, borderRadius: 3, flexShrink: 0,
        border: `1px solid ${checked ? LIME : "var(--muted)"}`,
        background: checked ? LIME : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", cursor: "pointer",
      }}>
        {checked && <span style={{ fontSize: 11, color: "#000", fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: "0.85rem", color: checked ? "var(--text)" : "var(--sub)" }}>{label}</span>
    </label>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Cards() {
  const [yearSel, setYearSel]     = useState(new Date().getFullYear());
  const [wrapped, setWrapped]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [themeIdx, setThemeIdx]   = useState(0);
  const [sections, setSections]   = useState(
    Object.fromEntries(ALL_SECTIONS.map(s => [s.key, true]))
  );

  const { metric, mToDist, mToElev, distUnit, marathonDist, earthCirc } = useUnits();
  const elevUnit = distUnit === "mi" ? "ft" : "m";
  const t = THEMES[themeIdx];

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
      weekday:      DAYS[(new Date(a.start_time).getDay() + 6) % 7],
    }));

    const n    = acts.length;
    const dist = acts.reduce((s, a) => s + a.dist, 0);
    const hrs  = acts.reduce((s, a) => s + a.duration_hrs, 0);
    const cals = acts.reduce((s, a) => s + (a.calories || 0), 0);
    const elevM = acts.reduce((s, a) => s + (a.elevation_gain || 0), 0);
    const elev  = mToElev(elevM);

    const monthCounts = MONTHS.map(m => ({ month: m, Count: acts.filter(a => a.month === m).length }));
    const dayCounts   = DAYS.map(d   => ({ day: d,   Count: acts.filter(a => a.weekday === d).length }));

    const stats      = wrapped.stats;
    const totalSteps = stats.reduce((s, d) => s + (d.steps || 0), 0);
    const avgSteps   = stats.length ? Math.round(totalSteps / stats.length) : 0;
    const bestSteps  = stats.length ? Math.max(...stats.map(d => d.steps || 0)) : 0;

    const sleepArr = wrapped.sleep;
    const avgSleep = sleepArr.length
      ? (sleepArr.reduce((s, d) => s + (d.duration_secs || 0), 0) / sleepArr.length / 3600).toFixed(1)
      : null;
    const avgScore = sleepArr.filter(d => d.score).length
      ? Math.round(sleepArr.reduce((s, d) => s + (d.score || 0), 0) / sleepArr.filter(d => d.score).length)
      : null;

    const tagline = n >= 100 ? `${n} workouts. Every one counted.`
                 : n >= 50  ? `${n} workouts. Consistent.`
                 :             `${n} workouts. You showed up.`;

    return { n, dist, hrs, cals, elev, monthCounts, dayCounts,
             totalSteps, avgSteps, bestSteps, avgSleep, avgScore, tagline };
  }, [wrapped, metric]);

  const toggleSection = key =>
    setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const sharedProps = { year: yearSel, t, distUnit, elevUnit, marathonDist, earthCirc };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Share Cards</h1>
        <select value={yearSel} onChange={e => setYearSel(+e.target.value)}>
          {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Theme picker */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Theme</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, auto)", gap: "12px 20px",
          justifyContent: "start" }}>
          {THEMES.map((theme, i) => (
            <ThemeSwatch key={theme.id} theme={theme} active={themeIdx === i}
              onClick={() => setThemeIdx(i)} />
          ))}
        </div>
      </div>

      {loading && <p className="loading">Loading…</p>}
      {error   && <p className="error">Error: {error}</p>}

      {!loading && !error && computed && (
        <>
          {/* All Stats card + section controls */}
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 32, marginBottom: 32, alignItems: "start" }}>
            <AllStatsCard
              {...sharedProps}
              tagline={computed.tagline}
              n={computed.n}
              dist={computed.dist}
              hrs={computed.hrs}
              cals={computed.cals}
              totalSteps={computed.totalSteps}
              avgSteps={computed.avgSteps}
              bestSteps={computed.bestSteps}
              elev={computed.elev}
              monthCounts={computed.monthCounts}
              dayCounts={computed.dayCounts}
              avgSleep={computed.avgSleep}
              avgScore={computed.avgScore}
              enabledSections={sections}
            />

            <div className="card" style={{ alignSelf: "start" }}>
              <h2 style={{ marginTop: 0 }}>Customize</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--sub)", marginBottom: 16 }}>
                Choose which sections appear on the all-stats card.
              </p>
              {ALL_SECTIONS.filter(s => s.key !== "sleep" || computed.avgSleep).map(s => (
                <SectionToggle
                  key={s.key}
                  label={s.label}
                  checked={sections[s.key] !== false}
                  onChange={() => toggleSection(s.key)}
                />
              ))}
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button onClick={() => setSections(Object.fromEntries(ALL_SECTIONS.map(s => [s.key, true])))}
                  style={{ fontSize: "0.75rem", padding: "5px 12px", borderRadius: 4,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--sub)", cursor: "pointer" }}>
                  Select All
                </button>
                <button onClick={() => setSections(Object.fromEntries(ALL_SECTIONS.map(s => [s.key, false])))}
                  style={{ fontSize: "0.75rem", padding: "5px 12px", borderRadius: 4,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--sub)", cursor: "pointer" }}>
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Individual cards */}
          <h2 style={{ marginBottom: 16 }}>Individual Cards</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
            <HeroCard        {...sharedProps} tagline={computed.tagline} />
            <ActivityCard    {...sharedProps} n={computed.n} dist={computed.dist}
              hrs={computed.hrs} cals={computed.cals} />
            <StepsCard       {...sharedProps} totalSteps={computed.totalSteps}
              avgSteps={computed.avgSteps} bestSteps={computed.bestSteps} />
            <ScaleCard       {...sharedProps} dist={computed.dist} elev={computed.elev} />
            <ConsistencyCard {...sharedProps} n={computed.n}
              monthCounts={computed.monthCounts} dayCounts={computed.dayCounts} />
          </div>
        </>
      )}
    </div>
  );
}
