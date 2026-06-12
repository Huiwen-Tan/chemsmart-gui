from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from chemsmart_gui.api.documents import router as documents_router
from chemsmart_gui.api.health import router as health_router

app = FastAPI(title="CHEMSMART GUI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(health_router)
app.include_router(documents_router)
