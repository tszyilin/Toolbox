"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const NRM_RATES: Record<string, { il: number; cl: number }> = {
  "East Flatlands, West Flatlands, Rangelands & Rangelands West": { il: 4.5, cl: 5.6 },
  "Murray Basin": { il: 3.1, cl: 6.7 },
  "Southern Slopes Mainland & Southern Slopes Tasmania": { il: 3.9, cl: 8.5 },
  "East Coast North & East Coast South": { il: 2.0, cl: 3.8 },
  "Central Slopes": { il: 1.1, cl: 2.0 },
  "Wet Tropics": { il: 0.8, cl: 1.4 },
  "Monsoonal North": { il: 2.4, cl: 4.4 },
};

const REF_TABS = [
  { key: "nrm",  label: "NRM Loss Rates",   src: "/ifd-reference/NRM cluster.png",        caption: "Table 1.6.3 — IL and CL rates (%/°C) by NRM cluster (ARR Book 1 Ch. 6)" },
  { key: "eq",   label: "Equation",          src: "/ifd-reference/main_equation.png",       caption: "Equation 1.6.1 — Adjustment formula (ARR Book 1 Ch. 6)" },
  { key: "period", label: "ΔT by Time Period", src: "/ifd-reference/time_period.png",       caption: "Table 1.6.2 — Global mean surface temperature projections (°C)" },
];

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

interface Options {
  ssps: string[];
  time_periods: string[];
  nrm_clusters: string[];
}

interface Result {
  delta_t: number;
  ssp: string;
  time_period: string;
  delta_t_choice: string;
  nrm_cluster: string;
  il_rate: number;
  cl_rate: number;
  initial_loss_original?: number;
  initial_loss_adjusted?: number;
  continuing_loss_original?: number;
  continuing_loss_adjusted?: number;
}

