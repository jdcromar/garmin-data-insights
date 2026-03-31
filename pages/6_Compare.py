import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from src.database import get_conn

st.set_page_config(page_title="Year Compare", page_icon="📊", layout="wide")

LIME   = "#C8F135"
RED    = "#FF4545"
PURPLE = "#7B61FF"
BLUE   = "#4a90d9"
ORANGE = "#f39c12"
MUTED  = "#aaaaaa"

PALETTE = [LIME, RED, PURPLE, BLUE, ORANGE]

CHART = dict(
    template="plotly_dark",
    paper_bgcolor="#0e0e0e",
    plot_bgcolor="#0e0e0e",
    margin=dict(t=36, b=24, l=10, r=10),
    font=dict(color="#bbbbbb", size=12),
    yaxis=dict(showgrid=False),
)

def section(label):
    st.markdown(f"""
    <div style="margin:40px 0 20px;">
        <span style="font-size:0.6rem;letter-spacing:6px;color:{LIME};text-transform:uppercase;font-weight:700;">{label}</span>
        <hr style="border:none;border-top:1px solid #1c1c1c;margin-top:8px;">
    </div>""", unsafe_allow_html=True)

st.markdown("## 📊 Year-over-Year Compare")

# ── Year picker ────────────────────────────────────────────────────────────────
all_years = list(range(2026, 2019, -1))
selected = st.multiselect("Select years to compare", all_years,
                          default=all_years[:2], max_selections=4)

if len(selected) < 2:
    st.info("Select at least 2 years to compare.")
    st.stop()

# ── Load data per year ────────────────────────────────────────────────────────
year_data = {}
for yr in selected:
    with get_conn() as conn:
        stats = pd.read_sql(
            "SELECT date, steps, active_calories, total_calories, resting_hr FROM daily_stats WHERE date LIKE ?",
            conn, params=(f"{yr}%",)
        )
        acts = pd.read_sql(
            "SELECT start_time, distance_meters, duration_secs, calories, elevation_gain, activity_type "
            "FROM activities WHERE start_time LIKE ?",
            conn, params=(f"{yr}%",)
        )
        sleep = pd.read_sql(
            "SELECT duration_secs, score FROM sleep WHERE date LIKE ?",
            conn, params=(f"{yr}%",)
        )
    if not acts.empty:
        acts["distance_mi"]  = acts["distance_meters"] / 1609.344
        acts["duration_hrs"] = acts["duration_secs"] / 3600
        acts["activity_type"] = acts["activity_type"].str.replace("_", " ", regex=False).str.title()

    year_data[yr] = {"stats": stats, "acts": acts, "sleep": sleep}

# ── Summary table ─────────────────────────────────────────────────────────────
section("Summary")

rows = []
for yr in selected:
    d  = year_data[yr]
    s  = d["stats"]
    a  = d["acts"]
    sl = d["sleep"]
    rows.append({
        "Year":            yr,
        "Activities":      len(a),
        "Miles":           round(a["distance_mi"].sum(), 1) if not a.empty else 0,
        "Hours Moving":    round(a["duration_hrs"].sum(), 1) if not a.empty else 0,
        "Calories Burned": int(a["calories"].sum()) if not a.empty else 0,
        "Avg Daily Steps": int(s["steps"].mean(skipna=True)) if not s.empty and s["steps"].notna().any() else 0,
        "Avg Resting HR":  round(s["resting_hr"].mean(skipna=True), 1) if not s.empty and s["resting_hr"].notna().any() else 0,
        "Avg Sleep (hrs)": round(sl["duration_secs"].mean() / 3600, 1) if not sl.empty else 0,
    })

summary_df = pd.DataFrame(rows).set_index("Year")
st.dataframe(summary_df, use_container_width=True)

# ── Bar chart comparison ──────────────────────────────────────────────────────
section("Key Metrics")

metrics = ["Activities", "Miles", "Hours Moving", "Avg Daily Steps"]
met_cols = st.columns(len(metrics))

for i, metric in enumerate(metrics):
    color = PALETTE[i % len(PALETTE)]
    fig = go.Figure(go.Bar(
        x=[str(yr) for yr in selected],
        y=[summary_df.loc[yr, metric] for yr in selected],
        marker_color=color,
    ))
    fig.update_layout(**CHART, title=metric, title_font=dict(color="#444", size=10), height=220)
    with met_cols[i]:
        st.plotly_chart(fig, use_container_width=True)

# ── Monthly steps by year ─────────────────────────────────────────────────────
section("Monthly Steps Pattern")

MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

fig_monthly = go.Figure()
for i, yr in enumerate(selected):
    s = year_data[yr]["stats"].copy()
    if s.empty:
        continue
    s["date"]  = pd.to_datetime(s["date"])
    s["month"] = s["date"].dt.month
    monthly = s.groupby("month")["steps"].mean().reindex(range(1, 13), fill_value=0)
    fig_monthly.add_trace(go.Scatter(
        x=MONTH_NAMES,
        y=monthly.values,
        mode="lines+markers",
        name=str(yr),
        line=dict(color=PALETTE[i % len(PALETTE)], width=2),
        marker=dict(size=5),
    ))

fig_monthly.update_layout(**CHART, yaxis_title="Avg Steps", height=280)
st.plotly_chart(fig_monthly, use_container_width=True)

# ── Activity type breakdown ───────────────────────────────────────────────────
section("Activity Mix")

mix_cols = st.columns(len(selected))
for i, yr in enumerate(selected):
    a = year_data[yr]["acts"]
    if a.empty:
        with mix_cols[i]:
            st.caption(f"{yr}: no data")
        continue

    type_dist = a.groupby("activity_type")["distance_mi"].sum().reset_index()
    fig_pie = px.pie(type_dist, names="activity_type", values="distance_mi",
                     hole=0.55, title=str(yr),
                     color_discrete_sequence=PALETTE)
    fig_pie.update_traces(
        textposition="outside", textinfo="label+percent",
        marker=dict(line=dict(color="#0e0e0e", width=2)),
    )
    fig_pie.update_layout(
        **CHART, showlegend=False, height=260,
        title_font=dict(color="white", size=16),
    )
    with mix_cols[i]:
        st.plotly_chart(fig_pie, use_container_width=True)

# ── Sleep ─────────────────────────────────────────────────────────────────────
has_sleep = any(not year_data[yr]["sleep"].empty for yr in selected)
if has_sleep:
    section("Sleep Quality")
    sl_cols = st.columns(2)

    fig_dur = go.Figure()
    fig_score = go.Figure()
    for i, yr in enumerate(selected):
        sl = year_data[yr]["sleep"]
        if sl.empty:
            continue
        avg_hrs   = sl["duration_secs"].mean() / 3600
        avg_score = sl["score"].mean(skipna=True)
        color = PALETTE[i % len(PALETTE)]
        fig_dur.add_trace(go.Bar(x=[str(yr)], y=[round(avg_hrs, 2)], name=str(yr), marker_color=color))
        fig_score.add_trace(go.Bar(x=[str(yr)], y=[round(avg_score, 1)], name=str(yr), marker_color=color))

    fig_dur.update_layout(**CHART, yaxis_title="hrs", title="Avg Sleep Duration", height=220, showlegend=False)
    fig_score.update_layout(**CHART, yaxis_title="score", title="Avg Sleep Score", height=220, showlegend=False)

    with sl_cols[0]:
        st.plotly_chart(fig_dur, use_container_width=True)
    with sl_cols[1]:
        st.plotly_chart(fig_score, use_container_width=True)
