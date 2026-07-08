from fastapi import APIRouter, UploadFile, File, Form
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
