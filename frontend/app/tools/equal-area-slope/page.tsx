"use client";

import { useState } from "react";
import Link from "next/link";

interface Result {
  [key: string]: string | number;
  eas_m_per_km: number;
  length_km: number;
  outlet_elevation_m: number;
  hydraulic_slope: number;
}

const _RAW_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_URL = _RAW_URL.startsWith("http") ? _RAW_URL : `https://${_RAW_URL}`;

export default function EqualAreaSlopePage() {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pastedData, setPastedData] = useState("");
  const [pastedLineId, setPastedLineId] = useState("Line 1");
  const [linesIdCol, setLinesIdCol] = useState("id");
  const [elevCol, setElevCol] = useState("Elev1");
  const [distCol, setDistCol] = useState("distance");
  const [results, setResults] = useState<Result[]>([]);
  const [idColKey, setIdColKey] = useState<string>("id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pastedDataToFile(): File {
    const rows = pastedData.trim().split("\n").filter(Boolean);
    const csvLines = ["id,distance,Elev1"];
    for (const row of rows) {
      const parts = row.trim().split(/\s+/);
      if (parts.length >= 2) {
        csvLines.push(`${pastedLineId},${parts[0]},${parts[1]}`);
      }
    }
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    return new File([blob], "pasted_data.csv", { type: "text/csv" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResults([]);

    const form = new FormData();
    if (mode === "paste") {
      if (!pastedData.trim()) { setError("Please paste some data first."); setLoading(false); return; }
      form.append("file", pastedDataToFile());
      form.append("lines_id_col", "id");
      form.append("elev_col", "Elev1");
      form.append("dist_col", "distance");
    } else {
      if (!file) { setLoading(false); return; }
      form.append("file", file);
      form.append("lines_id_col", linesIdCol);
      form.append("elev_col", elevCol);
      form.append("dist_col", distCol);
    }

    try {
      const res = await fetch(`${API_URL}/tools/equal-area-slope/calculate`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data = await res.json();
      setResults(data.results);
      setIdColKey(linesIdCol);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!results.length) return;
    const headers = [idColKey, "EAS [m/km]", "Length [km]", "Outlet Elevation [m RL]", "Hydraulic Slope [m/m]"];
    const rows = results.map((r) => [
      r[idColKey],
      r.eas_m_per_km,
      r.length_km,
      r.outlet_elevation_m,
      r.hydraulic_slope,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "equal_area_slope_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen tb-bg">
      {/* Header */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-sm hover:underline transition-colors" style={{ color: "var(--color-text-secondary)" }}>
            ← Back to Toolbox
          </Link>
          <h1 className="mt-3 text-3xl tb-h1">Equal Area Slope</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Upload a CSV with survey data. Distance in metres, elevation in metres. Output in m/km.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-6 tb-card"
        >
          {/* Mode tabs */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
            <div className="flex" style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-panel)" }}>
              {(["upload", "paste"] as const).map((m) => (
                <button
                  key={m} type="button" onClick={() => setMode(m)}
                  className="px-4 py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: mode === m ? "var(--color-elevated)" : "transparent",
                    color: mode === m ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    borderBottom: mode === m ? "2px solid var(--color-accent)" : "2px solid transparent",
                  }}
                >
                  {m === "upload" ? "Upload CSV" : "Paste Data"}
                </button>
              ))}
            </div>

            <div className="p-5" style={{ backgroundColor: "var(--color-panel)" }}>
              {mode === "upload" ? (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-elevated)" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 4h8l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="var(--color-text-secondary)" strokeWidth="1.5" fill="none"/>
                      <path d="M12 4v4h4M10 9v6M7 12l3-3 3 3" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--color-text-primary)" }}>Upload Survey CSV</p>
                    <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
                      CSV with columns for line ID, elevation (m), and distance (m). One row per survey point.
                    </p>
                    <label
                      className="inline-flex items-center gap-2 cursor-pointer rounded-lg px-4 py-2 text-sm transition-colors tb-btn-primary"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v8M4 4l3-3 3 3M2 11h10" stroke="var(--color-accent-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {file ? file.name : "Choose CSV file"}
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {file && <p className="mt-2 text-xs" style={{ color: "var(--color-accent)" }}>✓ {file.name}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Line ID</label>
                    <input
                      type="text" value={pastedLineId} onChange={(e) => setPastedLineId(e.target.value)}
                      placeholder="e.g. Line 1"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none tb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                      Paste distance / elevation data <span style={{ color: "var(--color-text-secondary)" }}>(tab or space separated, one point per line)</span>
                    </label>
                    <textarea
                      value={pastedData} onChange={(e) => setPastedData(e.target.value)}
                      rows={8} placeholder={"0.0\t370.54\n35.63\t369.15\n71.26\t371.23\n…"}
                      className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none resize-y tb-input"
                    />
                    {pastedData.trim() && (
                      <p className="mt-1 text-xs" style={{ color: "var(--color-accent)" }}>
                        ✓ {pastedData.trim().split("\n").filter(Boolean).length} points detected
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {mode === "upload" && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Line ID Column", value: linesIdCol, setter: setLinesIdCol, placeholder: "e.g. id" },
              { label: "Elevation Column", value: elevCol, setter: setElevCol, placeholder: "e.g. Elev1" },
              { label: "Distance Column", value: distCol, setter: setDistCol, placeholder: "e.g. distance" },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 tb-input"
                  style={{ "--tw-ring-color": "var(--color-accent)" } as React.CSSProperties}
                />
              </div>
            ))}
          </div>}

          <button
            type="submit"
            disabled={loading || (mode === "upload" && !file) || (mode === "paste" && !pastedData.trim())}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors tb-btn-primary"
          >
            {loading ? "Calculating…" : "Calculate"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-lg px-4 py-3 text-sm" style={{ background: "#2a1414", border: "1px solid #5c2323", color: "#f2a8a8" }}>
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 rounded-xl overflow-hidden tb-card">
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "var(--color-panel)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>📐 Results</span>
              <button
                onClick={downloadCSV}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                Download CSV
              </button>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: "var(--color-elevated)" }}>
                  <tr>
                    {[idColKey, "EAS [m/km]", "Length [km]", "Outlet Elevation [m RL]", "Hydraulic Slope [m/m]"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {results.map((row, i) => (
                    <tr key={i}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }}>{String(row[idColKey])}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-text-primary)" }}>{Number(row.eas_m_per_km).toFixed(4)}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-text-primary)" }}>{Number(row.length_km).toFixed(4)}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-text-primary)" }}>{Number(row.outlet_elevation_m).toFixed(4)}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--color-text-primary)" }}>{Number(row.hydraulic_slope).toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>

  );
}
