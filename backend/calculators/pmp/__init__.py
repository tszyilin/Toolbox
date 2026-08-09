import math
import os
import pandas as pd

_data = os.path.join(os.path.dirname(__file__), "data")

_gsdm: pd.DataFrame = pd.read_csv(os.path.join(_data, "dda_gsdm.csv"))
_gtsmr: pd.DataFrame = pd.read_csv(os.path.join(_data, "dda_gtsmr.csv"))
_gsam: pd.DataFrame = pd.read_csv(os.path.join(_data, "dda_gsam.csv"))


def _interp(x1: float, y1: float, x2: float, y2: float, x: float) -> float:
    """Log-x / linear-y interpolation (matches DDA table formula in spreadsheet)."""
    t = (math.log(x) - math.log(x1)) / (math.log(x2) - math.log(x1))
    return y1 + t * (y2 - y1)


def _lookup_depth(df: pd.DataFrame, area: float, zone: str, duration: float) -> float:
    """Interpolate depth from DDA-GTSMR or DDA-GSAM by area (log-x linear-y)."""
    sub = df[(df["zone"] == zone) & (df["duration"] == duration)].sort_values("area")
    areas = sub["area"].values
    depths = sub["depth"].values

    if len(areas) < 2:
        raise ValueError(f"No data for zone={zone}, duration={duration}")

    a = max(area, areas[0])  # clamp to table minimum

    if a <= areas[0]:
        return float(depths[0])
    if a >= areas[-1]:
        return _interp(areas[-2], depths[-2], areas[-1], depths[-1], a)

    for i in range(len(areas) - 1):
        if areas[i] <= a <= areas[i + 1]:
            return _interp(areas[i], depths[i], areas[i + 1], depths[i + 1], a)

    raise ValueError(f"Interpolation failed for area={area}")


def _lookup_gsdm_depth(area: float, terrain: str, duration: float) -> float:
    """Interpolate GSDM rainfall depth by area (log-x linear-y)."""
    sub = _gsdm[(_gsdm["terrain"] == terrain) & (_gsdm["duration"] == duration)].sort_values("area")
    areas = sub["area"].values
    depths = sub["rainfall"].values

    a = max(area, 1e-5)  # clamp to table minimum

    if a <= areas[0]:
        return float(depths[0])
    if a >= areas[-1]:
        return _interp(areas[-2], depths[-2], areas[-1], depths[-1], a)

    for i in range(len(areas) - 1):
        if areas[i] <= a <= areas[i + 1]:
            return _interp(areas[i], depths[i], areas[i + 1], depths[i + 1], a)

    raise ValueError(f"GSDM interpolation failed for area={area}, terrain={terrain}, duration={duration}")


def _calc_gsdm(area: float, params: dict) -> dict:
    durations = sorted(_gsdm["duration"].unique())
    limit = float(params["duration_limit"])
    smooth_pct = float(params["smooth_fraction"]) / 100
    rough_pct = float(params["rough_fraction"]) / 100
    eaf = float(params["elevation_factor"])
    maf = float(params["moisture_factor"])

    results_by_dur = {}
    for dur in durations:
        if dur > limit + 1e-9:
            continue
        ds = _lookup_gsdm_depth(area, "S", dur)
        dr = _lookup_gsdm_depth(area, "R", dur)
        pmp_raw = (smooth_pct * ds + rough_pct * dr) * eaf * maf
        results_by_dur[dur] = round(pmp_raw, 1)

    if not results_by_dur:
        raise ValueError("No GSDM durations within the specified limit")

    controlling_dur = max(results_by_dur, key=results_by_dur.get)
    return {
        "by_duration": [{"duration_hr": d, "pmp_mm": v} for d, v in sorted(results_by_dur.items())],
        "controlling_duration_hr": controlling_dur,
        "pmp_mm": results_by_dur[controlling_dur],
    }


