import logging
import yfinance as yf
from typing import Dict
from config import DEFAULT_MARKET_DATA, TROY_OZ_TO_GRAMS

logger = logging.getLogger(__name__)

# MARKET DATA
# Fetch current commodity futures prices from Yahoo Finance 

def get_live_market_data() -> Dict[str, float]:
    data = DEFAULT_MARKET_DATA.copy()
    try:
        # Copper: COMEX futures, directly in USD/lb.
        copper = yf.Ticker("HG=F").history(period="1d")
        if not copper.empty:
            data["p_copper"] = float(copper["Close"].iloc[-1])

        # Steel HRC: in USD/short ton (1 short ton = 2,000 lbs).
        steel = yf.Ticker("HRC=F").history(period="1d")
        if not steel.empty:
            data["p_steel"] = round(float(steel["Close"].iloc[-1]) / 2000.0, 3)

        # Aluminium (LME): in USD/metric ton (1 tonne = 2,204.62 lbs).
        alum = yf.Ticker("ALI=F").history(period="1d")
        if not alum.empty:
            data["p_alum"] = round(float(alum["Close"].iloc[-1]) / 2204.62, 3)

        # Platinum: convert USD/troy oz to USD/gram.
        platinum = yf.Ticker("PL=F").history(period="1d")
        if not platinum.empty:
            data["pt_per_g"] = round(
                float(platinum["Close"].iloc[-1]) / TROY_OZ_TO_GRAMS, 4
            )

        # Palladium: convert USD/troy oz to USD/gram.
        palladium = yf.Ticker("PA=F").history(period="1d")
        if not palladium.empty:
            data["pd_per_g"] = round(
                float(palladium["Close"].iloc[-1]) / TROY_OZ_TO_GRAMS, 4
            )

        logger.info(f"Market data updated: {data}")
    except Exception as e:
        logger.warning(f"Yahoo Finance fetch failed, using defaults: {e}")
    return data