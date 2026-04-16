import logging
from typing import Dict, List, Optional
from config import DEFAULT_MARKET_DATA, TROY_OZ_TO_GRAMS, PGM_RECOVERY_FACTOR

logger = logging.getLogger(__name__)

MANDATORY_NAMES  = {"Safe Depollution", "Airbag Neutralization"}
ALWAYS_LAST_NAME = "Hull Shredding/Crushing"

# ─────────────────────────────────────────────────────────────────
# DYNAMIC v_cat  (PGM-based catalytic converter valuation)
#
# ─────────────────────────────────────────────────────────────────

def _pgm_grams(fuel: str, disp: float, year: int) -> dict:
    """
    Estimate platinum-group metal (PGM) loading in grams for a catalytic converter, based on engine type, displacement, and manufacturing era.

    Parameters
    fuel : str   — Engine fuel type.
    disp : float — Displacement in litres (defaults to 2.0 if unknown).
    year : int   — Model year 
    """
    if fuel == "Diesel":
        # Diesel oxidation catalysts: platinum-rich, palladium-lean.
        pt_per_l, pd_per_l, rh_per_l = 2.8, 0.10, 0.15
    elif fuel == "Hybrid":
        # Hybrid three-way catalysts: higher palladium for cold-start performance.
        pt_per_l, pd_per_l, rh_per_l = 1.0, 2.00, 0.20
    elif fuel == "Electric":
        # Battery-electric vehicles: no exhaust; no catalytic converter.
        return {"pt_g": 0.0, "pd_g": 0.0, "rh_g": 0.0}
    else:
        # Petrol/gasoline three-way catalyst
        pt_per_l, pd_per_l, rh_per_l = 0.8, 3.20, 0.25

    disp = disp if disp > 0 else 2.0   # Default to 2.0 L if NHTSA lookup failed

    era_factor = 1.15 if year >= 2010 else (1.0 if year >= 2000 else 0.75)

    return {
        "pt_g": pt_per_l * disp * era_factor,
        "pd_g": pd_per_l * disp * era_factor,
        "rh_g": rh_per_l * disp * era_factor,
    }

def compute_v_cat_dynamic(fuel: str, disp: float, year: int, market_data: dict) -> float:
    """
    Compute the net catalytic converter recovery value in USD.

    Formula:
        gross = (Pt_g × pt_price) + (Pd_g × pd_price) + (Rh_g × rh_price)
        net   = max(gross × PGM_RECOVERY_FACTOR, 40.0)

    """
    if fuel == "Electric":
        return 0.0

    pgm = _pgm_grams(fuel, disp, year)

    # Rhodium: use a conservative long-run average ($4,500/troy oz) 
    rh_per_g = 4500.0 / TROY_OZ_TO_GRAMS

    gross = (
        pgm["pt_g"] * market_data.get("pt_per_g", DEFAULT_MARKET_DATA["pt_per_g"]) +
        pgm["pd_g"] * market_data.get("pd_per_g", DEFAULT_MARKET_DATA["pd_per_g"]) +
        pgm["rh_g"] * rh_per_g
    )
    net = max(round(gross * PGM_RECOVERY_FACTOR, 2), 40.0)
    logger.info(f"v_cat ({fuel}, {disp:.1f}L, {year}): gross=${gross:.2f} → net=${net:.2f}")
    return net


# ─────────────────────────────────────────────────────────────────
# CONDITION FLAG PROCESSOR
# ─────────────────────────────────────────────────────────────────

