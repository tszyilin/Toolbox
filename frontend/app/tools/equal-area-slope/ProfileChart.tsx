"use client";

import { useRef } from "react";

export interface Profile {
  distance_km: number[];
  elevation_m: number[];
  equal_area_line_m: number[];
  average_line_m: number[];
}

export interface DemResult {
  id: string;
  length_km: number;
  equal_area_slope: number;
  average_slope: number;
  upstream_elevation_m: number;
  outlet_elevation_m: number;
  area_cut: number;
  area_fill: number;
  sample_points: number;
  profile: Profile;
}

const W = 900;
const H = 520;
const M = { top: 48, right: 24, bottom: 56, left: 76 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

/** "Nice" axis ticks covering [min, max] — the round numbers a reader expects. */
function ticks(min: number, max: number, count = 6): number[] {
  if (!isFinite(min) || !isFinite(max) || min === max) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(v);
  return out;
}

/**
 * Split the band between the profile and the equal-area line into polygons of
 * constant sign, so cut and fill can be shaded in different colours. Crossings
 * are interpolated so the wedges meet exactly on the line.
 */
function bands(
  xs: number[],
  a: number[],
  b: number[],
  wantAbove: boolean,
): Array<Array<[number, number, number]>> {
  const out: Array<Array<[number, number, number]>> = [];
  let current: Array<[number, number, number]> = [];
  const sign = (i: number) => (wantAbove ? a[i] - b[i] : b[i] - a[i]);

  for (let i = 0; i < xs.length; i++) {
    const inRegion = sign(i) > 0;
    if (inRegion) {
      if (!current.length && i > 0) {
        // Enter through the crossing point between i-1 and i.
        const t = sign(i - 1) / (sign(i - 1) - sign(i));
        const x = xs[i - 1] + t * (xs[i] - xs[i - 1]);
        const y = a[i - 1] + t * (a[i] - a[i - 1]);
        current.push([x, y, y]);
      }
      current.push([xs[i], a[i], b[i]]);
    } else if (current.length) {
      const t = sign(i - 1) / (sign(i - 1) - sign(i));
      const x = xs[i - 1] + t * (xs[i] - xs[i - 1]);
      const y = a[i - 1] + t * (a[i] - a[i - 1]);
      current.push([x, y, y]);
      out.push(current);
      current = [];
    }
  }
  if (current.length) out.push(current);
  return out;
}

export default function ProfileChart({ result }: { result: DemResult }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { distance_km: xs, elevation_m: elev, equal_area_line_m: eas, average_line_m: avg } = result.profile;

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const all = [...elev, ...eas, ...avg];
  const yLo = Math.min(...all);
  const yHi = Math.max(...all);
  const pad = (yHi - yLo) * 0.08 || 1;
  const yMin = yLo - pad;
  const yMax = yHi + pad;

  const sx = (v: number) => M.left + ((v - xMin) / (xMax - xMin || 1)) * PLOT_W;
  const sy = (v: number) => M.top + PLOT_H - ((v - yMin) / (yMax - yMin || 1)) * PLOT_H;

  const path = (ys: number[]) => xs.map((x, i) => `${i ? "L" : "M"}${sx(x).toFixed(2)} ${sy(ys[i]).toFixed(2)}`).join(" ");

  const poly = (band: Array<[number, number, number]>) => {
    const top = band.map(([x, a]) => `${sx(x).toFixed(2)},${sy(a).toFixed(2)}`);
    const bottom = band.slice().reverse().map(([x, , b]) => `${sx(x).toFixed(2)},${sy(b).toFixed(2)}`);
    return [...top, ...bottom].join(" ");
  };

  const xTicks = ticks(xMin, xMax);
  const yTicks = ticks(yMin, yMax);
  const cut = bands(xs, elev, eas, true);   // profile above the line — upstream cut
  const fill = bands(xs, elev, eas, false); // line above the profile — downstream fill

  function downloadPNG() {
    const svg = svgRef.current;
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `equal_area_slope_${result.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
  }

  const legend: Array<[string, string, string]> = [
    ["Longitudinal profile", "#000000", "line"],
    ["Equal area slope line", "#d62728", "dashed"],
    ["Average slope line", "#000000", "dotted"],
    ["Area below (cut — upstream)", "#7b3fbf", "swatch"],
    ["Area above (fill — downstream)", "#2e8b57", "swatch"],
  ];

  return (
    <div className="rounded-xl overflow-hidden tb-card">
      <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "var(--color-panel)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          📈 {result.id}
        </span>
        <button
          onClick={downloadPNG}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Download PNG
        </button>
      </div>

      <div className="overflow-x-auto" style={{ backgroundColor: "#ffffff" }}>
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 640, display: "block" }}>
          <rect x="0" y="0" width={W} height={H} fill="#ffffff" />
          <text x={W / 2} y="26" textAnchor="middle" fontFamily="sans-serif" fontSize="15" fill="#111111">
            Longitudinal profile with equal area and average slope lines ({result.id})
          </text>

          {/* Grid + axes */}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} y1={M.top} x2={sx(t)} y2={M.top + PLOT_H} stroke="#d9d9d9" strokeWidth="1" />
              <text x={sx(t)} y={M.top + PLOT_H + 20} textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#333333">
                {t.toFixed(Math.abs(t) < 10 ? 1 : 0)}
              </text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={M.left} y1={sy(t)} x2={M.left + PLOT_W} y2={sy(t)} stroke="#d9d9d9" strokeWidth="1" />
              <text x={M.left - 10} y={sy(t) + 4} textAnchor="end" fontFamily="sans-serif" fontSize="12" fill="#333333">
                {t.toFixed(0)}
              </text>
            </g>
          ))}
          <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} fill="none" stroke="#666666" strokeWidth="1" />

          {/* Cut / fill shading */}
          {cut.map((band, i) => (
            <polygon key={`c${i}`} points={poly(band)} fill="#7b3fbf" fillOpacity="0.3" />
          ))}
          {fill.map((band, i) => (
            <polygon key={`f${i}`} points={poly(band)} fill="#2e8b57" fillOpacity="0.3" />
          ))}

          {/* Lines */}
          <path d={path(avg)} fill="none" stroke="#000000" strokeWidth="1.4" strokeDasharray="2 4" />
          <path d={path(eas)} fill="none" stroke="#d62728" strokeWidth="1.8" strokeDasharray="8 5" />
          <path d={path(elev)} fill="none" stroke="#000000" strokeWidth="1.6" />

          {/* Axis labels */}
          <text x={M.left + PLOT_W / 2} y={H - 14} textAnchor="middle" fontFamily="sans-serif" fontSize="13" fill="#111111">
            Distance along main stream (km)
          </text>
          <text x="18" y={M.top + PLOT_H / 2} textAnchor="middle" fontFamily="sans-serif" fontSize="13" fill="#111111"
            transform={`rotate(-90 18 ${M.top + PLOT_H / 2})`}>
            Elevation (m)
          </text>

          {/* Legend */}
          <g transform={`translate(${M.left + 12}, ${M.top + 12})`}>
            <rect x="0" y="0" width="250" height={legend.length * 18 + 12} fill="#ffffff" fillOpacity="0.85" stroke="#bbbbbb" />
            {legend.map(([label, colour, kind], i) => (
              <g key={label} transform={`translate(10, ${14 + i * 18})`}>
                {kind === "swatch" ? (
                  <rect x="0" y="-6" width="20" height="9" fill={colour} fillOpacity="0.3" />
                ) : (
                  <line x1="0" y1="-2" x2="20" y2="-2" stroke={colour} strokeWidth="1.8"
                    strokeDasharray={kind === "dashed" ? "6 4" : kind === "dotted" ? "2 3" : undefined} />
                )}
                <text x="27" y="2" fontFamily="sans-serif" fontSize="11" fill="#111111">{label}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ backgroundColor: "var(--color-border)" }}>
        {[
          ["Length", `${result.length_km.toFixed(2)} km`],
          ["Equal area slope", `${result.equal_area_slope.toFixed(2)} m/km`],
          ["Average slope", `${result.average_slope.toFixed(2)} m/km`],
          ["Cut / fill area", `${result.area_cut.toFixed(3)} / ${result.area_fill.toFixed(3)}`],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-3" style={{ backgroundColor: "var(--color-panel)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
