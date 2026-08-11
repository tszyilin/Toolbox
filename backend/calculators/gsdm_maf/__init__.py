"""GSDM Moisture Adjustment Factor looked up by latitude / longitude.

The contours come from the Bureau of Meteorology's GSDM Figure 3 (January 2003),
digitised straight out of the vector PDF. The sheet is drawn on an Albers
Equal-Area Conic projection; its parameters were recovered from the printed
graticule (meridians are straight lines through a common apex, parallels are
concentric arcs) and check out against the coastline to about 1 page pixel,
roughly 5 km.

A queried point is placed on the sheet, then the factor is interpolated
linearly between the two contours that bracket it.

The sheet carries two contour series: the labelled ones every 0.05, drawn in
red, and an unlabelled series every 0.01 drawn in a pale tint. Both are used.
The 0.01 lines carry no printed values, so each takes its value from its
position between the labelled lines it sits between — there are always exactly
four of them per 0.05 step, and every value recovered this way falls on a 0.01
step that is not a multiple of 0.05, which is the check that the counting is
right.
"""
import json
import math
import os

_DATA = os.path.join(os.path.dirname(__file__), "data", "gsdm_maf.json")

with open(_DATA, "r", encoding="utf-8") as fh:
    _MAP = json.load(fh)

_P = _MAP["projection"]
_APEX_X, _APEX_Y = _P["apex"]
_A, _B, _N, _LON0 = _P["A"], _P["B"], _P["n"], _P["lon0"]
_CONTOURS = [(c["v"], c["p"]) for c in _MAP["contours"]]

VALUES = sorted({v for v, _ in _CONTOURS})
MIN_VALUE, MAX_VALUE = VALUES[0], VALUES[-1]

CONTOUR_INTERVAL = 0.01     # the figure carries a 0.01 series between the labelled 0.05 lines
STEP = 0.005                # reporting granularity

# Rough extent of the drawn map — outside this the answer would be extrapolation.
LAT_RANGE = (-44.0, -8.0)
LON_RANGE = (110.0, 156.0)

_E2 = 0.00669438002290          # GRS80
_E = math.sqrt(_E2)


def _q(phi: float) -> float:
    """Authalic (equal-area) latitude term."""
    s = math.sin(phi)
    return (1 - _E2) * (
        s / (1 - _E2 * s * s)
        - (1 / (2 * _E)) * math.log((1 - _E * s) / (1 + _E * s))
    )


def to_page(lat: float, lon: float):
    """Latitude/longitude -> position on the map sheet."""
    rho = math.sqrt(_A - _B * _q(math.radians(lat)))
    theta = _N * (lon - _LON0)
    return _APEX_X + rho * math.sin(theta), _APEX_Y + rho * math.cos(theta)


def _dist_to_polyline(px: float, py: float, pts):
    """Shortest distance from a point to a polyline, plus the closest point."""
    best = None
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        dx, dy = x2 - x1, y2 - y1
        L2 = dx * dx + dy * dy
        if L2 < 1e-12:
            t = 0.0
        else:
            t = ((px - x1) * dx + (py - y1) * dy) / L2
            t = 0.0 if t < 0 else (1.0 if t > 1 else t)
        cx, cy = x1 + t * dx, y1 + t * dy
        d = (px - cx) ** 2 + (py - cy) ** 2
        if best is None or d < best[0]:
            best = (d, cx, cy)
    if best is None:                      # single-vertex guard
        x1, y1 = pts[0]
        return math.hypot(px - x1, py - y1), x1, y1
    return math.sqrt(best[0]), best[1], best[2]


def lookup(lat: float, lon: float) -> dict:
    """Read the GSDM moisture adjustment factor at a point.

    Returns the interpolated value together with the two contours it sits
    between, so the caller can show its working.
    """
    if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1]):
        raise ValueError(
            f"Latitude {lat} is outside the map ({LAT_RANGE[0]} to {LAT_RANGE[1]})."
        )
    if not (LON_RANGE[0] <= lon <= LON_RANGE[1]):
        raise ValueError(
            f"Longitude {lon} is outside the map ({LON_RANGE[0]} to {LON_RANGE[1]})."
        )

    px, py = to_page(lat, lon)

    near = []
    for value, pts in _CONTOURS:
        d, cx, cy = _dist_to_polyline(px, py, pts)
        bearing = math.degrees(math.atan2(cy - py, cx - px))
        near.append((d, value, bearing))
    near.sort(key=lambda t: t[0])

    d1, v1, b1 = near[0]

    # Prefer the nearest contour of a different value lying on the opposite
    # side, so we interpolate across the point rather than along one flank.
    opposite = None
    fallback = None
    for d2, v2, b2 in near[1:]:
        if abs(v2 - v1) < 1e-9:
            continue
        if fallback is None:
            fallback = (d2, v2, b2)
        if abs((b1 - b2 + 180) % 360 - 180) > 90:
            opposite = (d2, v2, b2)
            break

    pair = opposite or fallback
    if pair is None:
        return {
            "maf": round(v1, 3),
            "lower": v1, "upper": v1,
            "bracketed": False,
            "note": "Only one contour available near this point.",
        }

    d2, v2, _ = pair
    total = d1 + d2
    maf = v1 if total < 1e-9 else v1 + (v2 - v1) * (d1 / total)
    maf = max(MIN_VALUE, min(MAX_VALUE, maf))
    # The map is hand-drawn at a 0.05 contour interval, so anything finer than
    # 0.005 is false precision.
    maf = round(maf / STEP) * STEP

    lo, hi = (v1, v2) if v1 <= v2 else (v2, v1)
    conservative = min(MAX_VALUE, math.ceil(maf / CONTOUR_INTERVAL - 1e-9) * CONTOUR_INTERVAL)

    return {
        "maf": round(maf, 3),
        "conservative": round(conservative, 2),
        "lower": round(lo, 2),
        "upper": round(hi, 2),
        "bracketed": opposite is not None,
        "distance_px": [round(d1, 2), round(d2, 2)],
        "page": [round(px, 2), round(py, 2)],
    }