def apply_condition_flags(features: dict, flags: dict) -> tuple:
    """
    Apply vehicle intake condition flags to the base feature dictionary.
    """
    f       = features.copy()
    removed = set()
    notes   = []

    # ── Cascade: fire damage implies wiring, glass, and interior damage ──
    body_dmg = flags.get("body_damage", "minor")
    if body_dmg == "fire":
        flags["wiring_condition"] = "burned"
        flags["glass_condition"]  = "smashed"
        flags["interior_present"] = False
        notes.append("Fire damage: interior, glass, wiring destroyed.")

    # ── Cascade: flood damage implies engine seizure, ECU failure, zero battery
    if flags.get("flood_damage", False):
        flags["engine_condition"] = "seized"
        flags["ecu_present"]      = False
        f["v_batt"]               = 0.0
        notes.append("Flood damage: ECUs bricked, battery zeroed, engine seized.")

    # ── Engine condition ──────────────────────────────────────────
    engine_cond = flags.get("engine_condition", "runs")
    if engine_cond == "seized":
        f["v_eng"] = round(f["w_eng"] * f["m_steel"], 2)
        notes.append(f"Engine seized: → scrap (${f['v_eng']:.0f})")
    elif engine_cond == "cranks":
        f["v_eng"] = round(f["v_eng"] * 0.50, 2)
        notes.append(f"Engine cranks: −50% (${f['v_eng']:.0f})")

    # ── Catalytic converter condition ─────────────────────────────
    cat_type = flags.get("cat_type", "oem")
    if cat_type == "missing":
        f["v_cat"] = 0.0
        removed.add(2)   # Tier 2: remove the Catalytic Converter Removal step
        notes.append("Cat absent: step removed")
    elif cat_type == "aftermarket":
        f["v_cat"] = round(f["v_cat"] * 0.15, 2)
        notes.append(f"Aftermarket cat: → ${f['v_cat']:.0f}")

    # ── Transmission presence ─────────────────────────────────────
    if not flags.get("transmission_present", True):
        removed.add(4)
        notes.append("Transmission absent: step removed")

    # ── Turbocharger and DPF add-ons ──────────────────────────────
    if flags.get("turbo_present", False):
        f["v_eng"] = round(f["v_eng"] * 1.20, 2)
        notes.append(f"Turbo: engine +20% (${f['v_eng']:.0f})")
    if flags.get("dpf_present", False):
        f["v_eng"] = round(f["v_eng"] + 200.0, 2)
        notes.append(f"DPF: +$200 (${f['v_eng']:.0f})")

    # ── Battery ───────────────────────────────────────────────────
    if not flags.get("battery_present", True):
        removed.add(7)
        notes.append("Battery absent: step removed")
    if flags.get("hybrid_battery", False):
        f["v_batt"] = 500.0
        notes.append(f"Hybrid HV battery: → ${f['v_batt']:.0f}")

    # ── Wiring harness condition ──────────────────────────────────
    wiring_cond = flags.get("wiring_condition", "intact")
    if wiring_cond == "cut":
        f["w_cop"] = round(f["w_cop"] * 0.40, 3)
        notes.append(f"Wiring cut: copper −60% ({f['w_cop']:.1f} lbs)")
    elif wiring_cond == "burned":
        f["w_cop"] = round(f["w_cop"] * 0.10, 3)
        notes.append(f"Wiring burned: copper −90% ({f['w_cop']:.1f} lbs)")

    # ── AC refrigerant ────────────────────────────────────────────
    if not flags.get("ac_refrigerant_present", True):
        removed.add(8)
        notes.append("AC refrigerant recovered: step removed")

    # ── Body damage on structural weights ─────────────────────────
    if body_dmg == "heavy":
        f["w_pnl"]  = round(f["w_pnl"]  * 0.50, 3)
        f["w_body"] = round(f["w_body"] * 0.75, 3)
        notes.append("Heavy damage: panels −50%, hull −25%")
    elif body_dmg == "fire":
        f["w_pnl"]  = round(f["w_pnl"]  * 0.20, 3)
        f["w_body"] = round(f["w_body"] * 0.60, 3)
        notes.append("Fire: panels −80%, hull −40%")

    # ── Flood damage copper penalty ───────────────────────────────
    if flags.get("flood_damage", False):
        f["w_cop"] = round(f["w_cop"] * 0.30, 3)
        notes.append("Flood: copper −70%")

    # ── Wheel count ───────────────────────────────────────────────
    try:
        wheels = max(0, min(4, int(flags.get("wheels_present", 4))))
    except Exception:
        wheels = 4

    if wheels == 0:
        removed.add(6)   # Tier 2: remove Alloy Wheel Removal step
        f["w_whl"]  = 0.0
        f["v_tyre"] = 0.0
        flags["tyre_condition"] = None
        notes.append("All wheels absent: step removed")
    elif wheels < 4:
        ratio       = wheels / 4
        f["w_whl"]  = round(f["w_whl"]  * ratio, 3)
        f["v_tyre"] = round(f["v_tyre"] * ratio, 3)
        notes.append(f"{4 - wheels} wheel(s) missing: scaled to {wheels}/4")

    # ── Tyre condition ────────────────────────────────────────────
    tyre_cond = flags.get("tyre_condition")
    if tyre_cond == "resaleable" and wheels > 0:
        f["v_tyre"] = round(f["v_tyre"] * 5.0, 3)
        notes.append("Tyres resaleable: ×5")
    elif tyre_cond == "flat":
        f["v_tyre"] = round(f["v_tyre"] * 0.50, 3)
        notes.append("Flat tyres: value halved")

    # ── Glass condition ───────────────────────────────────────────
    glass_cond = flags.get("glass_condition", "intact")
    if glass_cond == "cracked":
        f["w_gls"] = round(f["w_gls"] * 0.50, 3)
        notes.append("Glass cracked: −50%")
    elif glass_cond == "smashed":
        f["w_gls"] = round(f["w_gls"] * 0.15, 3)
        notes.append("Glass smashed: cullet only")

    # ── Interior and ECU presence ─────────────────────────────────
    if not flags.get("interior_present", True):
        removed.add(12)
        notes.append("Interior stripped: step removed")
    if not flags.get("ecu_present", True):
        removed.add(11)
        notes.append("ECU removed: step removed")

    return f, removed, notes


