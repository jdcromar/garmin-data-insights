import { useRef, useState } from "react";
import html2canvas from "html2canvas";

const CARD_PX      = 360;
const EXPORT_SCALE = 3;

// ── 10 Themes ─────────────────────────────────────────────────────────────────

export const THEMES = [
  {
    id: "carbon",   name: "Carbon",
    bg: "#0a0a0a",  surface: "#111111",
    bar: "#c8f135",
    a1: "#c8f135",  a2: "#ff4545", a3: "#7b61ff", a4: "#4a90d9",
    text: "#ffffff", sub: "#888888", muted: "#1e1e1e", eyebrow: "#333333",
  },
  {
    id: "chalk",    name: "Chalk",
    bg: "#f0f0f0",  surface: "#e2e2e2",
    bar: "#111111",
    a1: "#111111",  a2: "#c0392b", a3: "#2471a3", a4: "#1e8449",
    text: "#111111", sub: "#555555", muted: "#cccccc", eyebrow: "#999999",
  },
  {
    id: "midnight", name: "Midnight",
    bg: "#0d1117",  surface: "#161b22",
    bar: "linear-gradient(90deg,#58a6ff,#3fb950)",
    a1: "#58a6ff",  a2: "#f85149", a3: "#bc8cff", a4: "#3fb950",
    text: "#e6edf3", sub: "#8b949e", muted: "#21262d", eyebrow: "#30363d",
  },
  {
    id: "neon",     name: "Neon",
    bg: "#09090f",  surface: "#0f0f1a",
    bar: "linear-gradient(90deg,#ff00ff,#00ffff)",
    a1: "#ff00ff",  a2: "#00ffff", a3: "#ff6600", a4: "#ffff00",
    text: "#ffffff", sub: "#9999bb", muted: "#1a1a2e", eyebrow: "#2a2a4a",
  },
  {
    id: "sunset",   name: "Sunset",
    bg: "#0d0806",  surface: "#150f0a",
    bar: "linear-gradient(90deg,#ff6b35,#e84393)",
    a1: "#ff6b35",  a2: "#e84393", a3: "#f7c59f", a4: "#ffb347",
    text: "#fff8f0", sub: "#9a7060", muted: "#1f1510", eyebrow: "#3a2010",
  },
  {
    id: "forest",   name: "Forest",
    bg: "#080e08",  surface: "#0d160d",
    bar: "#2ecc71",
    a1: "#2ecc71",  a2: "#f39c12", a3: "#1abc9c", a4: "#a8e063",
    text: "#e8f5e8", sub: "#5a8a5a", muted: "#111811", eyebrow: "#1a2a1a",
  },
  {
    id: "glacier",  name: "Glacier",
    bg: "#080d14",  surface: "#0d1520",
    bar: "linear-gradient(90deg,#74b9ff,#a29bfe)",
    a1: "#74b9ff",  a2: "#a29bfe", a3: "#55efc4", a4: "#81ecec",
    text: "#ddeeff", sub: "#6688aa", muted: "#0d1825", eyebrow: "#182535",
  },
  {
    id: "crimson",  name: "Crimson",
    bg: "#0e0808",  surface: "#180c0c",
    bar: "#e53e3e",
    a1: "#e53e3e",  a2: "#fc8181", a3: "#f6ad55", a4: "#fbb6ce",
    text: "#fff5f5", sub: "#9a5a5a", muted: "#1a0e0e", eyebrow: "#2a1515",
  },
  {
    id: "gold",     name: "Gold",
    bg: "#0c0900",  surface: "#151100",
    bar: "linear-gradient(90deg,#f6d365,#fda085)",
    a1: "#f6d365",  a2: "#fda085", a3: "#f093fb", a4: "#ffeaa7",
    text: "#fff8e8", sub: "#8a7040", muted: "#1a1500", eyebrow: "#2a2000",
  },
  {
    id: "mono",     name: "Mono",
    bg: "#000000",  surface: "#0a0a0a",
    bar: "#ffffff",
    a1: "#ffffff",  a2: "#cccccc", a3: "#888888", a4: "#444444",
    text: "#ffffff", sub: "#555555", muted: "#111111", eyebrow: "#222222",
  },
];

// ── Shared primitives ─────────────────────────────────────────────────────────

function Shell({ cardRef, t, children }) {
  return (
    <div ref={cardRef} style={{
      width: CARD_PX, height: CARD_PX,
      background: t.bg,
      position: "relative",
      overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: 36,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: t.bar }} />
      <div style={{ position: "absolute", bottom: -50, right: -50, width: 160, height: 160,
        borderRadius: "50%", border: `1px solid ${t.a1}18` }} />
      <div style={{ position: "absolute", bottom: -20, right: -20, width: 90, height: 90,
        borderRadius: "50%", border: `1px solid ${t.a1}28` }} />
      {children}
      <Watermark t={t} />
    </div>
  );
}

