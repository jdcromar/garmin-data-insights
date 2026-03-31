import { useState } from "react";
import { api } from "../api";

const LIME = "#c8f135";

const TABLES = [
  { key: "activities",  label: "Activities",   desc: "All workout sessions — type, distance, duration, HR, calories" },
  { key: "daily_stats", label: "Daily Stats",  desc: "Step counts, calories, heart rate by day" },
  { key: "sleep",       label: "Sleep",        desc: "Sleep duration, stages, and score per night" },
  { key: "hrv",         label: "HRV",          desc: "Heart rate variability — weekly average and last-night readings" },
];

export default function Export() {
  const [downloading, setDownloading] = useState({});
  const [done, setDone]               = useState({});

  async function download(table) {
    setDownloading(d => ({ ...d, [table]: true }));
    setDone(d => ({ ...d, [table]: false }));

    try {
      const url = api.exportCsv(table);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${table}.csv`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      setDone(d => ({ ...d, [table]: true }));
      setTimeout(() => setDone(d => ({ ...d, [table]: false })), 3000);
    } finally {
      setDownloading(d => ({ ...d, [table]: false }));
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Export Data</h1>
      <p style={{ color: "var(--sub)", marginBottom: 32, fontSize: "0.9rem" }}>
        Download your Garmin data as CSV files for use in Excel, Google Sheets, or any analysis tool.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {TABLES.map(t => {
          const isDownloading = downloading[t.key];
          const isDone        = done[t.key];

          return (
            <div key={t.key} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>{t.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--sub)" }}>{t.desc}</div>
              </div>

              <button
                onClick={() => download(t.key)}
                disabled={isDownloading}
                style={{
                  marginTop: "auto",
                  background: isDone ? LIME + "22" : "transparent",
                  border: `1px solid ${isDone ? LIME : isDownloading ? "var(--muted)" : LIME}`,
                  color: isDone ? LIME : isDownloading ? "var(--muted)" : LIME,
                  borderRadius: 4,
                  padding: "8px 16px",
                  cursor: isDownloading ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  letterSpacing: 1,
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}>
                {isDownloading && <Spinner />}
                {isDone       && "✓ "}
                {isDownloading ? "Downloading…" : isDone ? "Downloaded!" : `Download ${t.label}.csv`}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 40, padding: "20px 0", borderTop: "1px solid var(--border)",
        fontSize: "0.75rem", color: "var(--muted)", letterSpacing: 1 }}>
        Raw JSON columns are excluded from exports.
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx={7} cy={7} r={5.5} fill="none" stroke="currentColor"
        strokeWidth={1.8} strokeDasharray="22 8" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
