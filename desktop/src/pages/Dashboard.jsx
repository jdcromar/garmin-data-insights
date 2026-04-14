import { useEffect, useState, useCallback } from "react";
import GridLayout from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { api } from "../api";
import { WIDGET_REGISTRY } from "../dashboard/widgets";
import { PRESETS } from "../dashboard/presets";
import ErrorBoundary from "../ErrorBoundary";

const STORAGE_KEY = "gd_dashboard";
const SCHEMA_VERSION = 7;
const COLS_DESKTOP = 12;
const COLS_MOBILE  = 4;
const ROW_H = 80;
const GAP  = 12;

function useCols(width) {
  return width < 600 ? COLS_MOBILE : COLS_DESKTOP;
}

const CAT_COLOR = { Metrics: "#c8f135", Charts: "#4a90d9", Health: "#7b61ff", Summaries: "#f39c12", Running: "#ff6b9d" };
const LIME = "#c8f135";

// Custom resize handle renderer
const HANDLE_STYLES = {
  se: { bottom: 2, right: 2, width: 14, height: 14, cursor: "se-resize", borderRight: `2px solid ${LIME}`, borderBottom: `2px solid ${LIME}` },
  sw: { bottom: 2, left: 2, width: 14, height: 14, cursor: "sw-resize", borderLeft: `2px solid ${LIME}`, borderBottom: `2px solid ${LIME}` },
  ne: { top: 2, right: 2, width: 14, height: 14, cursor: "ne-resize", borderRight: `2px solid ${LIME}`, borderTop: `2px solid ${LIME}` },
  nw: { top: 2, left: 2, width: 14, height: 14, cursor: "nw-resize", borderLeft: `2px solid ${LIME}`, borderTop: `2px solid ${LIME}` },
  n:  { top: 2, left: "50%", transform: "translateX(-50%)", width: 48, height: 5, cursor: "n-resize", background: `${LIME}aa`, borderRadius: 3 },
  s:  { bottom: 2, left: "50%", transform: "translateX(-50%)", width: 48, height: 5, cursor: "s-resize", background: `${LIME}aa`, borderRadius: 3 },
  e:  { right: 2, top: "50%", transform: "translateY(-50%)", width: 5, height: 48, cursor: "e-resize", background: `${LIME}aa`, borderRadius: 3 },
  w:  { left: 2, top: "50%", transform: "translateY(-50%)", width: 5, height: 48, cursor: "w-resize", background: `${LIME}aa`, borderRadius: 3 },
};

function renderResizeHandle(axis, ref) {
  return (
    <span ref={ref} style={{ position: "absolute", zIndex: 20, boxSizing: "border-box", ...HANDLE_STYLES[axis] }} />
  );
}

// ── Persistence ───────────────────────────────────────────────────────────────

function migrateState(raw) {
  if (!raw || typeof raw !== "object") return null;
  let state = raw;
  let version = state._version || 0;

  // Migration: pre-versioned states (v6 key) had no _version
  if (!state._version && state.tabs) version = 6;

  // Future migrations go here:
  // if (version < 8) { state = ...; version = 8; }

  if (version < SCHEMA_VERSION) return null; // incompatible — reset
  return state;
}

