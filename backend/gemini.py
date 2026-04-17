import os, logging
from dotenv import load_dotenv
from google import genai

load_dotenv()
logger        = logging.getLogger(__name__)

# GEMINI CLIENT
# Used  by /api/estimate_materials. When GEMINI_API_KEY is absent, the endpoint falls back to rule-based heuristics.

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
gemini_client  = None

if GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("SUCCESS: Gemini API Client initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")
else:
    logger.warning("GEMINI_API_KEY not set. Material estimation will use fallbacks.")