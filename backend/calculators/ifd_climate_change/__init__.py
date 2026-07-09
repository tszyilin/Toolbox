import pandas as pd
import io

# Table 1.6.2 — ΔT (°C) relative to 1961-1990 baseline
# Structure: DELTA_T[ssp][time_period] = (median, low, high)
DELTA_T = {
    "SSP1-2.6": {
        "2021-2040": (1.2, 0.9, 1.5),
        "2041-2060": (1.4, 1.0, 1.9),
        "2081-2100": (1.5, 1.0, 2.1),
    },
    "SSP2-4.5": {
        "2021-2040": (1.2, 0.9, 1.5),
        "2041-2060": (1.7, 1.3, 2.2),
        "2081-2100": (2.4, 1.8, 3.2),
    },
    "SSP3-7.0": {
        "2021-2040": (1.2, 0.9, 1.5),
        "2041-2060": (1.8, 1.4, 2.3),
        "2081-2100": (3.3, 2.5, 4.3),
    },
    "SSP5-8.5": {
        "2021-2040": (1.3, 1.0, 1.6),
        "2041-2060": (2.1, 1.6, 2.7),
        "2081-2100": (4.1, 3.0, 5.4),
    },
}

# Table 1.6.1 & 1.6.5 — α (%/°C) by duration
# Durations in hours mapped to (median, low, high)
ALPHA_BY_DURATION = {
    # ≤ 1 hr
    1.0:  (15.0, 7.0, 28.0),
    # Interpolated zone (Table 1.6.5)
    1.5:  (13.7, 6.1, 25.6),
    2.0:  (12.8, 5.5, 24.0),
    3.0:  (11.8, 4.7, 22.0),
    4.5:  (10.8, 4.0, 20.3),
    6.0:  (10.2, 3.6, 19.2),
    9.0:  (9.5,  3.1, 17.8),
    12.0: (9.0,  2.7, 16.9),
    18.0: (8.4,  2.3, 15.7),
    # ≥ 24 hr
    24.0: (8.0,  2.0, 15.0),
}

# Table 1.6.3 — IL and CL rates (%/°C) by NRM cluster
# (median, low, high)
NRM_LOSS_RATES = {
    "East Flatlands, West Flatlands, Rangelands & Rangelands West": {
        "IL": (4.5, 2.0, 7.1),
        "CL": (5.6, 2.5, 8.7),
    },
    "Murray Basin": {
        "IL": (3.1, 1.0, 5.7),
        "CL": (6.7, 1.5, 12.1),
    },
    "Southern Slopes Mainland & Southern Slopes Tasmania": {
        "IL": (3.9, 1.5, 7.2),
        "CL": (8.5, 2.9, 15.7),
    },
    "East Coast North & East Coast South": {
        "IL": (2.0, 0.6, 4.3),
        "CL": (3.8, 1.1, 8.0),
    },
    "Central Slopes": {
        "IL": (1.1, 0.4, 2.2),
        "CL": (2.0, -0.5, 7.5),
    },
    "Wet Tropics": {
        "IL": (0.8, -0.4, 2.0),
        "CL": (1.4, -0.1, 4.8),
    },
    "Monsoonal North": {
        "IL": (2.4, 1.0, 5.4),
        "CL": (4.4, 3.1, 9.5),
    },
}


def _get_alpha(duration_hr: float) -> tuple[float, float, float]:
    """Interpolate α for a given duration in hours."""
    breakpoints = sorted(ALPHA_BY_DURATION.keys())

    if duration_hr <= 1.0:
        return ALPHA_BY_DURATION[1.0]
    if duration_hr >= 24.0:
        return ALPHA_BY_DURATION[24.0]

    # Find surrounding breakpoints and interpolate
    lower = max(bp for bp in breakpoints if bp <= duration_hr)
    upper = min(bp for bp in breakpoints if bp >= duration_hr)

    if lower == upper:
        return ALPHA_BY_DURATION[lower]

    t = (duration_hr - lower) / (upper - lower)
    al, au = ALPHA_BY_DURATION[lower], ALPHA_BY_DURATION[upper]
    return tuple(al[i] + t * (au[i] - al[i]) for i in range(3))


def _apply_factor(value: float, alpha: float, delta_t: float) -> float:
    # ARR Book 1 Eq 1.6.1: compound form confirmed by worked examples in Ch. 6
    return round(value * (1 + alpha / 100) ** delta_t, 3)


