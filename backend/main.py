from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import equal_area_slope, interpolation, pmp, chat

app = FastAPI(title="Toolbox API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(equal_area_slope.router)
app.include_router(interpolation.router)
app.include_router(pmp.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}
