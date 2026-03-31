import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from src.database import get_conn

st.set_page_config(page_title="Dashboard", page_icon="📊", layout="wide")
st.title("📊 Dashboard")

LIME   = "#C8F135"
RED    = "#FF4545"
BLUE   = "#4a90d9"
PURPLE = "#7B61FF"
MUTED  = "#aaaaaa"

with get_conn() as conn:
    df       = pd.read_sql("SELECT * FROM daily_stats ORDER BY date", conn)
    acts_df  = pd.read_sql("SELECT start_time, distance_meters, duration_secs, calories FROM activities ORDER BY start_time", conn)
    sleep_df = pd.read_sql("SELECT date, score FROM sleep ORDER BY date", conn)
    records  = pd.read_sql(
        "SELECT date, steps FROM daily_stats WHERE steps IS NOT NULL ORDER BY steps DESC LIMIT 5", conn
    )
    best_run = pd.read_sql(
        "SELECT activity_type, start_time, distance_meters FROM activities "
        "WHERE distance_meters IS NOT NULL ORDER BY distance_meters DESC LIMIT 1", conn
    )

if df.empty:
    st.warning("No data yet. Go to the Home page and sync first.")
    st.stop()

df["date"]       = pd.to_datetime(df["date"])
df["resting_hr"] = pd.to_numeric(df["resting_hr"], errors="coerce")
df["avg_hr"]     = pd.to_numeric(df["avg_hr"], errors="coerce")

def _safe(val):
    return int(val) if pd.notna(val) else 0

# ── Latest non-null row ───────────────────────────────────────────────────────
latest = df[df["steps"].notna() | df["total_calories"].notna()].iloc[-1]

# ── 7-day rolling averages for trend arrows ───────────────────────────────────
recent   = df.tail(14)
last7    = recent.tail(7)
prev7    = recent.head(7)

def trend(col):
    a = last7[col].mean()
    b = prev7[col].mean()
    if pd.isna(a) or pd.isna(b) or b == 0:
        return None
    return round((a - b) / abs(b) * 100, 1)

steps_trend = trend("steps")
cal_trend   = trend("total_calories")
rhr_trend   = trend("resting_hr")

def delta_str(pct, inverse=False):
    if pct is None:
        return None
    good = pct > 0 if not inverse else pct < 0
    sign = "+" if pct > 0 else ""
    return f"{sign}{pct}% vs prev 7d"

# ── KPI row ───────────────────────────────────────────────────────────────────
col1, col2, col3, col4 = st.columns(4)
col1.metric("Steps",       f"{_safe(latest.get('steps')):,}",
            delta=delta_str(steps_trend), delta_color="normal")
col2.metric("Calories",    f"{_safe(latest.get('total_calories')):,}",
            delta=delta_str(cal_trend))
col3.metric("Resting HR",  f"{_safe(latest.get('resting_hr'))} bpm",
            delta=delta_str(rhr_trend, inverse=True), delta_color="inverse")
col4.metric("Avg HR",      f"{_safe(latest.get('avg_hr'))} bpm")

st.divider()

# ── Steps Chart ───────────────────────────────────────────────────────────────
st.subheader("Daily Steps")

view = st.radio("View", ["All Time", "Year", "Month"], horizontal=True)

if view == "Year":
    years = sorted(df["date"].dt.year.unique(), reverse=True)
    selected_year = st.selectbox("Year", years)
    plot_df = df[df["date"].dt.year == selected_year].copy()
elif view == "Month":
    years = sorted(df["date"].dt.year.unique(), reverse=True)
    selected_year = st.selectbox("Year", years)
    month_options = sorted(df[df["date"].dt.year == selected_year]["date"].dt.month.unique())
    selected_month = st.selectbox("Month", month_options,
                                  format_func=lambda m: pd.Timestamp(2000, m, 1).strftime("%B"))
    plot_df = df[
        (df["date"].dt.year == selected_year) & (df["date"].dt.month == selected_month)
    ].copy()
