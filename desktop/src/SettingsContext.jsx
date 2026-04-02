import { createContext, useContext, useState, useEffect } from "react";

const Ctx = createContext();

export function SettingsProvider({ children }) {
  const [unit,      setUnit]      = useState(() => localStorage.getItem("gd_unit")  || "imperial");
  const [theme,     setTheme]     = useState(() => localStorage.getItem("gd_theme") || "dark");
  const [hiddenNav, setHiddenNav] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gd_hidden_nav") || "[]"); }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem("gd_unit", unit); }, [unit]);

  useEffect(() => {
    localStorage.setItem("gd_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("gd_hidden_nav", JSON.stringify(hiddenNav));
  }, [hiddenNav]);

  // Apply stored theme immediately on mount (before React paint)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme",
      localStorage.getItem("gd_theme") || "dark");
  }, []);

  return (
    <Ctx.Provider value={{ unit, setUnit, theme, setTheme, hiddenNav, setHiddenNav }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSettings = () => useContext(Ctx);

/** Unit conversion helpers — recomputed whenever unit changes */
export function useUnits() {
  const { unit } = useSettings();
  const metric = unit === "metric";
  return {
    metric,
    distUnit:     metric ? "km"   : "mi",
    elevUnit:     metric ? "m"    : "ft",
    mToDist:      (m)  => metric ? m / 1000       : m / 1609.344,
    mToElev:      (m)  => metric ? m               : m * 3.28084,
    miToDist:     (mi) => metric ? mi * 1.60934    : mi,
    marathonDist: metric ? 42.195  : 26.219,
    earthCirc:    metric ? 40075   : 24901,
  };
}

/** Theme-aware style objects for Recharts */
export function useChartTheme() {
  const { theme } = useSettings();
  const dark = theme === "dark";
  return {
    tooltip: {
      contentStyle: { background: dark ? "#111" : "#fff", border: `1px solid ${dark ? "#222" : "#ddd"}`, borderRadius: 4 },
      labelStyle:   { color: dark ? "#888" : "#666" },
      itemStyle:    { color: dark ? "#e2e2e2" : "#333" },
    },
    axisTick:  { fill: dark ? "#555" : "#888", fontSize: 11 },
    gridColor: dark ? "#1a1a1a" : "#ebebeb",
  };
}
