import os
import json
import logging
import requests
import yfinance as yf
import pandas as pd
import numpy as np
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List

# ---------- CONFIGURATION & LOGGING ----------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app with metadata
app = FastAPI(title="RecyWise Backend")

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://recy-wise-frontend.onrender.com",  # Your production frontend
        "http://localhost:5173",  # Vite dev server (for local development)
        "http://localhost:3000"   # Alternative local port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- MODEL LOADING ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "recywise_model.json")

# Initialize XGBoost model instance
bst = xgb.Booster()

try:
    if os.path.exists(MODEL_PATH):
        bst.load_model(MODEL_PATH)
        logger.info(f"SUCCESS: Model loaded from: {MODEL_PATH}")
    else:
        logger.error(f"ERROR: Model file not found at: {MODEL_PATH}")
except Exception as e:
    logger.error(f"Failed to load XGBoost model: {e}")

# ---------- DEFAULT MARKET DATA ----------

# Default fallback prices (USD per lb) if live data unavailable
DEFAULT_MARKET_DATA = {
    "p_steel": 0.25,
    "p_alum": 1.10,
    "p_copper": 3.80,
    "p_plastic": 0.12,
    "p_rubber": 0.45,
    "p_glass": 0.06,
    "labor_rate": 32.50 # USD/hour - Automotive technician rate
}

# Default vehicle weight (lbs) - used as fallback if NHTSA data unavailable
DEFAULT_VEHICLE_WEIGHT = 3500.0  # EPA mid-size sedan average

# ---------- DATA MODELS ----------
# Vehicle identification schema for VIN decoding and material estimation.

class VehicleRequest(BaseModel):
    year: str
    make: str
    model: str

class MaterialRequest(BaseModel):
    year: int
    make: str
    model: str

class PathwayRequest(BaseModel):
    vehicle: VehicleRequest
    materials: Dict[str, float]  # Material name -> Percentage

# --------- MARKET DATA RETRIEVAL ----------

def get_live_market_data() -> Dict[str, float]:
    """
    Fetches live commodity prices from Yahoo Finance.
    Returns prices in USD/lb.
    """
    data = DEFAULT_MARKET_DATA.copy()
    try:
        # Copper (HG=F): Priced in USD/lb
        copper = yf.Ticker("HG=F").history(period="1d")
        if not copper.empty:
            data["p_copper"] = float(copper["Close"].iloc[-1])

        # Steel (HRC=F): Priced in USD/Short Ton (2000 lbs)
        steel = yf.Ticker("HRC=F").history(period="1d")
        if not steel.empty:
            price_ton = float(steel["Close"].iloc[-1])
            data["p_steel"] = round(price_ton / 2000.0, 3)

        # Aluminum (ALI=F): Priced in USD/Metric Ton (2204.6 lbs)
        alum = yf.Ticker("ALI=F").history(period="1d")
        if not alum.empty:
            price_metric_ton = float(alum["Close"].iloc[-1])
            data["p_alum"] = round(price_metric_ton / 2204.62, 3)

        logger.info(f"Market data updated: {data}")
    except Exception as e:
        logger.warning(f"Yahoo Finance fetch failed, using defaults: {e}")
    
    return data

# ---------- VEHICLE WEIGHT ESTIMATION ----------

def get_vehicle_weight(year: str, make: str, model: str) -> float:
    """
    Fetches vehicle curb weight from NHTSA vPIC API.
    Returns DEFAULT_VEHICLE_WEIGHT (3500 lbs) if unavailable.
    """
    try:
        # Step 1: Get models for year/make
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        # Step 2: Find matching model and get Model_ID
        model_id = None
        for m in data.get('Results', []):
            if model.lower() in m.get('Model_Name', '').lower():
                model_id = m.get('Model_ID')
                break
        
        if not model_id:
            return DEFAULT_VEHICLE_WEIGHT
        
        # Step 3: Get vehicle specifications
        spec_url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleVariableValuesList/{model_id}?format=json"
        spec_response = requests.get(spec_url, timeout=10)
        spec_data = spec_response.json()
        
        # Step 4: Extract curb weight
        for item in spec_data.get('Results', []):
            if item.get('Variable') == "Curb Weight - lbs" and item.get('Value'):
                weight = float(item.get('Value').replace(',', '').strip())
                if 1500 <= weight <= 8000:  # Sanity check
                    logger.info(f"Vehicle weight: {weight} lbs")
                    return weight
        
        return DEFAULT_VEHICLE_WEIGHT
        
    except Exception as e:
        logger.warning(f"Weight lookup failed, using default: {e}")
        return DEFAULT_VEHICLE_WEIGHT

