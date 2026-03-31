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
from src.fetcher import sync_all

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

@app.post("/sync")
def sync(req: SyncRequest):
    try:
        client = get_client()
        sync_all(client, req.start, req.end)
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


# ── CSV Export ────────────────────────────────────────────────────────────────

ALLOWED_TABLES = {"activities", "daily_stats", "sleep", "hrv"}

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
