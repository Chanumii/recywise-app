from fastapi import APIRouter, HTTPException
import sqlite3, json, logging
from datetime import datetime
from models import SaveRecordRequest
from database import DB_PATH

router = APIRouter()
logger    = logging.getLogger(__name__)


# Save vehicle record

@router.post("/api/save_record")
def save_record(request: SaveRecordRequest):
    """
    Persist a completed pathway to the SQLite database.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c    = conn.cursor()
        c.execute(
            """INSERT INTO vehicle_records
               (timestamp, vin, year, make, model, total_profit, total_time_mins,
                vehicle_weight_lbs, pathway, condition_notes, market_prices)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                datetime.now().isoformat(),
                request.vin or "",
                request.year, request.make, request.model,
                round(request.total_profit, 2),
                request.total_time_mins,
                round(request.vehicle_weight_lbs, 1),
                json.dumps(request.pathway),
                json.dumps(request.condition_notes or []),
                json.dumps(request.market_prices   or {}),
            ),
        )
        record_id = c.lastrowid
        conn.commit()
        conn.close()
        logger.info(f"Record saved: id={record_id} — {request.year} {request.make} {request.model}")
        return {"id": record_id, "message": "Saved successfully"}
    except Exception as e:
        logger.error(f"Save record failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# Get vehicle history (list)

@router.get("/api/vehicle_history")
def get_vehicle_history():
    """
    Return all vehicle records ordered by most-recent timestamp.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c    = conn.cursor()
        c.execute(
            """SELECT id, timestamp, vin, year, make, model,
                      total_profit, total_time_mins, vehicle_weight_lbs
               FROM vehicle_records ORDER BY timestamp DESC"""
        )
        rows = c.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"History fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Get single vehicle record

@router.get("/api/vehicle_record/{record_id}")
def get_vehicle_record(record_id: int):
    """Return a complete vehicle record including pathway JSON."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c    = conn.cursor()
        c.execute("SELECT * FROM vehicle_records WHERE id = ?", (record_id,))
        row  = c.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Record not found")
        record                    = dict(row)
        record["pathway"]         = json.loads(record["pathway"])
        record["condition_notes"] = json.loads(record["condition_notes"])
        record["market_prices"]   = json.loads(record["market_prices"])
        return record
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Record fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))