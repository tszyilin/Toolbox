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
  const [file, setFile] = useState<File | null>(null);
  const [linesIdCol, setLinesIdCol] = useState("id");
  const [elevCol, setElevCol] = useState("Elev1");
  const [distCol, setDistCol] = useState("distance");
  const [results, setResults] = useState<Result[]>([]);
  const [idColKey, setIdColKey] = useState<string>("id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults([]);

    const form = new FormData();
    form.append("file", file);
    form.append("lines_id_col", linesIdCol);
    form.append("elev_col", elevCol);
    form.append("dist_col", distCol);

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
    <main className="min-h-screen" style={{ backgroundColor: "#BDCDD6" }}>
      {/* Blue header band */}
      <div className="px-6 py-8" style={{ backgroundColor: "#6096B4" }}>
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-sm hover:underline" style={{ color: "#EEE9DA" }}>
            ← Back to Toolbox
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white">Equal Area Slope</h1>
          <p className="mt-1 text-sm" style={{ color: "#EEE9DA" }}>
            Upload a CSV with survey data. Distance in metres, elevation in metres. Output in m/km.
          </p>
        </div>
      </div>
      {/* Content on #BDCDD6 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-8 space-y-6"
          style={{ border: "1px solid #BDCDD6" }}
        >
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#1e2a35" }}>CSV File</label>
            <input
              type="file"
              accept=".csv"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 cursor-pointer
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-semibold file:text-white"
              style={{ "--file-bg": "#6096B4" } as React.CSSProperties}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  style={{ border: "1px solid #BDCDD6", "--tw-ring-color": "#6096B4" } as React.CSSProperties}
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: "#6096B4" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#4d7d99")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6096B4")}
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
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "#1e2a35" }}>Results</h2>
              <button
                onClick={downloadCSV}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white"
                style={{ border: "1px solid #BDCDD6", color: "#6096B4" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EEE9DA")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
              >
                Download CSV
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl shadow-sm" style={{ border: "1px solid #BDCDD6" }}>
              <table className="w-full text-sm">
                <thead className="text-left" style={{ backgroundColor: "#BDCDD6" }}>
                  <tr>
                    {[idColKey, "EAS [m/km]", "Length [km]", "Outlet Elevation [m RL]", "Hydraulic Slope [m/m]"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold" style={{ color: "#1e2a35" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y" style={{ borderColor: "#EEE9DA" }}>
                  {results.map((row, i) => (
                    <tr key={i} className="transition-colors" style={{ color: "#1e2a35" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f7f5f0")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                    >
                      <td className="px-4 py-3 font-medium">{String(row[idColKey])}</td>
                      <td className="px-4 py-3">{row.eas_m_per_km}</td>
                      <td className="px-4 py-3">{row.length_km}</td>
                      <td className="px-4 py-3">{row.outlet_elevation_m}</td>
                      <td className="px-4 py-3">{row.hydraulic_slope}</td>
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
