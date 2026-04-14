from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io, csv, json

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from src.database import get_conn

router = APIRouter()

TABLE_MAP = {
    "activities":  "activities",
    "daily_stats": "daily_stats",
    "sleep":       "sleep",
    "hrv":         "hrv",
    "body_battery": "body_battery",
}


def _fetch_export_rows(table: str):
    safe_name = TABLE_MAP.get(table)
    if not safe_name:
        raise HTTPException(status_code=400, detail=f"Unknown table '{table}'")
    with get_conn() as conn:
        rows = conn.execute(f"SELECT * FROM {safe_name} ORDER BY rowid").fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")
    return [{k: v for k, v in dict(r).items() if k != "raw_json"} for r in rows]


@router.get("/export/csv/{table}")
def export_csv(table: str):
    rows = _fetch_export_rows(table)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={table}.csv"},
    )


@router.get("/export/json/{table}")
def export_json(table: str):
    rows = _fetch_export_rows(table)
    payload = json.dumps(rows, indent=2, default=str)
    return StreamingResponse(
        io.BytesIO(payload.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={table}.json"},
    )


@router.get("/export/xlsx/{table}")
def export_xlsx(table: str):
    rows = _fetch_export_rows(table)
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = table
    headers = list(rows[0].keys())
    ws.append(headers)
    for row in rows:
        ws.append([row.get(h) for h in headers])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={table}.xlsx"},
    )
