import pandas as pd
import io


def run(csv_bytes: bytes, lines_id_col: str, elev_col: str, dist_col: str) -> list[dict]:
    df = pd.read_csv(io.BytesIO(csv_bytes))

    lines = sorted(df[lines_id_col].unique().tolist())

    results = []
    for line in lines:
        tempdf = df.loc[df[lines_id_col] == line].copy()
        min_elev = tempdf[elev_col].min()
        elevation = tempdf[elev_col] - min_elev
        area = (elevation.shift(periods=1) + elevation) * tempdf[dist_col].diff() / 2
        length_m = tempdf[dist_col].max() - tempdf[dist_col].min()

        results.append({
            lines_id_col: line,
            "eas_m_per_km": round(2 * area.sum() * 1000 / (length_m ** 2), 4),
            "length_km": round(0.001 * length_m, 4),
            "outlet_elevation_m": round(float(tempdf[elev_col].iloc[-1]), 4),
            "hydraulic_slope": round((tempdf[elev_col].iloc[0] - tempdf[elev_col].iloc[-1]) / length_m, 6),
        })

    return results
