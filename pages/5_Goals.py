import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from src.database import get_conn

st.set_page_config(page_title="Goals", page_icon="🎯", layout="wide")

LIME   = "#C8F135"
RED    = "#FF4545"
PURPLE = "#7B61FF"
BLUE   = "#4a90d9"
MUTED  = "#aaaaaa"

METRICS = {
    "steps":           {"label": "Total Steps",      "unit": "steps", "default": 3000000},
    "active_calories": {"label": "Active Calories",  "unit": "kcal",  "default": 500000},
    "distance_mi":     {"label": "Distance (miles)", "unit": "mi",    "default": 500},
    "active_days":     {"label": "Active Days (≥5k steps)", "unit": "days", "default": 250},
    "workout_hours":   {"label": "Workout Hours",    "unit": "hrs",   "default": 200},
}

COLORS = [LIME, RED, PURPLE, BLUE, "#f39c12"]

st.markdown("## 🎯 Goals")

year = st.selectbox("", list(range(2026, 2019, -1)), label_visibility="collapsed")

# ── Load goals + compute actuals ──────────────────────────────────────────────
with get_conn() as conn:
    goals_df = pd.read_sql("SELECT * FROM goals WHERE year=?", conn, params=(year,))
    stats_df = pd.read_sql(
        "SELECT steps, active_calories, distance_meters FROM daily_stats WHERE date LIKE ?",
        conn, params=(f"{year}%",)
    )
    acts_df = pd.read_sql(
        "SELECT duration_secs FROM activities WHERE start_time LIKE ?",
        conn, params=(f"{year}%",)
    )

actuals = {
    "steps":           int(stats_df["steps"].sum()),
    "active_calories": int(stats_df["active_calories"].sum()),
    "distance_mi":     round(stats_df["distance_meters"].sum() / 1609.344, 1),
    "active_days":     int((stats_df["steps"] >= 5000).sum()),
    "workout_hours":   round(acts_df["duration_secs"].sum() / 3600, 1),
}

# ── Set / Edit Goals ──────────────────────────────────────────────────────────
with st.expander("⚙️ Set Goals for " + str(year), expanded=goals_df.empty):
    with st.form("goals_form"):
        inputs = {}
        cols = st.columns(len(METRICS))
        for i, (metric, cfg) in enumerate(METRICS.items()):
            existing = goals_df[goals_df["metric"] == metric]["target"].values
            default_val = float(existing[0]) if len(existing) else float(cfg["default"])
            inputs[metric] = cols[i].number_input(
                f"{cfg['label']} ({cfg['unit']})",
                min_value=0.0, value=default_val, step=1000.0 if "steps" in metric else 10.0,
                format="%.0f"
            )
        submitted = st.form_submit_button("Save Goals")

    if submitted:
        with get_conn() as conn:
            for metric, target in inputs.items():
                conn.execute(
                    "INSERT INTO goals(metric, target, year) VALUES(?,?,?) "
                    "ON CONFLICT(metric, year) DO UPDATE SET target=excluded.target",
                    (metric, target, year)
                )
        st.success("Goals saved!")
        st.rerun()

# ── No goals set ─────────────────────────────────────────────────────────────
if goals_df.empty:
    st.info(f"No goals set for {year}. Expand the section above to add them.")
    st.stop()

# ── Progress Cards ────────────────────────────────────────────────────────────
st.markdown(f"### {year} Progress")

goal_map = {r["metric"]: r["target"] for _, r in goals_df.iterrows()}

card_cols = st.columns(len(goal_map))
for i, (metric, target) in enumerate(goal_map.items()):
    cfg     = METRICS.get(metric, {"label": metric, "unit": ""})
    actual  = actuals.get(metric, 0)
    pct     = min(round(actual / target * 100, 1), 100) if target else 0
    color   = COLORS[i % len(COLORS)]

    # Days remaining in year
    import datetime
    today = datetime.date.today()
    year_end = datetime.date(year, 12, 31)
    days_remaining = max((year_end - today).days, 0) if today.year == year else 0
    days_elapsed   = max((today - datetime.date(year, 1, 1)).days, 1) if today.year == year else 365
    on_pace = round(actual / days_elapsed * 365) if days_elapsed else None

    pace_note = ""
    if on_pace and target and today.year == year:
        pace_pct = round(on_pace / target * 100)
        pace_note = f"On pace for {on_pace:,.0f} ({pace_pct}% of goal)"

    with card_cols[i]:
        st.markdown(f"""
        <div style="background:#0e0e0e;padding:20px;border-top:3px solid {color};border-radius:4px;margin-bottom:16px;">
            <div style="font-size:0.7rem;letter-spacing:2px;color:{MUTED};text-transform:uppercase;margin-bottom:8px;">{cfg['label']}</div>
            <div style="font-size:2rem;font-weight:900;color:white;line-height:1;">{actual:,.0f}</div>
            <div style="color:{MUTED};font-size:0.75rem;margin:4px 0;">of {target:,.0f} {cfg['unit']}</div>
            <div style="background:#1a1a1a;border-radius:3px;height:6px;margin:10px 0;">
                <div style="background:{color};width:{pct}%;height:6px;border-radius:3px;"></div>
            </div>
            <div style="color:{color};font-size:0.8rem;font-weight:700;">{pct}%</div>
            {'<div style="color:' + MUTED + ';font-size:0.7rem;margin-top:4px;">' + pace_note + '</div>' if pace_note else ''}
        </div>""", unsafe_allow_html=True)

# ── Gauge Charts ──────────────────────────────────────────────────────────────
st.markdown("### Progress Gauges")

gauge_cols = st.columns(len(goal_map))
for i, (metric, target) in enumerate(goal_map.items()):
    cfg    = METRICS.get(metric, {"label": metric, "unit": ""})
    actual = actuals.get(metric, 0)
    pct    = min(actual / target * 100, 100) if target else 0
    color  = COLORS[i % len(COLORS)]

    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=actual,
        delta={"reference": target, "valueformat": ",.0f"},
        title={"text": cfg["label"], "font": {"size": 12, "color": MUTED}},
        number={"valueformat": ",.0f", "font": {"color": "white"}},
        gauge={
            "axis": {"range": [0, target], "tickcolor": "#333", "tickfont": {"color": "#555"}},
            "bar": {"color": color, "thickness": 0.3},
            "bgcolor": "#1a1a1a",
            "borderwidth": 0,
            "steps": [{"range": [0, target * 0.5], "color": "#111"},
                      {"range": [target * 0.5, target], "color": "#111"}],
            "threshold": {"line": {"color": "white", "width": 2}, "thickness": 0.75, "value": target},
        },
    ))
    fig.update_layout(
        height=200,
        margin=dict(t=40, b=10, l=20, r=20),
        paper_bgcolor="#0e0e0e",
        font=dict(color="#aaa"),
    )

    with gauge_cols[i]:
        st.plotly_chart(fig, use_container_width=True)
