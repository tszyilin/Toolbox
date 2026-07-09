"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const TABS = [
  { key: "equation", label: "Equation",           src: "/ifd-reference/main_equation.png",        caption: "Equation 1.6.1 — IFD adjustment formula (ARR Book 1 Ch. 6)" },
  { key: "scenario", label: "Climate Scenarios",  src: "/ifd-reference/Climate scenario.png",     caption: "Figure 1.6.2 — SSP temperature projections relative to 1961-1990 baseline" },
  { key: "period",   label: "ΔT by Time Period",  src: "/ifd-reference/time_period.png",          caption: "Table 1.6.2 — Global mean surface temperature projections (°C) by SSP and time period" },
  { key: "rate1",    label: "α Rate of Change",   src: "/ifd-reference/rate_of_change_table1.png",caption: "Table 1.6.1 — Recommended rates of change (α) per °C global temperature change (%/°C)" },
  { key: "rate2",    label: "α Interpolated",     src: "/ifd-reference/rate_of_change_table2.png",caption: "Table 1.6.5 — Interpolated rate of change for 1–24 hr storm durations (%/°C)" },
  { key: "nrm",     label: "NRM Loss Rates",      src: "/ifd-reference/NRM cluster.png",          caption: "Table 1.6.3 — IL and CL rates (%/°C) by NRM cluster (ARR Book 1 Ch. 6)" },
];

