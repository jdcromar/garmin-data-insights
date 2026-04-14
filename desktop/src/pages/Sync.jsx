import { useState } from "react";
import { api } from "../api";

const LIME = LIME;

function today()    { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

const DATA_TYPES = [
  { key: "activities",   label: "Activities",   desc: "Workouts and exercise sessions" },
  { key: "daily-stats",  label: "Daily Stats",  desc: "Steps, calories, distance" },
  { key: "sleep",        label: "Sleep",        desc: "Sleep stages and score" },
  { key: "hrv",          label: "HRV",          desc: "Heart rate variability" },
  { key: "body-battery", label: "Body Battery", desc: "Energy level throughout the day" },
];

// ── Step status indicator ─────────────────────────────────────────────────────

function StepRow({ label, desc, state }) {
  const icon = state === "done"    ? "✓"
             : state === "error"   ? "✕"
             : state === "running" ? "●"
             : "○";
  const color = state === "done"    ? LIME
              : state === "error"   ? "#ff4545"
              : state === "running" ? "#4a90d9"
              : "var(--muted)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <span style={{ fontSize: "1rem", color, width: 16, textAlign: "center", flexShrink: 0,
        animation: state === "running" ? "spin 1.2s linear infinite" : "none" }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: "0.85rem", color: state === "done" ? "var(--text)" : state === "error" ? "#ff4545" : "var(--sub)", fontWeight: state === "running" ? 600 : 400 }}>
          {label}
          {state === "running" && <span style={{ color: "#4a90d9" }}> — syncing…</span>}
        </div>
        {state === "idle" && <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{desc}</div>}
      </div>
    </div>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Check({ checked, onChange, label, sub }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", userSelect: "none", padding: "6px 0" }}>
      <div onClick={onChange} style={{
        marginTop: 2, width: 16, height: 16, borderRadius: 3, flexShrink: 0,
        border: `2px solid ${checked ? LIME : "var(--border)"}`,
        background: checked ? LIME : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.12s, border-color 0.12s", cursor: "pointer",
      }}>
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5l2.5 2.5 4.5-5" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div>
        <div style={{ fontSize: "0.85rem", color: "var(--text)" }}>{label}</div>
        {sub && <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>{sub}</div>}
      </div>
    </label>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Sync() {
  const [start, setStart] = useState(daysAgo(30));
  const [end,   setEnd]   = useState(today());
  const [force, setForce] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(new Set(DATA_TYPES.map(d => d.key)));

  // step states: idle | running | done | error
  const [stepStates, setStepStates] = useState({});
  const [running, setRunning]       = useState(false);
  const [started, setStarted]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState("");

  function toggleType(key) {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const activeTypes = DATA_TYPES.filter(d => selectedTypes.has(d.key));
  const completed   = Object.values(stepStates).filter(s => s === "done" || s === "error").length;
  const total       = activeTypes.length;
  const pct         = total ? Math.round((completed / total) * 100) : 0;
  const allDone     = started && !running;

  async function handleSync() {
    if (start > end) { setErrorMsg("Start date must be before end date."); return; }
    if (!activeTypes.length) { setErrorMsg("Select at least one data type."); return; }

    setErrorMsg("");
    setStarted(true);
    setRunning(true);
    const states = {};
    activeTypes.forEach(t => { states[t.key] = "idle"; });
    setStepStates({ ...states });

    for (const type of activeTypes) {
      setStepStates(prev => ({ ...prev, [type.key]: "running" }));
      try {
        await api.syncType(type.key, start, end, force);
        setStepStates(prev => ({ ...prev, [type.key]: "done" }));
      } catch (e) {
        setStepStates(prev => ({ ...prev, [type.key]: "error" }));
        setErrorMsg(`${type.label} failed: ${e.message}`);
      }
    }

    setRunning(false);
  }

  function reset() {
    setStarted(false);
    setStepStates({});
    setErrorMsg("");
  }

  const inputStyle = {
    background: "var(--surface)", color: "var(--text)",
    border: "1px solid var(--border)", borderRadius: 4,
    padding: "7px 10px", fontSize: "0.88rem",
  };

  return (
    <div>
      <h1>Sync</h1>
      <p style={{ color: "var(--sub)", marginBottom: 32, maxWidth: 480 }}>
        Pull data from Garmin Connect for a date range. Dates already in the database are skipped unless you force a re-sync.
      </p>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* Config panel */}
        <div className="card" style={{ minWidth: 300, flex: "1 1 300px", maxWidth: 480 }}>
          {/* Date range */}
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Date Range</h2>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.68rem", letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 }}>From</div>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} max={end} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: "0.68rem", letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 }}>To</div>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} min={start} max={today()} style={inputStyle} />
            </div>
          </div>

          {/* Quick range buttons */}
          <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
            {[["7d", 7], ["30d", 30], ["90d", 90], ["1y", 365]].map(([label, days]) => (
              <button key={label} onClick={() => { setStart(daysAgo(days)); setEnd(today()); }}
                style={{ background: "var(--bg)", color: "var(--sub)", border: "1px solid var(--border)",
                  borderRadius: 4, padding: "4px 10px", fontSize: "0.78rem", cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Data types */}
          <h2 style={{ marginBottom: 8 }}>Data to Sync</h2>
          <div style={{ marginBottom: 8, display: "flex", gap: 12 }}>
            <button onClick={() => setSelectedTypes(new Set(DATA_TYPES.map(d => d.key)))}
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>
              Select all
            </button>
            <button onClick={() => setSelectedTypes(new Set())}
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>
              Clear
            </button>
          </div>
          <div style={{ marginBottom: 24 }}>
            {DATA_TYPES.map(t => (
              <Check key={t.key} checked={selectedTypes.has(t.key)}
                onChange={() => toggleType(t.key)} label={t.label} sub={t.desc} />
            ))}
          </div>

          {/* Options */}
          <h2 style={{ marginBottom: 8 }}>Options</h2>
          <Check
            checked={!force}
            onChange={() => setForce(f => !f)}
            label="Skip already-loaded dates"
            sub="Uncheck to re-fetch and overwrite everything in range"
          />

          <div style={{ marginTop: 24 }}>
            {errorMsg && <p style={{ color: "#ff4545", fontSize: "0.82rem", marginBottom: 12 }}>{errorMsg}</p>}
            <button className="btn" onClick={started ? reset : handleSync}
              disabled={running}
              style={{ fontSize: "0.88rem", padding: "9px 24px", opacity: running ? 0.6 : 1 }}>
              {running ? "Syncing…" : started ? "Sync Again" : "Sync from Garmin Connect"}
            </button>
          </div>
        </div>

        {/* Progress panel — only shown once sync starts */}
        {started && (
          <div className="card" style={{ minWidth: 260, flex: "1 1 260px", maxWidth: 380 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>
              {running ? "Syncing…" : allDone ? "Complete" : "Progress"}
            </h2>

            {/* Progress bar */}
            <div style={{ background: "var(--border)", borderRadius: 4, height: 6, marginBottom: 6 }}>
              <div style={{
                background: errorMsg ? "#ff4545" : LIME,
                width: `${pct}%`, height: 6, borderRadius: 4,
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 20, textAlign: "right" }}>
              {completed} / {total} complete
            </div>

            {/* Step list */}
            <div style={{ borderTop: "1px solid var(--border)" }}>
              {activeTypes.map(t => (
                <div key={t.key} style={{ borderBottom: "1px solid var(--border)" }}>
                  <StepRow label={t.label} desc={t.desc} state={stepStates[t.key] || "idle"} />
                </div>
              ))}
            </div>

            {!running && !errorMsg && completed === total && (
              <p style={{ color: LIME, fontSize: "0.85rem", marginTop: 16 }}>
                ✓ All done — navigate to any page to see updated data.
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { opacity: 1; } 50% { opacity: 0.3; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
