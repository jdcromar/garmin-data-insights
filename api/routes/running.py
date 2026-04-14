from fastapi import APIRouter
from datetime import datetime, timedelta
from collections import defaultdict
import json

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from src.database import get_conn

router = APIRouter()


def _pace_min_per_unit(dist_m, dur_s, unit_m=1609.34):
    """Convert distance (m) and duration (s) to pace in min per unit (mile/km)."""
    if not dist_m or dist_m <= 0:
        return None
    return (dur_s / 60) / (dist_m / unit_m)


@router.get("/running/dashboard")
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
        rj = json.loads(r["raw_json"]) if r["raw_json"] else {}
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

    # ── Summaries (week / month / year)
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

    # ── VO2 Max history
    vo2_history = []
    for r in runs:
        if r["vo2max"] is not None:
            vo2_history.append({"date": r["date"][:10], "value": r["vo2max"]})
    vo2_by_date = {}
    for v in vo2_history:
        vo2_by_date[v["date"]] = v["value"]
    vo2_history = [{"date": d, "value": v} for d, v in sorted(vo2_by_date.items())]

    # ── Weekly mileage
    week_buckets = defaultdict(lambda: {"distance_m": 0, "runs": 0, "duration_secs": 0})
    for r in runs:
        dt = datetime.strptime(r["date"], "%Y-%m-%d %H:%M:%S")
        iso_year, iso_week, _ = dt.isocalendar()
        key = f"{iso_year}-W{iso_week:02d}"
        week_buckets[key]["distance_m"] += r["distance_m"]
        week_buckets[key]["runs"] += 1
        week_buckets[key]["duration_secs"] += r["duration_secs"]
    weekly_mileage = [{"week": k, **v} for k, v in sorted(week_buckets.items())]

    # ── Pace trend (monthly avg)
    month_pace = defaultdict(lambda: {"dist": 0, "dur": 0})
    for r in runs:
        key = r["date"][:7]
        month_pace[key]["dist"] += r["distance_m"]
        month_pace[key]["dur"] += r["duration_secs"]
    pace_trend = [{"month": k, "avg_pace_min_mi": _pace_min_per_unit(v["dist"], v["dur"])}
                  for k, v in sorted(month_pace.items()) if v["dist"] > 0]

    # ── Records
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
    longest = max(runs, key=lambda r: r["distance_m"])
    records["longest_run"] = {
        "distance_m": longest["distance_m"],
        "duration_secs": longest["duration_secs"],
        "date": longest["date"][:10],
        "id": longest["id"],
    }
    valid_pace = [r for r in runs if r["pace_min_mi"] and r["distance_m"] >= 1000]
    if valid_pace:
        fastest = min(valid_pace, key=lambda r: r["pace_min_mi"])
        records["fastest_pace"] = {
            "pace_min_mi": round(fastest["pace_min_mi"], 2),
            "distance_m": fastest["distance_m"],
            "date": fastest["date"][:10],
            "id": fastest["id"],
        }

    # ── Running dynamics averages (last 30 runs)
    recent = [r for r in runs[-30:] if r["cadence"]]
    dyn_keys = ["cadence", "ground_contact_time", "stride_length",
                "vertical_oscillation", "vertical_ratio", "power"]
    dynamics_avg = {}
    for k in dyn_keys:
        vals = [r[k] for r in recent if r[k] is not None]
        dynamics_avg[k] = round(sum(vals) / len(vals), 1) if vals else None

    # ── Training effect distribution
    te_counts = defaultdict(int)
    for r in runs:
        if r["te_label"]:
            te_counts[r["te_label"]] += 1
    training_effects = dict(te_counts)

    # ── Races
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