# ─────────────────────────────────────────────────────────────────
# TIME AND LABOUR COST RESOLUTION HELPERS
# ─────────────────────────────────────────────────────────────────

def _resolve_action_time(
    action_id:    int,
    default_time: float,
    custom_times: Optional[Dict[str, float]],
) -> float:
    """
    Determine the technician time (minutes) for one recycling action.
    """
    if custom_times is not None:
        key = str(action_id)   # JSON keys are strings
        if key in custom_times:
            return max(1.0, float(custom_times[key]))
    return float(default_time)


def _resolve_labour_cost(
    resolved_time:  float,
    effective_rate: float,
) -> float:
    """
    Compute the labour cost (USD) for one recycling action.

    Formula: labour_cost = (resolved_time / 60) × effective_rate
    """
    return (resolved_time / 60.0) * effective_rate

# ─────────────────────────────────────────────────────────────────
# ACTION REVENUE HELPER
# ─────────────────────────────────────────────────────────────────

def _action_revenue(action: dict, features: dict) -> float:
    """
    Compute the expected gross revenue (USD) for one recycling action
    applied to one vehicle, using post-condition-flag feature values.

    Revenue type tokens and their formulas:
        fixed         → action["fixed_rev"]         (constant fee)
        v_cat         → features["v_cat"]            (PGM recovery)
        v_eng         → features["v_eng"]            (engine resale/core)
        w_trans_steel → w_trans × m_steel × 0.6     (steel scrap, partial)
        w_cop_cop     → w_cop × m_cop               (copper scrap)
        w_whl_alum    → w_whl × m_alum              (alloy scrap)
        v_batt        → features["v_batt"]           (battery value)
        v_ref         → features["v_ref"]            (refrigerant fee)
        w_rad_alum    → w_rad × m_alum              (radiator scrap)
        w_pnl_steel   → w_pnl × m_steel             (panel scrap)
        v_tyre_4      → v_tyre × 4                  (per-wheel × 4)
        w_gls_gls     → w_gls × m_gls              (glass cullet)
        w_body_steel  → w_body × m_steel             (hull scrap)

    """
    t = action["rev_type"]
    if t == "fixed":         return float(action["fixed_rev"])
    if t == "v_cat":         return features["v_cat"]
    if t == "v_eng":         return features["v_eng"]
    if t == "w_trans_steel": return features["w_trans"] * features["m_steel"] * 0.6
    if t == "w_cop_cop":     return features["w_cop"]   * features["m_cop"]
    if t == "w_whl_alum":    return features["w_whl"]   * features["m_alum"]
    if t == "v_batt":        return features["v_batt"]
    if t == "v_ref":         return features["v_ref"]
    if t == "w_rad_alum":    return features["w_rad"]   * features["m_alum"]
    if t == "w_pnl_steel":   return features["w_pnl"]   * features["m_steel"]
    if t == "v_tyre_4":      return features["v_tyre"]  * 4
    if t == "w_gls_gls":     return features["w_gls"]   * features["m_gls"]
    if t == "w_body_steel":  return features["w_body"]  * features["m_steel"]
    return 0.0


# ─────────────────────────────────────────────────────────────────
# EXPLANATION GENERATOR
# ─────────────────────────────────────────────────────────────────

