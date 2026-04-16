from fastapi import APIRouter, HTTPException
import pandas as pd, xgboost as xgb, logging
from models import PathwayRequest
from config import DEFAULT_MARKET_DATA, DEFAULT_VEHICLE_WEIGHT
from ml_model import bst, FEATURE_COLS, ALL_ACTIONS
from market_data import get_live_market_data
from vehicle_data import get_vehicle_weight, get_engine_info
from pathway_engine import (
    compute_v_cat_dynamic, apply_condition_flags,
    _resolve_action_time, _resolve_labour_cost,
    _action_revenue, build_explanation
)

logger    = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────
# ENDPOINT: GENERATE RECYCLING PATHWAY
# ─────────────────────────────────────────────────────────────────

@router.post("/api/generate_pathway")
def generate_pathway(request: PathwayRequest):
    """
    Produce a ranked recycling pathway for one vehicle.
    """
    vehicle_weight = DEFAULT_VEHICLE_WEIGHT

    try:
        logger.info("=" * 60)
        logger.info(
            f"PATHWAY: {request.vehicle.year} "
            f"{request.vehicle.make} {request.vehicle.model}"
        )
        if request.custom_labour_rate is not None:
            logger.info(f"Custom labour rate supplied: ${request.custom_labour_rate:.2f}/hr")
        if request.custom_action_times:
            logger.info(
                f"Custom action times supplied for "
                f"{len(request.custom_action_times)} step(s)"
            )
        logger.info("=" * 60)

        # ── Phase 1: Validate vehicle identification ──────────────
        if not (
            request.vehicle.year  and request.vehicle.year.strip()  and
            request.vehicle.make  and request.vehicle.make.strip()  and
            request.vehicle.model and request.vehicle.model.strip()
        ):
            raise HTTPException(
                status_code=400,
                detail={"error": "Vehicle year, make, and model are required."},
            )

        # ── Phase 2: Fetch live commodity prices ──────────────────
        market_data = get_live_market_data()

        # ── Phase 3: Resolve effective hourly labour rate ─────────
        # The custom rate takes precedence when it is positive.
        # Non-positive values (e.g., 0.0, -1.0) are treated as absent.
        if (
            request.custom_labour_rate is not None
            and request.custom_labour_rate > 0.0
        ):
            effective_rate = float(request.custom_labour_rate)
            logger.info(f"Effective rate: ${effective_rate:.2f}/hr (custom)")
        else:
            effective_rate = market_data["labor_rate"]
            logger.info(f"Effective rate: ${effective_rate:.2f}/hr (market default)")

        # ── Phase 4: Retrieve curb weight ─────────────────────────
        try:
            vehicle_weight = get_vehicle_weight(
                str(request.vehicle.year),
                str(request.vehicle.make),
                str(request.vehicle.model),
            )
        except Exception as e:
            logger.error(f"Weight lookup failed: {e}. Using default.")

        # ── Phase 5: Engine info and PGM catalyst valuation ───────
        materials = request.materials or {}
        w_steel   = vehicle_weight * (materials.get("Steel",    60) / 100)
        w_alum    = vehicle_weight * (materials.get("Aluminum", 10) / 100)
        w_copper  = vehicle_weight * (materials.get("Copper",    2) / 100)
        w_glass   = vehicle_weight * (materials.get("Glass",     3) / 100)

        engine_info = get_engine_info(
            str(request.vehicle.year),
            str(request.vehicle.make),
            str(request.vehicle.model),
        )
        v_cat_value = compute_v_cat_dynamic(
            fuel        = engine_info["fuel_type"],
            disp        = engine_info["displacement_liters"],
            year        = int(request.vehicle.year),
            market_data = market_data,
        )

        # ── Phase 6: Assemble base feature dictionary ─────────────
        disp = engine_info["displacement_liters"]
        features = {
            "w_cat":  max(2.0, vehicle_weight * 0.0014 * max(disp / 2.0, 0.5)),
            "w_eng":  vehicle_weight * 0.15,
            "w_trans":vehicle_weight * 0.05,
            "w_ecu":  max(1.5, 2.0 + max(0, int(request.vehicle.year) - 2000) * 0.05),
            "w_whl":  w_alum  * 0.50,
            "w_pnl":  w_steel * 0.20,
            "w_cop":  w_copper,
            "w_gls":  w_glass,
            "w_seat": vehicle_weight * 0.05,
            "w_body": w_steel * 0.70,
            "w_rad":  vehicle_weight * 0.02,
            "m_steel": market_data["p_steel"],
            "m_alum":  market_data["p_alum"],
            "m_cop":   market_data["p_copper"],
            "m_labor": market_data["labor_rate"],   # market default kept for training consistency
            "m_gls":   market_data.get("p_glass", 0.06),
            "v_cat":  v_cat_value,
            "v_eng":  max(150.0, disp * 120) if engine_info["fuel_type"] != "Electric" else 0.0,
            "v_ref":  18.0,
            "v_batt": 22.0,
            "v_tyre": 6.0,
        }

        # ── Phase 7: Apply condition flags ────────────────────────
        flags           = request.condition_flags or {}
        removed_ids     = set()
        condition_notes = []
        if flags:
            features, removed_ids, condition_notes = apply_condition_flags(features, flags)
            for note in condition_notes:
                logger.info(f"  Flag: {note}")

        # ── Phase 8: Filter to active actions ─────────────────────
        active_actions = [a for a in ALL_ACTIONS if a["id"] not in removed_ids]
        logger.info(f"Active actions: {len(active_actions)} ({len(removed_ids)} removed)")

        # ── Phase 9: Build per-action feature matrix ──────────────
        rows = []
        for a in active_actions:
            # Step (a): Resolve operator-configured duration.
            resolved_time = _resolve_action_time(
                action_id    = a["id"],
                default_time = a["time"],
                custom_times = request.custom_action_times,
            )

            # Step (b): Compute labour cost from resolved time × effective rate.
            labour_cost = _resolve_labour_cost(
                resolved_time  = resolved_time,
                effective_rate = effective_rate,
            )

            # Step (c): Revenue and derived economic signals.
            rev    = _action_revenue(a, features)
            profit = rev - labour_cost
            roi    = rev / max(labour_cost, 0.01)  # guard division by zero
            rpm    = rev / resolved_time            # revenue per resolved minute

            rows.append({
                "w_cat":  round(features["w_cat"],  3),
                "w_eng":  round(features["w_eng"],  3),
                "w_trans":round(features["w_trans"],3),
                "w_ecu":  round(features["w_ecu"],  3),
                "w_whl":  round(features["w_whl"],  3),
                "w_pnl":  round(features["w_pnl"],  3),
                "w_cop":  round(features["w_cop"],  3),
                "w_gls":  round(features["w_gls"],  3),
                "w_seat": round(features["w_seat"], 3),
                "w_body": round(features["w_body"], 3),
                "w_rad":  round(features["w_rad"],  3),
                "m_steel": features["m_steel"],
                "m_alum":  features["m_alum"],
                "m_cop":   features["m_cop"],
                "m_labor": features["m_labor"],
                "m_gls":   features["m_gls"],
                "v_cat":  round(features["v_cat"],  3),
                "v_eng":  round(features["v_eng"],  3),
                "v_ref":  round(features["v_ref"],  3),
                "v_batt": round(features["v_batt"], 3),
                "v_tyre": round(features["v_tyre"], 3),
                # All six economic signals derived from resolved time and rate:
                "act_time":         resolved_time,             # operator-configured duration
                "act_labour_cost":  round(labour_cost, 4),
                "act_revenue":      round(rev,         4),
                "act_profit":       round(profit,      4),
                "act_roi":          round(roi,         4),
                "act_rev_per_min":  round(rpm,         4),     # rev / resolved time
                "is_mandatory": a["is_mandatory"],
                "is_last":      a["is_last"],
            })

        # ── Phase 10: Score with XGBoost LambdaRank ───────────────
        df         = pd.DataFrame(rows)[FEATURE_COLS]
        null_count = df.isnull().sum().sum()
        if null_count > 0:
            null_cols = df.isnull().sum()[df.isnull().sum() > 0].to_dict()
            raise HTTPException(
                status_code=500,
                detail=f"Feature matrix NaN detected: {null_cols}",
            )
        dmatrix = xgb.DMatrix(df, feature_names=FEATURE_COLS)
        scores  = bst.predict(dmatrix)

        # ── Phase 11: Reconstruct scored steps ────────────────────
        scored = []
        for i, score in enumerate(scores):
            a = active_actions[i]
            resolved_time = _resolve_action_time(
                action_id    = a["id"],
                default_time = a["time"],
                custom_times = request.custom_action_times,
            )
            labour_cost = _resolve_labour_cost(
                resolved_time  = resolved_time,
                effective_rate = effective_rate,
            )
            rev = _action_revenue(a, features)
            scored.append({
                "action":              a["name"],
                "estimated_time_mins": resolved_time,         # operator-configured
                "projected_profit":    round(rev - labour_cost, 2),
                "model_score":         float(score),
                "_action_ref":         a,                     # removed before return
                "_resolved_time":      resolved_time,         # passed to explanation
            })

        # ── Phase 12: Enforce hard ordering constraints ────────────
        mandatory_steps = [s for s in scored if s["_action_ref"]["is_mandatory"]]
        last_steps      = [s for s in scored if s["_action_ref"]["is_last"]]
        variable_steps  = sorted(
            [
                s for s in scored
                if not s["_action_ref"]["is_mandatory"]
                and not s["_action_ref"]["is_last"]
            ],
            key     = lambda x: x["model_score"],
            reverse = True,
        )
        final_pathway = mandatory_steps + variable_steps + last_steps
        total_steps   = len(final_pathway)

        # ── Phase 13: Attach explanations and clean internal fields ─
        for idx, step in enumerate(final_pathway):
            step["sequence"] = idx + 1
            step["explanation"] = build_explanation(
                action        = step["_action_ref"],
                features      = features,
                market_data   = market_data,
                profit        = step["projected_profit"],
                rank          = idx + 1,
                total_steps   = total_steps,
                flags         = flags,
                resolved_time = step["_resolved_time"],  # pass operator duration
            )
            del step["_action_ref"]     
            del step["_resolved_time"]   

        logger.info("PATHWAY GENERATION SUCCESSFUL")

        # ── Phase 14: Return pathway and metadata ──────────────────
        return {
            "vehicle":              (
                f"{request.vehicle.year} "
                f"{request.vehicle.make} "
                f"{request.vehicle.model}"
            ),
            "vehicle_weight_lbs":   vehicle_weight,
            "market_prices_used":   market_data,
            "engine_info":          engine_info,
            "v_cat_computed":       round(v_cat_value, 2),
            # Echo effective_rate for operator audit: confirms which rate was applied.
            "effective_labour_rate": round(effective_rate, 2),
            "condition_notes":      condition_notes,
            "steps_removed":        len(removed_ids),
            "pathway":              final_pathway,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PATHWAY FAILED: {type(e).__name__} — {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
