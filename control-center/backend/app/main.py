import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api.v1.router import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ZENOVA Control Center")
    init_db()
    yield
    logger.info("Shutting down ZENOVA Control Center")

app = FastAPI(
    title="ZENOVA Control Center",
    version="1.0.0",
    description="Private admin panel for managing ZENOVA School ERP customers",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/")
def root():
    return {"service": "ZENOVA Control Center", "version": "1.0.0", "status": "operational"}