# Steps that are legal/safety requirements and must always come first.
MANDATORY_NAMES  = {"Safe Depollution", "Airbag Neutralization"}
# Step that must always be performed last.
ALWAYS_LAST_NAME = "Hull Shredding/Crushing"


def build_explanation(
    action:        dict,
    features:      dict,
    market_data:   dict,
    profit:        float,
    rank:          int,
    total_steps:   int,
    flags:         Optional[dict] = None,
    resolved_time: Optional[float] = None,
) -> str:
    """
    Generate a plain-language explanation for why an action
    was assigned its specific rank in the recycling pathway.
    """
    name  = action["name"]
    flags = flags or {}

    # Use the resolved (operator-configured) time where available;
    # fall back to the ALL_ACTIONS default for backward compatibility.
    mins = resolved_time if resolved_time is not None else float(action["time"])

    p_copper = market_data.get("p_copper", DEFAULT_MARKET_DATA["p_copper"])
    p_steel  = market_data.get("p_steel",  DEFAULT_MARKET_DATA["p_steel"])
    p_alum   = market_data.get("p_alum",   DEFAULT_MARKET_DATA["p_alum"])

    lines    = []
    reasons  = []
    limiting = []

    # ── Part 1: WHEN ─────────────────────────────────────────────
    if name in MANDATORY_NAMES:
        lines.append(
            "Do this before anything else, it is a legal safety requirement "
            "and must be completed before any parts can be stripped."
        )
    elif name == ALWAYS_LAST_NAME:
        lines.append(
            f"Do this last (step {rank} of {total_steps}). "
            "The hull can only be crushed once everything else has been removed."
        )
    elif rank == 1:  lines.append("Top priority, do this first.")
    elif rank <= 3:  lines.append(f"High priority, do this early (step {rank} of {total_steps}).")
    elif rank <= 6:  lines.append(f"Do this in the first half of the job (step {rank} of {total_steps}).")
    elif rank <= 9:  lines.append(f"Do this in the second half of the job (step {rank} of {total_steps}).")
    else:            lines.append(f"Do this near the end (step {rank} of {total_steps}).")

    # ── Part 2: EARNINGS ─────────────────────────────────────────
    if name not in MANDATORY_NAMES:
        if profit >= 0:
            lines.append(f"Estimated return: ${profit:.0f} after labour.")
        else:
            lines.append(
                f"Estimated loss: ${abs(profit):.0f} after labour. "
                "Only worth doing if the part can be sold whole."
            )

    # ── Part 3: action-specific WHY/NOTE ─────────────────────────
    v_cat   = features.get("v_cat",  0)
    v_eng   = features.get("v_eng",  0)
    v_batt  = features.get("v_batt", 0)
    v_tyre  = features.get("v_tyre", 0)
    w_cop   = features.get("w_cop",  0)
    w_eng   = features.get("w_eng",  0)
    w_pnl   = features.get("w_pnl",  0)
    w_whl   = features.get("w_whl",  0)
    w_gls   = features.get("w_gls",  0)
    w_body  = features.get("w_body", 0)
    w_seat  = features.get("w_seat", 0)
    w_rad   = features.get("w_rad",  0)
    w_trans = features.get("w_trans",0)

    if name == "Catalytic Converter Removal":
        if flags.get("cat_type") == "aftermarket":
            limiting.append("aftermarket cat with minimal PGM content")
        elif v_cat >= 400: reasons.append("carries high-value platinum-group metals")
        elif v_cat >= 150: reasons.append("contains recoverable platinum-group metals")
        if mins <= 20:     reasons.append("quick job relative to its earnings")
    elif name == "Engine Assembly Removal":
        if flags.get("engine_condition") == "seized":
            limiting.append("engine is seized. Only steel scrap applies")
        elif v_eng >= 350: reasons.append("strong resale or part-out potential")
        if w_eng < 300:    limiting.append("relatively small, light engine")
        if mins >= 60:     limiting.append("most time-consuming step on the job")
    elif name == "Copper Wiring Harvest":
        wc = flags.get("wiring_condition", "intact")
        if wc in ("cut", "burned"):
            limiting.append(f"wiring is {wc}, recovery significantly reduced")
        elif p_copper >= 4.0: reasons.append("copper prices are very strong right now")
        elif p_copper >= 3.5: reasons.append("copper prices are solid")
        else:                 limiting.append("copper prices are on the lower side")
        if w_cop >= 100:   reasons.append("large copper harness on this vehicle")
        elif w_cop < 40:   limiting.append("limited copper content after condition adjustment")
        if mins >= 45:     limiting.append("labour-intensive step")
    elif name == "Alloy Wheel Removal":
        wp = flags.get("wheels_present", 4)
        if isinstance(wp, int) and wp < 4:
            limiting.append(f"only {wp} of 4 wheels present")
        elif p_alum >= 1.0: reasons.append("aluminium prices are good right now")
        else:               limiting.append("soft aluminium prices")
        if w_whl >= 150:   reasons.append("substantial alloy wheels on this vehicle")
        elif w_whl < 60:   limiting.append("limited wheel material to recover")
    elif name == "Battery/12V Removal":
        if flags.get("hybrid_battery", False):
            reasons.append("high-voltage hybrid battery with significant value")
        elif v_batt >= 20: reasons.append("good battery scrap value")
        if mins <= 15:     reasons.append("quick, low-effort step")
    elif name == "AC Refrigerant Recovery":
        reasons.append("refrigerant capture is legally required")
        if mins <= 20: reasons.append("quick step with a fixed recovery fee")
    elif name == "Radiator Removal":
        if w_rad >= 60:   reasons.append("sizeable aluminium radiator on this vehicle")
        if p_alum >= 1.0: reasons.append("aluminium prices support this recovery")
        else:             limiting.append("soft aluminium prices reduce radiator value")
    elif name == "Transmission Removal":
        if w_trans >= 150: reasons.append("heavy transmission with good scrap weight")
        elif w_trans < 100: limiting.append("light transmission on this vehicle")
        if mins >= 45:     limiting.append("takes significant time")
    elif name == "Body Panel Removal":
        if flags.get("body_damage") in ("heavy", "fire"):
            limiting.append("body damage has reduced panel recovery value")
        elif p_steel >= 0.22: reasons.append("steel prices are solid right now")
        else:                 limiting.append("steel prices are on the lower side")
        if w_pnl >= 150:   reasons.append("large amount of body panelling on this vehicle")
        elif w_pnl < 80:   limiting.append("limited panel material")
    elif name == "ECU/Electronics Harvest":
        if mins <= 15:               reasons.append("quick step")
        if features.get("w_ecu", 0) >= 3: reasons.append("good electronics content on this vehicle")
        else:                        limiting.append("limited electronics content")
    elif name == "Interior/Seat Removal":
        if w_seat >= 180:  reasons.append("substantial interior worth stripping")
        elif w_seat < 120: limiting.append("limited interior material")
    elif name == "Tyre Removal":
        tc = flags.get("tyre_condition", "worn")
        if tc == "resaleable":  reasons.append("tyres have usable tread, resale not just scrap")
        elif tc == "flat":      limiting.append("flat or damaged tyres reduce value")
        if v_tyre >= 30:        reasons.append("high tyre value at current rates")
    elif name == "Glass Removal":
        gc = flags.get("glass_condition", "intact")
        if gc == "smashed":    limiting.append("smashed glass, only low-value cullet recoverable")
        elif gc == "cracked":  limiting.append("cracked glass reduces recovery value")
        elif w_gls >= 120:     reasons.append("good amount of glass on this vehicle")
        else:                  limiting.append("glass scrap value rarely covers labour costs")
    elif name == "Hull Shredding/Crushing":
        if flags.get("body_damage") == "fire":
            limiting.append("fire damage reduced hull steel weight")
        elif p_steel >= 0.22:  reasons.append("solid steel prices, stripped shell has good scrap value")
        else:                  limiting.append("weak steel prices reduce hull scrap value")
        if w_body >= 1000:     reasons.append("large amount of steel in the body shell")
        elif w_body < 500:     limiting.append("not much hull steel remaining after stripping")
    elif name == "Safe Depollution":
        limiting.append("costs more in labour than it earns, but cannot be skipped")
    elif name == "Airbag Neutralization":
        if flags.get("airbags_deployed", False):
            reasons.append(
                "airbags already deployed, verification only, "
                "quicker than full neutralisation"
            )
        else:
            limiting.append("undeployed airbags are an explosion hazard, non-negotiable")

    if reasons:  lines.append(f"Why: {' and '.join(reasons[:2])}.")
    if limiting: lines.append(f"Note: {limiting[0]}.")

    return " ".join(lines)