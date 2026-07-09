from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import equal_area_slope, ifd_climate_change, loss_climate_change, chat

app = FastAPI(title="Toolbox API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # add Railway frontend URL here later
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(equal_area_slope.router)
app.include_router(ifd_climate_change.router)
app.include_router(loss_climate_change.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}