function Watermark({ t, year }) {
  return (
    <div style={{ position: "absolute", bottom: 20, left: 36, right: 36,
      display: "flex", justifyContent: "space-between",
      fontSize: 7, letterSpacing: 3, color: t.eyebrow, textTransform: "uppercase" }}>
      <span>Garmin Wrapped{year ? ` · ${year}` : ""}</span>
      <span>Keep Moving</span>
    </div>
  );
}

function SectionLabel({ children, color }) {
  return (
    <div style={{ fontSize: 6, letterSpacing: 4, color,
      textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
      {children}
    </div>
  );
}

function StatRow({ label, value, t, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
      alignItems: "baseline", marginBottom: 8 }}>
      <span style={{ fontSize: 9, letterSpacing: 2, color: t.eyebrow, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 17, fontWeight: 800, color: color || t.text }}>{value}</span>
    </div>
  );
}

function Divider({ t }) {
  return <div style={{ height: 1, background: t.muted, margin: "16px 0" }} />;
}

// ── Hero Card ─────────────────────────────────────────────────────────────────

export function HeroCard({ year, tagline, t }) {
  const ref = useRef();
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-hero`}>
      <Shell cardRef={ref} t={t}>
        <div style={{ fontSize: 7, letterSpacing: 5, color: t.a1,
          textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>
          Your {year} in Motion
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 110, fontWeight: 900, color: t.text, lineHeight: 0.85,
            letterSpacing: -5, marginBottom: 24 }}>{year}</div>
          <div style={{ fontSize: 13, color: t.a1, fontWeight: 600, letterSpacing: 0.5 }}>{tagline}</div>
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Activity Card ─────────────────────────────────────────────────────────────

export function ActivityCard({ year, n, dist, hrs, cals, distUnit, t }) {
  const ref = useRef();
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-activities`}>
      <Shell cardRef={ref} t={t}>
        <div style={{ fontSize: 7, letterSpacing: 5, color: t.a1,
          textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>
          {year} · Activities
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 80, fontWeight: 900, color: t.text,
            lineHeight: 1, letterSpacing: -3, marginBottom: 4 }}>{n.toLocaleString()}</div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: t.a1,
            textTransform: "uppercase", fontWeight: 700, marginBottom: 20 }}>Workouts</div>
          <Divider t={t} />
          <StatRow label="Distance"        value={`${dist.toFixed(1)} ${distUnit}`} t={t} color={t.text} />
          <StatRow label="Time Moving"     value={`${hrs.toFixed(1)} hrs`}          t={t} color={t.text} />
          <StatRow label="Calories Burned" value={Math.round(cals).toLocaleString() + " kcal"} t={t} color={t.a2} />
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Steps Card ────────────────────────────────────────────────────────────────

