import streamlit as st
import pandas as pd
import plotly.express as px
from src.database import get_conn

st.set_page_config(page_title="Activities", page_icon="🏃", layout="wide")
st.title("🏃 Activities")

with get_conn() as conn:
    df = pd.read_sql("SELECT * FROM activities ORDER BY start_time DESC", conn)

if df.empty:
    st.warning("No activities yet. Go to the Home page and sync first.")
    st.stop()

df["start_time"] = pd.to_datetime(df["start_time"])
df["distance_mi"] = (df["distance_meters"] / 1609.344).round(2)
df["duration_min"] = (df["duration_secs"] / 60).round(1)
df["activity_type"] = df["activity_type"].str.replace("_", " ", regex=False).str.title()

# --- Filters ---
col_f1, col_f2 = st.columns(2)
with col_f1:
    activity_types = ["All"] + sorted(df["activity_type"].dropna().unique().tolist())
    selected_type = st.selectbox("Activity type", activity_types)
with col_f2:
    years = ["All"] + sorted(df["start_time"].dt.year.unique().tolist(), reverse=True)
    selected_year = st.selectbox("Year", years)

filtered = df.copy()
if selected_type != "All":
    filtered = filtered[filtered["activity_type"] == selected_type]
if selected_year != "All":
    filtered = filtered[filtered["start_time"].dt.year == int(selected_year)]

# --- KPIs ---
col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Activities", len(filtered))
col2.metric("Total Distance", f"{filtered['distance_mi'].sum():.1f} mi")
col3.metric("Total Time", f"{filtered['duration_min'].sum() / 60:.1f} hrs")
col4.metric("Total Calories", f"{filtered['calories'].sum():,.0f} kcal")

st.divider()

# --- Charts ---
col_a, col_b = st.columns(2)

with col_a:
    st.subheader("Distance Over Time")
    fig = px.scatter(filtered, x="start_time", y="distance_mi", color="activity_type",
                     labels={"distance_mi": "Distance (mi)", "start_time": ""})
    st.plotly_chart(fig, use_container_width=True)

with col_b:
    st.subheader("Activities by Type")
    type_counts = filtered["activity_type"].value_counts().reset_index()
    type_counts.columns = ["type", "count"]
    fig2 = px.bar(type_counts, x="type", y="count",
                  labels={"type": "Activity Type", "count": "Count"})
    st.plotly_chart(fig2, use_container_width=True)

st.subheader("Activity Log")
filtered["elevation_ft"] = (filtered["elevation_gain"] * 3.28084).round(0)
st.dataframe(
    filtered[["start_time", "activity_type", "distance_mi", "duration_min", "calories", "avg_hr", "elevation_ft"]]
    .rename(columns={
        "start_time": "Date",
        "activity_type": "Type",
        "distance_mi": "Distance (mi)",
        "duration_min": "Duration (min)",
        "calories": "Calories",
        "avg_hr": "Avg HR",
        "elevation_ft": "Elevation Gain (ft)",
    }),
    use_container_width=True,
)
