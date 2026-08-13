from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from calculators.pmp import calculate
from calculators.pmp.workbook import build_workbook
from calculators import gsdm_maf, gsdm_duration, gtsmr_zones, gtsmr_grids

router = APIRouter(prefix="/tools/pmp", tags=["pmp"])


@router.get("/maf")
async def moisture_adjustment_factor(
    lat: float = Query(..., description="Catchment centroid latitude, decimal degrees (negative south)"),
    lon: float = Query(..., description="Catchment centroid longitude, decimal degrees"),
):
    """GSDM moisture adjustment factor read off BoM GSDM Figure 3."""
    try:
        result = gsdm_maf.lookup(lat, lon)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    result["source"] = "BoM GSDM Figure 3 (January 2003)"
    return JSONResponse(content=result)


@router.get("/duration")
async def duration_limit(
    lat: float = Query(..., description="Catchment centroid latitude, decimal degrees (negative south)"),
    lon: float = Query(..., description="Catchment centroid longitude, decimal degrees"),
):
    """Maximum GSDM duration read off BoM GSDM Figure 2."""
    try:
        result = gsdm_duration.lookup(lat, lon)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    result["source"] = "BoM GSDM Figure 2 (June 2003)"
    return JSONResponse(content=result)


@router.get("/zones")
async def gtsmr_zone(
    lat: float = Query(..., description="Catchment centroid latitude, decimal degrees (negative south)"),
    lon: float = Query(..., description="Catchment centroid longitude, decimal degrees"),
):
    """GTSMR coastal / inland application zone, read off BoM GSDM Figure 1."""
    try:
        result = gtsmr_zones.lookup(lat, lon)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    result["source"] = "BoM GSDM Figure 1 (June 2003)"
    return JSONResponse(content=result)


@router.get("/gtsmr-factors")
async def gtsmr_factors(
    lat: float = Query(..., description="Catchment centroid latitude, decimal degrees (negative south)"),
    lon: float = Query(..., description="Catchment centroid longitude, decimal degrees"),
):
    """GTSMR catchment factors (EPW, TAF, DAF) from the Bureau's gridded data."""
    try:
        result = gtsmr_grids.lookup(lat, lon)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    result["source"] = "BoM GTSMR CD gridded data (September 2005)"
    return JSONResponse(content=result)


class GsdmParams(BaseModel):
    duration_limit: float
    smooth_fraction: float
    rough_fraction: float
    elevation_factor: float = 1.0
    moisture_factor: float


class GtsmrParams(BaseModel):
    epw_avg_summer: float
    epw_std_summer: float
    epw_avg_winter: float
    epw_std_winter: float
    decay_factor: float
    topographic_factor: float
    zone_summer: str
    zone_winter: str


class GsamParams(BaseModel):
    epw_avg_summer: float
    epw_std_summer: float
    epw_avg_autumn: float
    epw_std_autumn: float
    topographic_factor: float
    zone_summer: str
    zone_autumn: str


class Catchment(BaseModel):
    name: str
    area: float
    gsdm_enabled: bool = False
    gsdm: Optional[GsdmParams] = None
    gtsmr_enabled: bool = False
    gtsmr: Optional[GtsmrParams] = None
    gsam_enabled: bool = False
    gsam: Optional[GsamParams] = None


class PmpRequest(BaseModel):
    catchments: list[Catchment]


@router.post("/calculate")
async def pmp_calculate(req: PmpRequest):
    try:
        payload = [c.model_dump() for c in req.catchments]
        results = calculate(payload)
        return JSONResponse(content={"results": results})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post("/export")
async def pmp_export(req: PmpRequest):
    """Recalculate and return the results as an .xlsx workbook: a summary sheet
    plus the full depth-duration series for every case, one sheet per catchment."""
    try:
        payload = [c.model_dump() for c in req.catchments]
        results = calculate(payload)
        content = build_workbook(results)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": 'attachment; filename="pmp_results.xlsx"'},
    )
