import math

METHODS = {"log_log", "linear", "log_x_linear_y", "linear_x_log_y"}


def _interp(x1: float, y1: float, x2: float, y2: float, x: float, method: str) -> float:
    if method == "log_log":
        if any(v <= 0 for v in (x1, x2, y1, y2, x)):
            raise ValueError("All x and y values must be positive for log-log interpolation.")
        t = (math.log(x) - math.log(x1)) / (math.log(x2) - math.log(x1))
        return math.exp(math.log(y1) + t * (math.log(y2) - math.log(y1)))

    elif method == "log_x_linear_y":
        if any(v <= 0 for v in (x1, x2, x)):
            raise ValueError("All x values must be positive for log-x / linear-y interpolation.")
        t = (math.log(x) - math.log(x1)) / (math.log(x2) - math.log(x1))
        return y1 + t * (y2 - y1)

    elif method == "linear_x_log_y":
        if any(v <= 0 for v in (y1, y2)):
            raise ValueError("All y values must be positive for linear-x / log-y interpolation.")
        t = (x - x1) / (x2 - x1)
        return math.exp(math.log(y1) + t * (math.log(y2) - math.log(y1)))

    else:  # linear
        return y1 + (y2 - y1) * (x - x1) / (x2 - x1)


def interpolate(
    known_x: list[float],
    known_y: list[float],
    query_x: list[float],
    method: str = "log_log",
) -> list[dict]:
    if len(known_x) < 2:
        raise ValueError("At least two known data points are required.")
    if len(known_x) != len(known_y):
        raise ValueError("known_x and known_y must have the same length.")
    if method not in METHODS:
        raise ValueError(f"method must be one of {sorted(METHODS)}.")

    pairs = sorted(zip(known_x, known_y), key=lambda p: p[0])
    xs = [p[0] for p in pairs]
    ys = [p[1] for p in pairs]

    results = []
    for qx in query_x:
        if qx <= xs[0]:
            x1, y1, x2, y2 = xs[0], ys[0], xs[1], ys[1]
            extrapolated = qx < xs[0]
        elif qx >= xs[-1]:
            x1, y1, x2, y2 = xs[-2], ys[-2], xs[-1], ys[-1]
            extrapolated = qx > xs[-1]
        else:
            extrapolated = False
            for i in range(len(xs) - 1):
                if xs[i] <= qx <= xs[i + 1]:
                    x1, y1, x2, y2 = xs[i], ys[i], xs[i + 1], ys[i + 1]
                    break

        y = _interp(x1, y1, x2, y2, qx, method)
        results.append({"x": qx, "y": round(y, 6), "extrapolated": extrapolated})

    return results
