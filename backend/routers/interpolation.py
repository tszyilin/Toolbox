from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from calculators.interpolation import interpolate

router = APIRouter(prefix="/tools/interpolation", tags=["interpolation"])


class InterpolationRequest(BaseModel):
    known_x: list[float]
    known_y: list[float]
    query_x: list[float]
    method: str = "log_log"


@router.post("/calculate")
async def calculate(req: InterpolationRequest):
    try:
        results = interpolate(req.known_x, req.known_y, req.query_x, req.method)
        return JSONResponse(content={"results": results})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
