import { useSettings } from "../SettingsContext";

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

export default function Settings() {
  const { unit, setUnit, theme, setTheme } = useSettings();

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Settings</h1>
      <p style={{ color: "var(--sub)", marginBottom: 32, fontSize: "0.9rem" }}>
        Preferences are saved locally and persist across sessions.
      </p>

      <div className="card" style={{ maxWidth: 520 }}>
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
    </div>
  );
}
