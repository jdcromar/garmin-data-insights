import { useEffect, useState, useCallback } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { api } from "../api";
import { WIDGET_REGISTRY } from "../dashboard/widgets";
import { PRESETS } from "../dashboard/presets";

const STORAGE_KEY = "gd_dashboard_v4";
const COLS = 12;
const ROW_H = 80;
const GAP  = 12;

const CAT_COLOR = { Metrics: "#c8f135", Charts: "#4a90d9", Health: "#7b61ff", Summaries: "#f39c12" };

// ── Persistence ───────────────────────────────────────────────────────────────

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function uid() { return "t_" + Math.random().toString(36).slice(2, 9); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function makeInitialState() {
  const def = PRESETS.find(p => p.id === "default");
  return { tabs: [{ id: "t_default", name: "Dashboard", layout: def.layout }], activeTabId: "t_default" };
}

// ── Widget renderer ───────────────────────────────────────────────────────────

function WidgetRenderer({ id, data }) {
  const def = WIDGET_REGISTRY.find(w => w.id === id);
  if (!def) return <div style={{ color: "var(--muted)", fontSize: "0.8rem", padding: 12 }}>Unknown widget: {id}</div>;
  const C = def.component;
  return <C data={data} />;
}

// ── Library panel ─────────────────────────────────────────────────────────────

function LibraryPanel({ onAdd, onClose, presentIds }) {
  const categories = [...new Set(WIDGET_REGISTRY.map(w => w.category))];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 900 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 300,
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
                          border: `1px solid ${added ? "var(--border)" : "#c8f135"}`,
                          background: added ? "transparent" : "#c8f13518",
                          color: added ? "var(--muted)" : "#c8f135",
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
    insights: null, records: null, readiness: null,
  });
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
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
    ]).then(([dailyStats, activities, sleep, hrv, bodyBattery, insights, records, readiness]) => {
      setDashData({ dailyStats, activities, sleep, hrv, bodyBattery, insights, records, readiness });
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); }),
  []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function syncToday() {
    setSyncing(true);
    try { await api.sync(todayStr(), todayStr()); await fetchAll(); }
    finally { setSyncing(false); }
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

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!editMode && (
            <button className="btn" onClick={syncToday} disabled={syncing}
              style={{ fontSize: "0.8rem", padding: "7px 18px" }}>
              {syncing ? "Syncing…" : "Sync Today"}
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
                  border: "1px solid #c8f135", background: showLib ? "#c8f13522" : "transparent", color: "#c8f135" }}>
                + Add Widget
              </button>
            </>
          )}
          <button onClick={() => { setEditMode(e => !e); setShowLib(false); }}
            style={{ padding: "7px 16px", borderRadius: 4, fontSize: "0.8rem", cursor: "pointer", fontWeight: editMode ? 700 : 400,
              border: `1px solid ${editMode ? "#c8f135" : "var(--border)"}`,
              background: editMode ? "#c8f135" : "transparent",
              color: editMode ? "#000" : "var(--sub)" }}>
            {editMode ? "✓ Done" : "Edit Layout"}
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
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
            cols={COLS}
            rowHeight={ROW_H}
            width={gridW}
            margin={[GAP, GAP]}
            containerPadding={[0, 0]}
            onLayoutChange={updateLayout}
            isDraggable={editMode}
            isResizable={editMode}
            resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
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

        /* Hide ALL handles outside edit mode */
        .react-resizable-handle {
          display: none !important;
        }
        /* Show + style ALL handles inside .edit-active */
        .edit-active .react-resizable-handle {
          display: block !important;
          position: absolute !important;
          background: none !important;
          background-image: none !important;
          z-index: 20;
        }
        .edit-active .react-resizable-handle::after { content: none !important; }

        /* Corners — L-bracket in lime */
        .edit-active .react-resizable-handle-se,
        .edit-active .react-resizable-handle-sw,
        .edit-active .react-resizable-handle-ne,
        .edit-active .react-resizable-handle-nw {
          width: 16px !important; height: 16px !important;
        }
        .edit-active .react-resizable-handle-se {
          bottom: 2px !important; right: 2px !important; cursor: se-resize !important;
          border-right: 2px solid #c8f135 !important; border-bottom: 2px solid #c8f135 !important;
        }
        .edit-active .react-resizable-handle-sw {
          bottom: 2px !important; left: 2px !important; cursor: sw-resize !important;
          border-left: 2px solid #c8f135 !important; border-bottom: 2px solid #c8f135 !important;
        }
        .edit-active .react-resizable-handle-ne {
          top: 2px !important; right: 2px !important; cursor: ne-resize !important;
          border-right: 2px solid #c8f135 !important; border-top: 2px solid #c8f135 !important;
        }
        .edit-active .react-resizable-handle-nw {
          top: 2px !important; left: 2px !important; cursor: nw-resize !important;
          border-left: 2px solid #c8f135 !important; border-top: 2px solid #c8f135 !important;
        }

        /* Edge handles — pill bar centered on each edge */
        .edit-active .react-resizable-handle-n,
        .edit-active .react-resizable-handle-s {
          width: 48px !important; height: 5px !important;
          left: 50% !important; transform: translateX(-50%) !important;
          background: #c8f135aa !important; border-radius: 3px !important;
        }
        .edit-active .react-resizable-handle-n { top: 2px !important; cursor: n-resize !important; }
        .edit-active .react-resizable-handle-s { bottom: 2px !important; cursor: s-resize !important; }
        .edit-active .react-resizable-handle-e,
        .edit-active .react-resizable-handle-w {
          width: 5px !important; height: 48px !important;
          top: 50% !important; transform: translateY(-50%) !important;
          background: #c8f135aa !important; border-radius: 3px !important;
        }
        .edit-active .react-resizable-handle-e { right: 2px !important; cursor: e-resize !important; }
        .edit-active .react-resizable-handle-w { left: 2px !important; cursor: w-resize !important; }

        .w-drag:active { cursor: grabbing !important; }
      `}</style>
    </div>
  );
}
