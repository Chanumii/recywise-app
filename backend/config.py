import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

from typing import Dict
DEFAULT_MARKET_DATA: Dict[str, float] = {
    "p_steel": 0.25,    # USD per lb  - structural steel scrap
    "p_alum": 1.10,    # USD per lb  - aluminium scrap
    "p_copper": 3.80,    # USD per lb  - bare bright copper
    "p_glass": 0.06,    # USD per lb  -flat glass cullet
    "p_plastic": 0.12,    # USD per lb - mixed plastics scrap
    "p_rubber": 0.45,    # USD per lb  - natural rubber crumb
    "labor_rate": 32.50,   # USD per hr  - baseline technician rate
    "pt_per_g": 0.0315,  # USD per g  - platinum
    "pd_per_g": 0.0338,  # USD per g  - palladium 
}

DEFAULT_VEHICLE_WEIGHT: float = 3500.0   # lbs - NHTSA lookup fallback
TROY_OZ_TO_GRAMS: float = 31.1035  # Exact troy ounce to gram conversion
PGM_RECOVERY_FACTOR: float = 0.85     # Fraction of gross PGM value recoverable

# Default action duration in minutes, keyed by integer action ID (0-15).

DEFAULT_ACTION_TIMES: Dict[int, float] = {
    0: 40.0,   # Safe Depollution        - 40 min default
    1: 20.0,   # Airbag Neutralization     - 20 min default
    2: 15.0,   # Catalytic Converter       - 15 min default
    3: 60.0,   # Engine Assembly Removal   - 60 min default
    4: 45.0,   # Transmission Removal      - 45 min default
    5: 45.0,   # Copper Wiring Harvest     - 45 min default
    6: 20.0,   # Alloy Wheel Removal       - 20 min default
    7: 15.0,   # Battery/12V Removal       - 15 min default
    8: 20.0,   # AC Refrigerant Recovery   - 20 min default
    9: 20.0,   # Radiator Removal          - 20 min default
    10: 40.0,   # Body Panel Removal        - 40 min default
    11: 10.0,   # ECU/Electronics Harvest   - 10 min default
    12: 25.0,   # Interior/Seat Removal     - 25 min default
    13: 20.0,   # Tyre Removal              - 20 min default
    14: 30.0,   # Glass Removal             - 30 min default
    15: 15.0,   # Hull Shredding/Crushing   - 15 min default
}
