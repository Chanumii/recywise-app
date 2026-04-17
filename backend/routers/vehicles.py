from fastapi import APIRouter, HTTPException
import requests, json, logging
from models import MaterialRequest
from config import DEFAULT_MARKET_DATA
from gemini import gemini_client
from google import genai
from google.genai import types
from dotenv import load_dotenv

router = APIRouter()
logger = logging.getLogger(__name__)

# Load environment variables from project-root .env file before any os.environ reads, ensuring GEMINI_API_KEY is available at import time.
load_dotenv()

# VIN decode

@router.get("/api/decode_vin/{vin}")
def decode_vin(vin: str):
    """
    Decode a VIN via NHTSA vPIC and return make, model, and year.
    """
    try:
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{vin}?format=json"
        response = requests.get(url, timeout=10)
        data = response.json()
        decoded = {}
        for item in data.get("Results", []):
            variable = item.get("Variable")
            value = item.get("Value")
            if value and str(value).strip():
                if variable == "Make": decoded["make"] = value.strip()
                if variable == "Model": decoded["model"] = value.strip()
                if variable == "Model Year": decoded["year"] = value.strip()
        missing = [f for f in ["make", "model", "year"] if not decoded.get(f)]
        if missing:
            return {
                "partial": True,
                "make": decoded.get("make",  ""),
                "model": decoded.get("model", ""),
                "year": decoded.get("year",  ""),
                "message": f"Could not decode: {', '.join(missing)}",
            }
        return {
            "partial": False,
            "make": decoded["make"],
            "model": decoded["model"],
            "year": decoded["year"],
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"NHTSA API error: {e}")
        raise HTTPException(status_code=500, detail="External API unavailable.")



# Estimate material compositions

@router.post("/api/estimate_materials")
def estimate_materials(vehicle: MaterialRequest):
    """
    Estimate material composition (% by weight) for a given vehicle with Gemini Flash.
    """
    try:
        year_str = str(vehicle.year)
        year = int(vehicle.year)
    except Exception:
        year_str = "Unknown Year"
        year     = 2010

    make = vehicle.make  or "Unknown Make"
    model = vehicle.model or "Unknown Model"
    make_lower = make.lower()
    model_lower = model.lower()

    # ──  Gemini AI with structured JSON ───────────────────────
    if gemini_client:
        try:
            prompt = f"""You are an expert automotive materials engineer.
            Estimate material composition (% by weight) for a {year_str} {make} {model}.
            Newer cars = more aluminium; EVs/hybrids = more copper; trucks = more steel.
            Return ONLY a JSON object. Values should approximately sum to 100.0.
            {{"Steel": float, "Aluminum": float, "Copper": float,
              "Plastics": float, "Rubber": float, "Glass": float}}"""
            response = gemini_client.models.generate_content(
                model = "gemini-flash-latest",
                contents = prompt,
                config = types.GenerateContentConfig(
                    response_mime_type = "application/json",
                    temperature = 0.1,   # deterministic JSON
                ),
            )
            estimates = json.loads(response.text)
            valid_keys = ["Steel", "Aluminum", "Copper", "Plastics", "Rubber", "Glass"]
            clean, total = {}, 0.0
            for key in valid_keys:
                val = max(0.0, float(estimates.get(key, 0.0)))
                clean[key] = val
                total += val
            if total > 0:
                for k in valid_keys:
                    clean[k] = round((clean[k] / total) * 100.0, 1)
            else:
                raise ValueError("Zero total from Gemini.")
            return clean
        except Exception as e:
            logger.error(f"Gemini failed: {e}. Using heuristic fallback.")

    # ── Fallback: rule-based heuristics ──────────────────────────
    comp = {
        "Steel": 60.0, "Aluminum": 10.0, "Copper": 2.0,
        "Plastics": 12.0, "Rubber": 8.0, "Glass": 3.0,
    }
    if year >= 2015:
        comp["Steel"] -= 5.0; comp["Aluminum"] += 3.0; comp["Plastics"] += 2.0
    elif 1900 < year <= 2000:
        comp["Steel"] += 5.0; comp["Aluminum"] -= 2.0; comp["Plastics"] -= 3.0
    ev_kw = ["tesla","leaf","bolt","mach-e","rivian","lucid","polestar","ioniq","ev6","prius","hybrid"]
    if any(kw in make_lower or kw in model_lower for kw in ev_kw):
        comp["Steel"] -= 5.0; comp["Aluminum"] += 2.0; comp["Copper"] += 2.0; comp["Plastics"] += 1.0
    truck_kw = ["f-150","silverado","ram","tacoma","tundra","sierra","colorado","ranger","suv","jeep","truck"]
    if any(kw in make_lower or kw in model_lower for kw in truck_kw):
        comp["Steel"] += 4.0; comp["Aluminum"] -= 1.0; comp["Plastics"] -= 1.0; comp["Rubber"] -= 1.0; comp["Glass"] -= 1.0
    for k in comp:
        comp[k] = round(max(0.0, comp[k]), 1)
    return comp