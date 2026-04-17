from pydantic import BaseModel
from typing import Any, Dict, List, Optional


# DATA MODELS

class VehicleRequest(BaseModel):
    """Minimal vehicle identification fields shared across several requests."""
    year:  str
    make:  str
    model: str


class MaterialRequest(BaseModel):
    """Request body for POST /api/estimate_materials."""
    year:  int
    make:  str
    model: str


class PathwayRequest(BaseModel):
    """
    Request body for POST /api/generate_pathway.

    """
    vehicle:             VehicleRequest
    materials:           Optional[Dict[str, float]] = None
    condition_flags:     Optional[Dict[str, Any]]   = None
    custom_labour_rate:  Optional[float]             = None
    custom_action_times: Optional[Dict[str, float]] = None


class SaveRecordRequest(BaseModel):
    """
    Request body for POST /api/save_record.

    """
    vin:                Optional[str]  = ""
    year:               str
    make:               str
    model:              str
    total_profit:       float
    total_time_mins:    int
    vehicle_weight_lbs: float
    pathway:            list
    condition_notes:    Optional[list] = []
    market_prices:      Optional[dict] = {}
