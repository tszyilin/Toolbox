"""GTSMR application zone (coastal / inland) looked up by latitude / longitude.

From Figure 1 of the GSDM guidebook (BoM, June 2003). The figure is a raster
with no graticule, so its two halves were registered to the same Albers grid as
the moisture-factor map by matching their coastline (median 0 page pixels).

The boundary between the GTSMR coastal and inland application zones is a single
hairline arc; it was separated from the thicker GSAM lines it crosses by local
stroke width, then ordered into a path so the side test has a consistent
orientation.

Scope, deliberately narrow: this reports coastal vs inland only. Figure 1's GSAM
coastal/inland divide did not survive validation and is not modelled here, and
neither is the SW WA winter zone — for a catchment in the south-west the caller
is told to check the figure rather than given a guess.
"""
import json
import math
import os

_DATA = os.path.join(os.path.dirname(__file__), "data", "gtsmr_zones.json")

with open(_DATA, "r", encoding="utf-8") as fh:
    _MAP = json.load(fh)

_P = _MAP["projection"]
_APEX_X, _APEX_Y = _P["apex"]
_A, _B, _N, _LON0 = _P["A"], _P["B"], _P["n"], _P["lon0"]
ARC = [tuple(p) for p in _MAP["gtsmr_arc"]]

LAT_RANGE = (-44.0, -8.0)
LON_RANGE = (110.0, 156.0)

# Rough envelope of Figure 1's SW WA winter zone. Only used to raise a flag.
SW_WA = {"lat_max": -29.0, "lon_max": 121.0}

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


_WEST_TIP = min(ARC, key=lambda p: p[0])
_EAST_TIP = max(ARC, key=lambda p: p[0])


def _southern_limit(px: float) -> float:
    """The chord closing the arc between its two arm tips.

    The arc is open at the bottom: its real southern boundary is the GTSMR/GSAM
    divide, which could not be traced reliably off Figure 1. The chord between
    the arm tips approximates it, so anything south of this line is reported as
    outside the GTSMR zones rather than guessed at.
    """
    (x1, y1), (x2, y2) = _WEST_TIP, _EAST_TIP
    if abs(x2 - x1) < 1e-9:
        return min(y1, y2)
    t = (px - x1) / (x2 - x1)
    return y1 + t * (y2 - y1)


def lookup(lat: float, lon: float) -> dict:
    """Which application zone of Figure 1 a catchment centroid falls in."""
    if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1]):
        raise ValueError(f"Latitude {lat} is outside the map.")
    if not (LON_RANGE[0] <= lon <= LON_RANGE[1]):
        raise ValueError(f"Longitude {lon} is outside the map.")

    px, py = to_page(lat, lon)

    best_i, best_d = 0, None
    for i, (x, y) in enumerate(ARC):
        d = (x - px) ** 2 + (y - py) ** 2
        if best_d is None or d < best_d:
            best_i, best_d = i, d
    dist = math.sqrt(best_d)

    j = max(0, best_i - 6)
    k = min(len(ARC) - 1, best_i + 6)
    tx, ty = ARC[k][0] - ARC[j][0], ARC[k][1] - ARC[j][1]
    vx, vy = px - ARC[best_i][0], py - ARC[best_i][1]
    outside = (tx * vy - ty * vx) > 0          # calibrated on Darwin / Alice Springs

    notes = []
    in_sw_wa = lat <= SW_WA["lat_max"] and lon <= SW_WA["lon_max"]

    # South of the closing chord, GTSMR's zones no longer apply — this has to be
    # checked for points inside the arc's belly too, not just outside it.
    if py < _southern_limit(px):
        notes.append(
            "South of the GTSMR application zones on Figure 1, so GTSMR does not "
            "apply here. Figure 1 shows GSAM zones for this part of the country, "
            "which are not modelled — set the GSAM zones manually."
        )
        if in_sw_wa:
            notes.append(
                "This centroid is in south-west WA, where Figure 1 shows a "
                "GTSMR SW WA Winter Zone (SWWA_W). Check the figure."
            )
        return {
            "zone": "outside",
            "zone_label": "Outside the GTSMR zones",
            "gtsmr_applicable": False,
            "gsam_applicable": True,
            "gtsmr_summer": None,
            "gtsmr_winter": None,
            "distance_px": round(dist, 1),
            "notes": notes,
        }

    zone = "coastal" if outside else "inland"
    summer = "COAST_S" if zone == "coastal" else "INLAND_S"
    winter = "COAST_W" if zone == "coastal" else None
    if winter is None:
        notes.append(
            "Figure 1's inland zone has no winter equivalent — the GTSMR winter "
            "zone list only offers COAST_W and SWWA_W. Left unset; choose manually."
        )
    if in_sw_wa:
        notes.append(
            "This centroid is in south-west WA, where Figure 1 also shows a "
            "GTSMR SW WA Winter Zone (SWWA_W) that is not modelled here."
        )
    if dist < 25:
        notes.append(
            f"Only {dist:.0f} page px (~{dist * 4.9:.0f} km) from the zone boundary — "
            "close enough to be worth checking by eye."
        )

    return {
        "zone": zone,
        "zone_label": f"GTSMR {zone.capitalize()} Zone",
        "gtsmr_applicable": True,
        # GTSMR country is the tropical-storm region; GSAM covers the south-east.
        "gsam_applicable": False,
        "gtsmr_summer": summer,
        "gtsmr_winter": winter,
        "distance_px": round(dist, 1),
        "notes": notes,
    }
