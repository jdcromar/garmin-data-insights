from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import date, datetime, timedelta
from typing import Optional
import sys, os, io, csv, math

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.database import get_conn, init_db
from src.auth import get_client
from src.fetcher import (sync_all, fetch_activities, fetch_daily_stats,
                         fetch_sleep, fetch_hrv, fetch_body_battery)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


# ── Sync ─────────────────────────────────────────────────────────────────────

class SyncRequest(BaseModel):
    start: date
    end: date
    force: bool = False

@app.post("/sync")
def sync(req: SyncRequest):
    try:
        client = get_client()
        sync_all(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync/activities")
def sync_activities(req: SyncRequest):
    try:
        client = get_client()
        fetch_activities(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync/daily-stats")
def sync_daily_stats(req: SyncRequest):
    try:
        client = get_client()
        fetch_daily_stats(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync/sleep")
def sync_sleep(req: SyncRequest):
    try:
        client = get_client()
        fetch_sleep(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync/hrv")
def sync_hrv(req: SyncRequest):
    try:
        client = get_client()
        fetch_hrv(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync/body-battery")
def sync_body_battery(req: SyncRequest):
    try:
        client = get_client()
        fetch_body_battery(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Daily Stats ───────────────────────────────────────────────────────────────

@app.get("/daily-stats")
def daily_stats():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, steps, active_calories, total_calories, "
            "distance_meters, avg_hr, resting_hr FROM daily_stats ORDER BY date"
        ).fetchall()
    return [dict(r) for r in rows]


# ── Activities ────────────────────────────────────────────────────────────────

@app.get("/activities")
def activities():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT activity_id, activity_type, start_time, duration_secs, "
            "distance_meters, avg_hr, max_hr, calories, elevation_gain "
            "FROM activities ORDER BY start_time DESC"
        ).fetchall()
    return [dict(r) for r in rows]


# ── Sleep ─────────────────────────────────────────────────────────────────────

@app.get("/sleep")
def sleep():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, duration_secs, deep_secs, light_secs, rem_secs, "
            "awake_secs, score FROM sleep ORDER BY date"
        ).fetchall()
    return [dict(r) for r in rows]


# ── HRV ───────────────────────────────────────────────────────────────────────

@app.get("/hrv")
def hrv():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, weekly_avg, last_night_avg, last_night_5min_high "
            "FROM hrv ORDER BY date"
        ).fetchall()
    return [dict(r) for r in rows]


# ── Insights (rolling averages + week-over-week trends) ───────────────────────

@app.get("/insights")
def insights():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, steps, resting_hr, total_calories "
            "FROM daily_stats ORDER BY date DESC LIMIT 90"
        ).fetchall()
        sleep_rows = conn.execute(
            "SELECT date, duration_secs, score "
            "FROM sleep ORDER BY date DESC LIMIT 90"
        ).fetchall()

    stats = [dict(r) for r in rows]
    sleep_data = [dict(r) for r in sleep_rows]

    def avg(vals):
        clean = [v for v in vals if v is not None]
        return sum(clean) / len(clean) if clean else None

    def trend_pct(recent, prev):
        if prev and prev != 0 and recent is not None:
            return round((recent - prev) / abs(prev) * 100, 1)
        return None

    steps_vals   = [r["steps"] for r in stats]
    hr_vals      = [r["resting_hr"] for r in stats]
    cal_vals     = [r["total_calories"] for r in stats]
    sleep_dur    = [r["duration_secs"] for r in sleep_data]
    sleep_scores = [r["score"] for r in sleep_data]

    r7  = slice(0, 7)
    r14 = slice(7, 14)
    r30 = slice(0, 30)

    return {
        "steps": {
            "avg_7d":  avg(steps_vals[r7]),
            "avg_30d": avg(steps_vals[r30]),
            "trend_pct": trend_pct(avg(steps_vals[r7]), avg(steps_vals[r14])),
        },
        "resting_hr": {
            "avg_7d":  avg(hr_vals[r7]),
            "avg_30d": avg(hr_vals[r30]),
            "trend_pct": trend_pct(avg(hr_vals[r7]), avg(hr_vals[r14])),
        },
        "calories": {
            "avg_7d":  avg(cal_vals[r7]),
            "avg_30d": avg(cal_vals[r30]),
            "trend_pct": trend_pct(avg(cal_vals[r7]), avg(cal_vals[r14])),
        },
        "sleep": {
            "avg_hrs_7d":  round(avg(sleep_dur[r7]) / 3600, 2) if avg(sleep_dur[r7]) else None,
            "avg_score_7d": avg(sleep_scores[r7]),
            "trend_pct": trend_pct(avg(sleep_dur[r7]), avg(sleep_dur[r14])),
        },
    }


# ── Personal Records ──────────────────────────────────────────────────────────

@app.get("/records")
def records():
    with get_conn() as conn:
        best_steps = conn.execute(
            "SELECT date, steps FROM daily_stats WHERE steps IS NOT NULL ORDER BY steps DESC LIMIT 5"
        ).fetchall()
        longest_run = conn.execute(
            "SELECT activity_type, start_time, distance_meters, duration_secs "
            "FROM activities WHERE distance_meters IS NOT NULL ORDER BY distance_meters DESC LIMIT 1"
        ).fetchone()
        peak_calories_act = conn.execute(
            "SELECT activity_type, start_time, calories "
            "FROM activities WHERE calories IS NOT NULL ORDER BY calories DESC LIMIT 1"
        ).fetchone()
        longest_session = conn.execute(
            "SELECT activity_type, start_time, duration_secs "
            "FROM activities WHERE duration_secs IS NOT NULL ORDER BY duration_secs DESC LIMIT 1"
        ).fetchone()
        best_sleep_score = conn.execute(
            "SELECT date, score FROM sleep WHERE score IS NOT NULL ORDER BY score DESC LIMIT 1"
        ).fetchone()
        lowest_rhr = conn.execute(
            "SELECT date, resting_hr FROM daily_stats WHERE resting_hr IS NOT NULL ORDER BY resting_hr ASC LIMIT 1"
        ).fetchone()

    return {
        "best_steps_days": [dict(r) for r in best_steps],
        "longest_run": dict(longest_run) if longest_run else None,
        "peak_calorie_activity": dict(peak_calories_act) if peak_calories_act else None,
        "longest_session": dict(longest_session) if longest_session else None,
        "best_sleep_score": dict(best_sleep_score) if best_sleep_score else None,
        "lowest_rhr": dict(lowest_rhr) if lowest_rhr else None,
    }


# ── Readiness Score ───────────────────────────────────────────────────────────

@app.get("/readiness")
def readiness():
    """Composite readiness score 0-100 based on HRV, sleep, resting HR trends."""
    with get_conn() as conn:
        hrv_rows = conn.execute(
            "SELECT last_night_avg FROM hrv WHERE last_night_avg IS NOT NULL ORDER BY date DESC LIMIT 30"
        ).fetchall()
        sleep_rows = conn.execute(
            "SELECT duration_secs, score FROM sleep WHERE score IS NOT NULL ORDER BY date DESC LIMIT 14"
        ).fetchall()
        hr_rows = conn.execute(
            "SELECT resting_hr FROM daily_stats WHERE resting_hr IS NOT NULL ORDER BY date DESC LIMIT 14"
        ).fetchall()

    def avg(lst):
        return sum(lst) / len(lst) if lst else None

    hrv_vals  = [r["last_night_avg"] for r in hrv_rows]
    sleep_dur = [r["duration_secs"] for r in sleep_rows]
    sleep_sc  = [r["score"] for r in sleep_rows]
    hr_vals   = [r["resting_hr"] for r in hr_rows]

    # HRV: compare last night vs 30-day avg (higher is better)
    hrv_score = None
    if len(hrv_vals) >= 2:
        baseline = avg(hrv_vals[1:])
        last_night = hrv_vals[0]
        if baseline:
            ratio = last_night / baseline
            hrv_score = min(100, max(0, round(50 + (ratio - 1) * 200)))

    # Sleep: score directly (0-100 scale from Garmin)
    sleep_score = round(avg(sleep_sc[:3])) if sleep_sc else None

    # RHR: compare recent 3 days vs 14-day avg (lower is better)
    rhr_score = None
    if len(hr_vals) >= 4:
        baseline = avg(hr_vals[3:])
        recent = avg(hr_vals[:3])
        if baseline:
            ratio = baseline / recent  # >1 means lower RHR = better
            rhr_score = min(100, max(0, round(50 + (ratio - 1) * 300)))

    components = [s for s in [hrv_score, sleep_score, rhr_score] if s is not None]
    composite = round(avg(components)) if components else None

    return {
        "composite": composite,
        "hrv_score": hrv_score,
        "sleep_score": sleep_score,
        "rhr_score": rhr_score,
        "label": (
            "Peak" if composite and composite >= 80 else
            "Good" if composite and composite >= 65 else
            "Moderate" if composite and composite >= 45 else
            "Low" if composite else "No data"
        ),
    }


# ── Goals ─────────────────────────────────────────────────────────────────────

class GoalRequest(BaseModel):
    metric: str
    target: float
    year: int

@app.get("/goals")
def get_goals(year: Optional[int] = None):
    with get_conn() as conn:
        if year:
            rows = conn.execute("SELECT * FROM goals WHERE year=? ORDER BY metric", (year,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM goals ORDER BY year DESC, metric").fetchall()
    return [dict(r) for r in rows]

@app.post("/goals")
def upsert_goal(req: GoalRequest):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO goals(metric, target, year) VALUES(?,?,?) "
            "ON CONFLICT(metric, year) DO UPDATE SET target=excluded.target",
            (req.metric, req.target, req.year)
        )
    return {"status": "ok"}

@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM goals WHERE id=?", (goal_id,))
    return {"status": "ok"}


# ── Goal Progress (actuals vs targets for current year) ───────────────────────

@app.get("/goals/progress/{year}")
def goals_progress(year: int):
    with get_conn() as conn:
        goals = conn.execute("SELECT * FROM goals WHERE year=?", (year,)).fetchall()
        stats = conn.execute(
            "SELECT steps, active_calories, distance_meters FROM daily_stats WHERE date LIKE ?",
            (f"{year}%",)
        ).fetchall()
        activities = conn.execute(
            "SELECT duration_secs FROM activities WHERE start_time LIKE ?",
            (f"{year}%",)
        ).fetchall()

    total_steps    = sum(r["steps"] or 0 for r in stats)
    total_cals     = sum(r["active_calories"] or 0 for r in stats)
    total_dist_mi  = sum((r["distance_meters"] or 0) / 1609.344 for r in stats)
    active_days    = sum(1 for r in stats if (r["steps"] or 0) >= 5000)
    total_hrs      = sum((r["duration_secs"] or 0) / 3600 for r in activities)

    actuals = {
        "steps": total_steps,
        "active_calories": total_cals,
        "distance_mi": round(total_dist_mi, 1),
        "active_days": active_days,
        "workout_hours": round(total_hrs, 1),
    }

    result = []
    for g in goals:
        g = dict(g)
        actual = actuals.get(g["metric"], 0)
        pct = round(actual / g["target"] * 100, 1) if g["target"] else 0
        result.append({**g, "actual": actual, "pct": min(pct, 100)})

    return result


# ── Wrapped ───────────────────────────────────────────────────────────────────

@app.get("/wrapped/{year}")
def wrapped(year: int):
    with get_conn() as conn:
        acts = conn.execute(
            "SELECT activity_type, duration_secs, distance_meters, calories, elevation_gain, start_time "
            "FROM activities WHERE start_time LIKE ?", (f"{year}%",)
        ).fetchall()
        stats = conn.execute(
            "SELECT steps FROM daily_stats WHERE date LIKE ?", (f"{year}%",)
        ).fetchall()
        sleep_rows = conn.execute(
            "SELECT duration_secs, score FROM sleep WHERE date LIKE ?", (f"{year}%",)
        ).fetchall()

    return {
        "activities": [dict(r) for r in acts],
        "stats": [dict(r) for r in stats],
        "sleep": [dict(r) for r in sleep_rows],
    }


# ── Multi-year Wrapped ────────────────────────────────────────────────────────

@app.get("/wrapped/multi/{years_str}")
def wrapped_multi(years_str: str):
    """years_str = comma-separated years e.g. '2024,2025'"""
    try:
        years = [int(y.strip()) for y in years_str.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid years format")

    result = {}
    with get_conn() as conn:
        for year in years:
            acts = conn.execute(
                "SELECT duration_secs, distance_meters, calories, elevation_gain "
                "FROM activities WHERE start_time LIKE ?", (f"{year}%",)
            ).fetchall()
            stats = conn.execute(
                "SELECT steps FROM daily_stats WHERE date LIKE ?", (f"{year}%",)
            ).fetchall()
            sleep_rows = conn.execute(
                "SELECT duration_secs, score FROM sleep WHERE date LIKE ?", (f"{year}%",)
            ).fetchall()

            n      = len(acts)
            dist   = sum((r["distance_meters"] or 0) / 1609.344 for r in acts)
            hrs    = sum((r["duration_secs"] or 0) / 3600 for r in acts)
            cals   = sum((r["calories"] or 0) for r in acts)
            elev_m = sum((r["elevation_gain"] or 0) for r in acts)
            steps  = sum((r["steps"] or 0) for r in stats)
            avg_sleep = (
                sum((r["duration_secs"] or 0) for r in sleep_rows) / len(sleep_rows) / 3600
                if sleep_rows else None
            )

            result[str(year)] = {
                "year": year,
                "activities": n,
                "distance_mi": round(dist, 1),
                "hours": round(hrs, 1),
                "calories": round(cals),
                "elevation_m": round(elev_m),
                "total_steps": steps,
                "avg_sleep_hrs": round(avg_sleep, 1) if avg_sleep else None,
            }

    return result


# ── Activity route (on-demand, cached) ───────────────────────────────────────

@app.get("/activities/{activity_id}/route")
def activity_route(activity_id: str):
    import json as _json
    # Return cached track if available
    with get_conn() as conn:
        cached = conn.execute(
            "SELECT track_json FROM activity_tracks WHERE activity_id=?",
            (activity_id,)
        ).fetchone()
        if cached:
            return _json.loads(cached["track_json"])

    # Fetch from Garmin
    try:
        client = get_client()
        details = client.get_activity_details(activity_id, maxpoly=2000)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Garmin fetch failed: {e}")

    # Metric indices (from metricDescriptors):
    # 0=HR, 2=cumDist(m), 3=speed(m/s), 4=lng, 7=lat, 10=elev(m), 15=timestamp(ms)
    IDX_HR   = 0
    IDX_DIST = 2
    IDX_SPD  = 3
    IDX_LNG  = 4
    IDX_LAT  = 7
    IDX_ELEV = 10
    IDX_TS   = 15

    # Remap descriptor metricsIndex → position in the values array
    descs = details.get("metricDescriptors", [])
    KEY_IDX = {d["key"]: d["metricsIndex"] for d in descs}
    IDX_HR   = KEY_IDX.get("directHeartRate",   IDX_HR)
    IDX_DIST = KEY_IDX.get("sumDistance",        IDX_DIST)
    IDX_SPD  = KEY_IDX.get("directSpeed",        IDX_SPD)
    IDX_LNG  = KEY_IDX.get("directLongitude",    IDX_LNG)
    IDX_LAT  = KEY_IDX.get("directLatitude",     IDX_LAT)
    IDX_ELEV = KEY_IDX.get("directElevation",    IDX_ELEV)
    IDX_TS   = KEY_IDX.get("directTimestamp",    IDX_TS)

    points = []
    for row in details.get("activityDetailMetrics", []):
        vals = row.get("metrics", [])
        def v(i):
            return vals[i] if i < len(vals) else None
        lat = v(IDX_LAT)
        lng = v(IDX_LNG)
        if lat is None or lng is None:
            continue
        # Skip clearly invalid coordinates
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            continue
        spd = v(IDX_SPD)
        points.append({
            "lat":   round(lat, 6),
            "lng":   round(lng, 6),
            "hr":    v(IDX_HR),
            "spd":   round(spd, 3) if spd is not None else None,   # m/s
            "elev":  round(v(IDX_ELEV), 1) if v(IDX_ELEV) is not None else None,
            "dist":  round(v(IDX_DIST), 1) if v(IDX_DIST) is not None else None,
            "ts":    v(IDX_TS),
        })

    result = {"points": points}

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO activity_tracks(activity_id, track_json) VALUES(?,?)",
            (activity_id, _json.dumps(result))
        )

    return result


# ── Body Battery ─────────────────────────────────────────────────────────────

@app.get("/body-battery")
def body_battery():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, high_value, low_value, charged, drained "
            "FROM body_battery ORDER BY date"
        ).fetchall()
    return [dict(r) for r in rows]


# ── Activity locations (for map) ──────────────────────────────────────────────

@app.get("/activities/locations")
def activity_locations():
    """Return start lat/lng extracted from raw_json for map rendering."""
    import json as _json
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT activity_id, activity_type, start_time, distance_meters, "
            "duration_secs, raw_json FROM activities WHERE raw_json IS NOT NULL"
        ).fetchall()
    result = []
    for r in rows:
        try:
            raw = _json.loads(r["raw_json"])
            lat = (raw.get("startLatitude") or raw.get("beginLatitude")
                   or raw.get("startLat") or raw.get("latitudeBegin"))
            lng = (raw.get("startLongitude") or raw.get("beginLongitude")
                   or raw.get("startLon") or raw.get("longitudeBegin"))
            if lat and lng:
                result.append({
                    "activity_id":    r["activity_id"],
                    "activity_type":  r["activity_type"],
                    "start_time":     r["start_time"],
                    "distance_meters": r["distance_meters"],
                    "duration_secs":  r["duration_secs"],
                    "lat": lat,
                    "lng": lng,
                })
        except Exception:
            pass
    return result