function ReferenceSection() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("scenario");

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid #8CB6D0" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-colors"
        style={{ backgroundColor: open ? "#1A72B5" : "#8CB6D0", color: open ? "white" : "#1e2a35" }}
      >
        <span>📋 Reference Tables (ARR Book 1 Ch. 6)</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ backgroundColor: "#EDF4F9" }}>
          {/* Tabs */}
          <div className="flex" style={{ borderBottom: "1px solid #8CB6D0" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-2.5 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: tab === t.key ? "white" : "transparent",
                  color: tab === t.key ? "#1A72B5" : "#1e2a35",
                  borderBottom: tab === t.key ? "2px solid #1A72B5" : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Image */}
          {TABS.filter((t) => t.key === tab).map((t) => (
            <div key={t.key} className="p-3">
              <div className="relative w-full rounded-lg overflow-hidden" style={{ border: "1px solid #8CB6D0" }}>
                <Image
                  src={t.src}
                  alt={t.label}
                  width={2400}
                  height={1200}
                  className="w-full h-auto object-contain"
                  style={{ backgroundColor: "white", minHeight: "200px" }}
                />
              </div>
              <p className="mt-2 text-xs text-center" style={{ color: "#1A72B5" }}>{t.caption}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultTables({
  result,
  aepCols,
  onDownload,
}: {
  result: CalcResult;
  aepCols: string[];
  onDownload: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"original" | "adjusted">("adjusted");
  const rows = activeTab === "original" ? result.original : result.adjusted;

  return (
    <div className="mt-8 space-y-4">
      {/* Summary banner */}
      <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#8CB6D0", color: "#1e2a35" }}>
        <strong>{result.ssp}</strong> · {result.time_period} · {result.delta_t_choice} ΔT ={" "}
        <strong>{result.delta_t}°C</strong> above 1961-1990 baseline
      </div>

      {/* Tabbed IFD table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #8CB6D0" }}>
        {/* Tab bar header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ backgroundColor: "#1A72B5" }}
        >
          <span className="text-sm font-semibold text-white">📊 Adjusted IFD Table</span>
          <button
            onClick={onDownload}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: "white", color: "#1A72B5", border: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E4D9B6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
          >
            Download Adjusted CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid #8CB6D0", backgroundColor: "#EDF4F9" }}>
          {(["original", "adjusted"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-4 py-2.5 text-xs font-semibold transition-colors capitalize"
              style={{
                backgroundColor: activeTab === t ? "white" : "transparent",
                color: activeTab === t ? "#1A72B5" : "#1e2a35",
                borderBottom: activeTab === t ? "2px solid #1A72B5" : "2px solid transparent",
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto" style={{ backgroundColor: "white" }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "#8CB6D0" }}>
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
            <tbody className="divide-y" style={{ borderColor: "#E4D9B6" }}>
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
    </div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Options {
  ssps: string[];
  time_periods: string[];
  nrm_clusters: string[];
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
  bom_csv: string | null;
}

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
  const [fileName, setFileName] = useState<string>("");
  const [ssp, setSsp] = useState("");
  const [timePeriod, setTimePeriod] = useState("");
  const [deltaTChoice, setDeltaTChoice] = useState("median");
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

    let csv: string;
    if (result.bom_csv) {
      // Use BOM-format output from backend
      csv = result.bom_csv;
    } else {
      // Fallback: simple format
      const idxCol = result.index_col;
      const cols = [idxCol, ...result.aep_cols];
      const header = cols.join(",");
      const adjRows = result.adjusted.map((row) => cols.map((c) => row[c] ?? "").join(","));
      csv = [header, ...adjRows].join("\n");
    }

    const downloadName = fileName
      ? `${fileName}_climate_change.csv`
      : "ifd_climate_change.csv";

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const aepCols = result?.aep_cols ?? [];

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#8CB6D0" }}>
      {/* Blue header band */}
      <div className="px-6 py-8" style={{ backgroundColor: "#1A72B5" }}>
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-sm hover:underline" style={{ color: "#E4D9B6" }}>
            ← Back to Toolbox
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white">
            IFD Climate Change Adjustment
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#E4D9B6" }}>
            Adjusts 2016 IFD curves for climate change per ARR Book 1 Chapter 6 (Eq. 1.6.1).
            Upload the CSV exported directly from the BOM 2016 IFD portal.
          </p>
        </div>
      </div>
      {/* Content on #8CB6D0 */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-8 space-y-6"
          style={{ border: "1px solid #8CB6D0" }}
        >
          {/* IFD Upload */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#EDF4F9", border: "1.5px dashed #4AADC4" }}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#8CB6D0" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4h8l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#1A72B5" strokeWidth="1.5" fill="none"/>
                  <path d="M12 4v4h4M10 9v6M7 12l3-3 3 3" stroke="#1A72B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {/* Text + input */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-0.5" style={{ color: "#1e2a35" }}>
                  Upload BOM IFD CSV
                </p>
                <p className="text-xs mb-3" style={{ color: "#1A72B5" }}>
                  Download your IFD data from the{" "}
                  <a
                    href="https://www.bom.gov.au/water/designRainfalls/revised-ifd/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                    style={{ color: "#1A72B5" }}
                  >
                    BOM 2016 IFD Portal
                  </a>
                  {" "}→ click <strong>Download data as CSV</strong> → upload here.
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
                  <input
                    type="file"
                    accept=".csv"
                    required
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFile(f);
                      if (f) setFileName(f.name.replace(/\.csv$/i, ""));
                    }}
                  />
                </label>
                {file && (
                  <p className="mt-2 text-xs" style={{ color: "#1A72B5" }}>
                    ✓ {file.name}
                  </p>
                )}
              </div>
            </div>
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

          <button
            type="submit"
            disabled={loading || !file || !ssp || !timePeriod}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:cursor-not-allowed"
            style={{
              backgroundColor: (loading || !file || !ssp || !timePeriod) ? "#8CB6D0" : "#1A72B5",
              color: "white",
            }}
            onMouseEnter={(e) => { if (file && ssp && timePeriod && !loading) e.currentTarget.style.backgroundColor = "#145D96"; }}
            onMouseLeave={(e) => { if (file && ssp && timePeriod && !loading) e.currentTarget.style.backgroundColor = "#1A72B5"; }}
          >
            {loading ? "Calculating…" : "Apply Climate Change Adjustment"}
          </button>
        </form>

        {/* Reference section */}
        <ReferenceSection />

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <ResultTables result={result} aepCols={aepCols} onDownload={downloadCSV} />
        )}
      </div>
    </main>
  );
}
