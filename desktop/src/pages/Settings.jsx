import { useSettings } from "../SettingsContext";
import { NAV_GROUPS } from "../main";

const LIME = "#c8f135";

function ToggleGroup({ label, hint, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize: "0.65rem", letterSpacing: 3, color: "var(--muted)",
        textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {hint && <div style={{ fontSize: "0.8rem", color: "var(--sub)", marginBottom: 14 }}>{hint}</div>}
      <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 4,
        overflow: "hidden", width: "fit-content" }}>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button key={opt.value} onClick={() => onChange(opt.value)}
              style={{
                padding: "10px 28px", border: "none", cursor: "pointer",
                fontSize: "0.9rem", fontWeight: 600,
                background: active ? LIME : "var(--surface)",
                color: active ? "#000" : "var(--sub)",
                transition: "background 0.15s, color 0.15s",
                borderRight: "1px solid var(--border)",
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavToggle({ item, hidden, onToggle }) {
  const isHidden = hidden.includes(item.key);
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "9px 0", borderBottom: "1px solid var(--border)",
      cursor: "pointer", userSelect: "none",
    }}>
      <div
        onClick={() => onToggle(item.key)}
        style={{
          width: 18, height: 18, borderRadius: 3, flexShrink: 0,
          border: `2px solid ${isHidden ? "var(--border)" : LIME}`,
          background: isHidden ? "transparent" : LIME,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s, border-color 0.15s",
          cursor: "pointer",
        }}
      >
        {!isHidden && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: "0.88rem", color: isHidden ? "var(--muted)" : "var(--text)" }}>
        {item.label}
      </span>
    </label>
  );
}

export default function Settings() {
  const { unit, setUnit, theme, setTheme, hiddenNav, setHiddenNav } = useSettings();

  function toggleNav(key) {
    setHiddenNav(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Settings</h1>
      <p style={{ color: "var(--sub)", marginBottom: 32, fontSize: "0.9rem" }}>
        Preferences are saved locally and persist across sessions.
      </p>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="card" style={{ maxWidth: 520, flex: "1 1 400px" }}>
          <h2 style={{ marginTop: 0, marginBottom: 28 }}>Preferences</h2>

          <ToggleGroup
            label="Units"
            hint="Applies to distance and elevation throughout the app."
            value={unit}
            onChange={setUnit}
            options={[
              { value: "imperial", label: "Imperial  (mi, ft)" },
              { value: "metric",   label: "Metric  (km, m)"   },
            ]}
          />

          <ToggleGroup
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "dark",  label: "Dark"  },
              { value: "light", label: "Light" },
            ]}
          />
        </div>

        <div className="card" style={{ minWidth: 260, flex: "0 1 280px" }}>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>Navigation</h2>
          <p style={{ color: "var(--sub)", fontSize: "0.8rem", marginBottom: 20 }}>
            Choose which pages appear in the sidebar.
          </p>

          {NAV_GROUPS.map((group, gi) => (
            <div key={group.group}>
              {gi > 0 && <div style={{ height: 1, background: "var(--border)", margin: "12px 0 10px" }} />}
              <div style={{
                fontSize: "0.6rem", letterSpacing: "0.18em",
                textTransform: "uppercase", color: "var(--muted)",
                marginBottom: 4,
              }}>
                {group.group}
              </div>
              {group.items.map(item => (
                <NavToggle
                  key={item.key}
                  item={item}
                  hidden={hiddenNav}
                  onToggle={toggleNav}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
