import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from src.database import get_conn

st.set_page_config(page_title="Dashboard", page_icon="📊", layout="wide")
st.title("📊 Dashboard")

with get_conn() as conn:
    df = pd.read_sql("SELECT * FROM daily_stats ORDER BY date", conn)

if df.empty:
    st.warning("No data yet. Go to the Home page and sync first.")
    st.stop()

df["date"] = pd.to_datetime(df["date"])
df["resting_hr"] = pd.to_numeric(df["resting_hr"], errors="coerce")
df["avg_hr"] = pd.to_numeric(df["avg_hr"], errors="coerce")

# --- KPI row ---
latest = df.iloc[-1]

def _safe(val):
    return int(val) if pd.notna(val) else 0

col1, col2, col3, col4 = st.columns(4)
col1.metric("Steps (latest)", f"{_safe(latest.get('steps')):,}")
col2.metric("Calories (latest)", f"{_safe(latest.get('total_calories')):,}")
col3.metric("Resting HR (latest)", f"{_safe(latest.get('resting_hr'))} bpm")
col4.metric("Avg HR (latest)", f"{_safe(latest.get('avg_hr'))} bpm")

st.divider()

# --- Steps Chart ---
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

peak_idx = plot_df["steps"].idxmax() if not plot_df["steps"].isna().all() else None
colors = ["#e74c3c" if i == peak_idx else "#4a90d9" for i in plot_df.index]

fig = go.Figure(go.Bar(
    x=plot_df["date"],
    y=plot_df["steps"],
    marker_color=colors,
))

if view == "All Time":
    for yr in sorted(plot_df["date"].dt.year.unique())[1:]:
        fig.add_vline(x=f"{yr}-01-01", line_dash="dot",
                      line_color="rgba(150,150,150,0.7)", line_width=1.5)

y_max = plot_df["steps"].max(skipna=True)
fig.update_layout(xaxis_title="", yaxis_title="Steps", showlegend=False, margin=dict(t=40),
                  yaxis=dict(showgrid=False, range=[0, y_max * 1.18]))

for _, row in plot_df[plot_df["steps"] >= 30000].iterrows():
    fig.add_annotation(
        x=row["date"], y=row["steps"],
        text=f"{int(row['steps']):,}",
        showarrow=False, yshift=6,
        font=dict(size=9, color="white"),
    )
st.plotly_chart(fig, use_container_width=True)

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