function ReferenceSection() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("nrm");
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
          <div className="flex" style={{ borderBottom: "1px solid #8CB6D0" }}>
            {REF_TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-2.5 text-xs font-semibold transition-colors"
                style={{ backgroundColor: tab === t.key ? "white" : "transparent", color: tab === t.key ? "#1A72B5" : "#1e2a35", borderBottom: tab === t.key ? "2px solid #1A72B5" : "2px solid transparent" }}>
                {t.label}
              </button>
            ))}
          </div>
          {REF_TABS.filter((t) => t.key === tab).map((t) => (
            <div key={t.key} className="p-4">
              <div className="relative w-full rounded-lg overflow-hidden" style={{ border: "1px solid #8CB6D0" }}>
                <Image src={t.src} alt={t.label} width={1200} height={600} className="w-full h-auto object-contain" style={{ backgroundColor: "white" }} />
              </div>
              <p className="mt-2 text-xs text-center" style={{ color: "#1A72B5" }}>{t.caption}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LossClimateChangePage() {
  const [options, setOptions] = useState<Options | null>(null);
  const [ssp, setSsp] = useState("");
  const [timePeriod, setTimePeriod] = useState("");
  const [deltaTChoice, setDeltaTChoice] = useState("median");
  const [nrmCluster, setNrmCluster] = useState("");
  const [initialLoss, setInitialLoss] = useState("");
  const [continuingLoss, setContinuingLoss] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/tools/loss-climate-change/options`)
      .then((r) => r.json())
      .then((data) => {
        setOptions(data);
        setSsp(data.ssps[1]);
        setTimePeriod(data.time_periods[1]);
      })
      .catch(() => setError("Could not load options from API."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/tools/loss-climate-change/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ssp,
          time_period: timePeriod,
          delta_t_choice: deltaTChoice,
          nrm_cluster: nrmCluster,
          initial_loss: initialLoss ? parseFloat(initialLoss) : null,
          continuing_loss: continuingLoss ? parseFloat(continuingLoss) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#8CB6D0" }}>
      <div className="px-6 py-8" style={{ backgroundColor: "#1A72B5" }}>
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-sm hover:underline" style={{ color: "#E4D9B6" }}>← Back to Toolbox</Link>
          <h1 className="mt-3 text-3xl font-bold text-white">Loss Parameter Adjustment</h1>
          <p className="mt-1 text-sm" style={{ color: "#E4D9B6" }}>
            Adjust Initial Loss (IL) and Continuing Loss (CL) for climate change per ARR Book 1 Ch. 6.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 space-y-6" style={{ border: "1px solid #8CB6D0" }}>

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

          {/* NRM Cluster */}
          <div>
            <label style={LABEL_STYLE}>NRM Cluster</label>
            <select value={nrmCluster} onChange={(e) => setNrmCluster(e.target.value)} style={INPUT_STYLE} required>
              <option value="">— Select a cluster —</option>
              {options?.nrm_clusters?.map((c) => <option key={c}>{c}</option>)}
            </select>
            {nrmCluster && NRM_RATES[nrmCluster] && (
              <div className="mt-2 flex gap-4 text-xs" style={{ color: "#1A72B5" }}>
                <span>IL rate: <strong>{NRM_RATES[nrmCluster].il} %/°C</strong></span>
                <span>CL rate: <strong>{NRM_RATES[nrmCluster].cl} %/°C</strong></span>
              </div>
            )}
          </div>

          {/* Loss values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={LABEL_STYLE}>Initial Loss IL (mm)</label>
              <input
                type="number" step="0.1" value={initialLoss}
                onChange={(e) => setInitialLoss(e.target.value)}
                placeholder="e.g. 15.0"
                disabled={!nrmCluster}
                style={{ ...INPUT_STYLE, opacity: nrmCluster ? 1 : 0.4 }}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Continuing Loss CL (mm/hr)</label>
              <input
                type="number" step="0.1" value={continuingLoss}
                onChange={(e) => setContinuingLoss(e.target.value)}
                placeholder="e.g. 2.5"
                disabled={!nrmCluster}
                style={{ ...INPUT_STYLE, opacity: nrmCluster ? 1 : 0.4 }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !nrmCluster || !ssp || !timePeriod}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:cursor-not-allowed"
            style={{ backgroundColor: (loading || !nrmCluster || !ssp || !timePeriod) ? "#8CB6D0" : "#1A72B5" }}
            onMouseEnter={(e) => { if (nrmCluster && ssp && timePeriod && !loading) e.currentTarget.style.backgroundColor = "#145D96"; }}
            onMouseLeave={(e) => { if (nrmCluster && ssp && timePeriod && !loading) e.currentTarget.style.backgroundColor = "#1A72B5"; }}
          >
            {loading ? "Calculating…" : "Apply Climate Change Adjustment"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {result && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: "1px solid #8CB6D0" }}>
            {/* Summary */}
            <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "#8CB6D0", color: "#1e2a35" }}>
              <strong>{result.ssp}</strong> · {result.time_period} · {result.delta_t_choice} ΔT = <strong>{result.delta_t}°C</strong>
              <span className="ml-3 opacity-70">· {result.nrm_cluster}</span>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 gap-4">
              {result.initial_loss_original !== undefined && (
                <>
                  <div className="rounded-lg p-4" style={{ backgroundColor: "#EDF4F9", border: "1px solid #8CB6D0" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#4AADC4" }}>Original IL</p>
                    <p className="text-2xl font-bold" style={{ color: "#1e2a35" }}>{result.initial_loss_original} <span className="text-sm font-normal">mm</span></p>
                    <p className="text-xs mt-1" style={{ color: "#4AADC4" }}>α = {result.il_rate} %/°C</p>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: "#1A72B5" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-white/70">Adjusted IL</p>
                    <p className="text-2xl font-bold text-white">{result.initial_loss_adjusted} <span className="text-sm font-normal">mm</span></p>
                    <p className="text-xs mt-1 text-white/70">+{((result.initial_loss_adjusted! / result.initial_loss_original - 1) * 100).toFixed(1)}% increase</p>
                  </div>
                </>
              )}
              {result.continuing_loss_original !== undefined && (
                <>
                  <div className="rounded-lg p-4" style={{ backgroundColor: "#EDF4F9", border: "1px solid #8CB6D0" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#4AADC4" }}>Original CL</p>
                    <p className="text-2xl font-bold" style={{ color: "#1e2a35" }}>{result.continuing_loss_original} <span className="text-sm font-normal">mm/hr</span></p>
                    <p className="text-xs mt-1" style={{ color: "#4AADC4" }}>α = {result.cl_rate} %/°C</p>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: "#1A72B5" }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-white/70">Adjusted CL</p>
                    <p className="text-2xl font-bold text-white">{result.continuing_loss_adjusted} <span className="text-sm font-normal">mm/hr</span></p>
                    <p className="text-xs mt-1 text-white/70">+{((result.continuing_loss_adjusted! / result.continuing_loss_original - 1) * 100).toFixed(1)}% increase</p>
                  </div>
                </>
              )}
              {result.initial_loss_original === undefined && result.continuing_loss_original === undefined && (
                <div className="col-span-2 text-sm text-center py-4" style={{ color: "#1A72B5" }}>
                  Enter IL and/or CL values above to see adjusted results.
                </div>
              )}
            </div>
          </div>
        )}

        <ReferenceSection />
      </div>
    </main>
  );
}
