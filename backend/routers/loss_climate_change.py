from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from calculators.loss_climate_change import run
from calculators.ifd_climate_change import DELTA_T, NRM_LOSS_RATES

router = APIRouter(prefix="/tools/loss-climate-change", tags=["loss-climate-change"])


@router.get("/options")
def get_options():
    return {
        "ssps": list(DELTA_T.keys()),
        "time_periods": list(next(iter(DELTA_T.values())).keys()),
        "nrm_clusters": list(NRM_LOSS_RATES.keys()),
    }


class LossInput(BaseModel):
    ssp: str
    time_period: str
    delta_t_choice: str = "median"
    nrm_cluster: str
    initial_loss: Optional[float] = None
    continuing_loss: Optional[float] = None


@router.post("/calculate")
def calculate(data: LossInput):
    result = run(
        data.ssp,
        data.time_period,
        data.delta_t_choice,
        data.nrm_cluster,
        data.initial_loss,
        data.continuing_loss,
    )
    return JSONResponse(content=result)