else:
    plot_df = df.copy()

top10_threshold = plot_df["steps"].dropna().nlargest(10).min() if len(plot_df["steps"].dropna()) >= 10 else 0
peak_val = plot_df["steps"].max(skipna=True) if not plot_df["steps"].isna().all() else 0
colors = [RED if (v == peak_val and peak_val > 0) else BLUE for v in plot_df["steps"]]

fig = go.Figure(go.Bar(x=plot_df["date"], y=plot_df["steps"], marker_color=colors))

if view == "All Time":
    for yr in sorted(plot_df["date"].dt.year.unique())[1:]:
        fig.add_vline(x=f"{yr}-01-01", line_dash="dot",
                      line_color="rgba(150,150,150,0.7)", line_width=1.5)

y_max = plot_df["steps"].max(skipna=True)
fig.update_layout(xaxis_title="", yaxis_title="Steps", showlegend=False,
                  margin=dict(t=40), yaxis=dict(showgrid=False, range=[0, (y_max or 1) * 1.18]))

for _, row in plot_df[plot_df["steps"].fillna(0) >= top10_threshold].iterrows():
    if pd.notna(row["steps"]) and row["steps"] > 0:
        fig.add_annotation(
            x=row["date"], y=row["steps"],
            text=f"{int(row['steps']):,}",
            showarrow=False, yshift=6,
            font=dict(size=9, color="white"),
        )

st.plotly_chart(fig, use_container_width=True)

# ── Calories + HR ─────────────────────────────────────────────────────────────
col_a, col_b = st.columns(2)

with col_a:
    st.subheader("Calories Burned")
    cal_df = df[df["total_calories"] <= 10000][["date", "active_calories", "total_calories"]].rename(columns={
        "active_calories": "Active Calories", "total_calories": "Total Calories"
    })
    fig2 = px.line(cal_df, x="date", y=["Active Calories", "Total Calories"],
                   labels={"value": "kcal", "date": "", "variable": "Type"})
    st.plotly_chart(fig2, use_container_width=True)

with col_b:
    st.subheader("Heart Rate")
    hr_df = df[["date", "resting_hr", "avg_hr"]].rename(columns={
        "resting_hr": "Resting Heart Rate", "avg_hr": "Average Heart Rate"
    })
    fig3 = px.line(hr_df, x="date", y=["Resting Heart Rate", "Average Heart Rate"],
                   labels={"value": "bpm", "date": "", "variable": "Type"})
    st.plotly_chart(fig3, use_container_width=True)

st.divider()

# ── Personal Records ──────────────────────────────────────────────────────────
st.subheader("🏆 Personal Records")

pr_cols = st.columns(3)
with pr_cols[0]:
    if not records.empty:
        top = records.iloc[0]
        st.markdown(f"""
        <div style="background:#0e0e0e;padding:20px;border-left:3px solid {LIME};border-radius:4px;">
            <div style="font-size:0.7rem;letter-spacing:2px;color:{MUTED};text-transform:uppercase;margin-bottom:8px;">Best Step Day</div>
            <div style="font-size:2rem;font-weight:900;color:{LIME};line-height:1;">{int(top['steps']):,}</div>
            <div style="color:{MUTED};font-size:0.8rem;margin-top:6px;">{pd.to_datetime(top['date']).strftime('%b %d, %Y')}</div>
        </div>""", unsafe_allow_html=True)

with pr_cols[1]:
    if not best_run.empty:
        r = best_run.iloc[0]
        dist_mi = r["distance_meters"] / 1609.344
        atype = str(r["activity_type"]).replace("_", " ").title() if pd.notna(r["activity_type"]) else "Activity"
        st.markdown(f"""
        <div style="background:#0e0e0e;padding:20px;border-left:3px solid {RED};border-radius:4px;">
            <div style="font-size:0.7rem;letter-spacing:2px;color:{MUTED};text-transform:uppercase;margin-bottom:8px;">Longest {atype}</div>
            <div style="font-size:2rem;font-weight:900;color:{RED};line-height:1;">{dist_mi:.1f} <span style="font-size:1rem;color:#888;">mi</span></div>
            <div style="color:{MUTED};font-size:0.8rem;margin-top:6px;">{pd.to_datetime(r['start_time']).strftime('%b %d, %Y')}</div>
        </div>""", unsafe_allow_html=True)

