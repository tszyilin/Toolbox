"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const INPUT_STYLE = {
  border: "1px solid var(--color-border)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
  backgroundColor: "var(--color-panel)",
  color: "var(--color-text-primary)",
};

interface Point { x: number; y: number }

type Method = "interpolated" | "extrapolated";

/** A solved point: the full (x, y) pair plus the two data points it was derived from. */
interface Solution {
  x: number;
  y: number;
  method: Method;
  p0: Point;
  p1: Point;
}

/** Given X, solve for Y. Linear interpolation, or extrapolation off either end. */
function solveY(data: Point[], queryX: number): Solution | null {
  if (data.length < 2) return null;
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;

  let p0: Point, p1: Point, method: Method;

  if (queryX <= sorted[0].x) {
    p0 = sorted[0]; p1 = sorted[1]; method = queryX === sorted[0].x ? "interpolated" : "extrapolated";
  } else if (queryX >= sorted[n - 1].x) {
    p0 = sorted[n - 2]; p1 = sorted[n - 1]; method = queryX === sorted[n - 1].x ? "interpolated" : "extrapolated";
  } else {
    const idx = sorted.findIndex(p => p.x > queryX);
    p0 = sorted[idx - 1]; p1 = sorted[idx]; method = "interpolated";
  }

  if (p1.x === p0.x) return null;
  const slope = (p1.y - p0.y) / (p1.x - p0.x);
  return { x: queryX, y: p0.y + slope * (queryX - p0.x), method, p0, p1 };
}

/**
 * Given Y, solve for X. Y need not be monotonic, so a query can cross several
 * segments — every crossing is returned. If nothing is crossed, the nearer end
 * segment is extrapolated.
 */
function solveX(data: Point[], queryY: number): Solution[] {
  if (data.length < 2) return [];
  const sorted = [...data].sort((a, b) => a.x - b.x);
  const n = sorted.length;
  const out: Solution[] = [];

  for (let i = 0; i < n - 1; i++) {
    const p0 = sorted[i], p1 = sorted[i + 1];
    if (p0.y === p1.y) continue;
    const lo = Math.min(p0.y, p1.y), hi = Math.max(p0.y, p1.y);
    if (queryY < lo || queryY > hi) continue;
    const x = p0.x + (queryY - p0.y) * (p1.x - p0.x) / (p1.y - p0.y);
    // A shared vertex sits in two segments — keep only the first hit.
    if (out.some(s => Math.abs(s.x - x) < 1e-12)) continue;
    out.push({ x, y: queryY, method: "interpolated", p0, p1 });
  }

  if (out.length > 0) return out.sort((a, b) => a.x - b.x);

  // No crossing: extrapolate from whichever end is closer in Y.
  const dFirst = Math.abs(queryY - sorted[0].y);
  const dLast = Math.abs(queryY - sorted[n - 1].y);
  const [p0, p1] = dFirst <= dLast ? [sorted[0], sorted[1]] : [sorted[n - 2], sorted[n - 1]];
  if (p0.y === p1.y) return [];
  const x = p0.x + (queryY - p0.y) * (p1.x - p0.x) / (p1.y - p0.y);
  return [{ x, y: queryY, method: "extrapolated", p0, p1 }];
}

/** One row of the input grid — kept as raw strings so partial typing survives. */
interface Row { x: string; y: string }

const BLANK_ROWS = 8;
const blankRows = (n: number): Row[] => Array.from({ length: n }, () => ({ x: "", y: "" }));

/** Split pasted / uploaded text into a grid of cells. */
function parseGrid(raw: string): string[][] {
  return raw.replace(/\r/g, "").split("\n")
    .filter(line => line.trim() !== "")
    .map(line => line.trim().split(/[\s,\t]+/));
}

function rowsFromText(raw: string): Row[] {
  const grid = parseGrid(raw)
    // Drop a header row like "X,Y".
    .filter((cells, i) => !(i === 0 && isNaN(parseFloat(cells[0]))));
  return grid.map(cells => ({ x: cells[0] ?? "", y: cells[1] ?? "" }));
}

function fmt(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(6);
}

