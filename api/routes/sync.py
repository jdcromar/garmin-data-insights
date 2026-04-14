from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from src.auth import get_client
from src.fetcher import (sync_all, fetch_activities, fetch_daily_stats,
                         fetch_sleep, fetch_hrv, fetch_body_battery)

router = APIRouter()


class SyncRequest(BaseModel):
    start: date
    end: date
    force: bool = False


@router.post("/sync")
def sync(req: SyncRequest):
    try:
        client = get_client()
        sync_all(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/activities")
def sync_activities(req: SyncRequest):
    try:
        client = get_client()
        fetch_activities(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/daily-stats")
def sync_daily_stats(req: SyncRequest):
    try:
        client = get_client()
        fetch_daily_stats(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/sleep")
def sync_sleep(req: SyncRequest):
    try:
        client = get_client()
        fetch_sleep(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/hrv")
def sync_hrv(req: SyncRequest):
    try:
        client = get_client()
        fetch_hrv(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/body-battery")
def sync_body_battery(req: SyncRequest):
    try:
        client = get_client()
        fetch_body_battery(client, req.start, req.end, force=req.force)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
