from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
from calculators.ifd_climate_change import run, DELTA_T, NRM_LOSS_RATES

router = APIRouter(prefix="/tools/ifd-climate-change", tags=["ifd-climate-change"])


@router.get("/options")
def get_options():
    return {
        "ssps": list(DELTA_T.keys()),
        "time_periods": list(next(iter(DELTA_T.values())).keys()),
        "nrm_clusters": list(NRM_LOSS_RATES.keys()),
    }


@router.post("/calculate")
async def calculate(
    file: UploadFile = File(...),
    ssp: str = Form(...),
    time_period: str = Form(...),
    delta_t_choice: str = Form("median"),
    nrm_cluster: Optional[str] = Form(None),
    initial_loss: Optional[float] = Form(None),
    continuing_loss: Optional[float] = Form(None),
):
    csv_bytes = await file.read()
    result = run(csv_bytes, ssp, time_period, delta_t_choice, nrm_cluster, initial_loss, continuing_loss)
    return JSONResponse(content=result)
