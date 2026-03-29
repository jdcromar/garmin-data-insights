import streamlit as st
import pandas as pd
import plotly.express as px
from src.database import get_conn

st.set_page_config(page_title="Garmin Wrapped", page_icon="🎁", layout="wide")

# ── Palette ───────────────────────────────────────────────────────────────────
LIME   = "#C8F135"
RED    = "#FF4545"
PURPLE = "#7B61FF"
MUTED  = "#aaaaaa"

CHART = dict(
    template="plotly_dark",
    paper_bgcolor="#0e0e0e",
    plot_bgcolor="#0e0e0e",
    margin=dict(t=36, b=24, l=10, r=10),
    font=dict(color="#bbbbbb", size=12),
)

def section(label):
    st.markdown(f"""
    <div style="margin:52px 0 28px;">
        <span style="font-size:0.6rem; letter-spacing:6px; color:{LIME};
                     text-transform:uppercase; font-weight:700;">{label}</span>
        <hr style="border:none; border-top:1px solid #1c1c1c; margin-top:10px;">
    </div>""", unsafe_allow_html=True)

def stat_cell(label, value, color):
    st.markdown(f"""
    <div style="background:#0e0e0e; padding:32px 24px;
                border-left:3px solid #1c1c1c; height:100%;">
        <div style="font-size:0.75rem; letter-spacing:2px; color:{MUTED};
                    text-transform:uppercase; margin-bottom:12px;">{label}</div>
        <div style="font-size:3rem; font-weight:900; color:{color};
                    line-height:1;">{value}</div>
    </div>""", unsafe_allow_html=True)

def scale_cell(value, label, color):
    st.markdown(f"""
    <div style="border-top:3px solid {color}; padding-top:18px; margin-bottom:8px;">
        <div style="font-size:2.8rem; font-weight:900; color:white;
                    line-height:1;">{value}</div>
        <div style="color:{MUTED}; margin-top:8px; font-size:0.8rem;">{label}</div>
    </div>""", unsafe_allow_html=True)

# ── Year picker ───────────────────────────────────────────────────────────────
year = st.selectbox("", list(range(2026, 2019, -1)), label_visibility="collapsed")

with get_conn() as conn:
    activities = pd.read_sql("SELECT * FROM activities WHERE start_time LIKE ?", conn, params=(f"{year}%",))
    stats      = pd.read_sql("SELECT * FROM daily_stats WHERE date LIKE ?",      conn, params=(f"{year}%",))
    sleep      = pd.read_sql("SELECT * FROM sleep WHERE date LIKE ?",            conn, params=(f"{year}%",))

if activities.empty and stats.empty:
    st.warning(f"No data for {year}. Sync from the Home page first.")
    st.stop()

# ── Pre-compute ───────────────────────────────────────────────────────────────
if not activities.empty:
    activities["distance_mi"]  = activities["distance_meters"] / 1609.344
    activities["duration_hrs"] = activities["duration_secs"]   / 3600
    activities["start_time"]   = pd.to_datetime(activities["start_time"])
    activities["month"]        = activities["start_time"].dt.month_name()
    activities["weekday"]      = activities["start_time"].dt.day_name()

    n      = len(activities)
    dist   = activities["distance_mi"].sum()
    hrs    = activities["duration_hrs"].sum()
    cals   = activities["calories"].sum()
    elev_m = activities["elevation_gain"].sum()

    tagline = (
        f"{n} workouts. Every one counted." if n >= 100 else
        f"{n} workouts. Consistent."        if n >= 50  else
        f"{n} workouts. You showed up."
    )
else:
    n = dist = hrs = cals = elev_m = 0
    tagline = "A year of data."

# ── Hero ──────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="padding:72px 0 52px; border-bottom:1px solid #1c1c1c;">
    <div style="font-size:0.6rem; letter-spacing:9px; color:{MUTED};
                text-transform:uppercase; margin-bottom:18px;">YOUR {year} IN MOTION</div>
    <div style="font-size:clamp(5rem,12vw,9.5rem); font-weight:900; color:white;
                line-height:0.85; letter-spacing:-5px; margin-bottom:28px;">{year}</div>
    <div style="font-size:1.2rem; color:{LIME}; font-weight:600;
                letter-spacing:1px;">{tagline}</div>
