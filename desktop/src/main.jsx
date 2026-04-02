import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import { SettingsProvider, useSettings } from "./SettingsContext";
import Dashboard     from "./pages/Dashboard";
import Activities    from "./pages/Activities";
import Health        from "./pages/Health";
import Wrapped       from "./pages/Wrapped";
import Goals         from "./pages/Goals";
import Compare       from "./pages/Compare";
import Cards         from "./pages/Cards";
import Export        from "./pages/Export";
import Settings      from "./pages/Settings";
import Sync          from "./pages/Sync";
import TrainingLoad  from "./pages/TrainingLoad";
import ActivityMap   from "./pages/ActivityMap";
import "./index.css";

// ── Nav definition ────────────────────────────────────────────────────────────

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

// ── Sidebar nav ───────────────────────────────────────────────────────────────

function Sidebar() {
  const { hiddenNav } = useSettings();

  return (
    <nav className="sidebar">
      <div className="logo">⌚ Garmin</div>

      {/* Dashboard always visible */}
      <NavLink to="/" end>Dashboard</NavLink>

      {NAV_GROUPS.map((group, gi) => {
        const visible = group.items.filter(item => !hiddenNav.includes(item.key));
        if (!visible.length) return null;
        return (
          <div key={group.group}>
            <div style={{
              height: 1, background: "var(--border)",
              margin: "10px 0 6px",
            }} />
            <div style={{
              fontSize: "0.55rem", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--muted)",
              padding: "2px 12px 6px",
            }}>
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

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <div className="layout">
          <Sidebar />
          <main className="content">
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
          </main>
        </div>
      </HashRouter>
    </SettingsProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
