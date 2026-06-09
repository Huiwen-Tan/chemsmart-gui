from fastapi import FastAPI

from chemsmart_gui.api.documents import router as documents_router
from chemsmart_gui.api.health import router as health_router

app = FastAPI(title="CHEMSMART GUI Backend", version="0.1.0")
app.include_router(health_router)
app.include_router(documents_router)
