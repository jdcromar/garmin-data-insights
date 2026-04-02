import sqlite3
from pathlib import Path

DB_PATH = Path("data/garmin.db")


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS activities (
                activity_id     TEXT PRIMARY KEY,
                activity_type   TEXT,
                start_time      TEXT,
                duration_secs   REAL,
                distance_meters REAL,
                avg_hr          REAL,
                max_hr          REAL,
                calories        REAL,
                avg_speed       REAL,
                elevation_gain  REAL,
                raw_json        TEXT
            );

            CREATE TABLE IF NOT EXISTS daily_stats (
                date            TEXT PRIMARY KEY,
                steps           INTEGER,
                active_calories INTEGER,
                total_calories  INTEGER,
                distance_meters REAL,
                floors_climbed  INTEGER,
                avg_hr          REAL,
                resting_hr      INTEGER,
                raw_json        TEXT
            );

            CREATE TABLE IF NOT EXISTS sleep (
                date            TEXT PRIMARY KEY,
                sleep_start     TEXT,
                sleep_end       TEXT,
                duration_secs   REAL,
                deep_secs       REAL,
                light_secs      REAL,
                rem_secs        REAL,
                awake_secs      REAL,
                score           REAL,
                raw_json        TEXT
            );

            CREATE TABLE IF NOT EXISTS hrv (
                date            TEXT PRIMARY KEY,
                weekly_avg      REAL,
                last_night_avg  REAL,
                last_night_5min_high REAL,
                raw_json        TEXT
            );

            CREATE TABLE IF NOT EXISTS goals (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                metric      TEXT NOT NULL,
                target      REAL NOT NULL,
                year        INTEGER NOT NULL,
                created_at  TEXT DEFAULT (date('now')),
                UNIQUE(metric, year)
            );

            CREATE TABLE IF NOT EXISTS body_battery (
                date        TEXT PRIMARY KEY,
                high_value  REAL,
                low_value   REAL,
                charged     REAL,
                drained     REAL,
                raw_json    TEXT
            );

            CREATE TABLE IF NOT EXISTS activity_tracks (
                activity_id TEXT PRIMARY KEY,
                track_json  TEXT,
                fetched_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_activities_start ON activities(start_time);
            CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
            CREATE INDEX IF NOT EXISTS idx_sleep_date ON sleep(date);
            CREATE INDEX IF NOT EXISTS idx_hrv_date ON hrv(date);
            CREATE INDEX IF NOT EXISTS idx_body_battery_date ON body_battery(date);
        """)