# ---------- RECOVERY COST CALCULATION ----------

def estimate_recovery_cost(time_minutes: float, labor_rate: float) -> float:
    return (time_minutes / 60.0) * labor_rate

# ---------- DECODE VIN ----------
# Using NHTSA vPIC API

@app.get("/api/decode_vin/{vin}")
def decode_vin(vin: str):
    """
    Decodes VIN using the NHTSA vPIC API.
    """
    try:
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{vin}?format=json"
        logger.info(f"Fetching VIN: {vin} from NHTSA...")
        
        response = requests.get(url, timeout=10) #Timeout to prevent hanging
        data = response.json()
        
        # Parse Results
        decoded = {}
        for item in data.get('Results', []):
            variable = item.get('Variable')
            value = item.get('Value')
            
            # Map NHTSA field names 
            if variable == "Make": decoded["make"] = value
            if variable == "Model": decoded["model"] = value
            if variable == "Model Year": decoded["year"] = value
            

        logger.info(f"NHTSA Response Keys: {decoded.keys()}")

        if not decoded.get("make") or not decoded.get("year"):
            logger.error(f"VIN Decode Failed. Missing Data. Got: {decoded}")
            raise HTTPException(status_code=404, detail="VIN found but missing Make/Year data.")

        return decoded

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"NHTSA API Error: {e}")
        raise HTTPException(status_code=500, detail="External API unavailable.")

# ---------- AUTO-ESTIMATE MATERIAL COMPOSITIONS ----------

@app.post("/api/estimate_materials")
def estimate_materials(vehicle: MaterialRequest):
    """
    Non-functional placeholder. The frontend will not call this in the current flow.
    Future implementation.
    """
    return {"message": "This feature is currently disabled."}

# ---------- GENERATE RECYCLING PATHWAY ----------

