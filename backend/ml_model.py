import os
import logging
import xgboost as xgb
from typing import Dict, List
from config import BASE_DIR

# ─────────────────────────────────────────────────────────────────
# MODEL LOADING
# ─────────────────────────────────────────────────────────────────

logger    = logging.getLogger(__name__)
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "recywise_model.json")

bst = xgb.Booster()

try:
    if os.path.exists(MODEL_PATH):
        bst.load_model(MODEL_PATH)
        logger.info(f"SUCCESS: Model loaded from: {MODEL_PATH}")
    else:
        logger.error(f"ERROR: Model file not found at: {MODEL_PATH}")
except Exception as e:
    logger.error(f"Failed to load XGBoost model: {e}")

# ─────────────────────────────────────────────────────────────────
# MODEL FEATURE LIST  (29 features)
#
# The column order is fixed by the training pipeline.  
# Using pd.DataFrame(rows)[FEATURE_COLS] at inference time guarantees the DMatrix column order matches training.
# ─────────────────────────────────────────────────────────────────

FEATURE_COLS: List[str] = [
    # Component weights (lbs) — 11 features
    "w_cat",  "w_eng",  "w_trans", "w_ecu",  "w_whl",  "w_pnl",
    "w_cop",  "w_gls",  "w_seat",  "w_body", "w_rad",
    # Market / commodity prices — 5 features
    "m_steel", "m_alum", "m_cop", "m_labor", "m_gls",
    # Part resale / recovery values (USD) — 5 features
    "v_cat",  "v_eng",  "v_ref",  "v_batt", "v_tyre",
    # Per-action economic signals — 6 features
    "act_time", "act_labour_cost", "act_revenue",
    "act_profit", "act_roi", "act_rev_per_min",
    # Structural ordering flags — 2 features
    "is_mandatory", "is_last",
]


# ─────────────────────────────────────────────────────────────────
# 16 RECYCLING ACTIONS
# ─────────────────────────────────────────────────────────────────

ALL_ACTIONS: List[Dict] = [
    {"id":  0, "name": "Safe Depollution",
     "time": 40, "is_mandatory": 1, "is_last": 0,
     "rev_type": "fixed",        "fixed_rev": 15},
    {"id":  1, "name": "Airbag Neutralization",
     "time": 20, "is_mandatory": 1, "is_last": 0,
     "rev_type": "fixed",        "fixed_rev": 5},
    {"id":  2, "name": "Catalytic Converter Removal",
     "time": 15, "is_mandatory": 0, "is_last": 0,
     "rev_type": "v_cat",        "fixed_rev": None},
    {"id":  3, "name": "Engine Assembly Removal",
     "time": 60, "is_mandatory": 0, "is_last": 0,
     "rev_type": "v_eng",        "fixed_rev": None},
    {"id":  4, "name": "Transmission Removal",
     "time": 45, "is_mandatory": 0, "is_last": 0,
     "rev_type": "w_trans_steel","fixed_rev": None},
    {"id":  5, "name": "Copper Wiring Harvest",
     "time": 45, "is_mandatory": 0, "is_last": 0,
     "rev_type": "w_cop_cop",   "fixed_rev": None},
    {"id":  6, "name": "Alloy Wheel Removal",
     "time": 20, "is_mandatory": 0, "is_last": 0,
     "rev_type": "w_whl_alum",  "fixed_rev": None},
    {"id":  7, "name": "Battery/12V Removal",
     "time": 15, "is_mandatory": 0, "is_last": 0,
     "rev_type": "v_batt",      "fixed_rev": None},
    {"id":  8, "name": "AC Refrigerant Recovery",
     "time": 20, "is_mandatory": 0, "is_last": 0,
     "rev_type": "v_ref",       "fixed_rev": None},
    {"id":  9, "name": "Radiator Removal",
     "time": 20, "is_mandatory": 0, "is_last": 0,
     "rev_type": "w_rad_alum",  "fixed_rev": None},
    {"id": 10, "name": "Body Panel Removal",
     "time": 40, "is_mandatory": 0, "is_last": 0,
     "rev_type": "w_pnl_steel", "fixed_rev": None},
    {"id": 11, "name": "ECU/Electronics Harvest",
     "time": 10, "is_mandatory": 0, "is_last": 0,
     "rev_type": "fixed",       "fixed_rev": 50},
    {"id": 12, "name": "Interior/Seat Removal",
     "time": 25, "is_mandatory": 0, "is_last": 0,
     "rev_type": "fixed",       "fixed_rev": 25},
    {"id": 13, "name": "Tyre Removal",
     "time": 20, "is_mandatory": 0, "is_last": 0,
     "rev_type": "v_tyre_4",    "fixed_rev": None},
    {"id": 14, "name": "Glass Removal",
     "time": 30, "is_mandatory": 0, "is_last": 0,
     "rev_type": "w_gls_gls",   "fixed_rev": None},
    {"id": 15, "name": "Hull Shredding/Crushing",
     "time": 15, "is_mandatory": 0, "is_last": 1,
     "rev_type": "w_body_steel","fixed_rev": None},
]