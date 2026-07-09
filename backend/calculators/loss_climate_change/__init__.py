from calculators.ifd_climate_change import DELTA_T, NRM_LOSS_RATES


def run(
    ssp: str,
    time_period: str,
    delta_t_choice: str,
    nrm_cluster: str,
    initial_loss: float | None,
    continuing_loss: float | None,
) -> dict:
    idx = {"median": 0, "low": 1, "high": 2}[delta_t_choice]
    delta_t = DELTA_T[ssp][time_period][idx]
    rates = NRM_LOSS_RATES[nrm_cluster]

    result = {
        "delta_t": delta_t,
        "ssp": ssp,
        "time_period": time_period,
        "delta_t_choice": delta_t_choice,
        "nrm_cluster": nrm_cluster,
        "il_rate": rates["IL"][idx],
        "cl_rate": rates["CL"][idx],
    }

    if initial_loss is not None:
        alpha = rates["IL"][idx]
        result["initial_loss_original"] = initial_loss
        result["initial_loss_adjusted"] = round(initial_loss * (1 + alpha / 100) ** delta_t, 3)

    if continuing_loss is not None:
        alpha = rates["CL"][idx]
        result["continuing_loss_original"] = continuing_loss
        result["continuing_loss_adjusted"] = round(continuing_loss * (1 + alpha / 100) ** delta_t, 3)

    return result
