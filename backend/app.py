import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import vehicles, pathway, records, settings


# ─────────────────────────────────────────────────────────────────
# CONFIGURATION & LOGGING
# ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


app = FastAPI(title="RecyWise Backend", redirect_slashes=False)

# Cross-Origin Resource Sharing middleware.
# satisfies the data-privacy design goal that the API cannot be called from arbitrary third-party web pages.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://recy-wise-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["*"],
    max_age=600,  # Pre-flight response cache duration in seconds (10 min)
)

# Register all routers
app.include_router(vehicles.router)
app.include_router(pathway.router)
app.include_router(records.router)
app.include_router(settings.router)







