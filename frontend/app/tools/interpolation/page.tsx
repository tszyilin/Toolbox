"use client";

import { useState, useMemo, Fragment } from "react";
import Link from "next/link";

const INPUT_STYLE = {
  border: "1px solid #8CB6D0",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
  backgroundColor: "white",
  color: "#1e2a35",
};

interface Point { x: number; y: number }

interface InterpResult {
  y: number;
  method: "interpolated" | "extrapolated";
  p0: Point;
  p1: Point;
}

function linearInterp(data: Point[], queryX: number): InterpResult | null {
  if (data.length < 2) return null;
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  let p0: Point, p1: Point, method: "interpolated" | "extrapolated";

  if (queryX <= sorted[0].x) {
    p0 = sorted[0]; p1 = sorted[1]; method = "extrapolated";
  } else if (queryX >= sorted[n - 1].x) {
    p0 = sorted[n - 2]; p1 = sorted[n - 1]; method = "extrapolated";
  } else {
    const idx = sorted.findIndex(p => p.x > queryX);
    p0 = sorted[idx - 1]; p1 = sorted[idx]; method = "interpolated";
  }

  const slope = (p1.y - p0.y) / (p1.x - p0.x);
  const y = p0.y + slope * (queryX - p0.x);
  return { y, method, p0, p1 };
}

function parseData(raw: string): Point[] {
  return raw.trim().split("\n").filter(Boolean).flatMap(line => {
    const parts = line.trim().split(/[\s,\t]+/);
    if (parts.length < 2) return [];
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    if (isNaN(x) || isNaN(y)) return [];
    return [{ x, y }];
  });
}

