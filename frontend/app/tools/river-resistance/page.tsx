"use client";

import { useState } from "react";
import Link from "next/link";

const _RAW_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_URL = _RAW_URL.startsWith("http") ? _RAW_URL : `https://${_RAW_URL}`;

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 14,
  width: "100%",
  outline: "none",
  backgroundColor: "var(--color-panel)",
  color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)",
  display: "block", marginBottom: 3,
};
const ghostBtnStyle: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  color: "var(--color-text-secondary)",
  backgroundColor: "transparent",
};

interface SectionForm {
  id: string;
  name: string;
  grain_size_mm: string;
  depth_m: string;
  width_m: string;
  slope: string;
}

interface Result {
  name: string;
  bedform: string;
  manning_n: number;
  flow: {
    shear_velocity: number; grain_shear_reynolds: number; shields_number: number;
    relative_depth: number; csi: number; critical_shields: number; flow_intensity: number;
  };
  dune: { length_m: number; steepness: number };
  ripple: { active: boolean; length_m: number; steepness: number };
  resistance: { flat_bed_cf: number; chezy: number; ks_m: number };
  bars?: { b_over_h: number; boundary: number; type: string };
}

function makeSection(id: string): SectionForm {
  return { id, name: "", grain_size_mm: "1.18", depth_m: "", width_m: "", slope: "" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span className="text-sm font-mono" style={{ color: "var(--color-text-primary)" }}>
        {typeof value === "number"
          ? (Math.abs(value) >= 1000 || (Math.abs(value) < 0.001 && value !== 0)
              ? value.toExponential(3) : value.toFixed(4))
          : value}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

export default function RiverResistancePage() {
  const [sections, setSections] = useState<SectionForm[]>([makeSection("1")]);
  const [nextId, setNextId] = useState(2);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(id: string, patch: Partial<SectionForm>) {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addSection() {
    setSections(prev => [...prev, makeSection(String(nextId))]);
    setNextId(n => n + 1);
  }

  function removeSection(id: string) {
    setSections(prev => (prev.length > 1 ? prev.filter(s => s.id !== id) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tools/river-resistance/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: sections.map((s, i) => ({
            name: s.name || `Section ${i + 1}`,
            grain_size_mm: parseFloat(s.grain_size_mm),
            depth_m: parseFloat(s.depth_m),
            slope: parseFloat(s.slope),
            width_m: s.width_m ? parseFloat(s.width_m) : null,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "An error occurred.");
      }
      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!results.length) return;
    const headers = ["Section", "Bed-form", "Chezy c", "Manning n", "Dune length (m)",
                     "Dune steepness", "Ripple length (m)", "Ripple steepness", "Bar type"];
    const rows = results.map(r => [
      r.name, r.bedform, r.resistance.chezy.toFixed(6), r.manning_n.toFixed(6),
      r.dune.length_m.toFixed(4), r.dune.steepness.toFixed(6),
      r.ripple.length_m.toFixed(4), r.ripple.steepness.toFixed(6),
      r.bars?.type ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "river_resistance.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen tb-bg">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm hover:underline transition-colors" style={{ color: "var(--color-text-secondary)" }}>
            ← Back to Toolbox
          </Link>
          <h1 className="mt-4 text-3xl tb-h1">
            River Resistance &amp; Manning&apos;s n
            <span className="ml-3 align-middle text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded"
              style={{ color: "#F0D68A", border: "1px solid #7a6a3a", letterSpacing: "0.12em" }}>
              Testing
            </span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Bed-form type, Chézy resistance factor and Manning&apos;s n for a sand-bed river,
            from grain size, flow depth and slope.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {sections.map((s, idx) => (
            <div key={s.id} className="rounded-xl shadow-sm tb-card">
              <div className="flex items-center gap-3 px-6 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)", minWidth: 78 }}>
                  Section {idx + 1}
                </span>
                <input
                  type="text" placeholder="Name (optional)" value={s.name}
                  onChange={e => update(s.id, { name: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {sections.length > 1 && (
                  <button type="button" onClick={() => removeSection(s.id)}
                    className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                    style={ghostBtnStyle}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    Remove
                  </button>
                )}
              </div>

              <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Grain size, D (mm)">
                  <input type="number" step="any" required value={s.grain_size_mm}
                    onChange={e => update(s.id, { grain_size_mm: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Flow depth, h (m)">
                  <input type="number" step="any" required placeholder="e.g. 2.9" value={s.depth_m}
                    onChange={e => update(s.id, { depth_m: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Slope, S">
                  <input type="number" step="any" required placeholder="e.g. 0.0028" value={s.slope}
                    onChange={e => update(s.id, { slope: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Channel width, B (m)">
                  <input type="number" step="any" placeholder="optional — bars" value={s.width_m}
                    onChange={e => update(s.id, { width_m: e.target.value })} style={inputStyle} />
                </Field>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-3 items-center">
            <button type="button" onClick={addSection}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={ghostBtnStyle}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
              + Add Section
            </button>
            <div className="flex-1" />
            <button type="submit" disabled={loading}
              className="px-6 py-2 rounded-lg text-sm disabled:cursor-not-allowed transition-colors tb-btn-primary">
              {loading ? "Calculating…" : "Calculate"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-lg px-4 py-3 text-sm"
            style={{ background: "#2a1414", border: "1px solid #5c2323", color: "#f2a8a8" }}>
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Results</h2>
              <button onClick={downloadCSV}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={ghostBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                Download CSV
              </button>
            </div>

            {/* summary */}
            <div className="overflow-x-auto rounded-xl shadow-sm" style={{ border: "1px solid var(--color-border)" }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: "var(--color-elevated)" }}>
                  <tr>
                    {["Section", "Bed-form", "Chézy c", "Manning's n", "Bar type"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                        style={{ color: "var(--color-text-primary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-panel)" }}>
                  {results.map((r, i) => (
                    <tr key={i} style={{ color: "var(--color-text-primary)" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3">{r.bedform}</td>
                      <td className="px-4 py-3 font-mono">{r.resistance.chezy.toFixed(3)}</td>
                      <td className="px-4 py-3 font-mono font-bold" style={{ color: "var(--color-accent)" }}>
                        {r.manning_n.toFixed(4)}
                      </td>
                      <td className="px-4 py-3">{r.bars?.type ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* per-section working */}
            {results.map((r, i) => (
              <div key={i} className="rounded-xl shadow-sm tb-card">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{r.name}</span>
                  <span className="ml-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{r.bedform}</span>
                </div>
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-accent)" }}>Flow &amp; sediment</p>
                    <Row label="v* shear velocity" value={r.flow.shear_velocity} unit="m/s" />
                    <Row label="X grain Reynolds" value={r.flow.grain_shear_reynolds} />
                    <Row label="Y Shields number" value={r.flow.shields_number} />
                    <Row label="Z = h/D" value={r.flow.relative_depth} />
                    <Row label="Ξ" value={r.flow.csi} />
                    <Row label="Ycr critical Shields" value={r.flow.critical_shields} />
                    <Row label="η* flow intensity" value={r.flow.flow_intensity} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-accent)" }}>Bed-form geometry</p>
                    <Row label="Dune length Λd" value={r.dune.length_m} unit="m" />
                    <Row label="Dune steepness δd" value={r.dune.steepness} />
                    <Row label="Ripples active" value={r.ripple.active ? "yes" : "no"} />
                    <Row label="Ripple length Λr" value={r.ripple.length_m} unit="m" />
                    <Row label="Ripple steepness δr" value={r.ripple.steepness} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-accent)" }}>Resistance</p>
                    <Row label="ks = 2D" value={r.resistance.ks_m} unit="m" />
                    <Row label="cf flat-bed" value={r.resistance.flat_bed_cf} />
                    <Row label="c total Chézy" value={r.resistance.chezy} />
                    <Row label="Manning's n" value={r.manning_n} />
                    {r.bars && (
                      <>
                        <Row label="B/h" value={r.bars.b_over_h} />
                        <Row label="L1,2 boundary" value={r.bars.boundary} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