export function StepsCard({ year, totalSteps, avgSteps, bestSteps, t }) {
  const ref = useRef();
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-steps`}>
      <Shell cardRef={ref} t={t}>
        <div style={{ fontSize: 7, letterSpacing: 5, color: t.a2,
          textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>
          {year} · Daily Grind
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: t.eyebrow,
            textTransform: "uppercase", marginBottom: 6 }}>Total Steps</div>
          <div style={{ fontSize: 54, fontWeight: 900, color: t.text,
            lineHeight: 1, letterSpacing: -2, marginBottom: 20 }}>
            {totalSteps.toLocaleString()}
          </div>
          <Divider t={t} />
          <StatRow label="Daily Average" value={avgSteps.toLocaleString()} t={t} color={t.text} />
          <StatRow label="Best Day"      value={bestSteps.toLocaleString()} t={t} color={t.a2} />
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Scale Card ────────────────────────────────────────────────────────────────

export function ScaleCard({ year, dist, elev, marathonDist, earthCirc, distUnit, elevUnit, t }) {
  const ref = useRef();
  const everest = elevUnit === "ft" ? 29032 : 8849;
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-scale`}>
      <Shell cardRef={ref} t={t}>
        <div style={{ fontSize: 7, letterSpacing: 5, color: t.a3,
          textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>
          {year} · In Perspective
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          {[
            { val: (dist / marathonDist).toFixed(1), label: "marathon equivalent", color: t.a1 },
            { val: (elev / everest).toFixed(2),      label: "times up Everest",    color: t.a2 },
            { val: (dist / earthCirc).toFixed(4),    label: "laps around Earth",   color: t.a3 },
          ].map(({ val, label, color }) => (
            <div key={label}>
              <div style={{ fontSize: 50, fontWeight: 900, color: t.text,
                lineHeight: 1, letterSpacing: -2 }}>
                {val}<span style={{ fontSize: 22, color }}>×</span>
              </div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: t.eyebrow,
                textTransform: "uppercase", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Consistency Card ──────────────────────────────────────────────────────────

export function ConsistencyCard({ year, n, monthCounts, dayCounts, t }) {
  const ref = useRef();
  const bestMonth = [...(monthCounts || [])].sort((a, b) => b.Count - a.Count)[0];
  const bestDay   = [...(dayCounts   || [])].sort((a, b) => b.Count - a.Count)[0];
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-consistency`}>
      <Shell cardRef={ref} t={t}>
        <div style={{ fontSize: 7, letterSpacing: 5, color: t.a4,
          textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>
          {year} · Your Patterns
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: t.eyebrow,
              textTransform: "uppercase", marginBottom: 6 }}>Favourite Day</div>
            <div style={{ fontSize: 64, fontWeight: 900, color: t.text, lineHeight: 1, letterSpacing: -2 }}>
              {bestDay?.day?.slice(0, 3) ?? "—"}
            </div>
            <div style={{ fontSize: 9, color: t.sub, marginTop: 4 }}>
              {bestDay?.Count ?? 0} workouts on {bestDay?.day}s
            </div>
          </div>
          <Divider t={t} />
          <StatRow label="Best Month"     value={(bestMonth?.month?.slice(0, 3) ?? "—") + ` (${bestMonth?.Count ?? 0})`} t={t} color={t.text} />
          <StatRow label="Total Workouts" value={n.toLocaleString()} t={t} color={t.a4} />
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── All Stats Card (portrait 4:5) ─────────────────────────────────────────────

export const ALL_SECTIONS = [
  { key: "activities", label: "Activities" },
  { key: "steps",      label: "Steps"      },
  { key: "scale",      label: "Scale"      },
  { key: "patterns",   label: "Patterns"   },
  { key: "sleep",      label: "Sleep"      },
];

export function AllStatsCard({
  year, tagline, t,
  n, dist, hrs, cals, distUnit,
  totalSteps, avgSteps, bestSteps,
  elev, elevUnit, marathonDist, earthCirc,
  monthCounts, dayCounts,
  avgSleep, avgScore,
  enabledSections,
}) {
  const ref = useRef();
  const bestDay   = [...(dayCounts   || [])].sort((a, b) => b.Count - a.Count)[0];
  const bestMonth = [...(monthCounts || [])].sort((a, b) => b.Count - a.Count)[0];
  const everest   = elevUnit === "ft" ? 29032 : 8849;

  const W = CARD_PX;
  const H = Math.round(CARD_PX * 1.25);

  const show = (key) => enabledSections[key] !== false;

  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-all-stats`}>
      <div ref={ref} style={{
        width: W, height: H,
        background: t.bg,
        position: "relative",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "30px 30px 40px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {/* top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: t.bar }} />

        {/* decorative ring */}
        <div style={{ position: "absolute", top: -50, right: -50, width: 160, height: 160,
          borderRadius: "50%", border: `1px solid ${t.a1}15` }} />

        {/* Header */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 6, letterSpacing: 5, color: t.eyebrow,
            textTransform: "uppercase", marginBottom: 5 }}>Your {year} in Motion</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 50, fontWeight: 900, color: t.text,
              lineHeight: 1, letterSpacing: -3 }}>{year}</div>
            <div style={{ fontSize: 9, color: t.a1, fontWeight: 600,
              letterSpacing: 0.5, maxWidth: 160, lineHeight: 1.4 }}>{tagline}</div>
          </div>
        </div>

        {/* Activities */}
        {show("activities") && (
          <Block t={t} label="Activities" labelColor={t.a1}>
            <MiniGrid>
              <MiniStat label="Workouts"  value={n.toLocaleString()}                              color={t.text} t={t} />
              <MiniStat label="Hours"     value={hrs.toFixed(1)}                                  color={t.text} t={t} />
              <MiniStat label="Distance"  value={`${dist.toFixed(1)} ${distUnit}`}                color={t.a1}   t={t} />
              <MiniStat label="Calories"  value={Math.round(cals).toLocaleString() + " kcal"}     color={t.a2}   t={t} />
            </MiniGrid>
          </Block>
        )}

        {/* Steps */}
        {show("steps") && (
          <Block t={t} label="Steps" labelColor={t.a2}>
            <MiniGrid cols={3}>
              <MiniStat label="Total"     value={totalSteps.toLocaleString()} color={t.text} t={t} />
              <MiniStat label="Daily Avg" value={avgSteps.toLocaleString()}   color={t.text} t={t} />
              <MiniStat label="Best Day"  value={bestSteps.toLocaleString()}  color={t.a2}   t={t} />
            </MiniGrid>
          </Block>
        )}

        {/* Scale + Patterns side by side */}
        {(show("scale") || show("patterns")) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {show("scale") && (
              <Block t={t} label="Scale" labelColor={t.a3} compact>
                {[
                  { val: (dist / marathonDist).toFixed(1) + "×", label: "marathons",  color: t.a1 },
                  { val: (elev / everest).toFixed(2) + "×",      label: "Everest",    color: t.a2 },
                  { val: (dist / earthCirc).toFixed(4) + "×",    label: "Earth laps", color: t.a3 },
                ].map(({ val, label, color }) => (
                  <div key={label} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 6, letterSpacing: 2, color: t.eyebrow,
                      textTransform: "uppercase" }}>{label}</div>
                  </div>
                ))}
              </Block>
            )}
            {show("patterns") && (
              <Block t={t} label="Patterns" labelColor={t.a4} compact>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 6, letterSpacing: 2, color: t.eyebrow,
                    textTransform: "uppercase", marginBottom: 2 }}>Fav Day</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: t.text, lineHeight: 1 }}>
                    {bestDay?.day?.slice(0, 3) ?? "—"}
                  </div>
                  <div style={{ fontSize: 7, color: t.sub }}>
                    {bestDay?.Count ?? 0} workouts
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 6, letterSpacing: 2, color: t.eyebrow,
                    textTransform: "uppercase", marginBottom: 2 }}>Best Month</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: t.text, lineHeight: 1 }}>
                    {bestMonth?.month?.slice(0, 3) ?? "—"}
                  </div>
                  <div style={{ fontSize: 7, color: t.sub }}>
                    {bestMonth?.Count ?? 0} workouts
                  </div>
                </div>
              </Block>
            )}
          </div>
        )}

        {/* Sleep */}
        {show("sleep") && avgSleep && (
          <Block t={t} label="Recovery" labelColor={t.a3}>
            <MiniGrid cols={2}>
              <MiniStat label="Avg Sleep"   value={`${avgSleep} hrs`} color={t.a3} t={t} />
              {avgScore && <MiniStat label="Sleep Score" value={avgScore} color={t.text} t={t} />}
            </MiniGrid>
          </Block>
        )}

        <Watermark t={t} year={year} />
      </div>
    </ExportWrapper>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function Block({ t, label, labelColor, children, compact }) {
  return (
    <div style={{ background: t.surface, borderRadius: 5,
      padding: compact ? "10px 12px" : "11px 14px" }}>
      <SectionLabel color={labelColor}>{label}</SectionLabel>
      {children}
    </div>
  );
}

