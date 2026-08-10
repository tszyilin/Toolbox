"""Bed-form geometry, Chezy resistance factor and Manning's n for a sand-bed river.

Follows the RFACTOR logic of the River Resistance Calculator workbook: grain and
flow parameters, critical Shields number, bed-form classification, dune and
ripple geometry, then the combined resistance factor and Manning's n. Bar type
comes from the Fluvial Processes B/h vs h/D plane.

Inputs are grain size D (mm), flow depth h (m), slope S, and optionally channel
width B (m) — width is only needed for the bar classification.
"""
import math
from typing import Optional

G = 9.81            # gravity, m/s^2
RHO = 1000.0        # water density, kg/m^3
NU = 1e-6           # kinematic viscosity, m^2/s
GAMMA_S = 16186.5   # submerged specific weight of sediment, N/m^3


def _critical_shields(csi: float) -> float:
    if csi > 100:
        return 0.045
    return (
        0.13 * csi ** (-0.392) * math.exp(-0.015 * csi ** 2)
        + 0.045 * (1 - math.exp(-0.068 * csi))
    )


def _bedform(x: float, eta: float) -> str:
    if eta < 1:
        return "No transport"
    if x <= 2.5 and 1 < eta < 21:
        return "Ripples"
    if 2.5 < x < 35:
        return "Ripples on dunes" if 1 < eta < 21 else "Dunes"
    if x >= 35:
        return "Dunes"
    return "No bedforms"


def calculate(grain_size_mm: float, depth_m: float, slope: float,
              width_m: Optional[float] = None) -> dict:
    if grain_size_mm <= 0:
        raise ValueError("Grain size must be greater than zero.")
    if depth_m <= 0:
        raise ValueError("Flow depth must be greater than zero.")
    if slope <= 0:
        raise ValueError("Slope must be greater than zero.")

    d = grain_size_mm / 1000.0
    h = depth_m
    s = slope

    # Step 1 — flow and sediment parameters
    v_star = math.sqrt(G * s * h)
    x = v_star * d / NU                       # grain shear Reynolds number
    y = RHO * v_star ** 2 / (GAMMA_S * d)     # Shields number
    z = h / d                                 # relative depth
    csi = (x ** 2 / y) ** (1 / 3)

    # Step 2 — critical Shields number
    y_cr = _critical_shields(csi)

    # Step 3 — flow intensity and bed-form type
    eta = y / y_cr
    bedform = _bedform(x, eta)

    # Step 4 — dune geometry
    m_lambda = 0.055 * math.sqrt(z) + 0.04 * x
    aux_len = (1 + 0.01 * (((z - 40) * (z - 400)) / z) * math.exp(-m_lambda)
               if m_lambda <= 20 else 1.0)
    dune_active = x >= 2.5 and eta >= 1
    dune_length = 6 * aux_len * h if dune_active else 0.0

    decay_z = math.exp(-0.002 * z) if z < 7000 else 0.0
    decay_z1 = math.exp(-0.17 * z ** 0.47) if z < 10000 else 0.0
    delta_d_max = 0.00047 * z ** 1.2 * decay_z1 + 0.04 * (1 - decay_z)
    eta_hat_d = 35 * (1 - math.exp(-0.074 * z ** 0.4)) - 5
    m_delta = 1.0 if z <= 20 else 1 + 0.6 * math.exp(-0.1 * (5 - math.log10(z)) ** 3.6)
    zeta_d = (eta - 1) / (eta_hat_d - 1)
    psi_xd = 1 - math.exp(-((x / 10) ** 2)) if x < 70 else 1.0
    dune_steepness = (psi_xd * delta_d_max * (zeta_d * math.exp(1 - zeta_d)) ** m_delta
                      if dune_active else 0.0)

    # Step 5 — ripple geometry
    ripple_active = not (eta < 1 or eta >= 20.8 or x > 35)
    if ripple_active:
        ripple_length = d * 3000 / (csi ** 0.88 * math.sqrt(eta) * (1 - 0.22 * math.sqrt(eta)))
        zeta_r = 0.1 * (eta - 1)
        rr = 1.0 if zeta_r < 1 else zeta_r * (2 - zeta_r)
        psi_rx = 1.0 if x <= 3 else math.exp(-(((x - 2.5) / 14) ** 2))
        ripple_steepness = 0.14 * rr * zeta_r * math.exp(1 - zeta_r) * psi_rx
    else:
        ripple_length = 0.0
        zeta_r = 0.1 * (eta - 1)
        ripple_steepness = 0.0

    # Step 6 — Chezy resistance factor
    re_star = 2 * x
    if re_star > 70:
        bs = 8.5
    else:
        ln_re = math.log(re_star)
        bs = ((2.5 * ln_re + 5.5) * math.exp(-0.0705 * ln_re ** 2.55)
              + 8.5 * (1 - math.exp(-0.0594 * ln_re ** 2.55)))
    ks = 2 * d
    cf = 2.5 * math.log(0.368 * h / ks) + bs
    inv_c2 = 1 / cf ** 2 + 1 / (2 * h) * (
        dune_steepness ** 2 * dune_length + ripple_steepness ** 2 * ripple_length
    )
    chezy = (1 / inv_c2) ** 0.5

    # Step 7 — Manning's n
    manning_n = (1 / chezy) * h ** (1 / 6) / math.sqrt(G)

    result = {
        "inputs": {
            "grain_size_mm": grain_size_mm, "depth_m": h,
            "slope": s, "width_m": width_m,
        },
        "flow": {
            "grain_size_m": d,
            "shear_velocity": v_star,
            "grain_shear_reynolds": x,
            "shields_number": y,
            "relative_depth": z,
            "csi": csi,
            "critical_shields": y_cr,
            "flow_intensity": eta,
        },
        "bedform": bedform,
        "dune": {"length_m": dune_length, "steepness": dune_steepness,
                 "max_steepness": delta_d_max, "zeta": zeta_d},
        "ripple": {"active": ripple_active, "length_m": ripple_length,
                   "steepness": ripple_steepness, "zeta": zeta_r},
        "resistance": {"re_star": re_star, "bs": bs, "ks_m": ks,
                       "flat_bed_cf": cf, "chezy": chezy},
        "manning_n": manning_n,
    }

    # Step 8 — bar classification (needs the channel width)
    if width_m and width_m > 0:
        b_over_h = width_m / h
        boundary = 25 * z ** (1 / 3) if z < 200 else 150.0
        result["bars"] = {
            "b_over_h": b_over_h,
            "h_over_d": z,
            "boundary": boundary,
            "type": ("Alternate bars (single-row)" if b_over_h < boundary
                     else "Multiple-row bars"),
        }
    return result
