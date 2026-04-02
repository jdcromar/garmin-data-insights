import json
from datetime import date, timedelta
from typing import Callable, Optional
from garminconnect import Garmin
from src.database import get_conn


def fetch_activities(client: Garmin, start: date, end: date, on_progress: Optional[Callable] = None):
    """Fetch activities for a date range and upsert into the database."""
    activities = client.get_activities_by_date(start.isoformat(), end.isoformat())
    with get_conn() as conn:
        existing = {row[0] for row in conn.execute("SELECT activity_id FROM activities").fetchall()}
        for a in activities:
            aid = str(a.get("activityId"))
            if aid not in existing:
                conn.execute("""
                    INSERT OR REPLACE INTO activities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    aid,
                    a.get("activityType", {}).get("typeKey"),
                    a.get("startTimeLocal"),
                    a.get("duration"),
                    a.get("distance"),
                    a.get("averageHR"),
                    a.get("maxHR"),
                    a.get("calories"),
                    a.get("averageSpeed"),
                    a.get("elevationGain"),
                    json.dumps(a),
                ))
    if on_progress:
        on_progress()
    return activities


def fetch_daily_stats(client: Garmin, start: date, end: date, on_progress: Optional[Callable] = None):
    """Fetch daily step/calorie stats for a date range."""
    current = start
    with get_conn() as conn:
        existing = {row[0] for row in conn.execute("SELECT date FROM daily_stats").fetchall()}
        while current <= end:
            day = current.isoformat()
            if day not in existing:
                stats = client.get_stats(day)
                conn.execute("""
                    INSERT OR REPLACE INTO daily_stats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    day,
                    stats.get("totalSteps"),
                    stats.get("activeKilocalories"),
                    stats.get("totalKilocalories"),
                    stats.get("totalDistanceMeters"),
                    stats.get("floorsAscended"),
                    stats.get("averageHeartRate"),
                    stats.get("restingHeartRate"),
                    json.dumps(stats),
                ))
            if on_progress:
                on_progress()
            current += timedelta(days=1)


def fetch_sleep(client: Garmin, start: date, end: date, on_progress: Optional[Callable] = None):
    """Fetch sleep data for a date range."""
    current = start
    with get_conn() as conn:
        existing = {row[0] for row in conn.execute("SELECT date FROM sleep").fetchall()}
        while current <= end:
            day = current.isoformat()
            if day not in existing:
                data = client.get_sleep_data(day)
                daily = data.get("dailySleepDTO", {})
                conn.execute("""
                    INSERT OR REPLACE INTO sleep VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    day,
                    daily.get("sleepStartTimestampLocal"),
                    daily.get("sleepEndTimestampLocal"),
                    daily.get("sleepTimeSeconds"),
                    daily.get("deepSleepSeconds"),
                    daily.get("lightSleepSeconds"),
                    daily.get("remSleepSeconds"),
                    daily.get("awakeSleepSeconds"),
                    daily.get("sleepScores", {}).get("overall", {}).get("value"),
                    json.dumps(data),
                ))
            if on_progress:
                on_progress()
            current += timedelta(days=1)


def fetch_hrv(client: Garmin, start: date, end: date, on_progress: Optional[Callable] = None):
    """Fetch HRV data for a date range."""
    current = start
    with get_conn() as conn:
        existing = {row[0] for row in conn.execute("SELECT date FROM hrv").fetchall()}
        while current <= end:
            day = current.isoformat()
            if day not in existing:
                try:
                    data = client.get_hrv_data(day)
                    summary = data.get("hrvSummary", {})
                    conn.execute("""
                        INSERT OR REPLACE INTO hrv VALUES (?, ?, ?, ?, ?)
                    """, (
                        day,
                        summary.get("weeklyAvg"),
                        summary.get("lastNight"),
                        summary.get("lastNight5MinHigh"),
                        json.dumps(data),
                    ))
                except Exception:
                    pass  # HRV not available on all devices/days
            if on_progress:
                on_progress()
            current += timedelta(days=1)


def fetch_body_battery(client: Garmin, start: date, end: date, on_progress: Optional[Callable] = None):
    """Fetch body battery data for a date range."""
    current = start
    with get_conn() as conn:
        existing = {row[0] for row in conn.execute("SELECT date FROM body_battery").fetchall()}
        while current <= end:
            day = current.isoformat()
            if day not in existing:
                try:
                    # Returns list of day-objects; request one day at a time
                    data = client.get_body_battery(day, day)
                    if data:
                        item = data[0]
                        charged = item.get("charged")
                        drained = item.get("drained")
                        # bodyBatteryValuesArray = [[timestamp_ms, level], ...]
                        readings = item.get("bodyBatteryValuesArray") or []
                        levels = [r[1] for r in readings if isinstance(r, list) and len(r) >= 2]
                        high = max(levels) if levels else charged
                        low  = min(levels) if levels else None
                        conn.execute(
                            "INSERT OR REPLACE INTO body_battery VALUES (?, ?, ?, ?, ?, ?)",
                            (day, high, low, charged, drained, json.dumps(item))
                        )
                except Exception:
                    pass  # body battery not available on all devices/days
            if on_progress:
                on_progress()
            current += timedelta(days=1)


def sync_all(client: Garmin, start: date, end: date, on_progress: Optional[Callable] = None):
    """Sync all data types for the given range."""
    fetch_activities(client, start, end, on_progress)
    fetch_daily_stats(client, start, end, on_progress)
    fetch_sleep(client, start, end, on_progress)
    fetch_hrv(client, start, end, on_progress)
    fetch_body_battery(client, start, end, on_progress)
