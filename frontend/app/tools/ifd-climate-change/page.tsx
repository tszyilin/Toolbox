"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Options {
  ssps: string[];
  time_periods: string[];
  nrm_clusters: string[];
}

interface LossResult {
  initial_loss_original?: number;
  initial_loss_adjusted?: number;
  continuing_loss_original?: number;
  continuing_loss_adjusted?: number;
}

interface CalcResult {
  delta_t: number;
  ssp: string;
  time_period: string;
  delta_t_choice: string;
  orientation: string;
  original: Record<string, number | string>[];
  adjusted: Record<string, number | string>[];
  dur_hrs: number[];
  aep_cols: string[];
  index_col: string;
  loss: LossResult | null;
}

const INPUT_STYLE = {
  border: "1px solid #BDCDD6",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
  backgroundColor: "white",
  color: "#1e2a35",
};

const LABEL_STYLE = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  marginBottom: "0.25rem",
  color: "#1e2a35",
} as React.CSSProperties;

export default function IFDClimateChangePage() {
  const [options, setOptions] = useState<Options | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ssp, setSsp] = useState("");
  const [timePeriod, setTimePeriod] = useState("");
  const [deltaTChoice, setDeltaTChoice] = useState("median");
  const [nrmCluster, setNrmCluster] = useState("");
  const [initialLoss, setInitialLoss] = useState("");
  const [continuingLoss, setContinuingLoss] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/tools/ifd-climate-change/options`)
      .then((r) => r.json())
      .then((data) => {
        setOptions(data);
        setSsp(data.ssps[1]); // default SSP2-4.5
        setTimePeriod(data.time_periods[1]); // default medium-term
      })
      .catch(() => setError("Could not load options from API."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    form.append("ssp", ssp);
    form.append("time_period", timePeriod);
    form.append("delta_t_choice", deltaTChoice);
    if (nrmCluster) form.append("nrm_cluster", nrmCluster);
    if (initialLoss) form.append("initial_loss", initialLoss);
    if (continuingLoss) form.append("continuing_loss", continuingLoss);

    try {
      const res = await fetch(`${API_URL}/tools/ifd-climate-change/calculate`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!result) return;
    const idxCol = result.index_col;
    const cols = [idxCol, ...result.aep_cols];
    const header = cols.join(",");
    const origRows = result.original.map((row) => cols.map((c) => row[c] ?? "").join(","));
    const adjRows = result.adjusted.map((row) => cols.map((c) => row[c] ?? "").join(","));
    const csv = [
      "ORIGINAL IFD",
      header,
      ...origRows,
      "",
      `ADJUSTED IFD (${result.ssp} ${result.time_period} ${result.delta_t_choice} dT=${result.delta_t}degC)`,
      header,
      ...adjRows,
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ifd_climate_adjusted.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const aepCols = result?.aep_cols ?? [];

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#BDCDD6" }}>
      {/* Blue header band */}
      <div className="px-6 py-8" style={{ backgroundColor: "#6096B4" }}>
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-sm hover:underline" style={{ color: "#EEE9DA" }}>
            ← Back to Toolbox
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white">
            IFD Climate Change Adjustment
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#EEE9DA" }}>
            Adjusts 2016 IFD curves for climate change per ARR Book 1 Chapter 6 (Eq. 1.6.1).
            Upload the CSV exported directly from the BOM 2016 IFD portal.
          </p>
        </div>
      </div>
      {/* Content on #BDCDD6 */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-8 space-y-6"
          style={{ border: "1px solid #BDCDD6" }}
        >
          {/* IFD Upload */}
          <div>
            <label style={LABEL_STYLE}>IFD Table (CSV)</label>
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
            <p className="mt-1 text-xs text-gray-400">
              First column = AEP (e.g. "1%", "2%"). Remaining columns = duration in hours (e.g. "1", "6", "24").
            </p>
          </div>

          {/* Climate scenario */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label style={LABEL_STYLE}>Climate Scenario (SSP)</label>
              <select value={ssp} onChange={(e) => setSsp(e.target.value)} style={INPUT_STYLE} required>
                {options?.ssps?.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Time Period</label>
              <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} style={INPUT_STYLE} required>
                {options?.time_periods?.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>ΔT Estimate</label>
              <select value={deltaTChoice} onChange={(e) => setDeltaTChoice(e.target.value)} style={INPUT_STYLE}>
                <option value="median">Median (recommended)</option>
                <option value="low">Low (90% interval)</option>
                <option value="high">High (90% interval)</option>
              </select>
            </div>
          </div>

          {/* Loss parameters (optional) */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: "#6096B4" }}>
              Loss Parameters (optional)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label style={LABEL_STYLE}>NRM Cluster</label>
                <select value={nrmCluster} onChange={(e) => setNrmCluster(e.target.value)} style={INPUT_STYLE}>
                  <option value="">— Skip loss adjustment —</option>
                  {options?.nrm_clusters?.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Initial Loss IL (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={initialLoss}
                  onChange={(e) => setInitialLoss(e.target.value)}
                  placeholder="e.g. 15.0"
                  disabled={!nrmCluster}
                  style={{ ...INPUT_STYLE, opacity: nrmCluster ? 1 : 0.4 }}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Continuing Loss CL (mm/hr)</label>
                <input
                  type="number"
                  step="0.1"
                  value={continuingLoss}
                  onChange={(e) => setContinuingLoss(e.target.value)}
                  placeholder="e.g. 2.5"
                  disabled={!nrmCluster}
                  style={{ ...INPUT_STYLE, opacity: nrmCluster ? 1 : 0.4 }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file || !ssp || !timePeriod}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: "#6096B4" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#4d7d99")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6096B4")}
          >
            {loading ? "Calculating…" : "Apply Climate Change Adjustment"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-8">
            {/* Summary banner */}
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#BDCDD6", color: "#1e2a35" }}>
              <strong>{result.ssp}</strong> · {result.time_period} · {result.delta_t_choice} ΔT ={" "}
              <strong>{result.delta_t}°C</strong> above 1961-1990 baseline
            </div>

            {/* Loss parameters */}
            {result.loss && (
              <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: "1px solid #BDCDD6" }}>
                <h2 className="text-base font-semibold mb-4" style={{ color: "#1e2a35" }}>
                  Adjusted Loss Parameters
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {result.loss.initial_loss_original !== undefined && (
                    <>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Original IL (mm)</p>
                        <p className="font-semibold" style={{ color: "#1e2a35" }}>{result.loss.initial_loss_original}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Adjusted IL (mm)</p>
                        <p className="font-semibold" style={{ color: "#6096B4" }}>{result.loss.initial_loss_adjusted}</p>
                      </div>
                    </>
                  )}
                  {result.loss.continuing_loss_original !== undefined && (
                    <>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Original CL (mm/hr)</p>
                        <p className="font-semibold" style={{ color: "#1e2a35" }}>{result.loss.continuing_loss_original}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Adjusted CL (mm/hr)</p>
                        <p className="font-semibold" style={{ color: "#6096B4" }}>{result.loss.continuing_loss_adjusted}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* IFD tables */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "#1e2a35" }}>Adjusted IFD Table</h2>
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

            {[
              { label: "Original", rows: result.original },
              { label: "Adjusted", rows: result.adjusted },
            ].map(({ label, rows }) => (
              <div key={label}>
                <p className="text-sm font-semibold mb-2" style={{ color: "#93BFCF" }}>{label}</p>
                <div className="overflow-x-auto rounded-xl shadow-sm" style={{ border: "1px solid #BDCDD6" }}>
                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: "#BDCDD6" }}>
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>
                          {result.index_col}
                        </th>
                        {aepCols.map((c) => (
                          <th key={c} className="px-3 py-3 text-right font-semibold whitespace-nowrap" style={{ color: "#1e2a35" }}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y" style={{ borderColor: "#EEE9DA" }}>
                      {rows.map((row, i) => (
                        <tr
                          key={i}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f7f5f0")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                        >
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap" style={{ color: "#1e2a35" }}>
                            {String(row[result.index_col])}
                          </td>
                          {aepCols.map((c) => (
                            <td key={c} className="px-3 py-2.5 text-right" style={{ color: "#1e2a35" }}>
                              {row[c]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
