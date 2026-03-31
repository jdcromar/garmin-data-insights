"""
Background sync worker — run daily via Windows Task Scheduler.
Syncs yesterday and today so the dashboard always has fresh data.

Setup (run once in an elevated prompt):
    schtasks /create /tn "GarminSync" /tr "python \"<full_path>\\sync_worker.py\"" /sc daily /st 06:00 /ru SYSTEM /f

Or use the helper at the bottom:  python sync_worker.py --setup
"""

import sys
import os
import subprocess
import logging
from datetime import date, timedelta
from pathlib import Path

# ── Setup logging ────────────────────────────────────────────────────────────
LOG_PATH = Path(__file__).parent / "data" / "sync.log"
LOG_PATH.parent.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── Path setup ───────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from src.database import init_db
from src.auth import get_client
from src.fetcher import sync_all


def run_sync(days_back: int = 2):
    end   = date.today()
    start = end - timedelta(days=days_back)
    log.info(f"Starting sync  {start} → {end}")
    try:
        init_db()
        client = get_client()
        sync_all(client, start, end)
        log.info("Sync complete.")
    except Exception as e:
        log.error(f"Sync failed: {e}", exc_info=True)
        sys.exit(1)


def setup_task():
    """Register this script as a daily Windows Task Scheduler job at 06:00."""
    script = Path(__file__).resolve()
    python = Path(sys.executable).resolve()
    cmd = (
        f'schtasks /create /tn "GarminDailySync" '
        f'/tr "\"{python}\" \"{script}\"" '
        f"/sc daily /st 06:00 /f"
    )
    log.info(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        log.info("Task Scheduler job created: GarminDailySync (runs at 06:00 daily)")
    else:
        log.error(f"Failed to create task:\n{result.stderr}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--setup":
        setup_task()
    else:
        run_sync()
