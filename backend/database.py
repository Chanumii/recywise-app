import os
import sqlite3
import logging
from config import BASE_DIR 

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────
# SQLITE DATABASE
# A single SQLite file (recywise.db) provides storage for vehicle records.  
# ─────────────────────────────────────────────────────────────────

DB_PATH = os.path.join(BASE_DIR, "recywise.db")


def init_db() -> None:

    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS vehicle_records (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp           TEXT    NOT NULL,
            vin                 TEXT    DEFAULT '',
            year                TEXT,
            make                TEXT,
            model               TEXT,
            total_profit        REAL,
            total_time_mins     INTEGER,
            vehicle_weight_lbs  REAL,
            pathway             TEXT,
            condition_notes     TEXT,
            market_prices       TEXT
        )
    """)
    conn.commit()
    conn.close()
    logger.info("SQLite database initialised.")


init_db()