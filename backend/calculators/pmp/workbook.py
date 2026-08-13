"""Build an .xlsx workbook of PMP results: a summary sheet plus the full
depth-duration series for every case, one sheet per catchment."""

import io
import re
import pandas as pd

# Column label for each case, in the order they should appear on a sheet.
_CASES = [
    ("gsdm", None, "GSDM"),
    ("gtsmr", "summer", "GTSMR summer"),
    ("gtsmr", "winter", "GTSMR winter"),
    ("gsam", "summer", "GSAM summer"),
    ("gsam", "autumn", "GSAM autumn"),
]

_INVALID_SHEET_CHARS = re.compile(r"[:\\/?*\[\]]")


def _sheet_name(name: str, used: set[str]) -> str:
    """Excel sheet names: no :\\/?*[], 31 chars max, unique, non-empty."""
    clean = _INVALID_SHEET_CHARS.sub("-", (name or "").strip())[:31] or "Catchment"
    candidate = clean
    n = 2
    while candidate.lower() in used:
        suffix = f" ({n})"
        candidate = clean[: 31 - len(suffix)] + suffix
        n += 1
    used.add(candidate.lower())
    return candidate


def _series(result: dict, method: str, season: str | None) -> list[dict] | None:
    """The by_duration series for one case, or None if that case wasn't run."""
    block = result.get(method)
    if not block:
        return None
    if season is not None:
        block = block.get(season)
        if not block:
            return None
    return block.get("by_duration")


def _summary_frame(results: list[dict]) -> pd.DataFrame:
    rows = []
    for r in results:
        row = {"Catchment": r.get("name", ""), "Area (km2)": r.get("area")}

        gsdm = r.get("gsdm")
        row["GSDM PMP (mm)"] = gsdm["pmp_mm"] if gsdm else None
        row["GSDM controlling duration (hr)"] = gsdm["controlling_duration_hr"] if gsdm else None

        for method, label in (("gtsmr", "GTSMR"), ("gsam", "GSAM")):
            block = r.get(method)
            row[f"{label} PMP (mm)"] = block["pmp_mm"] if block else None
            row[f"{label} governing season"] = block["governing_season"] if block else None
            row[f"{label} controlling duration (hr)"] = block["controlling_duration_hr"] if block else None

        row["Governing PMP (mm)"] = r.get("governing_pmp_mm")
        row["Volume (m3)"] = r.get("volume_m3")
        rows.append(row)
    return pd.DataFrame(rows)


def _catchment_frame(result: dict) -> pd.DataFrame:
    """Durations as rows, one column of PMP depths per case that was run.

    Cases cover different duration ranges, so the index is the union of all
    durations present and cells outside a case's range are left blank.
    """
    columns: dict[str, dict[float, float]] = {}
    for method, season, label in _CASES:
        series = _series(result, method, season)
        if not series:
            continue
        columns[f"{label} PMP (mm)"] = {
            float(pt["duration_hr"]): pt["pmp_mm"] for pt in series
        }

    if not columns:
        return pd.DataFrame(columns=["Duration (hr)"])

    durations = sorted({d for col in columns.values() for d in col})
    frame = pd.DataFrame({"Duration (hr)": durations})
    for label, by_duration in columns.items():
        frame[label] = [by_duration.get(d) for d in durations]
    return frame


def build_workbook(results: list[dict]) -> bytes:
    """Return the .xlsx bytes for a set of calculated catchment results."""
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        _summary_frame(results).to_excel(writer, sheet_name="Summary", index=False)

        used: set[str] = {"summary"}
        for result in results:
            frame = _catchment_frame(result)
            sheet = _sheet_name(result.get("name", ""), used)
            frame.to_excel(writer, sheet_name=sheet, index=False)

        # Widen columns so headers aren't clipped.
        for worksheet in writer.book.worksheets:
            for column in worksheet.columns:
                width = max((len(str(cell.value)) for cell in column if cell.value is not None), default=10)
                worksheet.column_dimensions[column[0].column_letter].width = min(max(width + 2, 12), 40)

    return buffer.getvalue()