with pr_cols[2]:
    avg_steps_30 = df.tail(30)["steps"].mean()
    avg_steps_all = df["steps"].mean()
    vs = round((avg_steps_30 - avg_steps_all) / avg_steps_all * 100, 1) if avg_steps_all else 0
    color = LIME if vs >= 0 else RED
    sign = "+" if vs >= 0 else ""
    st.markdown(f"""
    <div style="background:#0e0e0e;padding:20px;border-left:3px solid {PURPLE};border-radius:4px;">
        <div style="font-size:0.7rem;letter-spacing:2px;color:{MUTED};text-transform:uppercase;margin-bottom:8px;">30-Day Avg Steps</div>
        <div style="font-size:2rem;font-weight:900;color:{PURPLE};line-height:1;">{int(avg_steps_30):,}</div>
        <div style="color:{color};font-size:0.8rem;margin-top:6px;">{sign}{vs}% vs all-time avg</div>
    </div>""", unsafe_allow_html=True)

st.divider()

# ── Year-over-Year Comparison ─────────────────────────────────────────────────
st.subheader("📅 Year-over-Year")

yoy_years = sorted(df["date"].dt.year.unique())
if len(yoy_years) >= 2:
    yoy_data = []
    for yr in yoy_years:
        yr_df = df[df["date"].dt.year == yr]
        yoy_data.append({
            "Year": str(yr),
            "Avg Daily Steps":    int(yr_df["steps"].mean(skipna=True)) if yr_df["steps"].notna().any() else 0,
            "Avg Resting HR":     round(yr_df["resting_hr"].mean(skipna=True), 1) if yr_df["resting_hr"].notna().any() else 0,
            "Avg Total Calories": int(yr_df["total_calories"].mean(skipna=True)) if yr_df["total_calories"].notna().any() else 0,
        })

    yoy_df = pd.DataFrame(yoy_data)

    yoy_c1, yoy_c2, yoy_c3 = st.columns(3)
    with yoy_c1:
        fig_yoy1 = px.bar(yoy_df, x="Year", y="Avg Daily Steps",
                          color_discrete_sequence=[BLUE],
                          labels={"Avg Daily Steps": "Steps"})
        fig_yoy1.update_layout(margin=dict(t=30, b=10), showlegend=False,
                               yaxis=dict(showgrid=False))
        st.caption("Avg Daily Steps")
        st.plotly_chart(fig_yoy1, use_container_width=True)

    with yoy_c2:
        fig_yoy2 = px.bar(yoy_df, x="Year", y="Avg Resting HR",
                          color_discrete_sequence=[RED],
                          labels={"Avg Resting HR": "bpm"})
        fig_yoy2.update_layout(margin=dict(t=30, b=10), showlegend=False,
                               yaxis=dict(showgrid=False))
        st.caption("Avg Resting HR (bpm)")
        st.plotly_chart(fig_yoy2, use_container_width=True)

    with yoy_c3:
        fig_yoy3 = px.bar(yoy_df, x="Year", y="Avg Total Calories",
                          color_discrete_sequence=[LIME],
                          labels={"Avg Total Calories": "kcal"})
        fig_yoy3.update_layout(margin=dict(t=30, b=10), showlegend=False,
                               yaxis=dict(showgrid=False))
        st.caption("Avg Total Calories")
        st.plotly_chart(fig_yoy3, use_container_width=True)
else:
    st.info("Year-over-year comparison requires data from at least 2 different years.")
