import logging
import requests
from config import DEFAULT_VEHICLE_WEIGHT

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────
# VEHICLE WEIGHT  (NHTSA vPIC)
# ─────────────────────────────────────────────────────────────────

def get_vehicle_weight(year: str, make: str, model: str) -> float:
    """
    Retrieve the official curb weight (lbs) from the NHTSA Vehicle Product Information Catalog (vPIC) REST API.
    """
    try:
        url  = (f"https://vpic.nhtsa.dot.gov/api/vehicles/"
                f"GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json")
        data = requests.get(url, timeout=10).json()
        model_id = None
        for m in data.get("Results", []):
            if model.lower() in m.get("Model_Name", "").lower():
                model_id = m.get("Model_ID")
                break
        if not model_id:
            return DEFAULT_VEHICLE_WEIGHT
        spec_url  = (f"https://vpic.nhtsa.dot.gov/api/vehicles/"
                     f"GetVehicleVariableValuesList/{model_id}?format=json")
        spec_data = requests.get(spec_url, timeout=10).json()
        for item in spec_data.get("Results", []):
            if item.get("Variable") == "Curb Weight - lbs" and item.get("Value"):
                weight = float(item["Value"].replace(",", "").strip())
                if 1500 <= weight <= 8000:
                    return weight
        return DEFAULT_VEHICLE_WEIGHT
    except Exception as e:
        logger.warning(f"Weight lookup failed: {e}")
        return DEFAULT_VEHICLE_WEIGHT


# ─────────────────────────────────────────────────────────────────
# ENGINE INFO  (fuel type + displacement for dynamic v_cat)
# ─────────────────────────────────────────────────────────────────

def get_engine_info(year: str, make: str, model: str) -> dict:
    """
    Retrieve engine fuel type and displacement (litres) from NHTSA vPIC.
    """
    result = {"fuel_type": "Unknown", "displacement_liters": 0.0}
    try:
        url  = (f"https://vpic.nhtsa.dot.gov/api/vehicles/"
                f"GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json")
        data = requests.get(url, timeout=10).json()
        model_id = None
        for m in data.get("Results", []):
            if model.lower() in m.get("Model_Name", "").lower():
                model_id = m.get("Model_ID")
                break
        if not model_id:
            return result
        spec_url  = (f"https://vpic.nhtsa.dot.gov/api/vehicles/"
                     f"GetVehicleVariableValuesList/{model_id}?format=json")
        spec_data = requests.get(spec_url, timeout=10).json()
        for item in spec_data.get("Results", []):
            var = item.get("Variable", "")
            val = item.get("Value")
            if not val:
                continue
            if var == "Fuel Type - Primary":
                raw = str(val).strip().lower()
                if   "diesel"   in raw: result["fuel_type"] = "Diesel"
                elif "electric" in raw: result["fuel_type"] = "Electric"
                elif "hybrid"   in raw: result["fuel_type"] = "Hybrid"
                elif "gasoline" in raw: result["fuel_type"] = "Gasoline"
            if var == "Displacement (L)":
                try:
                    result["displacement_liters"] = float(str(val).replace(",", ""))
                except ValueError:
                    pass
    except Exception as e:
        logger.warning(f"Engine info lookup failed: {e}")
    return result