function MiniGrid({ children, cols = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "6px 10px" }}>
      {children}
    </div>
  );
}

function MiniStat({ label, value, color, t }) {
  return (
    <div>
      <div style={{ fontSize: 6, letterSpacing: 2, color: t.eyebrow,
        textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── Export wrapper ────────────────────────────────────────────────────────────

export function ExportWrapper({ cardRef, filename, children }) {
  const [state, setState] = useState("idle");

  async function capture() {
    return html2canvas(cardRef.current, {
      scale: EXPORT_SCALE,
      useCORS: true,
      logging: false,
    });
  }

  async function download() {
    setState("working");
    try {
      const canvas = await capture();
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${filename}.png`; a.click();
        URL.revokeObjectURL(url);
        setState("done");
        setTimeout(() => setState("idle"), 2500);
      }, "image/png");
    } catch { setState("idle"); }
  }

  async function copy() {
    setState("working");
    try {
      const canvas = await capture();
      canvas.toBlob(async blob => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setState("copied");
        } catch { setState("idle"); }
        setTimeout(() => setState("idle"), 2500);
      }, "image/png");
    } catch { setState("idle"); }
  }

  const busy = state === "working";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ borderRadius: 4, overflow: "hidden", lineHeight: 0,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
        {children}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={download} disabled={busy} style={btnStyle("#c8f135", busy)}>
          {busy && <Spinner color="#c8f135" />}
          {state === "done" ? "✓ Saved" : busy ? "Exporting…" : "↓ Download"}
        </button>
        <button onClick={copy} disabled={busy} style={btnStyle("#555", busy)}>
          {state === "copied" ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function btnStyle(accent, disabled) {
  return {
    flex: 1, padding: "7px 10px", borderRadius: 4, border: `1px solid ${accent}`,
    background: "transparent", color: accent, fontSize: "0.75rem", fontWeight: 600,
    letterSpacing: 1, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1, display: "flex", alignItems: "center",
    justifyContent: "center", gap: 6, transition: "opacity 0.15s",
  };
}

function Spinner({ color }) {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx={6} cy={6} r={4.5} fill="none" stroke={color}
        strokeWidth={1.5} strokeDasharray="18 6" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
