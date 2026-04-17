// CONSTANTS & UTILS

export const API_BASE_URL = "http://localhost:8000";

// Default condition flags mirroring the backend Pydantic model
export const DEFAULT_FLAGS = {
  engine_condition:       'runs',
  cat_type:               'oem',
  transmission_present:   true,
  turbo_present:          false,
  dpf_present:            false,
  battery_present:        true,
  hybrid_battery:         false,
  wiring_condition:       'intact',
  ac_refrigerant_present: true,
  fuel_in_tank:           false,
  airbags_deployed:       false,
  body_damage:            'minor',
  flood_damage:           false,
  wheels_present:         4,
  tyre_condition:         'worn',
  glass_condition:        'intact',
  interior_present:       true,
  ecu_present:            true,
};

/**
 * Metadata for the 16 recycling actions.
 */
export const ACTIONS_META = [
  { id: 0, name: "Safe Depollution", defaultTime: 40 },
  { id: 1, name: "Airbag Neutralization", defaultTime: 20 },
  { id: 2, name: "Catalytic Converter Removal", defaultTime: 15 },
  { id: 3, name: "Engine Assembly Removal", defaultTime: 60 },
  { id: 4, name: "Transmission Removal", defaultTime: 45 },
  { id: 5, name: "Copper Wiring Harvest", defaultTime: 45 },
  { id: 6, name: "Alloy Wheel Removal", defaultTime: 20 },
  { id: 7, name: "Battery/12V Removal", defaultTime: 15 },
  { id: 8, name: "AC Refrigerant Recovery", defaultTime: 20 },
  { id: 9, name: "Radiator Removal", defaultTime: 20 },
  { id: 10, name: "Body Panel Removal", defaultTime: 40 },
  { id: 11, name: "ECU/Electronics Harvest", defaultTime: 10 },
  { id: 12, name: "Interior/Seat Removal", defaultTime: 25 },
  { id: 13, name: "Tyre Removal", defaultTime: 20 },
  { id: 14, name: "Glass Removal", defaultTime: 30 },
  { id: 15, name: "Hull Shredding/Crushing", defaultTime: 15 },
];

/**
 * Utility to get current local date in YYYY-MM-DD format for filtering records.
 */
export const getLocalDateStr = () => {
  const d   = new Date();
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
