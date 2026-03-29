import streamlit as st
from datetime import date, timedelta
from src.auth import get_client
from src.database import init_db
from src.fetcher import sync_all

st.set_page_config(
    page_title="Garmin Insights",
    page_icon="⌚",
    layout="wide",
)

st.title("⌚ Garmin Insights")
st.caption("Your personal Garmin data dashboard")

init_db()

st.header("Sync Data")

col1, col2 = st.columns(2)
with col1:
    start_date = st.date_input("From", value=date.today() - timedelta(days=30))
with col2:
    end_date = st.date_input("To", value=date.today())

if st.button("Sync from Garmin Connect", type="primary"):
    if start_date > end_date:
        st.error("Start date must be before end date.")
    else:
        try:
            with st.spinner("Connecting to Garmin Connect..."):
                client = get_client()

            num_days = (end_date - start_date).days + 1
            # 1 step for activities bulk fetch + num_days each for daily_stats, sleep, hrv
            total_steps = 1 + num_days * 3

            st.info(f"Syncing {start_date} → {end_date} — already-synced days will be skipped.")
            progress_bar = st.progress(0)
            status = st.empty()
            step = [0]

            def on_progress():
                step[0] += 1
                pct = min(step[0] / total_steps, 1.0)
                progress_bar.progress(pct)
                status.text(f"{step[0]} / {total_steps} steps complete")

            sync_all(client, start_date, end_date, on_progress)
            progress_bar.progress(1.0)
            status.text("Done!")
            st.success("Sync complete! Navigate to a page using the sidebar.")
        except Exception as e:
            st.error(f"Error: {e}")

st.divider()
st.markdown("""
### Pages
- **Dashboard** — daily overview: steps, calories, heart rate
- **Activities** — all your workouts with charts
- **Health** — sleep, HRV, resting heart rate trends
- **Wrapped** — your year-in-review Garmin stats
""")