export default function InterpolationPage() {
  const [mode, setMode] = useState<"upload" | "paste">("paste");
  const [file, setFile] = useState<File | null>(null);
  const [pastedData, setPastedData] = useState("");
  const [fileData, setFileData] = useState("");
  const [xLabel, setXLabel] = useState("X");
  const [yLabel, setYLabel] = useState("Y");
  const [queryInput, setQueryInput] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [queryMode, setQueryMode] = useState<"single" | "batch">("single");

  const rawText = mode === "paste" ? pastedData : fileData;
  const data = useMemo(() => parseData(rawText), [rawText]);
  const sorted = useMemo(() => [...data].sort((a, b) => a.x - b.x), [data]);

  const queryX = parseFloat(queryInput);
  const singleResult = useMemo(() => {
    if (!isNaN(queryX) && data.length >= 2) return linearInterp(data, queryX);
    return null;
  }, [data, queryX]);

  const batchResults = useMemo(() => {
    if (queryMode !== "batch" || !batchInput.trim() || data.length < 2) return [];
    return batchInput.trim().split("\n").filter(Boolean).map(line => {
      const x = parseFloat(line.trim());
      if (isNaN(x)) return null;
      const r = linearInterp(data, x);
      return r ? { x, ...r } : null;
    }).filter(Boolean) as (InterpResult & { x: number })[];
  }, [data, batchInput, queryMode]);

  function handleFileChange(f: File) {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setFileData(e.target?.result as string ?? "");
    reader.readAsText(f);
  }

  function downloadBatchCSV() {
    if (!batchResults.length) return;
    const header = `Query ${xLabel},${yLabel},Method,Lower ${xLabel},Lower ${yLabel},Upper ${xLabel},Upper ${yLabel}`;
    const rows = batchResults.map(r =>
      `${r.x},${r.y.toFixed(6)},${r.method},${r.p0.x},${r.p0.y},${r.p1.x},${r.p1.y}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "interpolation_results.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#8CB6D0" }}>
      <div className="px-6 py-8" style={{ backgroundColor: "#1A72B5" }}>
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-sm hover:underline" style={{ color: "#E4D9B6" }}>← Back to Toolbox</Link>
          <h1 className="mt-3 text-3xl font-bold text-white">Interpolation / Extrapolation</h1>
          <p className="mt-1 text-sm" style={{ color: "#E4D9B6" }}>
            Paste or upload X,Y data then query any X value — interpolates between points or extrapolates beyond the range.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Data input */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: "1px solid #8CB6D0" }}>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#1e2a35" }}>X axis label</label>
              <input value={xLabel} onChange={e => setXLabel(e.target.value)} style={{ ...INPUT_STYLE, width: "120px" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#1e2a35" }}>Y axis label</label>
              <input value={yLabel} onChange={e => setYLabel(e.target.value)} style={{ ...INPUT_STYLE, width: "120px" }} />
            </div>
          </div>

          {/* Mode tabs */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #8CB6D0" }}>
            <div className="flex" style={{ borderBottom: "1px solid #8CB6D0", backgroundColor: "#EDF4F9" }}>
              {(["paste", "upload"] as const).map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className="px-4 py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: mode === m ? "white" : "transparent",
                    color: mode === m ? "#1A72B5" : "#1e2a35",
                    borderBottom: mode === m ? "2px solid #1A72B5" : "2px solid transparent",
                  }}>
                  {m === "paste" ? "Paste Data" : "Upload CSV"}
                </button>
              ))}
            </div>

            <div className="p-5" style={{ backgroundColor: mode === "paste" ? "white" : "#EDF4F9" }}>
              {mode === "paste" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold" style={{ color: "#1e2a35" }}>
                    Paste X, Y data — <span style={{ color: "#1A72B5" }}>tab, space, or comma separated · one point per line</span>
                  </label>
                  <textarea
                    value={pastedData} onChange={e => setPastedData(e.target.value)}
                    rows={8} placeholder={"0.0\t10.5\n1.0\t12.3\n2.5\t15.8\n…"}
                    className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none resize-y"
                    style={{ border: "1px solid #8CB6D0", color: "#1e2a35" }}
                  />
                  {data.length > 0 && (
                    <p className="text-xs" style={{ color: "#1A72B5" }}>✓ {data.length} points · X range: {sorted[0].x} – {sorted[sorted.length-1].x}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#8CB6D0" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 4h8l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#1A72B5" strokeWidth="1.5" fill="none"/>
                      <path d="M12 4v4h4M10 9v6M7 12l3-3 3 3" stroke="#1A72B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-0.5" style={{ color: "#1e2a35" }}>Upload CSV</p>
                    <p className="text-xs mb-3" style={{ color: "#1A72B5" }}>Two columns: X and Y. Header row optional.</p>
                    <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: "#1A72B5" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#145D96")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1A72B5")}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v8M4 4l3-3 3 3M2 11h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {file ? file.name : "Choose CSV file"}
                      <input type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
                    </label>
                    {data.length > 0 && (
                      <p className="mt-2 text-xs" style={{ color: "#1A72B5" }}>✓ {data.length} points · X range: {sorted[0].x} – {sorted[sorted.length-1].x}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Query panel — only show once data is loaded */}
        {data.length >= 2 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #8CB6D0" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "#1A72B5" }}>
              <span className="text-sm font-semibold text-white">🔍 Query</span>
              {queryMode === "batch" && batchResults.length > 0 && (
                <button onClick={downloadBatchCSV}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: "white", color: "#1A72B5" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#E4D9B6")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}>
                  Download CSV
                </button>
              )}
            </div>

            {/* Sub-tabs: single / batch */}
            <div className="flex" style={{ borderBottom: "1px solid #8CB6D0", backgroundColor: "#EDF4F9" }}>
              {(["single", "batch"] as const).map(m => (
                <button key={m} type="button" onClick={() => setQueryMode(m)}
                  className="px-4 py-2.5 text-xs font-semibold transition-colors capitalize"
                  style={{
                    backgroundColor: queryMode === m ? "white" : "transparent",
                    color: queryMode === m ? "#1A72B5" : "#1e2a35",
                    borderBottom: queryMode === m ? "2px solid #1A72B5" : "2px solid transparent",
                  }}>
                  {m === "single" ? "Single value" : "Batch values"}
                </button>
              ))}
            </div>

            <div className="p-5 bg-white space-y-4">
              {queryMode === "single" ? (
                <>
                  <div className="flex items-end gap-4">
                    <div className="w-48">
                      <label className="block text-xs font-semibold mb-1" style={{ color: "#1e2a35" }}>Query {xLabel}</label>
                      <input
                        type="number" step="any" value={queryInput}
                        onChange={e => setQueryInput(e.target.value)}
                        placeholder="Enter X value…"
                        style={INPUT_STYLE}
                      />
                    </div>
                    {singleResult && (
                      <div className="flex-1 rounded-xl px-5 py-3 flex items-center justify-between"
                        style={{ backgroundColor: singleResult.method === "interpolated" ? "#1A72B5" : "#145D96" }}>
                        <div>
                          <p className="text-xs text-white/70 font-semibold uppercase tracking-widest">{yLabel} ({singleResult.method})</p>
                          <p className="text-2xl font-bold text-white mt-0.5">{singleResult.y.toFixed(6)}</p>
                        </div>
                        <div className="text-right text-xs text-white/60">
                          <p>Between {xLabel} {singleResult.p0.x} → {singleResult.p1.x}</p>
                          <p>slope = {((singleResult.p1.y - singleResult.p0.y) / (singleResult.p1.x - singleResult.p0.x)).toFixed(6)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Data table with highlight */}
                  {sorted.length > 0 && (
                    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #8CB6D0" }}>
                      <table className="w-full text-sm">
                        <thead style={{ backgroundColor: "#8CB6D0" }}>
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold" style={{ color: "#1e2a35" }}>{xLabel}</th>
                            <th className="px-4 py-3 text-right font-semibold" style={{ color: "#1e2a35" }}>{yLabel}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "#E4D9B6" }}>
                          {singleResult && !isNaN(queryX) && (queryX < sorted[0].x) && (
                            <tr style={{ backgroundColor: "#EDF4F9" }}>
                              <td className="px-4 py-2 text-xs font-semibold" style={{ color: "#1A72B5" }}>
                                ▶ {queryX} <span className="font-normal opacity-70">(extrapolated)</span>
                              </td>
                              <td className="px-4 py-2 text-xs font-bold text-right" style={{ color: "#1A72B5" }}>{singleResult.y.toFixed(6)}</td>
                            </tr>
                          )}
                          {sorted.map((pt, i) => {
                            const isLower = singleResult && pt.x === singleResult.p0.x;
                            const isUpper = singleResult && pt.x === singleResult.p1.x;
                            const insertAfter = singleResult && !isNaN(queryX)
                              && queryX > sorted[0].x && queryX < sorted[sorted.length-1].x
                              && pt.x < queryX && (i === sorted.length - 1 || sorted[i+1].x >= queryX);
                            return (
                              <Fragment key={i}>
                                <tr
                                  style={{ backgroundColor: (isLower || isUpper) ? "#EDF4F9" : undefined }}
                                  onMouseEnter={e => { if (!isLower && !isUpper) e.currentTarget.style.backgroundColor = "#f7f5f0"; }}
                                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = (isLower || isUpper) ? "#EDF4F9" : "#ffffff"; }}
                                >
                                  <td className="px-4 py-2.5 font-medium" style={{ color: (isLower || isUpper) ? "#1A72B5" : "#1e2a35" }}>{pt.x}</td>
                                  <td className="px-4 py-2.5 text-right" style={{ color: (isLower || isUpper) ? "#1A72B5" : "#1e2a35" }}>{pt.y}</td>
                                </tr>
                                {insertAfter && (
                                  <tr style={{ backgroundColor: "#EDF4F9" }}>
                                    <td className="px-4 py-2 text-xs font-semibold" style={{ color: "#1A72B5" }}>
                                      ▶ {queryX} <span className="font-normal opacity-70">(interpolated)</span>
                                    </td>
                                    <td className="px-4 py-2 text-xs font-bold text-right" style={{ color: "#1A72B5" }}>{singleResult!.y.toFixed(6)}</td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                          {singleResult && !isNaN(queryX) && queryX > sorted[sorted.length-1].x && (
                            <tr style={{ backgroundColor: "#EDF4F9" }}>
                              <td className="px-4 py-2 text-xs font-semibold" style={{ color: "#1A72B5" }}>
                                ▶ {queryX} <span className="font-normal opacity-70">(extrapolated)</span>
                              </td>
                              <td className="px-4 py-2 text-xs font-bold text-right" style={{ color: "#1A72B5" }}>{singleResult.y.toFixed(6)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                /* Batch mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#1e2a35" }}>
                      Query {xLabel} values — <span style={{ color: "#1A72B5" }}>one per line</span>
                    </label>
                    <textarea
                      value={batchInput} onChange={e => setBatchInput(e.target.value)}
                      rows={6} placeholder={"1.5\n3.2\n7.8\n…"}
                      className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none resize-y"
                      style={{ border: "1px solid #8CB6D0", color: "#1e2a35" }}
                    />
                  </div>
                  {batchResults.length > 0 && (
                    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #8CB6D0" }}>
                      <table className="w-full text-sm">
                        <thead style={{ backgroundColor: "#8CB6D0" }}>
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>Query {xLabel}</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>{yLabel}</th>
                            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>Method</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>Lower {xLabel}</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>Lower {yLabel}</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>Upper {xLabel}</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>Upper {yLabel}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "#E4D9B6" }}>
                          {batchResults.map((r, i) => (
                            <tr key={i}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f7f5f0")}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}
                            >
                              <td className="px-4 py-2.5 font-medium" style={{ color: "#1e2a35" }}>{r.x}</td>
                              <td className="px-4 py-2.5 text-right font-semibold" style={{ color: "#1A72B5" }}>{r.y.toFixed(6)}</td>
                              <td className="px-4 py-2.5" style={{ color: r.method === "extrapolated" ? "#145D96" : "#1e2a35" }}>{r.method}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: "#1e2a35" }}>{r.p0.x}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: "#1e2a35" }}>{r.p0.y}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: "#1e2a35" }}>{r.p1.x}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: "#1e2a35" }}>{r.p1.y}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