export default function InterpolationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>(() => blankRows(BLANK_ROWS));
  const [queryInput, setQueryInput] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [queryMode, setQueryMode] = useState<"single" | "batch">("single");
  const [direction, setDirection] = useState<"getY" | "getX">("getY");

  // Which axis is being typed in, and which is being solved for.
  const fromLabel = direction === "getY" ? "X" : "Y";
  const toLabel = direction === "getY" ? "Y" : "X";

  const data = useMemo<Point[]>(() => rows.flatMap(r => {
    const x = parseFloat(r.x), y = parseFloat(r.y);
    return (isNaN(x) || isNaN(y)) ? [] : [{ x, y }];
  }), [rows]);
  const sorted = useMemo(() => [...data].sort((a, b) => a.x - b.x), [data]);

  const query = parseFloat(queryInput);

  const singleResults = useMemo<Solution[]>(() => {
    if (isNaN(query) || data.length < 2) return [];
    if (direction === "getY") {
      const r = solveY(data, query);
      return r ? [r] : [];
    }
    return solveX(data, query);
  }, [data, query, direction]);

  const batchResults = useMemo<Solution[]>(() => {
    if (queryMode !== "batch" || !batchInput.trim() || data.length < 2) return [];
    return batchInput.trim().split("\n").filter(Boolean).flatMap(line => {
      const q = parseFloat(line.trim());
      if (isNaN(q)) return [];
      if (direction === "getY") {
        const r = solveY(data, q);
        return r ? [r] : [];
      }
      return solveX(data, q);
    });
  }, [data, batchInput, queryMode, direction]);

  /**
   * Data rows merged with the solved rows, ordered by X, so a solution shows up
   * in place between the two points it came from.
   */
  const tableRows = useMemo(() => {
    const rows: { pt: Point; solved?: Solution }[] = sorted.map(pt => ({ pt }));
    for (const s of singleResults) rows.push({ pt: { x: s.x, y: s.y }, solved: s });
    return rows.sort((a, b) => a.pt.x - b.pt.x);
  }, [sorted, singleResults]);

  function handleFileChange(f: File) {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = rowsFromText(e.target?.result as string ?? "");
      setRows(parsed.length ? [...parsed, ...blankRows(2)] : blankRows(BLANK_ROWS));
    };
    reader.readAsText(f);
  }

  function updateCell(i: number, col: "x" | "y", value: string) {
    setRows(prev => {
      const next = prev.map((r, j) => (j === i ? { ...r, [col]: value } : r));
      // Keep a spare row at the bottom so the grid always has room to grow.
      if (i === next.length - 1 && value !== "") next.push({ x: "", y: "" });
      return next;
    });
  }

  /** Paste a whole block of cells straight into the grid, Excel-style. */
  function handlePaste(e: React.ClipboardEvent, i: number, col: "x" | "y") {
    const text = e.clipboardData.getData("text");
    const grid = parseGrid(text);
    // A plain single value pastes normally into the one cell.
    if (grid.length <= 1 && (grid[0]?.length ?? 0) <= 1) return;
    e.preventDefault();

    setRows(prev => {
      const next = [...prev];
      grid.forEach((cells, k) => {
        // Skip a header row like "X  Y".
        if (k === 0 && isNaN(parseFloat(cells[0]))) return;
        const target = i + k;
        while (next.length <= target) next.push({ x: "", y: "" });
        const row = { ...next[target] };
        if (col === "x") {
          row.x = cells[0] ?? row.x;
          if (cells.length > 1) row.y = cells[1];
        } else {
          row.y = cells[0] ?? row.y;
        }
        next[target] = row;
      });
      return [...next, { x: "", y: "" }];
    });
  }

  function deleteRow(i: number) {
    setRows(prev => {
      const next = prev.filter((_, j) => j !== i);
      return next.length ? next : blankRows(BLANK_ROWS);
    });
  }

  function clearRows() {
    setRows(blankRows(BLANK_ROWS));
    setFile(null);
  }

  function downloadBatchCSV() {
    if (!batchResults.length) return;
    const header = `Query ${fromLabel},${toLabel},Method,Lower X,Lower Y,Upper X,Upper Y`;
    const rows = batchResults.map(r =>
      `${direction === "getY" ? r.x : r.y},${(direction === "getY" ? r.y : r.x).toFixed(6)},${r.method},${r.p0.x},${r.p0.y},${r.p1.x},${r.p1.y}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "interpolation_results.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen tb-bg">
      <div className="px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-sm hover:underline transition-colors" style={{ color: "var(--color-text-secondary)" }}>← Back to Toolbox</Link>
          <h1 className="mt-3 text-3xl tb-h1">Interpolation / Extrapolation</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Fill the X / Y table then solve either way — enter X to get Y, or enter Y to get X.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Data input — an editable X / Y grid you can paste straight into */}
        <div className="rounded-xl shadow-sm p-6 space-y-3 tb-card">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Data</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Type values, or paste two columns straight from Excel into the X cell of any row.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 4l3-3 3 3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {file ? file.name : "Upload CSV"}
                <input type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
              </label>
              <button type="button" onClick={clearRows}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-y-auto rounded-xl" style={{ border: "1px solid var(--color-border)", maxHeight: "22rem" }}>
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--color-elevated)" }}>
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold w-12" style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>#</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>X</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>Y</th>
                  <th className="w-10" style={{ borderBottom: "1px solid var(--color-border)" }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const filled = r.x !== "" || r.y !== "";
                  const invalid = filled && (isNaN(parseFloat(r.x)) || isNaN(parseFloat(r.y)));
                  const cellStyle = {
                    width: "100%",
                    padding: "0.4rem 0.2rem",
                    fontSize: "0.8125rem",
                    fontFamily: "var(--font-geist-mono, monospace)",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: invalid ? "#F0D68A" : "var(--color-text-primary)",
                  };
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-3 text-xs select-none" style={{ color: "var(--color-text-secondary)" }}>{i + 1}</td>
                      <td className="px-3" style={{ borderLeft: "1px solid var(--color-border)" }}>
                        <input value={r.x} placeholder="—"
                          onChange={e => updateCell(i, "x", e.target.value)}
                          onPaste={e => handlePaste(e, i, "x")}
                          style={cellStyle} />
                      </td>
                      <td className="px-3" style={{ borderLeft: "1px solid var(--color-border)" }}>
                        <input value={r.y} placeholder="—"
                          onChange={e => updateCell(i, "y", e.target.value)}
                          onPaste={e => handlePaste(e, i, "y")}
                          style={cellStyle} />
                      </td>
                      <td className="pr-2 text-center">
                        {filled && (
                          <button type="button" onClick={() => deleteRow(i)} title="Delete row"
                            className="text-xs px-1.5 py-0.5 rounded transition-opacity opacity-40 hover:opacity-100"
                            style={{ color: "var(--color-text-secondary)" }}>
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: data.length ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
              {data.length > 0
                ? `✓ ${data.length} valid points · X range: ${sorted[0].x} – ${sorted[sorted.length - 1].x}`
                : "No valid points yet — each row needs a number in both X and Y."}
            </p>
            <button type="button" onClick={() => setRows(prev => [...prev, ...blankRows(5)])}
              className="text-xs font-medium transition-opacity opacity-70 hover:opacity-100"
              style={{ color: "var(--color-accent)" }}>
              + Add rows
            </button>
          </div>
        </div>

        {/* Query panel — only show once data is loaded */}
        {data.length >= 2 && (
          <div className="rounded-xl overflow-hidden tb-card">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "var(--color-panel)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>🔍 Query</span>
              {queryMode === "batch" && batchResults.length > 0 && (
                <button onClick={downloadBatchCSV}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  Download CSV
                </button>
              )}
            </div>

            {/* Direction: Get Y from X, or Get X from Y */}
            <div className="flex" style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-panel)" }}>
              {([["getY", "Get Y  (enter X)"], ["getX", "Get X  (enter Y)"]] as const).map(([d, label]) => (
                <button key={d} type="button" onClick={() => setDirection(d)}
                  className="px-4 py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: direction === d ? "var(--color-elevated)" : "transparent",
                    color: direction === d ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    borderBottom: direction === d ? "2px solid var(--color-accent)" : "2px solid transparent",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Sub-tabs: single / batch */}
            <div className="flex" style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-panel)" }}>
              {(["single", "batch"] as const).map(m => (
                <button key={m} type="button" onClick={() => setQueryMode(m)}
                  className="px-4 py-2.5 text-xs font-semibold transition-colors capitalize"
                  style={{
                    backgroundColor: queryMode === m ? "var(--color-elevated)" : "transparent",
                    color: queryMode === m ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    borderBottom: queryMode === m ? "2px solid var(--color-accent)" : "2px solid transparent",
                  }}>
                  {m === "single" ? "Single value" : "Batch values"}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4" style={{ backgroundColor: "var(--color-panel)" }}>
              {queryMode === "single" ? (
                <>
                  <div className="flex items-end gap-4">
                    <div className="w-48">
                      <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>{fromLabel} value</label>
                      <input
                        type="number" step="any" value={queryInput}
                        onChange={e => setQueryInput(e.target.value)}
                        placeholder={`Enter ${fromLabel} value…`}
                        style={INPUT_STYLE}
                      />
                    </div>
                    {singleResults.length > 0 && (
                      <div className="flex-1 space-y-2">
                        {singleResults.map((r, i) => {
                          const answer = direction === "getY" ? r.y : r.x;
                          return (
                            <div key={i} className="rounded-xl px-5 py-3 flex items-center justify-between"
                              style={{
                                backgroundColor: "var(--color-elevated)",
                                border: r.method === "interpolated" ? "1px solid var(--color-accent)" : "1px solid #7a6a3a",
                              }}>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                                  {toLabel} ({r.method}){singleResults.length > 1 ? ` · solution ${i + 1}` : ""}
                                </p>
                                <p className="text-2xl font-bold mt-0.5" style={{ color: r.method === "interpolated" ? "var(--color-accent)" : "#F0D68A" }}>{answer.toFixed(6)}</p>
                              </div>
                              <div className="text-right text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                <p>Between ({r.p0.x}, {r.p0.y}) → ({r.p1.x}, {r.p1.y})</p>
                                <p>slope = {((r.p1.y - r.p0.y) / (r.p1.x - r.p0.x)).toFixed(6)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {!isNaN(query) && singleResults.length === 0 && (
                    <p className="text-xs" style={{ color: "#F0D68A" }}>
                      No solution — the data never reaches {fromLabel} = {query} along a sloped segment.
                    </p>
                  )}

                  {/* Data table with the solved row(s) slotted in by X */}
                  {tableRows.length > 0 && (
                    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--color-border)" }}>
                      <table className="w-full text-sm">
                        <thead style={{ backgroundColor: "var(--color-elevated)" }}>
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-primary)" }}>X</th>
                            <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--color-text-primary)" }}>Y</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                          {tableRows.map((row, i) => {
                            if (row.solved) {
                              const s = row.solved;
                              return (
                                <tr key={i} style={{ backgroundColor: "var(--color-elevated)" }}>
                                  <td className="px-4 py-2 text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                                    ▶ {fmt(s.x)} <span className="font-normal opacity-70">({s.method})</span>
                                  </td>
                                  <td className="px-4 py-2 text-xs font-bold text-right" style={{ color: "var(--color-accent)" }}>{fmt(s.y)}</td>
                                </tr>
                              );
                            }
                            const bracket = singleResults.some(s => s.p0.x === row.pt.x || s.p1.x === row.pt.x);
                            return (
                              <tr key={i}
                                style={{ backgroundColor: bracket ? "var(--color-elevated)" : undefined }}
                                onMouseEnter={e => { if (!bracket) e.currentTarget.style.backgroundColor = "var(--color-elevated)"; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = bracket ? "var(--color-elevated)" : "transparent"; }}
                              >
                                <td className="px-4 py-2.5 font-medium" style={{ color: bracket ? "var(--color-accent)" : "var(--color-text-primary)" }}>{row.pt.x}</td>
                                <td className="px-4 py-2.5 text-right" style={{ color: bracket ? "var(--color-accent)" : "var(--color-text-primary)" }}>{row.pt.y}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                /* Batch mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                      {fromLabel} values — <span style={{ color: "var(--color-text-secondary)" }}>one per line</span>
                    </label>
                    <textarea
                      value={batchInput} onChange={e => setBatchInput(e.target.value)}
                      rows={6} placeholder={"1.5\n3.2\n7.8\n…"}
                      className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none resize-y tb-input"
                    />
                  </div>
                  {batchResults.length > 0 && (
                    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--color-border)" }}>
                      <table className="w-full text-sm">
                        <thead style={{ backgroundColor: "var(--color-elevated)" }}>
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Query {fromLabel}</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{toLabel}</th>
                            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Method</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Lower X</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Lower Y</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Upper X</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Upper Y</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                          {batchResults.map((r, i) => (
                            <tr key={i}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              <td className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }}>{direction === "getY" ? r.x : r.y}</td>
                              <td className="px-4 py-2.5 text-right font-semibold" style={{ color: "var(--color-accent)" }}>{(direction === "getY" ? r.y : r.x).toFixed(6)}</td>
                              <td className="px-4 py-2.5" style={{ color: r.method === "extrapolated" ? "#F0D68A" : "var(--color-text-primary)" }}>{r.method}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: "var(--color-text-primary)" }}>{r.p0.x}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: "var(--color-text-primary)" }}>{r.p0.y}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: "var(--color-text-primary)" }}>{r.p1.x}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: "var(--color-text-primary)" }}>{r.p1.y}</td>
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