@app.post("/api/generate_pathway")
def generate_pathway(request: PathwayRequest):
    """
    Generates an optimized recycling pathway using XGBoost ML model.
    
    """
    # Initialize with default in case of early failure
    vehicle_weight = DEFAULT_VEHICLE_WEIGHT
    
    try:
        # Debug: Log full request structure
        logger.info("=" * 60)
        logger.info("PATHWAY REQUEST RECEIVED")
        logger.info("=" * 60)
        logger.info(f"Full request: {request}")
        logger.info(f"Vehicle object: {request.vehicle}")
        logger.info(f"Year: '{request.vehicle.year}' (type: {type(request.vehicle.year).__name__})")
        logger.info(f"Make: '{request.vehicle.make}' (type: {type(request.vehicle.make).__name__})")
        logger.info(f"Model: '{request.vehicle.model}' (type: {type(request.vehicle.model).__name__})")
        logger.info(f"Materials: {request.materials}")
        logger.info("=" * 60)
        
        # Validate vehicle data (check for both None and empty strings)
        year_valid = request.vehicle.year and request.vehicle.year.strip()
        make_valid = request.vehicle.make and request.vehicle.make.strip()
        model_valid = request.vehicle.model and request.vehicle.model.strip()
        
        if not year_valid or not make_valid or not model_valid:
            logger.error(f"VALIDATION FAILED - Missing or empty vehicle data:")
            logger.error(f"  year='{request.vehicle.year}' (valid: {bool(year_valid)})")
            logger.error(f"  make='{request.vehicle.make}' (valid: {bool(make_valid)})")
            logger.error(f"  model='{request.vehicle.model}' (valid: {bool(model_valid)})")
            raise HTTPException(
                status_code=400, 
                detail={
                    "error": "Vehicle year, make, and model are required and cannot be empty",
                    "received": {
                        "year": request.vehicle.year,
                        "make": request.vehicle.make,
                        "model": request.vehicle.model
                    }
                }
            )
        
        # 1. Fetch Live Market Data
        logger.info("Step 1: Fetching market data...")
        market_data = get_live_market_data()
        logger.info(f"✓ Market data fetched: {list(market_data.keys())}")
        
        # 2. Get Vehicle-Specific Weight from NHTSA
        logger.info("Step 2: Fetching vehicle weight...")
        try:
            vehicle_weight = get_vehicle_weight(
                year=str(request.vehicle.year),
                make=str(request.vehicle.make),
                model=str(request.vehicle.model)
            )
            logger.info(f" Vehicle weight obtained: {vehicle_weight} lbs")
        except Exception as weight_error:
            logger.error(f" Vehicle weight lookup failed: {weight_error}")
            logger.error(f"  Using default weight: {DEFAULT_VEHICLE_WEIGHT} lbs")
            vehicle_weight = DEFAULT_VEHICLE_WEIGHT
        
        # 3. Calculate Estimated Component Weights
        logger.info("Step 3: Calculating component weights...")
        materials = request.materials
        logger.info(f"  Material composition: {materials}")
        
        w_steel = vehicle_weight * (materials.get("Steel", 60) / 100)
        w_alum = vehicle_weight * (materials.get("Aluminum", 10) / 100)
        w_copper = vehicle_weight * (materials.get("Copper", 2) / 100)
        w_plastic = vehicle_weight * (materials.get("Plastics", 12) / 100)
        w_rubber = vehicle_weight * (materials.get("Rubber", 8) / 100)
        w_glass = vehicle_weight * (materials.get("Glass", 3) / 100)
        logger.info(f" Component weights calculated")
        

        # Component Weights
        logger.info("Step 4: Building feature set...")
        features = {
            "w_eng": vehicle_weight * 0.15, # Engine assembly (~15% total weight)
            "w_trans": vehicle_weight * 0.05, # Transmission
            "w_cat": 5.0, # Catalytic converter
            "w_pnl": w_steel * 0.2, # Body panels
            "w_whl": w_alum * 0.5, # Wheels
            "w_cop": w_copper, # Wiring harness (mostly copper)
            "w_gls": vehicle_weight * 0.03, # Windshield + windows
            "w_seat": vehicle_weight * 0.05, # Seats
            "w_ecu": 2.0, # Electronic Control Units
            "w_body": w_steel * 0.7, # Body (70% of steel)
            
            # Market Prices
            "m_steel": market_data["p_steel"],
            "m_alum": market_data["p_alum"],
            "m_cop": market_data["p_copper"],
            # High-value component estimates (USD per unit)
            "v_cat": 250.0, 
            "v_eng": 400.0, 
            "m_labor": market_data["labor_rate"]
        }
        logger.info(f" Feature set complete: {len(features)} features")

        # 4. Define Recycling Actions with Metadata (Time in Minutes)
        logger.info("Step 5: Defining recycling actions...")
        actions = [
            {"id": 0, "name": "Safe Depollution", "time": 40, "base_rev": 15},
            {"id": 1, "name": "Airbag Neutralization", "time": 20, "base_rev": 5},
            {"id": 2, "name": "Catalytic Converter Removal", "time": 15, "base_rev": features["v_cat"]},
            {"id": 3, "name": "Engine Assembly Removal", "time": 60, "base_rev": features["v_eng"]},
            {"id": 4, "name": "Transmission Removal", "time": 45, "base_rev": 200},
            {"id": 5, "name": "ECU/Electronics Harvest", "time": 10, "base_rev": 50},
            {"id": 6, "name": "Alloy Wheel Removal", "time": 20, "base_rev": features["w_whl"] * features["m_alum"]},
            {"id": 7, "name": "Body Panel Removal", "time": 40, "base_rev": features["w_pnl"] * features["m_steel"]},
            {"id": 8, "name": "Copper Wiring Harvest", "time": 45, "base_rev": features["w_cop"] * features["m_cop"]},
            {"id": 9, "name": "Glass Removal", "time": 30, "base_rev": features["w_gls"] * 0.06},
            {"id": 10, "name": "Interior/Seat Removal", "time": 25, "base_rev": 25},
            {"id": 11, "name": "Hull Shredding/Crushing", "time": 15, "base_rev": features["w_body"] * features["m_steel"]},
        ]
        logger.info(f" Defined {len(actions)} recycling actions")

        # 5. Prepare Data for XGBoost Prediction
        logger.info("Step 6: Preparing data for ML model...")
        prediction_rows = []
        
        for action in actions:
            # Build feature vector 
            row_dict = {
                # Component weights
                'w_cat': features["w_cat"], 'w_eng': features["w_eng"], 'w_trans': features["w_trans"],
                'w_ecu': features["w_ecu"], 'w_whl': features["w_whl"], 'w_pnl': features["w_pnl"],
                'w_cop': features["w_cop"], 'w_gls': features["w_gls"], 'w_seat': features["w_seat"],
                'w_body': features["w_body"],
                # Market prices
                'm_steel': features["m_steel"], 'm_alum': features["m_alum"], 'm_cop': features["m_cop"],
                # Component values & labour cost
                'v_cat': features["v_cat"], 'v_eng': features["v_eng"], 'm_labor': features["m_labor"],
                # Action-specific features
                'act_code': action["id"], 
                'act_time': action["time"], 
                'act_rev': action["base_rev"]
            }
            prediction_rows.append(row_dict)
        
        logger.info(f" Created {len(prediction_rows)} prediction rows")

        # --------- FEATURE MATRIX CONSTRUCTION ---------
        logger.info("Step 7: Building feature matrix...")
        feature_names = [
            'w_cat', 'w_eng', 'w_trans', 'w_ecu', 'w_whl', 'w_pnl', 'w_cop', 'w_gls', 'w_seat', 'w_body',
            'm_steel', 'm_alum', 'm_cop', 'v_cat', 'v_eng', 'm_labor',
            'act_code', 'act_time', 'act_rev'
        ]
        
        # Convert to DataFrame ensuring column order and names
        logger.info("  Converting to DataFrame...")
        df = pd.DataFrame(prediction_rows)
        df = df[feature_names] 
        logger.info(f" Feature matrix ready: {df.shape}")

        # 6. Predict Scores
        logger.info("Step 8: Running XGBoost prediction...")
        # Create DMatrix 
        dmatrix = xgb.DMatrix(df, feature_names=feature_names)
        # Predict profitability scores
        scores = bst.predict(dmatrix)
        logger.info(f" Predictions complete: {len(scores)} scores")

        # ---------- PATHWAY ASSEMBLY & RANKING ----------
        logger.info("Step 9: Assembling optimized pathway...")
        final_pathway = []
        for i, score in enumerate(scores):
            action = actions[i]

            # Calculate net profit (revenue - labor cost) 
            cost = estimate_recovery_cost(action["time"], features["m_labor"])
            profit = action["base_rev"] - cost
            
            final_pathway.append({
                "sequence": 0, 
                "action": action["name"],
                "estimated_time_mins": action["time"],
                "projected_profit": round(profit, 2),
                "model_score": float(score)
            })

        # Sort actions by ML score (highest profitability first)
        final_pathway.sort(key=lambda x: x["model_score"], reverse=True)
        
        # Assign sequence numbers 
        for idx, step in enumerate(final_pathway):
            step["sequence"] = idx + 1
        
        logger.info(f" Pathway assembly complete: {len(final_pathway)} steps")
        logger.info("=" * 60)
        logger.info("PATHWAY GENERATION SUCCESSFUL")
        logger.info("=" * 60)

        # ---------- RETURN OPTIMIZED PATHWAY ----------
        return {
            "vehicle": f"{request.vehicle.year} {request.vehicle.make} {request.vehicle.model}",
            "vehicle_weight_lbs": vehicle_weight,
            "market_prices_used": market_data,
            "pathway": final_pathway
        }

    except Exception as e:
        logger.error("=" * 60)
        logger.error("PATHWAY GENERATION FAILED")
        logger.error("=" * 60)
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        import traceback
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        logger.error("=" * 60)
        raise HTTPException(status_code=500, detail=str(e))