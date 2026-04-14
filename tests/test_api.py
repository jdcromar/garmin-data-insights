"""Basic API endpoint tests using an in-memory SQLite database."""
import json
import sqlite3
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


# ── Fixture: patch get_conn to use an in-memory DB ───────────────────────────

@pytest.fixture(autouse=True)
def mock_db(tmp_path):
    """Create a temporary SQLite DB with schema and seed data."""
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    # Create schema
    conn.executescript("""
        CREATE TABLE activities (
            activity_id TEXT PRIMARY KEY, activity_type TEXT, start_time TEXT,
            duration_secs REAL, distance_meters REAL, avg_hr REAL, max_hr REAL,
            calories REAL, avg_speed REAL, elevation_gain REAL, raw_json TEXT
        );
        CREATE TABLE daily_stats (
            date TEXT PRIMARY KEY, steps INTEGER, active_calories INTEGER,
            total_calories INTEGER, distance_meters REAL, floors_climbed INTEGER,
            avg_hr REAL, resting_hr INTEGER, raw_json TEXT
        );
        CREATE TABLE sleep (
            date TEXT PRIMARY KEY, sleep_start TEXT, sleep_end TEXT,
            duration_secs REAL, deep_secs REAL, light_secs REAL,
            rem_secs REAL, awake_secs REAL, score REAL, raw_json TEXT
        );
        CREATE TABLE hrv (
            date TEXT PRIMARY KEY, weekly_avg REAL, last_night_avg REAL,
            last_night_5min_high REAL, raw_json TEXT
        );
        CREATE TABLE goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL,
            target REAL NOT NULL, year INTEGER NOT NULL,
            created_at TEXT DEFAULT (date('now')), UNIQUE(metric, year)
        );
        CREATE TABLE body_battery (
            date TEXT PRIMARY KEY, high_value REAL, low_value REAL,
            charged REAL, drained REAL, raw_json TEXT
        );
        CREATE TABLE activity_tracks (
            activity_id TEXT PRIMARY KEY, track_json TEXT,
            fetched_at TEXT DEFAULT (datetime('now'))
        );
    """)

    # Seed data
    conn.execute(
        "INSERT INTO daily_stats VALUES (?,?,?,?,?,?,?,?,?)",
        ("2026-01-01", 10000, 500, 2200, 8000.0, 10, 72.0, 58, None),
    )
    conn.execute(
        "INSERT INTO daily_stats VALUES (?,?,?,?,?,?,?,?,?)",
        ("2026-01-02", 12000, 600, 2400, 9000.0, 12, 74.0, 57, None),
    )
    conn.execute(
        "INSERT INTO activities VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        ("act1", "running", "2026-01-01 08:00:00", 1800, 5000.0, 155, 175, 350, 2.8, 50.0,
         json.dumps({"vO2MaxValue": 55, "activityName": "Morning Run",
                      "aerobicTrainingEffect": 3.5, "trainingEffectLabel": "TEMPO",
                      "averageRunningCadenceInStepsPerMinute": 170,
                      "avgGroundContactTime": 240, "avgStrideLength": 1.2,
                      "avgVerticalOscillation": 8.5, "avgVerticalRatio": 7.1,
                      "avgPower": 250, "eventType": {"typeKey": "training"}})),
    )
    conn.execute(
        "INSERT INTO activities VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        ("act2", "running", "2026-01-02 07:30:00", 3600, 10000.0, 160, 180, 700, 2.8, 80.0,
         json.dumps({"vO2MaxValue": 56, "activityName": "Long Run",
                      "aerobicTrainingEffect": 4.0, "trainingEffectLabel": "VO2MAX",
                      "averageRunningCadenceInStepsPerMinute": 168,
                      "eventType": {"typeKey": "training"}})),
    )
    conn.execute(
        "INSERT INTO sleep VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("2026-01-01", "22:30", "06:30", 28800, 7200, 14400, 5400, 1800, 82, None),
    )
    conn.execute(
        "INSERT INTO hrv VALUES (?,?,?,?,?)",
        ("2026-01-01", 45.0, 42.0, 55.0, None),
    )
    conn.execute(
        "INSERT INTO body_battery VALUES (?,?,?,?,?,?)",
        ("2026-01-01", 95, 25, 70, 50, None),
    )
    conn.commit()

    def mock_get_conn():
        c = sqlite3.connect(str(db_path))
        c.row_factory = sqlite3.Row
        return c

    with patch("src.database.get_conn", mock_get_conn), \
         patch("src.database.init_db", lambda: None):
        # Import app after patching so init_db() is a no-op
        from api.main import app
        yield TestClient(app)