def _calc_gtsmr(area: float, params: dict) -> dict:
    a = max(area, 1.0)  # GTSMR table minimum area = 1 km²

    taf = float(params["topographic_factor"])
    daf = float(params["decay_factor"])

    maf_s = float(params["epw_avg_summer"]) / float(params["epw_std_summer"])
    maf_w = float(params["epw_avg_winter"]) / float(params["epw_std_winter"])

    zone_s = params["zone_summer"]
    zone_w = params["zone_winter"]

    seasons = {}
    for label, zone, maf in [("summer", zone_s, maf_s), ("winter", zone_w, maf_w)]:
        avail_durs = sorted(_gtsmr[_gtsmr["zone"] == zone]["duration"].unique())
        results_by_dur = {}
        for dur in avail_durs:
            base = _lookup_depth(_gtsmr, a, zone, dur)
            pmp = base * taf * daf * maf
            results_by_dur[dur] = round(pmp, 1)
        controlling_dur = max(results_by_dur, key=results_by_dur.get)
        seasons[label] = {
            "by_duration": [{"duration_hr": d, "pmp_mm": v} for d, v in sorted(results_by_dur.items())],
            "controlling_duration_hr": controlling_dur,
            "pmp_mm": results_by_dur[controlling_dur],
        }

    governing = "summer" if seasons["summer"]["pmp_mm"] >= seasons["winter"]["pmp_mm"] else "winter"
    return {
        "summer": seasons["summer"],
        "winter": seasons["winter"],
        "governing_season": governing,
        "pmp_mm": seasons[governing]["pmp_mm"],
        "controlling_duration_hr": seasons[governing]["controlling_duration_hr"],
    }


def _calc_gsam(area: float, params: dict) -> dict:
    a = max(area, 1.0)

    taf = float(params["topographic_factor"])
    maf_s = float(params["epw_avg_summer"]) / float(params["epw_std_summer"])
    maf_a = float(params["epw_avg_autumn"]) / float(params["epw_std_autumn"])

    zone_s = params["zone_summer"]
    zone_a = params["zone_autumn"]

    seasons = {}
    for label, zone, maf in [("summer", zone_s, maf_s), ("autumn", zone_a, maf_a)]:
        avail_durs = sorted(_gsam[_gsam["zone"] == zone]["duration"].unique())
        results_by_dur = {}
        for dur in avail_durs:
            base = _lookup_depth(_gsam, a, zone, dur)
            pmp = base * taf * maf
            results_by_dur[dur] = round(pmp, 1)
        controlling_dur = max(results_by_dur, key=results_by_dur.get)
        seasons[label] = {
            "by_duration": [{"duration_hr": d, "pmp_mm": v} for d, v in sorted(results_by_dur.items())],
            "controlling_duration_hr": controlling_dur,
            "pmp_mm": results_by_dur[controlling_dur],
        }

    governing = "summer" if seasons["summer"]["pmp_mm"] >= seasons["autumn"]["pmp_mm"] else "autumn"
    return {
        "summer": seasons["summer"],
        "autumn": seasons["autumn"],
        "governing_season": governing,
        "pmp_mm": seasons[governing]["pmp_mm"],
        "controlling_duration_hr": seasons[governing]["controlling_duration_hr"],
    }


def calculate(catchments: list[dict]) -> list[dict]:
    results = []
    for c in catchments:
        name = c.get("name", "")
        area = float(c["area"])
        result: dict = {"name": name, "area": area}

        if c.get("gsdm_enabled"):
            result["gsdm"] = _calc_gsdm(area, c["gsdm"])

        if c.get("gtsmr_enabled"):
            result["gtsmr"] = _calc_gtsmr(area, c["gtsmr"])

        if c.get("gsam_enabled"):
            result["gsam"] = _calc_gsam(area, c["gsam"])

        # Volume (m3) = PMP (mm) x area (km2) x 1e6 m2/km2 x 1e-3 m/mm = PMP x area x 1e3
        pmps = []
        if "gsdm" in result:
            pmps.append(result["gsdm"]["pmp_mm"])
        if "gtsmr" in result:
            pmps.append(result["gtsmr"]["pmp_mm"])
        if "gsam" in result:
            pmps.append(result["gsam"]["pmp_mm"])

        if pmps:
            governing_pmp = max(pmps)
            result["governing_pmp_mm"] = round(governing_pmp, 1)
            result["volume_m3"] = round(governing_pmp * area * 1e3, 0)

        results.append(result)
    return results