# ── CSV Export ────────────────────────────────────────────────────────────────

# ── Running Dashboard ─────────────────────────────────────────────────────────

import json as _json

def _pace_min_per_unit(dist_m, dur_s, unit_m=1609.34):
    """Convert distance (m) and duration (s) to pace in min per unit (mile/km)."""
    if not dist_m or dist_m <= 0:
        return None
    return (dur_s / 60) / (dist_m / unit_m)


@app.get("/running/dashboard")
def running_dashboard():
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT activity_id, start_time, distance_meters, duration_secs,
                   avg_hr, max_hr, calories, elevation_gain, raw_json
            FROM activities WHERE activity_type = 'running'
            ORDER BY start_time
        """).fetchall()

    if not rows:
        return {"runs": [], "weekly_mileage": [], "vo2max_history": [],
                "records": {}, "weekly_summary": {}, "monthly_summary": {},
                "yearly_summary": {}, "dynamics_avg": {}, "training_effects": {},
                "pace_trend": [], "races": [], "recent_runs": []}

    runs = []
    for r in rows:
        rj = _json.loads(r["raw_json"]) if r["raw_json"] else {}
        dist = r["distance_meters"] or 0
        dur = r["duration_secs"] or 0
        runs.append({
            "id": r["activity_id"],
            "date": r["start_time"],
            "name": rj.get("activityName", ""),
            "distance_m": dist,
            "duration_secs": dur,
            "pace_min_mi": _pace_min_per_unit(dist, dur, 1609.34),
            "avg_hr": r["avg_hr"],
            "max_hr": r["max_hr"],
            "calories": r["calories"],
            "elevation_gain": r["elevation_gain"],
            "vo2max": rj.get("vO2MaxValue"),
            "aerobic_te": rj.get("aerobicTrainingEffect"),
            "anaerobic_te": rj.get("anaerobicTrainingEffect"),
            "te_label": rj.get("trainingEffectLabel"),
            "training_load": rj.get("activityTrainingLoad"),
            "cadence": rj.get("averageRunningCadenceInStepsPerMinute"),
            "ground_contact_time": rj.get("avgGroundContactTime"),
            "stride_length": rj.get("avgStrideLength"),
            "vertical_oscillation": rj.get("avgVerticalOscillation"),
            "vertical_ratio": rj.get("avgVerticalRatio"),
            "power": rj.get("avgPower"),
            "event_type": rj.get("eventType", {}).get("typeKey"),
        })

    # ── Summaries (week / month / year) ────────────────────────────────────
    from collections import defaultdict
    now = datetime.now()
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    def summarize(subset):
        if not subset:
            return {"runs": 0, "distance_m": 0, "duration_secs": 0,
                    "avg_pace_min_mi": None, "avg_hr": None, "total_elevation": 0, "total_calories": 0}
        total_dist = sum(r["distance_m"] for r in subset)
        total_dur = sum(r["duration_secs"] for r in subset)
        hrs = [r["avg_hr"] for r in subset if r["avg_hr"]]
        return {
            "runs": len(subset),
            "distance_m": total_dist,
            "duration_secs": total_dur,
            "avg_pace_min_mi": _pace_min_per_unit(total_dist, total_dur),
            "avg_hr": round(sum(hrs) / len(hrs)) if hrs else None,
            "total_elevation": sum(r["elevation_gain"] or 0 for r in subset),
            "total_calories": sum(r["calories"] or 0 for r in subset),
        }

    week_runs = [r for r in runs if datetime.strptime(r["date"], "%Y-%m-%d %H:%M:%S") >= week_start]
    month_runs = [r for r in runs if datetime.strptime(r["date"], "%Y-%m-%d %H:%M:%S") >= month_start]
    year_runs = [r for r in runs if datetime.strptime(r["date"], "%Y-%m-%d %H:%M:%S") >= year_start]

    # ── VO2 Max history ────────────────────────────────────────────────────
    vo2_history = []
    for r in runs:
        if r["vo2max"] is not None:
            vo2_history.append({"date": r["date"][:10], "value": r["vo2max"]})
    # Deduplicate by date (keep last per day)
    vo2_by_date = {}
    for v in vo2_history:
        vo2_by_date[v["date"]] = v["value"]
    vo2_history = [{"date": d, "value": v} for d, v in sorted(vo2_by_date.items())]

    # ── Weekly mileage ─────────────────────────────────────────────────────
    week_buckets = defaultdict(lambda: {"distance_m": 0, "runs": 0, "duration_secs": 0})
    for r in runs:
        dt = datetime.strptime(r["date"], "%Y-%m-%d %H:%M:%S")
        iso_year, iso_week, _ = dt.isocalendar()
        key = f"{iso_year}-W{iso_week:02d}"
        week_buckets[key]["distance_m"] += r["distance_m"]
        week_buckets[key]["runs"] += 1
        week_buckets[key]["duration_secs"] += r["duration_secs"]
    weekly_mileage = [{"week": k, **v} for k, v in sorted(week_buckets.items())]

    # ── Pace trend (monthly avg) ───────────────────────────────────────────
    month_pace = defaultdict(lambda: {"dist": 0, "dur": 0})
    for r in runs:
        key = r["date"][:7]
        month_pace[key]["dist"] += r["distance_m"]
        month_pace[key]["dur"] += r["duration_secs"]
    pace_trend = [{"month": k, "avg_pace_min_mi": _pace_min_per_unit(v["dist"], v["dur"])}
                  for k, v in sorted(month_pace.items()) if v["dist"] > 0]

    # ── Records ────────────────────────────────────────────────────────────
    dist_brackets = [
        ("fastest_mile",   1609.34 * 0.8,  1609.34 * 1.2),
        ("fastest_5k",     5000 * 0.9,     5000 * 1.1),
        ("fastest_10k",    10000 * 0.9,    10000 * 1.15),
        ("fastest_half",   21097 * 0.9,    21097 * 1.1),
        ("fastest_marathon", 42195 * 0.9,  42195 * 1.1),
    ]
    records = {}
    for label, lo, hi in dist_brackets:
        bracket = [r for r in runs if lo <= r["distance_m"] <= hi and r["pace_min_mi"]]
        if bracket:
            best = min(bracket, key=lambda r: r["pace_min_mi"])
            records[label] = {
                "pace_min_mi": round(best["pace_min_mi"], 2),
                "distance_m": best["distance_m"],
                "duration_secs": best["duration_secs"],
                "date": best["date"][:10],
                "id": best["id"],
            }
    # Longest run
    longest = max(runs, key=lambda r: r["distance_m"])
    records["longest_run"] = {
        "distance_m": longest["distance_m"],
        "duration_secs": longest["duration_secs"],
        "date": longest["date"][:10],
        "id": longest["id"],
    }
    # Fastest pace (any distance, min 1km)
    valid_pace = [r for r in runs if r["pace_min_mi"] and r["distance_m"] >= 1000]
    if valid_pace:
        fastest = min(valid_pace, key=lambda r: r["pace_min_mi"])
        records["fastest_pace"] = {
            "pace_min_mi": round(fastest["pace_min_mi"], 2),
            "distance_m": fastest["distance_m"],
            "date": fastest["date"][:10],
            "id": fastest["id"],
        }

    # ── Running dynamics averages (last 30 runs) ──────────────────────────
    recent = [r for r in runs[-30:] if r["cadence"]]
    dyn_keys = ["cadence", "ground_contact_time", "stride_length",
                "vertical_oscillation", "vertical_ratio", "power"]
    dynamics_avg = {}
    for k in dyn_keys:
        vals = [r[k] for r in recent if r[k] is not None]
        dynamics_avg[k] = round(sum(vals) / len(vals), 1) if vals else None

    # ── Training effect distribution ───────────────────────────────────────
    te_counts = defaultdict(int)
    for r in runs:
        if r["te_label"]:
            te_counts[r["te_label"]] += 1
    training_effects = dict(te_counts)

    # ── Races ──────────────────────────────────────────────────────────────
    races = [
        {
            "id": r["id"], "date": r["date"][:10], "name": r["name"],
            "distance_m": r["distance_m"], "duration_secs": r["duration_secs"],
            "pace_min_mi": r["pace_min_mi"], "avg_hr": r["avg_hr"],
        }
        for r in runs if r["event_type"] == "race"
    ]

    return {
        "weekly_summary": summarize(week_runs),
        "monthly_summary": summarize(month_runs),
        "yearly_summary": summarize(year_runs),
        "vo2max_history": vo2_history,
        "current_vo2max": vo2_history[-1]["value"] if vo2_history else None,
        "weekly_mileage": weekly_mileage,
        "pace_trend": pace_trend,
        "records": records,
        "dynamics_avg": dynamics_avg,
        "training_effects": training_effects,
        "races": races,
        "recent_runs": [
            {k: v for k, v in r.items() if k != "event_type"}
            for r in runs[-20:][::-1]
        ],
        "total_runs": len(runs),
    }


ALLOWED_TABLES = {"activities", "daily_stats", "sleep", "hrv", "body_battery"}

@app.get("/export/csv/{table}")
def export_csv(table: str):
    if table not in ALLOWED_TABLES:
        raise HTTPException(status_code=400, detail=f"Unknown table '{table}'")

    with get_conn() as conn:
        rows = conn.execute(f"SELECT * FROM {table} ORDER BY rowid").fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    for row in rows:
        writer.writerow({k: v for k, v in dict(row).items() if k != "raw_json"})

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={table}.csv"},
    )
