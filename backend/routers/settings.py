from fastapi import APIRouter, HTTPException
from config import DEFAULT_MARKET_DATA, DEFAULT_ACTION_TIMES
from ml_model import bst

router = APIRouter()

# ─────────────────────────────────────────────────────────────────
# ENDPOINT: DEFAULT SETTINGS
# ─────────────────────────────────────────────────────────────────

@router.get("/api/default_settings")
def get_default_settings():
    """
    Return the server-side defaults for the Settings panel.
    """
    return {
        "labour_rate":  DEFAULT_MARKET_DATA["labor_rate"],
        "action_times": DEFAULT_ACTION_TIMES,
    }


# ─────────────────────────────────────────────────────────────────
# ENDPOINT: FEATURE IMPORTANCE
# ─────────────────────────────────────────────────────────────────

@router.get("/api/model/feature_importance")
def feature_importance():
    """
    Return XGBoost feature importance scores (by gain) sorted descending.
    Gain = average improvement in the objective per feature split (Chen & Guestrin, 2016).
    """
    try:
        scores = bst.get_score(importance_type="gain")
        return dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