def _parse_bom_csv(csv_bytes: bytes) -> tuple[pd.DataFrame, list[float], list[str], list[str], pd.Series]:
    """
    Parse BOM IFD CSV export. Dynamically locates the AEP label row so any
    number of metadata rows is handled correctly.
    Returns (df, dur_hr list, aep_col_names, header_lines, dur_min_series)
    """
    text = csv_bytes.decode("utf-8", errors="replace")
    lines = text.splitlines()

    # Find the row containing the AEP label (e.g. "Annual Exceedance Probability (AEP)")
    aep_label_idx = next(
        (i for i, line in enumerate(lines) if "Annual Exceedance Probability" in line),
        None,
    )
    if aep_label_idx is None:
        raise ValueError("Could not find 'Annual Exceedance Probability' row in CSV.")

    # Column header row immediately follows the AEP label row
    col_header_idx = aep_label_idx + 1

    # Preserve everything up to and including the column header for export
    header_lines = lines[:col_header_idx + 1]

    # Skip all rows up to (and including) the AEP label; first remaining row is the header
    raw = pd.read_csv(io.BytesIO(csv_bytes), skiprows=col_header_idx, header=0, index_col=0)
    dur_min_col = raw.columns[0]  # "Duration in min"
    aep_cols = [c for c in raw.columns if c != dur_min_col]
    dur_hr = (raw[dur_min_col].astype(float) / 60).tolist()
    dur_min_series = raw[dur_min_col]
    df = raw[aep_cols].copy()
    df.index.name = "Duration"
    return df, dur_hr, aep_cols, header_lines, dur_min_series


def _parse_simple_csv(csv_bytes: bytes) -> tuple[pd.DataFrame, list[float], list[str]]:
    """
    Parse simple IFD CSV where first col = AEP labels, column headers = duration in hours.
    """
    df = pd.read_csv(io.BytesIO(csv_bytes), index_col=0)
    dur_hr = []
    for col in df.columns:
        try:
            dur_hr.append(float(col))
        except ValueError:
            raise ValueError(f"Column header '{col}' must be a numeric duration in hours.")
    return df, dur_hr, list(df.columns)


def run(
    csv_bytes: bytes,
    ssp: str,
    time_period: str,
    delta_t_choice: str,  # "median", "low", "high"
) -> dict:
    delta_t_values = DELTA_T[ssp][time_period]
    idx = {"median": 0, "low": 1, "high": 2}[delta_t_choice]
    delta_t = delta_t_values[idx]

    # Auto-detect BOM format vs simple format
    try:
        preview = pd.read_csv(io.BytesIO(csv_bytes), nrows=2, header=None)
        is_bom = str(preview.iloc[0, 0]).startswith("Copyright")
    except Exception:
        is_bom = False

    header_lines = None
    dur_min_series = None

    if is_bom:
        df, dur_hrs, aep_cols, header_lines, dur_min_series = _parse_bom_csv(csv_bytes)
        orientation = "duration_rows"
    else:
        df, dur_hrs, aep_cols = _parse_simple_csv(csv_bytes)
        orientation = "aep_rows"

    # Apply climate change factor per duration
    adjusted_df = df.copy().astype(float)
    if orientation == "duration_rows":
        for i, (row_label, row) in enumerate(df.iterrows()):
            alpha = _get_alpha(dur_hrs[i])[idx]
            adjusted_df.loc[row_label] = [_apply_factor(v, alpha, delta_t) for v in row]
    else:
        for j, (col, dur) in enumerate(zip(df.columns, dur_hrs)):
            alpha = _get_alpha(dur)[idx]
            adjusted_df[col] = [_apply_factor(v, alpha, delta_t) for v in df[col]]

    # Build BOM-format output CSV
    bom_csv = None
    if is_bom and header_lines is not None and dur_min_series is not None:
        rows = ["\n".join(header_lines)]
        for i, (dur_label, row) in enumerate(adjusted_df.iterrows()):
            dur_min = dur_min_series.iloc[i]
            vals = ",".join(str(v) for v in row.tolist())
            rows.append(f"{dur_label},{dur_min},{vals}")
        bom_csv = "\n".join(rows)

    return {
        "delta_t": delta_t,
        "ssp": ssp,
        "time_period": time_period,
        "delta_t_choice": delta_t_choice,
        "orientation": orientation,
        "original": df.reset_index().to_dict(orient="records"),
        "adjusted": adjusted_df.reset_index().to_dict(orient="records"),
        "dur_hrs": dur_hrs,
        "aep_cols": aep_cols,
        "index_col": df.index.name or "Duration",
        "bom_csv": bom_csv,
    }
