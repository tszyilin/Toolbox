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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
    <main className="min-h-screen" style={{ backgroundColor: "#8CB6D0" }}>
      {/* Blue header band */}
      <div className="px-6 py-8" style={{ backgroundColor: "#1A72B5" }}>
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-sm hover:underline" style={{ color: "#E4D9B6" }}>
            ← Back to Toolbox
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white">Equal Area Slope</h1>
          <p className="mt-1 text-sm" style={{ color: "#E4D9B6" }}>
            Upload a CSV with survey data. Distance in metres, elevation in metres. Output in m/km.
          </p>
        </div>
      </div>
      {/* Content on #8CB6D0 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-8 space-y-6"
          style={{ border: "1px solid #8CB6D0" }}
        >
          {/* Mode tabs */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #8CB6D0" }}>
            <div className="flex" style={{ borderBottom: "1px solid #8CB6D0", backgroundColor: "#EDF4F9" }}>
              {(["upload", "paste"] as const).map((m) => (
                <button
                  key={m} type="button" onClick={() => setMode(m)}
                  className="px-4 py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: mode === m ? "white" : "transparent",
                    color: mode === m ? "#1A72B5" : "#1e2a35",
                    borderBottom: mode === m ? "2px solid #1A72B5" : "2px solid transparent",
                  }}
                >
                  {m === "upload" ? "Upload CSV" : "Paste Data"}
                </button>
              ))}
            </div>

            <div className="p-5" style={{ backgroundColor: mode === "upload" ? "#EDF4F9" : "white" }}>
              {mode === "upload" ? (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#8CB6D0" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 4h8l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#1A72B5" strokeWidth="1.5" fill="none"/>
                      <path d="M12 4v4h4M10 9v6M7 12l3-3 3 3" stroke="#1A72B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-0.5" style={{ color: "#1e2a35" }}>Upload Survey CSV</p>
                    <p className="text-xs mb-3" style={{ color: "#1A72B5" }}>
                      CSV with columns for line ID, elevation (m), and distance (m). One row per survey point.
                    </p>
                    <label
                      className="inline-flex items-center gap-2 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: "#1A72B5" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#145D96")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1A72B5")}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v8M4 4l3-3 3 3M2 11h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {file ? file.name : "Choose CSV file"}
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {file && <p className="mt-2 text-xs" style={{ color: "#1A72B5" }}>✓ {file.name}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#1e2a35" }}>Line ID</label>
                    <input
                      type="text" value={pastedLineId} onChange={(e) => setPastedLineId(e.target.value)}
                      placeholder="e.g. Line 1"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ border: "1px solid #8CB6D0", color: "#1e2a35" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#1e2a35" }}>
                      Paste distance / elevation data <span style={{ color: "#1A72B5" }}>(tab or space separated, one point per line)</span>
                    </label>
                    <textarea
                      value={pastedData} onChange={(e) => setPastedData(e.target.value)}
                      rows={8} placeholder={"0.0\t370.54\n35.63\t369.15\n71.26\t371.23\n…"}
                      className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none resize-y"
                      style={{ border: "1px solid #8CB6D0", color: "#1e2a35" }}
                    />
                    {pastedData.trim() && (
                      <p className="mt-1 text-xs" style={{ color: "#1A72B5" }}>
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
                <label className="block text-sm font-medium mb-1" style={{ color: "#1e2a35" }}>{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ border: "1px solid #8CB6D0", "--tw-ring-color": "#1A72B5" } as React.CSSProperties}
                />
              </div>
            ))}
          </div>}

          <button
            type="submit"
            disabled={loading || (mode === "upload" && !file) || (mode === "paste" && !pastedData.trim())}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: "#1A72B5" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#145D96")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1A72B5")}
          >
            {loading ? "Calculating…" : "Calculate"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 rounded-xl overflow-hidden" style={{ border: "1px solid #8CB6D0" }}>
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "#1A72B5" }}>
              <span className="text-sm font-semibold text-white">📐 Results</span>
              <button
                onClick={downloadCSV}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "white", color: "#1A72B5" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E4D9B6")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
              >
                Download CSV
              </button>
            </div>
            {/* Table */}
            <div className="overflow-x-auto" style={{ backgroundColor: "white" }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: "#8CB6D0" }}>
                  <tr>
                    {[idColKey, "EAS [m/km]", "Length [km]", "Outlet Elevation [m RL]", "Hydraulic Slope [m/m]"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "#E4D9B6" }}>
                  {results.map((row, i) => (
                    <tr key={i}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f7f5f0")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                    >
                      <td className="px-4 py-2.5 font-medium" style={{ color: "#1e2a35" }}>{String(row[idColKey])}</td>
                      <td className="px-4 py-2.5" style={{ color: "#1e2a35" }}>{Number(row.eas_m_per_km).toFixed(4)}</td>
                      <td className="px-4 py-2.5" style={{ color: "#1e2a35" }}>{Number(row.length_km).toFixed(4)}</td>
                      <td className="px-4 py-2.5" style={{ color: "#1e2a35" }}>{Number(row.outlet_elevation_m).toFixed(4)}</td>
                      <td className="px-4 py-2.5" style={{ color: "#1e2a35" }}>{Number(row.hydraulic_slope).toFixed(6)}</td>
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