</div>""", unsafe_allow_html=True)

# ── The Numbers ───────────────────────────────────────────────────────────────
if not activities.empty:
    section("The Numbers")
    c1, c2, c3, c4 = st.columns(4)
    with c1: stat_cell("Activities",      f"{n:,}",         "white")
    with c2: stat_cell("Miles Covered",   f"{dist:,.1f}",   LIME)
    with c3: stat_cell("Hours Moving",    f"{hrs:,.1f}",    "white")
    with c4: stat_cell("Calories Burned", f"{int(cals):,}", RED)

    # ── Scale ─────────────────────────────────────────────────────────────────
    section("Scale")
    s1, s2, s3 = st.columns(3)
    with s1: scale_cell(f"{dist/26.219:.1f}×",  "marathon equivalent", LIME)
    with s2: scale_cell(f"{elev_m/8849:.2f}×",  "times up Everest",    RED)
    with s3: scale_cell(f"{dist/24901:.4f}×",   "laps around Earth",   PURPLE)

    # ── Patterns ──────────────────────────────────────────────────────────────
    section("Your Patterns")
    col_l, col_r = st.columns([3, 2])

    with col_l:
        month_counts = activities.groupby("month").size().reset_index(name="Count")
        fig_m = px.bar(month_counts, x="month", y="Count",
                       category_orders={"month": ["January","February","March","April","May","June",
                                                  "July","August","September","October","November","December"]},
                       labels={"month": ""})
        fig_m.update_traces(marker_color=LIME, marker_line_width=0)
        fig_m.update_layout(**CHART, title="Activities by Month",
                            title_font=dict(color="#444", size=10))
        st.plotly_chart(fig_m, use_container_width=True)

    with col_r:
        day_counts = activities.groupby("weekday").size().reset_index(name="Count")
        fig_d = px.bar(day_counts, x="weekday", y="Count",
                       category_orders={"weekday": ["Monday","Tuesday","Wednesday",
                                                    "Thursday","Friday","Saturday","Sunday"]},
                       labels={"weekday": ""})
        fig_d.update_traces(marker_color=PURPLE, marker_line_width=0)
        fig_d.update_layout(**CHART, title="Favourite Day",
                            title_font=dict(color="#444", size=10))
        st.plotly_chart(fig_d, use_container_width=True)

    # ── Breakdown + Records ───────────────────────────────────────────────────
    section("Breakdown & Records")
    col_pie, col_rec = st.columns(2)

    with col_pie:
        type_dist = activities.groupby("activity_type")["distance_mi"].sum().reset_index()
        fig_p = px.pie(type_dist, names="activity_type", values="distance_mi", hole=0.62)
        fig_p.update_traces(
            textposition="outside", textinfo="label+percent",
            marker=dict(line=dict(color="#0e0e0e", width=3)),
        )
        fig_p.update_layout(
            **CHART, showlegend=False,
            annotations=[dict(text=f"<b>{n}</b><br>activities",
                              x=0.5, y=0.5, showarrow=False,
                              font=dict(color="white", size=18))],
        )
        st.plotly_chart(fig_p, use_container_width=True)

    with col_rec:
        st.markdown("<br>", unsafe_allow_html=True)
        records = [
            ("Longest Activity",  f"{activities['distance_mi'].max():.1f}", "mi",   LIME),
            ("Peak Calorie Burn", f"{activities['calories'].max():,.0f}",   "kcal", RED),
            ("Longest Session",   f"{activities['duration_hrs'].max():.1f}","hrs",  PURPLE),
        ]
        for lbl, val, unit, color in records:
            st.markdown(f"""
            <div style="padding:20px 0; border-bottom:1px solid #1c1c1c;
                        margin-bottom:4px;">
                <div style="color:#aaa; font-size:0.8rem; text-transform:uppercase;
                            letter-spacing:2px; margin-bottom:8px;">{lbl}</div>
                <div style="font-size:2rem; font-weight:900; color:{color};
                            line-height:1;">{val}
                    <span style="font-size:0.85rem; color:#888;">{unit}</span>
                </div>
            </div>""", unsafe_allow_html=True)

# ── Daily Grind ───────────────────────────────────────────────────────────────
if not stats.empty:
    section("Daily Grind")
    d1, d2, d3 = st.columns(3)
    with d1: stat_cell("Total Steps",   f"{int(stats['steps'].sum()):,}",  "white")
    with d2: stat_cell("Daily Average", f"{int(stats['steps'].mean()):,}", LIME)
    with d3: stat_cell("Best Day",      f"{int(stats['steps'].max()):,}",  RED)

# ── Recovery ─────────────────────────────────────────────────────────────────
if not sleep.empty:
    sleep["total_hours"] = sleep["duration_secs"] / 3600
    section("Recovery")
    r1, r2 = st.columns(2)
    with r1: stat_cell("Avg Sleep",       f"{sleep['total_hours'].mean():.1f} hrs", PURPLE)
    with r2: stat_cell("Avg Sleep Score", f"{sleep['score'].mean():.0f}",           "white")

# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="margin-top:88px; padding-top:28px; border-top:1px solid #1c1c1c;">
    <span style="font-size:0.55rem; letter-spacing:5px; color:#2a2a2a;
                 text-transform:uppercase;">Garmin Wrapped &nbsp;·&nbsp; {year} &nbsp;·&nbsp; Keep Moving</span>
</div>""", unsafe_allow_html=True)
