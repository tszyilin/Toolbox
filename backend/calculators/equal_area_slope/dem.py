"""Equal area slope from a stream-line shapefile sampled against a DEM.

Port of examples/03_Equal_Area_slope/equal_area_slope_v4.py. The desktop tool
writes matplotlib PNGs; here the longitudinal profile is returned as arrays so
the browser can draw (and export) the chart itself.
"""
import os
import zipfile

import geopandas as gpd
import numpy as np
import rasterio
from shapely.geometry import LineString

# Points per profile sent to the browser. The slope itself is always computed
# on the full-resolution sample; only the returned arrays are thinned.
MAX_PROFILE_POINTS = 1500

_trapz = getattr(np, "trapezoid", None) or np.trapz


class InputError(ValueError):
    """Raised for a bad or unusable upload - surfaced to the user as 422."""


def find_shapefile(folder: str) -> str:
    """Return the single .shp inside `folder`, unpacking any zip first."""
    for name in sorted(os.listdir(folder)):
        if name.lower().endswith(".zip"):
            with zipfile.ZipFile(os.path.join(folder, name)) as zf:
                for member in zf.namelist():
                    # Flatten: ignore any directory structure inside the zip.
                    base = os.path.basename(member)
                    if not base:
                        continue
                    with zf.open(member) as src, open(os.path.join(folder, base), "wb") as dst:
                        dst.write(src.read())

    shps = [f for f in sorted(os.listdir(folder)) if f.lower().endswith(".shp")]
    if not shps:
        raise InputError(
            "No .shp found. Upload the shapefile as a .zip, or select the "
            ".shp together with its .shx, .dbf and .prj sidecar files."
        )
    if len(shps) > 1:
        raise InputError(f"Multiple shapefiles found ({', '.join(shps)}). Upload one at a time.")
    return os.path.join(folder, shps[0])


def list_fields(shapefile_path: str) -> list[str]:
    """Attribute field names, for the unique-identifier dropdown."""
    gdf = gpd.read_file(shapefile_path, rows=1)
    return [c for c in gdf.columns if c != "geometry"]


def _thin(arr: np.ndarray, step: int) -> list[float]:
    """Decimate while always keeping the first and last point."""
    if step <= 1:
        return [round(float(v), 4) for v in arr]
    kept = np.concatenate([arr[::step], arr[-1:]]) if (len(arr) - 1) % step else arr[::step]
    return [round(float(v), 4) for v in kept]


def run(shapefile_path: str, raster_path: str, id_header: str = "", interval: float = 10.0) -> dict:
    """Compute the equal area slope for every line feature in the shapefile.

    Returns {"results": [...], "warnings": [...]}, one result per LineString
    with its longitudinal profile, the fitted equal-area line and the cut/fill
    areas that the fit balances.
    """
    if interval <= 0:
        raise InputError("Sampling interval must be a positive number.")

    lines_gdf = gpd.read_file(shapefile_path)
    warnings: list[str] = []

    with rasterio.open(raster_path) as raster:
        if raster.crs is None:
            raise InputError("The raster has no CRS. A projected DEM in metres is required.")
        if lines_gdf.crs is None:
            raise InputError("The shapefile has no CRS (.prj missing?). Cannot align it with the raster.")
        if lines_gdf.crs != raster.crs:
            lines_gdf = lines_gdf.to_crs(raster.crs)

        id_header = (id_header or "").strip()
        if id_header and id_header not in lines_gdf.columns:
            warnings.append(
                f"Identifier field '{id_header}' not found in the shapefile "
                f"(available: {', '.join(c for c in lines_gdf.columns if c != 'geometry')}). "
                "Using the row index instead."
            )
            id_header = ""

        results = []
        for idx, row in lines_gdf.iterrows():
            line = row.geometry
            if not isinstance(line, LineString):
                warnings.append(f"Geometry at index {idx} is not a line. Skipped.")
                continue

            uid = idx
            if id_header:
                value = row[id_header]
                if value is not None and not (isinstance(value, float) and np.isnan(value)) \
                        and str(value).strip() != "":
                    uid = value

            total_length_m = line.length
            if total_length_m <= 0:
                warnings.append(f"Line {uid} has zero length. Skipped.")
                continue

            num_points = int(total_length_m // interval) + 1
            distances = np.linspace(0, total_length_m, num_points)
            coords = [(p.x, p.y) for p in (line.interpolate(d) for d in distances)]

            elevations = np.array(
                [val[0] if len(val) else np.nan for val in raster.sample(coords)], dtype=float
            )
            # Nodata cells come back as the raster's fill value, not NaN.
            if raster.nodata is not None:
                elevations[elevations == raster.nodata] = np.nan

            valid = ~np.isnan(elevations)
            if valid.sum() < 2:
                warnings.append(f"Line {uid} falls outside the DEM (no valid elevations). Skipped.")
                continue
            if not valid.all():
                warnings.append(
                    f"Line {uid}: {int((~valid).sum())} of {len(valid)} sample points had no DEM "
                    "value and were dropped."
                )

            elevations = elevations[valid]
            distances_km = distances[valid] / 1000.0

            downstream_elevation = float(elevations[-1])

            # The equal-area line is pinned at the downstream end and its
            # upstream intercept is chosen so cut and fill balance. Writing
            # that balance out — the area under the straight line must equal
            # the area under the profile — gives the intercept directly:
            #     L * (intercept + z_outlet) / 2 = integral(profile)
            # which is exact, unlike searching |cut - fill| numerically (that
            # objective has a kink at the optimum and stalls easily).
            offsets_km = distances_km - distances_km[0]
            length_along_km = float(offsets_km[-1])
            profile_area = float(_trapz(elevations, offsets_km))
            intercept = 2.0 * profile_area / length_along_km - downstream_elevation

            slope = (downstream_elevation - intercept) / length_along_km
            equal_area_line = intercept + slope * offsets_km
            area_cut = float(_trapz(np.maximum(equal_area_line - elevations, 0), offsets_km))
            area_fill = float(_trapz(np.maximum(elevations - equal_area_line, 0), offsets_km))

            average_slope = float(
                (elevations[-1] - elevations[0]) / length_along_km
            )
            average_line = elevations[0] + average_slope * offsets_km

            step = max(1, int(np.ceil(len(distances_km) / MAX_PROFILE_POINTS)))
            results.append({
                "id": str(uid),
                "length_km": round(float(total_length_m / 1000.0), 4),
                "equal_area_slope": round(float(slope), 4),
                "average_slope": round(average_slope, 4),
                "upstream_elevation_m": round(float(elevations[0]), 4),
                "outlet_elevation_m": round(float(elevations[-1]), 4),
                "area_cut": round(area_cut, 4),
                "area_fill": round(area_fill, 4),
                "sample_points": int(len(distances_km)),
                "profile": {
                    "distance_km": _thin(distances_km, step),
                    "elevation_m": _thin(elevations, step),
                    "equal_area_line_m": _thin(equal_area_line, step),
                    "average_line_m": _thin(average_line, step),
                },
            })

    if not results:
        raise InputError("No usable line features were found in the shapefile.")

    return {"results": results, "warnings": warnings}
