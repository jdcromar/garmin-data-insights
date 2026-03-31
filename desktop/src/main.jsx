import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import { SettingsProvider } from "./SettingsContext";
import Dashboard  from "./pages/Dashboard";
import Activities from "./pages/Activities";
import Health     from "./pages/Health";
import Wrapped    from "./pages/Wrapped";
import Goals      from "./pages/Goals";
import Compare    from "./pages/Compare";
import Export     from "./pages/Export";
import Settings   from "./pages/Settings";
import Sync       from "./pages/Sync";
import "./index.css";

function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <div className="layout">
          <nav className="sidebar">
            <div className="logo">⌚ Garmin</div>
            <NavLink to="/"          end>Dashboard</NavLink>
            <NavLink to="/activities">Activities</NavLink>
            <NavLink to="/health">Health</NavLink>
            <NavLink to="/goals">Goals</NavLink>
            <NavLink to="/wrapped">Wrapped</NavLink>
            <NavLink to="/compare">Compare</NavLink>
            <NavLink to="/export">Export</NavLink>
            <NavLink to="/sync">Sync</NavLink>
            <div style={{ flex: 1 }} />
            <NavLink to="/settings">Settings</NavLink>
          </nav>
          <main className="content">
            <Routes>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/health"     element={<Health />} />
              <Route path="/goals"      element={<Goals />} />
              <Route path="/wrapped"    element={<Wrapped />} />
              <Route path="/compare"    element={<Compare />} />
              <Route path="/export"     element={<Export />} />
              <Route path="/settings"   element={<Settings />} />
              <Route path="/sync"       element={<Sync />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </SettingsProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
