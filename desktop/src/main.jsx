import React, { useState, useCallback, useEffect, Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { SettingsProvider, useSettings } from "./SettingsContext";
import ErrorBoundary from "./ErrorBoundary";
import "./index.css";

// ── Code-split page imports ──────────────────────────────────────────────────

const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Activities   = lazy(() => import("./pages/Activities"));
const Health       = lazy(() => import("./pages/Health"));
const Wrapped      = lazy(() => import("./pages/Wrapped"));
const Goals        = lazy(() => import("./pages/Goals"));
const Compare      = lazy(() => import("./pages/Compare"));
const Cards        = lazy(() => import("./pages/Cards"));
const Export       = lazy(() => import("./pages/Export"));
const Settings     = lazy(() => import("./pages/Settings"));
const Sync         = lazy(() => import("./pages/Sync"));
const TrainingLoad = lazy(() => import("./pages/TrainingLoad"));
const ActivityMap  = lazy(() => import("./pages/ActivityMap"));

// ── Hooks ────────────────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(window.innerWidth <= breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

// ── Nav definition ───────────────────────────────────────────────────────────

export const NAV_GROUPS = [
  {
    group: "Overview",
    items: [
      { key: "activities",    path: "/activities",    label: "Activities" },
      { key: "health",        path: "/health",        label: "Health" },
    ],
  },
  {
    group: "Training",
    items: [
      { key: "training-load", path: "/training-load", label: "Training Load" },
      { key: "map",           path: "/map",           label: "Map" },
    ],
  },
  {
    group: "Planning",
    items: [
      { key: "goals",         path: "/goals",         label: "Goals" },
      { key: "compare",       path: "/compare",       label: "Compare" },
    ],
  },
  {
    group: "Sharing",
    items: [
      { key: "wrapped",       path: "/wrapped",       label: "Wrapped" },
      { key: "cards",         path: "/cards",         label: "Cards" },
    ],
  },
  {
    group: "Data",
    items: [
      { key: "export",        path: "/export",        label: "Export" },
      { key: "sync",          path: "/sync",          label: "Sync" },
    ],
  },
];

// ── Loading fallback ─────────────────────────────────────────────────────────

function PageLoader() {
  return <div className="loading" style={{ padding: "48px 0", textAlign: "center" }}>Loading…</div>;
}

// ── Sidebar nav ──────────────────────────────────────────────────────────────

function Sidebar({ open, onClose }) {
  const { hiddenNav } = useSettings();
  const location = useLocation();

  // Close drawer on navigation (mobile)
  useEffect(() => { if (onClose) onClose(); }, [location.pathname]);

  return (
    <nav className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
      <div className="logo">⌚ Garmin</div>

      {/* Dashboard always visible */}
      <NavLink to="/" end>Dashboard</NavLink>

      {NAV_GROUPS.map((group) => {
        const visible = group.items.filter(item => !hiddenNav.includes(item.key));
        if (!visible.length) return null;
        return (
          <div key={group.group} role="group" aria-label={group.group}>
            <div style={{
              height: 1, background: "var(--border)",
              margin: "10px 0 6px",
            }} />
            <div style={{
              fontSize: "0.55rem", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--muted)",
              padding: "2px 12px 6px",
            }} aria-hidden="true">
              {group.group}
            </div>
            {visible.map(item => (
              <NavLink key={item.key} to={item.path}>{item.label}</NavLink>
            ))}
          </div>
        );
      })}

      <div style={{ flex: 1 }} />
      <NavLink to="/settings">Settings</NavLink>
    </nav>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <SettingsProvider>
      <HashRouter>
        <div className="layout">
          {/* Mobile: hamburger header */}
          {isMobile && (
            <div className="mobile-header">
              <button
                className="mobile-hamburger"
                onClick={() => setDrawerOpen(o => !o)}
                aria-label={drawerOpen ? "Close menu" : "Open menu"}
                aria-expanded={drawerOpen}
              >
                {drawerOpen ? "✕" : "☰"}
              </button>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>⌚ Garmin</span>
            </div>
          )}

          {/* Mobile: overlay behind drawer */}
          {isMobile && drawerOpen && (
            <div className="mobile-overlay" onClick={closeDrawer} aria-hidden="true" />
          )}

          <Sidebar open={isMobile ? drawerOpen : true} onClose={isMobile ? closeDrawer : null} />

          <main className="content">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/"               element={<Dashboard />} />
                  <Route path="/activities"     element={<Activities />} />
                  <Route path="/health"         element={<Health />} />
                  <Route path="/goals"          element={<Goals />} />
                  <Route path="/wrapped"        element={<Wrapped />} />
                  <Route path="/cards"          element={<Cards />} />
                  <Route path="/compare"        element={<Compare />} />
                  <Route path="/export"         element={<Export />} />
                  <Route path="/settings"       element={<Settings />} />
                  <Route path="/sync"           element={<Sync />} />
                  <Route path="/training-load"  element={<TrainingLoad />} />
                  <Route path="/map"            element={<ActivityMap />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </HashRouter>
    </SettingsProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
