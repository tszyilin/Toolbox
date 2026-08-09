"""GSDM maximum duration limit looked up by latitude / longitude.

From Figure 2 of the GSDM guidebook (BoM, June 2003), which splits Australia
into a six-hour zone, a three-hour zone, and an intermediate zone between them.
The guidebook interpolates across that band; this reports whole-hour limits
only, and in the band it offers both 3 and 6 for the engineer to choose.

The figure is a raster, so the two zone boundaries were traced from the printed
dashes and placed on the same Albers grid as the moisture-factor map, by
registering the figure's base map against that map's coastline (median 1 page
pixel, about 5 km).

A point is classified by a local test: take the nearest dash on each boundary;
if the two lie in opposite directions the point is inside the band, otherwise it
is beyond the nearer boundary. That needs no assumption that the boundaries are
single-valued, which matters because the band turns south down the east coast.
"""
import json
import math
import os

_DATA = os.path.join(os.path.dirname(__file__), "data", "gsdm_duration.json")

with open(_DATA, "r", encoding="utf-8") as fh:
    _MAP = json.load(fh)

_P = _MAP["projection"]
_APEX_X, _APEX_Y = _P["apex"]
_A, _B, _N, _LON0 = _P["A"], _P["B"], _P["n"], _P["lon0"]
SIX_EDGE = [tuple(p) for p in _MAP["six_hour_edge"]]
THREE_EDGE = [tuple(p) for p in _MAP["three_hour_edge"]]

SIX_HOURS = 6.0
THREE_HOURS = 3.0

LAT_RANGE = (-44.0, -8.0)
LON_RANGE = (110.0, 156.0)

_E2 = 0.00669438002290
_E = math.sqrt(_E2)


def _q(phi: float) -> float:
    s = math.sin(phi)
    return (1 - _E2) * (
        s / (1 - _E2 * s * s)
        - (1 / (2 * _E)) * math.log((1 - _E * s) / (1 + _E * s))
    )


def to_page(lat: float, lon: float):
    rho = math.sqrt(_A - _B * _q(math.radians(lat)))
    theta = _N * (lon - _LON0)
    return _APEX_X + rho * math.sin(theta), _APEX_Y + rho * math.cos(theta)


def _nearest(edge, px, py):
    best = None
    for x, y in edge:
        d = (x - px) ** 2 + (y - py) ** 2
        if best is None or d < best[0]:
            best = (d, x, y)
    return math.sqrt(best[0]), best[1], best[2]


def lookup(lat: float, lon: float) -> dict:
    """Maximum GSDM duration for a catchment centroid — always 3 or 6 hours."""
    if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1]):
        raise ValueError(
            f"Latitude {lat} is outside the map ({LAT_RANGE[0]} to {LAT_RANGE[1]})."
        )
    if not (LON_RANGE[0] <= lon <= LON_RANGE[1]):
        raise ValueError(
            f"Longitude {lon} is outside the map ({LON_RANGE[0]} to {LON_RANGE[1]})."
        )

    px, py = to_page(lat, lon)
    d6, x6, y6 = _nearest(SIX_EDGE, px, py)
    d3, x3, y3 = _nearest(THREE_EDGE, px, py)

    # Opposite directions => the point lies between the two boundaries.
    dot = (x6 - px) * (x3 - px) + (y6 - py) * (y3 - py)
    if dot < 0:
        # In the band either limit is defensible, so offer both and let the
        # engineer decide rather than picking one for them.
        return {
            "zone": "intermediate",
            "options": [THREE_HOURS, SIX_HOURS],
            "recommended": None,
            "nearer": SIX_HOURS if d6 < d3 else THREE_HOURS,
            "distance_px": [round(d6, 1), round(d3, 1)],
        }

    hours, zone = (SIX_HOURS, "six-hour") if d6 < d3 else (THREE_HOURS, "three-hour")
    return {
        "zone": zone,
        "options": [hours],
        "recommended": hours,
        "nearer": hours,
        "distance_px": [round(d6, 1), round(d3, 1)],
    }
