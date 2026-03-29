import streamlit as st
import pandas as pd
import plotly.express as px
from src.database import get_conn

st.set_page_config(page_title="Health", page_icon="❤️", layout="wide")
st.title("❤️ Health")

with get_conn() as conn:
    sleep_df = pd.read_sql("SELECT * FROM sleep ORDER BY date", conn)
    hrv_df = pd.read_sql("SELECT * FROM hrv ORDER BY date", conn)

if sleep_df.empty and hrv_df.empty:
    st.warning("No health data yet. Go to the Home page and sync first.")
    st.stop()

# --- Sleep ---
if not sleep_df.empty:
    sleep_df["date"] = pd.to_datetime(sleep_df["date"])
    sleep_df["total_hours"] = (sleep_df["duration_secs"] / 3600).round(2)
    sleep_df["deep_hours"] = (sleep_df["deep_secs"] / 3600).round(2)
    sleep_df["rem_hours"] = (sleep_df["rem_secs"] / 3600).round(2)
    sleep_df["light_hours"] = (sleep_df["light_secs"] / 3600).round(2)

    st.subheader("Sleep")
    col1, col2, col3 = st.columns(3)
    col1.metric("Avg Sleep Duration", f"{sleep_df['total_hours'].mean():.1f} hrs")
    col2.metric("Avg Sleep Score", f"{sleep_df['score'].mean():.0f}")
    col3.metric("Avg REM", f"{sleep_df['rem_hours'].mean():.1f} hrs")

    sleep_plot = sleep_df[["date", "deep_hours", "rem_hours", "light_hours"]].rename(columns={
        "deep_hours": "Deep Sleep", "rem_hours": "REM Sleep", "light_hours": "Light Sleep"
    })
    fig = px.bar(
        sleep_plot,
        x="date",
        y=["Deep Sleep", "REM Sleep", "Light Sleep"],
        labels={"value": "Hours", "date": "", "variable": "Stage"},
        barmode="stack",
        color_discrete_map={"Deep Sleep": "#1f3a6e", "REM Sleep": "#4a90d9", "Light Sleep": "#a8c8f0"},
    )
    st.plotly_chart(fig, use_container_width=True)

    fig2 = px.line(sleep_df, x="date", y="score", labels={"score": "Sleep Score", "date": ""})
    st.plotly_chart(fig2, use_container_width=True)

st.divider()

# --- HRV ---
if not hrv_df.empty:
    hrv_df["date"] = pd.to_datetime(hrv_df["date"])
    hrv_df["weekly_avg"] = pd.to_numeric(hrv_df["weekly_avg"], errors="coerce")
    hrv_df["last_night_avg"] = pd.to_numeric(hrv_df["last_night_avg"], errors="coerce")

    st.subheader("HRV")
    col1, col2 = st.columns(2)
    col1.metric("Avg Weekly HRV", f"{hrv_df['weekly_avg'].mean():.0f} ms")
    col2.metric("Avg Last Night HRV", f"{hrv_df['last_night_avg'].mean():.0f} ms")

    hrv_plot = hrv_df[["date", "weekly_avg", "last_night_avg"]].rename(columns={
        "weekly_avg": "Weekly Average", "last_night_avg": "Last Night Average"
    })
    fig3 = px.line(hrv_plot, x="date", y=["Weekly Average", "Last Night Average"],
                   labels={"value": "HRV (ms)", "date": "", "variable": "Metric"})
    st.plotly_chart(fig3, use_container_width=True)