function loadState() {
  try {
    // Try current key first
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw) return migrateState(raw);
    // Try migrating from old versioned keys
    for (let v = SCHEMA_VERSION - 1; v >= 4; v--) {
      const old = JSON.parse(localStorage.getItem(`gd_dashboard_v${v}`) || "null");
      if (old) {
        const migrated = migrateState(old);
        if (migrated) {
          saveState(migrated);
          localStorage.removeItem(`gd_dashboard_v${v}`);
          return migrated;
        }
      }
    }
    return null;
  } catch { return null; }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, _version: SCHEMA_VERSION }));
}
function uid() { return "t_" + Math.random().toString(36).slice(2, 9); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function makeInitialState() {
  const def = PRESETS.find(p => p.id === "default");
  const runner = PRESETS.find(p => p.id === "runner");
  return {
    tabs: [
      { id: "t_default", name: "Dashboard", layout: def.layout },
      { id: "t_running", name: "Running", layout: runner.layout },
    ],
    activeTabId: "t_default",
  };
}

// ── Widget renderer ───────────────────────────────────────────────────────────

function WidgetRenderer({ id, data }) {
  const def = WIDGET_REGISTRY.find(w => w.id === id);
  if (!def) return <div style={{ color: "var(--muted)", fontSize: "0.8rem", padding: 12 }}>Unknown widget: {id}</div>;
  const C = def.component;
  return (
    <ErrorBoundary fallback={
      <div style={{ color: "var(--red)", fontSize: "0.8rem", padding: 12 }}>Widget failed to render</div>
    }>
      <C data={data} />
    </ErrorBoundary>
  );
}

// ── Library panel ─────────────────────────────────────────────────────────────

function LibraryPanel({ onAdd, onClose, presentIds }) {
  const categories = [...new Set(WIDGET_REGISTRY.map(w => w.category))];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 900 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: window.innerWidth <= 768 ? "100%" : 300,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 901, overflowY: "auto", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Widget Library</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: "12px 12px 24px" }}>
          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.58rem", letterSpacing: 3, textTransform: "uppercase", color: CAT_COLOR[cat] || "var(--sub)", marginBottom: 8, fontWeight: 700 }}>
                {cat}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {WIDGET_REGISTRY.filter(w => w.category === cat).map(w => {
                  const added = presentIds.includes(w.id);
                  return (
                    <div key={w.id} style={{
                      padding: "8px 10px", borderRadius: 5, border: "1px solid var(--border)",
                      background: "var(--bg)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                      opacity: added ? 0.45 : 1,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{w.title}</div>
                        <div style={{ fontSize: "0.67rem", color: "var(--muted)", marginTop: 1, lineHeight: 1.3 }}>{w.desc}</div>
                      </div>
                      <button onClick={() => !added && onAdd(w.id)} disabled={added}
                        style={{
                          padding: "4px 10px", borderRadius: 4, flexShrink: 0,
                          border: `1px solid ${added ? "var(--border)" : LIME}`,
                          background: added ? "transparent" : `${LIME}18`,
                          color: added ? "var(--muted)" : LIME,
                          cursor: added ? "default" : "pointer", fontSize: "0.7rem", fontWeight: 600,
                        }}>
                        {added ? "Added" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // Data
  const [dashData, setDashData] = useState({
    dailyStats: [], activities: [], sleep: [], hrv: [], bodyBattery: [],
    insights: null, records: null, readiness: null, running: null,
  });
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [syncCooldown, setSyncCooldown] = useState(false);
  const [error,    setError]    = useState(null);

  // Layout
  const [state, setState]         = useState(() => loadState() || makeInitialState());
  const [editMode, setEditMode]   = useState(false);
  const [showLib,  setShowLib]    = useState(false);
  const [gridW,    setGridW]      = useState(0);
  // Callback ref fires the moment the div appears in the DOM (no race with loading state)
  const containerRef = useCallback(node => {
    if (!node) return;
    setGridW(node.getBoundingClientRect().width);
    const ro = new ResizeObserver(e => setGridW(e[0].contentRect.width));
    ro.observe(node);
  }, []);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0];

  // Persist layout changes
  useEffect(() => { saveState(state); }, [state]);

  // Data fetch
  const fetchAll = useCallback(() =>
    Promise.all([
      api.dailyStats().catch(() => []),
      api.activities().catch(() => []),
      api.sleep().catch(() => []),
      api.hrv().catch(() => []),
      api.bodyBattery().catch(() => []),
      api.insights().catch(() => null),
      api.records().catch(() => null),
      api.readiness().catch(() => null),
      api.runningDashboard().catch(() => null),
    ]).then(([dailyStats, activities, sleep, hrv, bodyBattery, insights, records, readiness, running]) => {
      setDashData({ dailyStats, activities, sleep, hrv, bodyBattery, insights, records, readiness, running });
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); }),
  []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function syncToday() {
    if (syncCooldown) return;
    setSyncing(true);
    try {
      await api.sync(todayStr(), todayStr());
      await fetchAll();
      setSyncCooldown(true);
      setTimeout(() => setSyncCooldown(false), 30000);
    } finally { setSyncing(false); }
  }

  // Tab management
  function addTab() {
    const def = PRESETS.find(p => p.id === "default");
    const t = { id: uid(), name: "New Tab", layout: def.layout };
    setState(s => ({ tabs: [...s.tabs, t], activeTabId: t.id }));
  }
  function removeTab(id) {
    if (state.tabs.length <= 1) return;
    setState(s => {
      const tabs = s.tabs.filter(t => t.id !== id);
      return { tabs, activeTabId: s.activeTabId === id ? tabs[0].id : s.activeTabId };
    });
  }
  function renameTab(id) {
    const name = window.prompt("Tab name:", state.tabs.find(t => t.id === id)?.name || "");
    if (name?.trim()) setState(s => ({ ...s, tabs: s.tabs.map(t => t.id === id ? { ...t, name: name.trim() } : t) }));
  }

  // Widget management
  function updateLayout(layout) {
    setState(s => ({ ...s, tabs: s.tabs.map(t => t.id === s.activeTabId ? { ...t, layout } : t) }));
  }
  function addWidget(widgetId) {
    const def = WIDGET_REGISTRY.find(w => w.id === widgetId);
    if (!def || activeTab.layout.some(l => l.i === widgetId)) return;
    updateLayout([...activeTab.layout, { i: widgetId, x: 0, y: Infinity, w: def.defaultW, h: def.defaultH, minW: def.minW, minH: def.minH }]);
  }
  function removeWidget(widgetId) { updateLayout(activeTab.layout.filter(l => l.i !== widgetId)); }
  function applyPreset(presetId) {
    const p = PRESETS.find(p => p.id === presetId);
    if (!p) return;
    if (window.confirm(`Replace layout with "${p.name}" preset?`)) updateLayout(p.layout);
  }

  if (loading) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
      </div>
      <p className="loading">Loading…</p>
    </div>
  );
  if (error) return <p className="error">Error: {error}</p>;

  const presentIds = activeTab.layout.map(l => l.i);
  const cols = useCols(gridW);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {!editMode && (
            <button className="btn" onClick={syncToday} disabled={syncing || syncCooldown}
              style={{ fontSize: "0.8rem", padding: "7px 18px" }}>
              {syncing ? "Syncing…" : syncCooldown ? "Synced" : "Sync Today"}
            </button>
          )}
          {editMode && (
            <>
              <select defaultValue="" onChange={e => { if (e.target.value) { applyPreset(e.target.value); e.target.value = ""; } }}
                style={{ fontSize: "0.8rem", padding: "7px 10px" }}>
                <option value="" disabled>Apply preset…</option>
                {PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => setShowLib(l => !l)}
                style={{ padding: "7px 14px", borderRadius: 4, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${LIME}`, background: showLib ? `${LIME}22` : "transparent", color: LIME }}>
                + Add Widget
              </button>
            </>
          )}
          <button onClick={() => { setEditMode(e => !e); setShowLib(false); }}
            style={{ padding: "7px 16px", borderRadius: 4, fontSize: "0.8rem", cursor: "pointer", fontWeight: editMode ? 700 : 400,
              border: `1px solid ${editMode ? LIME : "var(--border)"}`,
              background: editMode ? LIME : "transparent",
              color: editMode ? "#000" : "var(--sub)" }}>
            {editMode ? "✓ Done" : "Edit Layout"}
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 0, overflowX: "auto" }}>
        {state.tabs.map(tab => (
          <div key={tab.id} style={{ display: "flex", alignItems: "center", position: "relative" }}>
            <button onClick={() => setState(s => ({ ...s, activeTabId: tab.id }))}
              style={{
                padding: "8px 16px", border: "none", borderRadius: "4px 4px 0 0",
                background: state.activeTabId === tab.id ? "var(--surface)" : "transparent",
                borderTop: state.activeTabId === tab.id ? "2px solid #c8f135" : "2px solid transparent",
                color: state.activeTabId === tab.id ? "var(--text)" : "var(--muted)",
                cursor: "pointer", fontSize: "0.85rem", fontWeight: state.activeTabId === tab.id ? 600 : 400,
              }}>
              {tab.name}
            </button>
            {editMode && state.activeTabId === tab.id && (
              <div style={{ display: "flex", gap: 0, marginLeft: -8 }}>
                <button onClick={() => renameTab(tab.id)} title="Rename"
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.75rem", padding: "4px 4px" }}>✎</button>
                {state.tabs.length > 1 && (
                  <button onClick={() => removeTab(tab.id)} title="Remove tab"
                    style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.8rem", padding: "4px 4px" }}>×</button>
                )}
              </div>
            )}
          </div>
        ))}
        {editMode && (
          <button onClick={addTab}
            style={{ padding: "8px 14px", border: "none", borderRadius: "4px 4px 0 0", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.82rem" }}>
            + Tab
          </button>
        )}
      </div>

      {/* ── Edit hint ── */}
      {editMode && (
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 12, padding: "7px 12px",
          background: "var(--surface)", borderRadius: 4, border: "1px solid var(--border)" }}>
          Drag the title bar to move · Grab any edge or corner to resize · Click × to remove
        </div>
      )}

      {/* ── Grid ── */}
      <div ref={containerRef} className={editMode ? "edit-active" : ""}>
        {gridW > 0 && (
          <GridLayout
            layout={activeTab.layout}
            cols={cols}
            rowHeight={ROW_H}
            width={gridW}
            margin={[GAP, GAP]}
            containerPadding={[0, 0]}
            onLayoutChange={updateLayout}
            isDraggable={editMode}
            isResizable={editMode}
            resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
            resizeHandle={editMode ? renderResizeHandle : undefined}
            draggableHandle=".w-drag"
            useCSSTransforms
          >
            {activeTab.layout.map(item => {
              const def = WIDGET_REGISTRY.find(w => w.id === item.i);
              return (
                <div key={item.i}>
                  <div style={{
                    height: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 4, overflow: "hidden", boxSizing: "border-box",
                    display: "flex", flexDirection: "column",
                    ...(editMode && { outline: "1px dashed #c8f13540", outlineOffset: -1 }),
                  }}>
                    {/* Drag handle bar (edit mode only) */}
                    {editMode && (
                      <div className="w-drag" style={{
                        height: 24, flexShrink: 0, cursor: "grab",
                        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px",
                        userSelect: "none",
                      }}>
                        <span style={{ fontSize: "0.6rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ letterSpacing: 1 }}>⠿</span>
                          <span style={{ letterSpacing: 0.5 }}>{def?.title ?? item.i}</span>
                        </span>
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); removeWidget(item.i); }}
                          style={{ background: "none", border: "none", color: "#ff4545", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0 2px" }}>
                          ×
                        </button>
                      </div>
                    )}
                    {/* Widget content */}
                    <div style={{ flex: 1, minHeight: 0, padding: 16, overflow: "hidden" }}>
                      <WidgetRenderer id={item.i} data={dashData} />
                    </div>
                  </div>
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>

      {/* ── Library panel ── */}
      {showLib && <LibraryPanel onAdd={addWidget} onClose={() => setShowLib(false)} presentIds={presentIds} />}

      {/* ── Grid & resize handle styles ── */}
      <style>{`
        .react-grid-item.react-grid-placeholder {
          background: #c8f13520 !important;
          border: 1px dashed #c8f135 !important;
          border-radius: 4px;
          opacity: 1 !important;
        }
        /* Hide default library handle styling */
        .react-resizable-handle { background-image: none !important; }
        .react-resizable-handle::after { content: none !important; }
        .w-drag:active { cursor: grabbing !important; }
      `}</style>
    </div>
  );
}
