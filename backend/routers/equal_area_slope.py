import os
import shutil
import tempfile

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from calculators.equal_area_slope import run

router = APIRouter(prefix="/tools/equal-area-slope", tags=["equal-area-slope"])


@router.post("/calculate")
async def calculate(
    file: UploadFile = File(...),
    lines_id_col: str = Form(...),
    elev_col: str = Form(...),
    dist_col: str = Form(...),
):
    csv_bytes = await file.read()
    results = run(csv_bytes, lines_id_col, elev_col, dist_col)
    return JSONResponse(content={"results": results})


async def _stage(folder: str, uploads: list[UploadFile]) -> None:
    """Write uploads into `folder` under their own names.

    A shapefile is only readable alongside its sidecars, so the basenames have
    to be preserved rather than using temp names.
    """
    for upload in uploads:
        name = os.path.basename(upload.filename or "")
        if not name:
            continue
        with open(os.path.join(folder, name), "wb") as fh:
            shutil.copyfileobj(upload.file, fh)


@router.post("/fields")
async def shapefile_fields(files: list[UploadFile] = File(...)):
    """Attribute field names of an uploaded shapefile, for the ID dropdown."""
    from calculators.equal_area_slope import dem

    folder = tempfile.mkdtemp(prefix="eas_fields_")
    try:
        await _stage(folder, files)
        shapefile_path = dem.find_shapefile(folder)
        return JSONResponse(content={"fields": dem.list_fields(shapefile_path)})
    except dem.InputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read the shapefile: {e}")
    finally:
        shutil.rmtree(folder, ignore_errors=True)


@router.post("/dem")
async def calculate_from_dem(
    shapefile: list[UploadFile] = File(..., description=".shp plus sidecars, or a .zip"),
    raster: UploadFile = File(..., description="DEM raster (GeoTIFF)"),
    id_header: str = Form(""),
    interval: float = Form(10.0),
):
    """Equal area slope for each stream line, sampled off a DEM."""
    from calculators.equal_area_slope import dem

    folder = tempfile.mkdtemp(prefix="eas_dem_")
    try:
        await _stage(folder, shapefile)
        shapefile_path = dem.find_shapefile(folder)

        raster_path = os.path.join(folder, "dem_" + os.path.basename(raster.filename or "raster.tif"))
        with open(raster_path, "wb") as fh:
            shutil.copyfileobj(raster.file, fh)

        payload = dem.run(shapefile_path, raster_path, id_header, interval)
        return JSONResponse(content=payload)
    except dem.InputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        shutil.rmtree(folder, ignore_errors=True)
