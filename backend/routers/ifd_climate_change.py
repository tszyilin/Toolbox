from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from calculators.ifd_climate_change import run, DELTA_T, NRM_LOSS_RATES

router = APIRouter(prefix="/tools/ifd-climate-change", tags=["ifd-climate-change"])


@router.get("/options")
def get_options():
    return {
        "ssps": list(DELTA_T.keys()),
        "time_periods": list(next(iter(DELTA_T.values())).keys()),
    }


@router.post("/calculate")
async def calculate(
    file: UploadFile = File(...),
    ssp: str = Form(...),
    time_period: str = Form(...),
    delta_t_choice: str = Form("median"),
):
    csv_bytes = await file.read()
    result = run(csv_bytes, ssp, time_period, delta_t_choice)
    return JSONResponse(content=result)
