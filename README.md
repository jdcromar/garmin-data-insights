# Garmin Data Insights

A personal dashboard for your Garmin Connect data. Pulls activity, sleep, HRV, and daily stats from your account and gives you something worth actually looking at.

Built in two flavors — a Streamlit web app and a native Tauri desktop app — both backed by a local SQLite database and a FastAPI layer.

---

## What's inside

**Streamlit app** (`app.py` + `pages/`)
- Sync data from Garmin Connect for any date range
- Dashboard with daily steps, calories, and heart rate
- Activities log with distance/duration charts filtered by type and year
- Health page covering sleep stages, HRV trends, and resting HR
- Wrapped — a Spotify Wrapped-style year-in-review for your fitness data
- Goals — set annual targets per metric and track your pace toward them
- Compare — put two or more years side by side

**Desktop app** (`desktop/`)
- All the same pages in a native window (Tauri 2 + React + Recharts)
- Settings page: switch between imperial/metric and dark/light mode
- Readiness score computed from HRV, sleep, and resting HR trends
- Trend badges on KPIs (↑/↓ vs prior 7 days)
- CSV export for any table
- Background sync via Windows Task Scheduler

---

## Setup

### Prerequisites

- Python 3.10+
- A Garmin Connect account
- Node.js 18+ and Rust (desktop app only)

### Install Python dependencies

```bash
pip install -r requirements.txt
```

### Configure credentials

Create a `.env` file in the project root:

```
GARMIN_EMAIL=you@example.com
GARMIN_PASSWORD=yourpassword
```

---

## Running

### Streamlit

```bash
python -m streamlit run app.py
```

Open the app, pick a date range, and hit **Sync from Garmin Connect**. Already-synced days are skipped automatically so re-running is fast.

### Desktop app

Start the API server:

```bash
cd api
uvicorn main:app --port 8765
```

Then in a separate terminal:

```bash
cd desktop
npm install
npm run tauri dev
```

The desktop app spawns the API automatically when built with `npm run tauri build`.

---

## Background sync

To keep data fresh without opening the app:

```bash
# Register a daily 6am sync with Windows Task Scheduler
python sync_worker.py --setup

# Or run a manual sync
python sync_worker.py
```

Logs are written to `data/sync.log`.

---

## Project structure

```
├── app.py                  # Streamlit entry point + sync UI
├── pages/                  # Streamlit pages
│   ├── 1_Dashboard.py
│   ├── 2_Activities.py
│   ├── 3_Health.py
│   ├── 4_Wrapped.py
│   ├── 5_Goals.py
│   └── 6_Compare.py
├── src/
│   ├── auth.py             # Garmin Connect auth via garth
│   ├── database.py         # SQLite schema + connection
│   └── fetcher.py          # API calls + sync logic
├── api/
│   └── main.py             # FastAPI server (used by desktop app)
├── desktop/
│   ├── src/                # React frontend
│   │   ├── pages/          # Dashboard, Activities, Health, Wrapped, Goals, Compare, Export, Settings
│   │   ├── api.js          # Fetch wrapper for the FastAPI backend
│   │   ├── SettingsContext.jsx  # Unit + theme state
│   │   └── index.css       # CSS variables, dark/light mode
│   └── src-tauri/          # Tauri config + Rust sidecar
├── sync_worker.py          # Standalone daily sync script
└── data/
    └── garmin.db           # SQLite database (gitignored)
```

---

## Notes

- Data is stored entirely on your machine — nothing is sent anywhere except to Garmin Connect to fetch your own data.
- The first sync for a long date range can take a while. Subsequent syncs skip days that are already in the database.
- Garmin's API is unofficial and undocumented. It works until it doesn't.
