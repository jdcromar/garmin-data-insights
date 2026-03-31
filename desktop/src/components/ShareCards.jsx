import { useRef, useState } from "react";
import html2canvas from "html2canvas";

// Cards render at CARD_PX; html2canvas exports at CARD_PX * EXPORT_SCALE = 1080px
const CARD_PX      = 360;
const EXPORT_SCALE = 3;

const BG     = "#0a0a0a";
const LIME   = "#c8f135";
const RED    = "#ff4545";
const PURPLE = "#7b61ff";
const BLUE   = "#4a90d9";

// ── Card shell ────────────────────────────────────────────────────────────────

function Shell({ cardRef, accent = LIME, children }) {
  return (
    <div ref={cardRef} style={{
      width: CARD_PX, height: CARD_PX,
      background: BG,
      position: "relative",
      overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: 36,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* top accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />

      {/* decorative rings bottom-right */}
      <div style={{ position: "absolute", bottom: -50, right: -50, width: 160, height: 160,
        borderRadius: "50%", border: `1px solid ${accent}18` }} />
      <div style={{ position: "absolute", bottom: -20, right: -20, width: 90, height: 90,
        borderRadius: "50%", border: `1px solid ${accent}28` }} />

      {children}

      {/* watermark */}
      <div style={{ position: "absolute", bottom: 22, left: 36, right: 36,
        display: "flex", justifyContent: "space-between",
        fontSize: 8, letterSpacing: 3, color: "#252525", textTransform: "uppercase" }}>
        <span>Garmin Wrapped</span>
        <span>Keep Moving</span>
      </div>
    </div>
  );
}

function Eyebrow({ children, color = "#333" }) {
  return (
    <div style={{ fontSize: 8, letterSpacing: 4, color, textTransform: "uppercase",
      marginBottom: 12, fontWeight: 700 }}>
      {children}
    </div>
  );
}

function BigNum({ children, color = "white" }) {
  return (
    <div style={{ fontSize: 80, fontWeight: 900, color, lineHeight: 1,
      letterSpacing: -3, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Label({ children, color = "#555" }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: 3, color, textTransform: "uppercase",
      fontWeight: 700 }}>
      {children}
    </div>
  );
}

function Divider({ color = "#1a1a1a" }) {
  return <div style={{ height: 1, background: color, margin: "20px 0" }} />;
}

function StatRow({ label, value, color = "#888" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
      alignItems: "baseline", marginBottom: 10 }}>
      <span style={{ fontSize: 10, letterSpacing: 2, color: "#444", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

// ── Card 1: Hero ──────────────────────────────────────────────────────────────

export function HeroCard({ year, tagline }) {
  const ref = useRef();
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-hero`}>
      <Shell cardRef={ref} accent={LIME}>
        <Eyebrow color={LIME}>Your {year} in Motion</Eyebrow>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 120, fontWeight: 900, color: "white", lineHeight: 0.85,
            letterSpacing: -6, marginBottom: 28 }}>
            {year}
          </div>
          <div style={{ fontSize: 14, color: LIME, fontWeight: 600, letterSpacing: 1 }}>
            {tagline}
          </div>
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Card 2: Activity Summary ──────────────────────────────────────────────────

export function ActivityCard({ year, n, dist, hrs, cals, distUnit }) {
  const ref = useRef();
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-activities`}>
      <Shell cardRef={ref} accent={LIME}>
        <Eyebrow color={LIME}>{year} · Activities</Eyebrow>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BigNum>{n.toLocaleString()}</BigNum>
          <Label color={LIME}>Workouts</Label>
          <Divider />
          <StatRow label="Distance"       value={`${dist.toFixed(1)} ${distUnit}`} color="white" />
          <StatRow label="Time Moving"    value={`${hrs.toFixed(1)} hrs`}          color="white" />
          <StatRow label="Calories Burned" value={Math.round(cals).toLocaleString() + " kcal"} color={RED} />
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Card 3: Steps ─────────────────────────────────────────────────────────────

export function StepsCard({ year, totalSteps, avgSteps, bestSteps }) {
  const ref = useRef();
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-steps`}>
      <Shell cardRef={ref} accent={RED}>
        <Eyebrow color={RED}>{year} · Daily Grind</Eyebrow>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#333",
            textTransform: "uppercase", marginBottom: 8 }}>Total Steps</div>
          <div style={{ fontSize: 58, fontWeight: 900, color: "white", lineHeight: 1,
            letterSpacing: -2, marginBottom: 24 }}>
            {totalSteps.toLocaleString()}
          </div>
          <Divider />
          <StatRow label="Daily Average" value={avgSteps.toLocaleString()} color="white" />
          <StatRow label="Best Day"      value={bestSteps.toLocaleString()} color={RED} />
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Card 4: Scale ─────────────────────────────────────────────────────────────

export function ScaleCard({ year, dist, elevElev, marathonDist, earthCirc, distUnit, elevUnit }) {
  const ref = useRef();
  const everest = distUnit === "mi" ? 29032 : 8849; // ft or m
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-scale`}>
      <Shell cardRef={ref} accent={PURPLE}>
        <Eyebrow color={PURPLE}>{year} · In Perspective</Eyebrow>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: -2 }}>
              {(dist / marathonDist).toFixed(1)}<span style={{ fontSize: 24, color: LIME }}>×</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", textTransform: "uppercase", marginTop: 4 }}>
              marathon equivalent
            </div>
          </div>
          <div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: -2 }}>
              {(elevElev / everest).toFixed(2)}<span style={{ fontSize: 24, color: RED }}>×</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", textTransform: "uppercase", marginTop: 4 }}>
              times up Everest
            </div>
          </div>
          <div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: -2 }}>
              {(dist / earthCirc).toFixed(4)}<span style={{ fontSize: 24, color: PURPLE }}>×</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", textTransform: "uppercase", marginTop: 4 }}>
              laps around Earth
            </div>
          </div>
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Card: All Stats (portrait 4:5 — 1080×1350) ───────────────────────────────

