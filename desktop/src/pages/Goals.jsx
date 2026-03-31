import { useEffect, useState } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { api } from "../api";

const LIME = "#c8f135", RED = "#ff4545", PURPLE = "#7b61ff", BLUE = "#4a90d9", ORANGE = "#f39c12";
const PALETTE = [LIME, RED, PURPLE, BLUE, ORANGE];

const METRICS = [
  { key: "steps",           label: "Total Steps",         unit: "steps", default: 3000000 },
  { key: "active_calories", label: "Active Calories",     unit: "kcal",  default: 500000 },
  { key: "distance_mi",     label: "Miles",               unit: "mi",    default: 500 },
  { key: "active_days",     label: "Active Days",         unit: "days",  default: 250 },
  { key: "workout_hours",   label: "Workout Hours",       unit: "hrs",   default: 200 },
];

function GoalCard({ metric, target, actual, id, color, onDelete }) {
  const pct = target ? Math.min(Math.round(actual / target * 100), 100) : 0;
  const m = METRICS.find(m => m.key === metric) || { label: metric, unit: "" };
  const fmtVal = (v) => v >= 1000 ? v.toLocaleString() : v;

  return (
    <div className="card" style={{ borderTop: `3px solid ${color}`, position: "relative" }}>
      <button
        onClick={() => onDelete(id)}
        style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none",
          color: "#444", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>
        ×
      </button>
      <div style={{ fontSize: "0.65rem", letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 12 }}>
        {m.label}
      </div>

      {/* Progress ring */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <ResponsiveContainer width={80} height={80}>
            <RadialBarChart cx={40} cy={40} innerRadius={28} outerRadius={38}
              startAngle={90} endAngle={-270} data={[{ value: pct, fill: color }]}>
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#1a1a1a" }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color }}>
            {pct}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "white", lineHeight: 1 }}>
            {fmtVal(actual)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#555", marginTop: 4 }}>
            of {fmtVal(target)} {m.unit}
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: 3, height: 4, marginTop: 10 }}>
            <div style={{ background: color, width: `${pct}%`, height: 4, borderRadius: 3, transition: "width 0.4s" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const [yearSel, setYearSel]   = useState(new Date().getFullYear());
  const [progress, setProgress] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [form, setForm]         = useState({});
  const [showForm, setShowForm] = useState(false);

  function fetchProgress() {
    setLoading(true);
    api.goalsProgress(yearSel)
      .then(d => { setProgress(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }

  useEffect(() => {
    fetchProgress();
  }, [yearSel]);

  // Seed form defaults
  useEffect(() => {
    const defaults = {};
    METRICS.forEach(m => {
      const existing = progress.find(p => p.metric === m.key);
      defaults[m.key] = existing ? existing.target : m.default;
    });
    setForm(defaults);
  }, [progress]);

  async function saveGoals() {
    setSaving(true);
    try {
      for (const m of METRICS) {
        if (form[m.key] != null) {
          await api.upsertGoal(m.key, Number(form[m.key]), yearSel);
        }
      }
      fetchProgress();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id) {
    await api.deleteGoal(id);
    fetchProgress();
  }

  const unset = METRICS.filter(m => !progress.find(p => p.metric === m.key));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Goals</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={yearSel} onChange={e => setYearSel(+e.target.value)}>
            {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn" onClick={() => setShowForm(v => !v)}
            style={{ fontSize: "0.8rem", padding: "7px 18px" }}>
            {showForm ? "Cancel" : "Set Goals"}
          </button>
        </div>
      </div>

      {/* Goal form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Set {yearSel} Goals</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
            {METRICS.map((m, i) => (
              <div key={m.key}>
                <label style={{ display: "block", fontSize: "0.7rem", letterSpacing: 2, color: "#555",
                  textTransform: "uppercase", marginBottom: 6 }}>
                  {m.label} ({m.unit})
                </label>
                <input
                  type="number"
                  value={form[m.key] ?? m.default}
                  onChange={e => setForm(f => ({ ...f, [m.key]: e.target.value }))}
                  style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
                    borderRadius: 4, padding: "8px 10px", color: "white", fontSize: "0.9rem",
                    borderColor: PALETTE[i % PALETTE.length] }}
                />
              </div>
            ))}
          </div>
          <button className="btn" onClick={saveGoals} disabled={saving}
            style={{ fontSize: "0.85rem", padding: "8px 24px" }}>
            {saving ? "Saving…" : "Save Goals"}
          </button>
        </div>
      )}

      {loading && <p className="loading">Loading…</p>}
      {error   && <p className="error">Error: {error}</p>}

      {!loading && !error && (
        <>
          {progress.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: "0.8rem", color: "#555", marginBottom: 12 }}>No goals set for {yearSel}</div>
              <button className="btn" onClick={() => setShowForm(true)}
                style={{ fontSize: "0.85rem", padding: "8px 24px" }}>
                Set Goals
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                {progress.map((p, i) => (
                  <GoalCard key={p.id} {...p} color={PALETTE[i % PALETTE.length]} onDelete={deleteGoal} />
                ))}
              </div>

              {/* Summary bar */}
              <div className="card" style={{ marginTop: 16 }}>
                <h2 style={{ marginTop: 0 }}>Overall Progress</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {progress.map((p, i) => {
                    const m = METRICS.find(m => m.key === p.metric) || { label: p.metric, unit: "" };
                    const color = PALETTE[i % PALETTE.length];
                    return (
                      <div key={p.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.8rem", color: "#888" }}>{m.label}</span>
                          <span style={{ fontSize: "0.8rem", color, fontWeight: 600 }}>{p.pct}%</span>
                        </div>
                        <div style={{ background: "#1a1a1a", borderRadius: 3, height: 6 }}>
                          <div style={{ background: color, width: `${p.pct}%`, height: 6, borderRadius: 3, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