# ── Tests ────────────────────────────────────────────────────────────────────

def test_daily_stats(mock_db):
    r = mock_db.get("/daily-stats")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[0]["steps"] == 10000


def test_activities(mock_db):
    r = mock_db.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert data[0]["activity_type"] == "running"


def test_sleep(mock_db):
    r = mock_db.get("/sleep")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_hrv(mock_db):
    r = mock_db.get("/hrv")
    assert r.status_code == 200
    assert r.json()[0]["weekly_avg"] == 45.0


def test_body_battery(mock_db):
    r = mock_db.get("/body-battery")
    assert r.status_code == 200
    assert r.json()[0]["high_value"] == 95


def test_insights(mock_db):
    r = mock_db.get("/insights")
    assert r.status_code == 200
    data = r.json()
    assert "steps" in data
    assert "sleep" in data


def test_records(mock_db):
    r = mock_db.get("/records")
    assert r.status_code == 200
    data = r.json()
    assert data["best_steps_days"][0]["steps"] == 12000


def test_readiness(mock_db):
    r = mock_db.get("/readiness")
    assert r.status_code == 200
    data = r.json()
    assert "composite" in data
    assert "label" in data


def test_export_csv(mock_db):
    r = mock_db.get("/export/csv/daily_stats")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    assert "date,steps" in r.text


def test_export_json(mock_db):
    r = mock_db.get("/export/json/daily_stats")
    assert r.status_code == 200
    data = json.loads(r.text)
    assert len(data) == 2


def test_export_xlsx(mock_db):
    r = mock_db.get("/export/xlsx/daily_stats")
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]


def test_export_invalid_table(mock_db):
    r = mock_db.get("/export/csv/evil_table")
    assert r.status_code == 400


def test_running_dashboard(mock_db):
    r = mock_db.get("/running/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert data["total_runs"] == 2
    assert data["current_vo2max"] == 56
    assert "weekly_summary" in data
    assert "records" in data
    assert "dynamics_avg" in data


def test_goals_crud(mock_db):
    # Create
    r = mock_db.post("/goals", json={"metric": "steps", "target": 3000000, "year": 2026})
    assert r.status_code == 200

    # Read
    r = mock_db.get("/goals?year=2026")
    assert r.status_code == 200
    goals = r.json()
    assert len(goals) == 1
    assert goals[0]["target"] == 3000000

    # Progress
    r = mock_db.get("/goals/progress/2026")
    assert r.status_code == 200
    progress = r.json()
    assert progress[0]["actual"] == 22000  # 10000 + 12000

    # Delete
    goal_id = goals[0]["id"]
    r = mock_db.delete(f"/goals/{goal_id}")
    assert r.status_code == 200

    r = mock_db.get("/goals?year=2026")
    assert len(r.json()) == 0


def test_wrapped(mock_db):
    r = mock_db.get("/wrapped/2026")
    assert r.status_code == 200
    data = r.json()
    assert len(data["activities"]) == 2
    assert len(data["stats"]) == 2


def test_wrapped_multi(mock_db):
    r = mock_db.get("/wrapped/multi/2026")
    assert r.status_code == 200
    data = r.json()
    assert "2026" in data
    assert data["2026"]["activities"] == 2