export function AllStatsCard({ year, tagline, n, dist, hrs, cals, distUnit,
  totalSteps, avgSteps, bestSteps, elev, elevUnit, marathonDist, earthCirc,
  monthCounts, dayCounts, avgSleep, avgScore }) {
  const ref = useRef();

  const bestDay   = [...(dayCounts  || [])].sort((a, b) => b.Count - a.Count)[0];
  const bestMonth = [...(monthCounts|| [])].sort((a, b) => b.Count - a.Count)[0];
  const everest   = elevUnit === "ft" ? 29032 : 8849;

  // Portrait dimensions: 360 wide × 450 tall → exports 1080×1350
  const W = CARD_PX;
  const H = Math.round(CARD_PX * 1.25);

  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-all-stats`} wide>
      <div ref={ref} style={{
        width: W, height: H,
        background: BG,
        position: "relative",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxSizing: "border-box",
        padding: "32px 32px 44px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}>
        {/* top accent — tri-color */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${LIME} 0%, ${BLUE} 50%, ${PURPLE} 100%)` }} />

        {/* decorative ring */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200,
          borderRadius: "50%", border: `1px solid ${LIME}12` }} />
        <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100,
          borderRadius: "50%", border: `1px solid ${LIME}20` }} />

        {/* ── Header ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 7, letterSpacing: 5, color: "#333",
            textTransform: "uppercase", marginBottom: 6 }}>
            YOUR {year} IN MOTION
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: "white",
              lineHeight: 1, letterSpacing: -3 }}>{year}</div>
            <div style={{ fontSize: 10, color: LIME, fontWeight: 600,
              letterSpacing: 0.5, maxWidth: 160, lineHeight: 1.4 }}>{tagline}</div>
          </div>
        </div>

        {/* ── Activities block ── */}
        <div style={{ background: "#111", borderRadius: 6, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ fontSize: 6, letterSpacing: 4, color: LIME,
            textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Activities</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            {[
              { label: "Workouts",  val: n.toLocaleString(),                         color: "white"  },
              { label: "Hours",     val: hrs.toFixed(1),                             color: "white"  },
              { label: `Distance`,  val: `${dist.toFixed(1)} ${distUnit}`,           color: LIME     },
              { label: "Calories",  val: Math.round(cals).toLocaleString() + " kcal",color: RED      },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div style={{ fontSize: 7, letterSpacing: 2, color: "#444",
                  textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Steps block ── */}
        <div style={{ background: "#111", borderRadius: 6, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ fontSize: 6, letterSpacing: 4, color: RED,
            textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Steps</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 8px" }}>
            {[
              { label: "Total",   val: totalSteps.toLocaleString(), color: "white" },
              { label: "Daily Avg", val: avgSteps.toLocaleString(), color: "white" },
              { label: "Best Day",  val: bestSteps.toLocaleString(),color: RED     },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div style={{ fontSize: 7, letterSpacing: 2, color: "#444",
                  textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scale + Patterns side by side ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          {/* Scale */}
          <div style={{ background: "#111", borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ fontSize: 6, letterSpacing: 4, color: PURPLE,
              textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Scale</div>
            {[
              { val: (dist / marathonDist).toFixed(1) + "×", label: "marathons",  color: LIME   },
              { val: (elev / everest).toFixed(2) + "×",      label: "Everest",    color: RED    },
              { val: (dist / earthCirc).toFixed(4) + "×",    label: "Earth laps", color: PURPLE },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 7, letterSpacing: 2, color: "#444",
                  textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Patterns */}
          <div style={{ background: "#111", borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ fontSize: 6, letterSpacing: 4, color: BLUE,
              textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Patterns</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "#444",
                textTransform: "uppercase", marginBottom: 3 }}>Fav Day</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "white", lineHeight: 1 }}>
                {bestDay?.day?.slice(0, 3) ?? "—"}
              </div>
              <div style={{ fontSize: 8, color: "#444", marginTop: 2 }}>
                {bestDay?.Count ?? 0} workouts
              </div>
            </div>
            <div>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "#444",
                textTransform: "uppercase", marginBottom: 3 }}>Best Month</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "white", lineHeight: 1 }}>
                {bestMonth?.month?.slice(0, 3) ?? "—"}
              </div>
              <div style={{ fontSize: 8, color: "#444", marginTop: 2 }}>
                {bestMonth?.Count ?? 0} workouts
              </div>
            </div>
          </div>
        </div>

        {/* ── Sleep (optional) ── */}
        {avgSleep && (
          <div style={{ background: "#111", borderRadius: 6, padding: "12px 16px", marginBottom: 10 }}>
            <div style={{ fontSize: 6, letterSpacing: 4, color: PURPLE,
              textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>Recovery</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 7, letterSpacing: 2, color: "#444",
                  textTransform: "uppercase", marginBottom: 2 }}>Avg Sleep</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: PURPLE }}>{avgSleep} hrs</div>
              </div>
              {avgScore && (
                <div>
                  <div style={{ fontSize: 7, letterSpacing: 2, color: "#444",
                    textTransform: "uppercase", marginBottom: 2 }}>Sleep Score</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>{avgScore}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Watermark ── */}
        <div style={{ position: "absolute", bottom: 18, left: 32, right: 32,
          display: "flex", justifyContent: "space-between",
          fontSize: 7, letterSpacing: 3, color: "#222", textTransform: "uppercase" }}>
          <span>Garmin Wrapped · {year}</span>
          <span>Keep Moving</span>
        </div>
      </div>
    </ExportWrapper>
  );
}

// ── Card 5: Consistency ───────────────────────────────────────────────────────

export function ConsistencyCard({ year, n, monthCounts, dayCounts }) {
  const bestMonth = [...monthCounts].sort((a, b) => b.Count - a.Count)[0];
  const bestDay   = [...dayCounts].sort((a, b) => b.Count - a.Count)[0];
  const ref = useRef();
  return (
    <ExportWrapper cardRef={ref} filename={`wrapped-${year}-consistency`}>
      <Shell cardRef={ref} accent={BLUE}>
        <Eyebrow color={BLUE}>{year} · Your Patterns</Eyebrow>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#333",
              textTransform: "uppercase", marginBottom: 8 }}>Favourite Day</div>
            <div style={{ fontSize: 64, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: -2 }}>
              {bestDay?.day?.slice(0, 3) ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>
              {bestDay?.Count ?? 0} workouts on {bestDay?.day}s
            </div>
          </div>
          <Divider />
          <StatRow label="Best Month" value={bestMonth?.month?.slice(0, 3) + ` (${bestMonth?.Count})`} color="white" />
          <StatRow label="Total Workouts" value={n.toLocaleString()} color={BLUE} />
        </div>
      </Shell>
    </ExportWrapper>
  );
}

// ── Export wrapper (handles download + copy UI) ───────────────────────────────

function ExportWrapper({ cardRef, filename, children, wide = false }) {
  const [state, setState] = useState("idle"); // idle | working | done

  async function capture() {
    setState("working");
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: EXPORT_SCALE,
        backgroundColor: BG,
        useCORS: true,
        logging: false,
      });
      return canvas;
    } finally {
      // state updated by caller
    }
  }

  async function download() {
    const canvas = await capture();
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    }, "image/png");
  }

  async function copyToClipboard() {
    const canvas = await capture();
    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setState("copied");
      } catch {
        setState("idle");
      }
      setTimeout(() => setState("idle"), 2500);
    }, "image/png");
  }

  const busy = state === "working";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Preview */}
      <div style={{ borderRadius: 4, overflow: "hidden", lineHeight: 0,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
        {children}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={download} disabled={busy} style={btnStyle(LIME, busy)}>
          {busy ? <Spinner color={LIME} /> : null}
          {state === "done" ? "✓ Saved" : busy ? "Exporting…" : "↓ Download"}
        </button>
        <button onClick={copyToClipboard} disabled={busy} style={btnStyle("#333", busy)}>
          {state === "copied" ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function btnStyle(accent, disabled) {
  return {
    flex: 1,
    padding: "7px 10px",
    borderRadius: 4,
    border: `1px solid ${accent}`,
    background: "transparent",
    color: accent,
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "opacity 0.15s",
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
