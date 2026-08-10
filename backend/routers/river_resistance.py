from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from calculators.river_resistance import calculate

router = APIRouter(prefix="/tools/river-resistance", tags=["river-resistance"])


class Section(BaseModel):
    name: str = ""
    grain_size_mm: float
    depth_m: float
    slope: float
    width_m: Optional[float] = None


class ResistanceRequest(BaseModel):
    sections: list[Section]


@router.post("/calculate")
async def river_resistance_calculate(req: ResistanceRequest):
    """Bed-form type, Chezy resistance factor and Manning's n per cross-section."""
    if not req.sections:
        raise HTTPException(status_code=422, detail="At least one cross-section is required.")
    results = []
    for i, s in enumerate(req.sections, start=1):
        try:
            r = calculate(s.grain_size_mm, s.depth_m, s.slope, s.width_m)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"{s.name or f'Section {i}'}: {e}")
        r["name"] = s.name or f"Section {i}"
        results.append(r)
    return JSONResponse(content={"results": results})
