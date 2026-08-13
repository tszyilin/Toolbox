"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const GTSMR_ZONES_SUMMER = ["COAST_S", "INLAND_S", "SWWA_W"];
const GTSMR_ZONES_WINTER = ["COAST_W", "SWWA_W"];
const GSAM_ZONES_SUMMER = ["GSAM_CS", "GSAM_IS"];
const GSAM_ZONES_AUTUMN = ["GSAM_CA", "GSAM_IA"];

interface GsdmForm {
  duration_limit: string;
  smooth_fraction: string;
  rough_fraction: string;
  elevation_factor: string;
  moisture_factor: string;
}

interface GtsmrForm {
  epw_avg_summer: string;
  epw_std_summer: string;
  epw_avg_winter: string;
  epw_std_winter: string;
  decay_factor: string;
  topographic_factor: string;
  zone_summer: string;
  zone_winter: string;
}

interface GsamForm {
  epw_avg_summer: string;
  epw_std_summer: string;
  epw_avg_autumn: string;
  epw_std_autumn: string;
  topographic_factor: string;
  zone_summer: string;
  zone_autumn: string;
}

interface CatchmentForm {
  id: string;
  name: string;
  area: string;
  latitude: string;
  longitude: string;
  gsdm_enabled: boolean;
  gsdm: GsdmForm;
  gtsmr_enabled: boolean;
  gtsmr: GtsmrForm;
  gsam_enabled: boolean;
  gsam: GsamForm;
}

const DEFAULT_GSDM: GsdmForm = {
  duration_limit: "3",
  smooth_fraction: "0",
  rough_fraction: "100",
  elevation_factor: "1.0",
  moisture_factor: "0.75",
};

const DEFAULT_GTSMR: GtsmrForm = {
  epw_avg_summer: "75",
  epw_std_summer: "120",
  epw_avg_winter: "51",
  epw_std_winter: "82.3",
  decay_factor: "0.8",
  topographic_factor: "1.18",
  zone_summer: "COAST_S",
  zone_winter: "SWWA_W",
};

const DEFAULT_GSAM: GsamForm = {
  epw_avg_summer: "79",
  epw_std_summer: "80.8",
  epw_avg_autumn: "58",
  epw_std_autumn: "71",
  topographic_factor: "1.13",
  zone_summer: "GSAM_IS",
  zone_autumn: "GSAM_IA",
};

function makeCatchment(id: string): CatchmentForm {
  return {
    id,
    name: "",
    area: "",
    latitude: "",
    longitude: "",
    gsdm_enabled: true,
    gsdm: { ...DEFAULT_GSDM },
    gtsmr_enabled: true,
    gtsmr: { ...DEFAULT_GTSMR },
    gsam_enabled: false,
    gsam: { ...DEFAULT_GSAM },
  };
}

interface MafLookup {
  maf: number;
  conservative: number;
  lower: number;
  upper: number;
  bracketed: boolean;
  source: string;
}

interface MafState {
  loading: boolean;
  data?: MafLookup;
  error?: string;
  /** true while the MAF field still holds the value we filled in. */
  applied?: boolean;
}

interface GtsmrFactors {
  epw_summer: number;
  epw_winter: number | null;
  epw_standard_summer: number;
  epw_standard_winter: number;
  maf_summer: number;
  maf_winter: number | null;
  taf: number | null;
  daf: number | null;
  source: string;
}

interface ZoneLookup {
  zone: string;
  zone_label: string;
  zones: string[];
  gtsmr_applicable: boolean;
  gsam_applicable: boolean;
  gtsmr_summer: string | null;
  gtsmr_winter: string | null;
  gsam_summer: string | null;
  gsam_autumn: string | null;
  notes: string[];
  source: string;
}

interface DurationLookup {
  zone: string;
  options: number[];
  /** null in the intermediate zone — the engineer picks. */
  recommended: number | null;
  nearer: number;
  source: string;
}

interface DurRow { duration_hr: number; pmp_mm: number }
interface SeasonResult { by_duration: DurRow[]; controlling_duration_hr: number; pmp_mm: number }
interface GtsmrResult { summer: SeasonResult; winter: SeasonResult; governing_season: string; pmp_mm: number; controlling_duration_hr: number }
interface GsamResult { summer: SeasonResult; autumn: SeasonResult; governing_season: string; pmp_mm: number; controlling_duration_hr: number }
interface CatchmentResult {
  name: string;
  area: number;
  gsdm?: { by_duration: DurRow[]; controlling_duration_hr: number; pmp_mm: number };
  gtsmr?: GtsmrResult;
  gsam?: GsamResult;
  governing_pmp_mm?: number;
  volume_m3?: number;
}

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
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 };
const selectStyle: React.CSSProperties = { ...inputStyle };

/* Secondary button — outline on the panel surface, matching the other tool pages. */
const ghostBtnStyle: React.CSSProperties = { border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", backgroundColor: "transparent" };

/* A field whose value came from the Bureau's data rather than the user. */
const lockedInputStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text-secondary)",
  cursor: "not-allowed",
};

function LockedField({ label, locked, children }:
  { label: string; locked: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {locked && <span title="Read from the Bureau's gridded data" style={{ marginLeft: 5 }}>🔒</span>}
      </label>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-secondary)" }}>{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

/* Categorical slots, assigned per method and never cycled or reordered, so a
   series keeps its colour whichever methods are switched on. Validated against
   the #1a1a1a panel surface. */
const SERIES_COLOURS: Record<string, string> = {
  "GSDM": "#3987e5",
  "GTSMR Summer": "#d95926",
  "GTSMR Winter": "#199e70",
  "GSAM Summer": "#c98500",
  "GSAM Autumn": "#d55181",
};

interface Series { name: string; colour: string; pts: DurRow[]; controlling: number }

/** The two method families cover different duration ranges, so they get a plot each. */
function buildSeries(r: CatchmentResult): { short: Series[]; long: Series[] } {
  const mk = (name: string, s?: SeasonResult): Series[] =>
    s && s.by_duration?.length
      ? [{ name, colour: SERIES_COLOURS[name], pts: s.by_duration, controlling: s.controlling_duration_hr }]
      : [];
  return {
    short: r.gsdm ? mk("GSDM", r.gsdm as SeasonResult) : [],
    long: [
      ...mk("GTSMR Summer", r.gtsmr?.summer),
      ...mk("GTSMR Winter", r.gtsmr?.winter),
      ...mk("GSAM Summer", r.gsam?.summer),
      ...mk("GSAM Autumn", r.gsam?.autumn),
    ],
  };
}

function PmpChart({ result }: { result: CatchmentResult }) {
  const { short, long } = buildSeries(result);
  return (
    <div className="space-y-5">
      {short.length > 0 && (
        <DurationChart title="GSDM — short duration (up to 6 hr)" series={short} name={result.name} />
      )}
      {long.length > 0 && (
        <DurationChart title="GTSMR / GSAM — long duration (up to 120 hr)" series={long} name={result.name} />
      )}
    </div>
  );
}

/** Depth–duration curves. Duration is log-scaled, the way DDA curves are read. */
function DurationChart({ title, series, name }: { title: string; series: Series[]; name: string }) {
  const [hover, setHover] = useState<{ x: number; dur: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!series.length) return null;

  // Direct labels only fit (and are only wanted) up to 4 series; without them
  // the right margin would just be dead space.
  const labelled = series.length <= 4;
  const W = 760, H = 340;
  const ML = 58, MR = labelled ? 96 : 26, MT = 16, MB = 44;
  const pw = W - ML - MR, ph = H - MT - MB;

  const durs = Array.from(new Set(series.flatMap(s => s.pts.map(p => p.duration_hr)))).sort((a, b) => a - b);
  const dMin = durs[0], dMax = durs[durs.length - 1];
  const vMax = Math.max(...series.flatMap(s => s.pts.map(p => p.pmp_mm)));
  const yMax = vMax * 1.08;

  const lx = Math.log(dMin), lxSpan = Math.log(dMax) - lx || 1;
  const sx = (d: number) => ML + ((Math.log(d) - lx) / lxSpan) * pw;
  const sy = (v: number) => MT + ph - (v / yMax) * ph;

  // Few enough durations to label them all; otherwise fall back to round values.
  const X_TICKS = durs.length <= 9
    ? durs
    : [0.25, 0.5, 1, 2, 3, 6, 12, 24, 48, 72, 96, 120].filter(d => d >= dMin && d <= dMax);
  const yStep = niceStep(yMax / 5);
  const Y_TICKS: number[] = [];
  for (let v = 0; v <= yMax; v += yStep) Y_TICKS.push(v);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    if (px < ML || px > ML + pw) { setHover(null); return; }
    let best = durs[0], bd = Infinity;
    for (const d of durs) {
      const dd = Math.abs(sx(d) - px);
      if (dd < bd) { bd = dd; best = d; }
    }
    setHover({ x: sx(best), dur: best });
  }

  const hoverRows = hover
    ? series.map(s => ({ name: s.name, colour: s.colour, v: s.pts.find(p => p.duration_hr === hover.dur)?.pmp_mm }))
        .filter(r => r.v !== undefined)
    : [];

  return (
    <div className="mt-1">
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-secondary)" }}>
        {title}
      </p>
      {/* legend — identity never rests on colour alone (a lone series is named by its direct label) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
        {series.length > 1 && series.map(s => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <span style={{ width: 10, height: 2, backgroundColor: s.colour, borderRadius: 1, display: "inline-block" }} />
            {s.name}
          </span>
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%"
          style={{ display: "block", overflow: "visible" }}
          onMouseMove={onMove} onMouseLeave={() => setHover(null)}
          role="img" aria-label={`${title} depth-duration curves for ${name}`}
        >
          {/* gridlines — recessive */}
          {Y_TICKS.map(v => (
            <line key={v} x1={ML} x2={ML + pw} y1={sy(v)} y2={sy(v)} stroke="var(--color-border)" strokeWidth={1} />
          ))}
          {X_TICKS.map(d => (
            <line key={d} x1={sx(d)} x2={sx(d)} y1={MT} y2={MT + ph} stroke="var(--color-border)" strokeWidth={1} />
          ))}
          <line x1={ML} x2={ML + pw} y1={MT + ph} y2={MT + ph} stroke="#383835" strokeWidth={1} />

          {/* axis labels */}
          {Y_TICKS.map(v => (
            <text key={v} x={ML - 10} y={sy(v) + 4} textAnchor="end" fontSize={11}
              fill="#898781" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(v)}</text>
          ))}
          {X_TICKS.map(d => (
            <text key={d} x={sx(d)} y={MT + ph + 18} textAnchor="middle" fontSize={11} fill="#898781">{d}</text>
          ))}
          <text x={ML + pw / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#898781">Duration (hours, log scale)</text>
          <text x={14} y={MT + ph / 2} textAnchor="middle" fontSize={11} fill="#898781"
            transform={`rotate(-90 14 ${MT + ph / 2})`}>PMP depth (mm)</text>

          {hover && (
            <line x1={hover.x} x2={hover.x} y1={MT} y2={MT + ph} stroke="#898781" strokeWidth={1} strokeDasharray="3 3" />
          )}

          {series.map(s => {
            const pts = [...s.pts].sort((a, b) => a.duration_hr - b.duration_hr);
            const d = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.duration_hr).toFixed(2)},${sy(p.pmp_mm).toFixed(2)}`).join(" ");
            const last = pts[pts.length - 1];
            const ctrl = pts.find(p => p.duration_hr === s.controlling);
            return (
              <g key={s.name}>
                <path d={d} fill="none" stroke={s.colour} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {ctrl && (
                  <circle cx={sx(ctrl.duration_hr)} cy={sy(ctrl.pmp_mm)} r={5}
                    fill={s.colour} stroke="var(--color-panel)" strokeWidth={2} />
                )}
                {hover && (() => {
                  const p = pts.find(q => q.duration_hr === hover.dur);
                  return p ? <circle cx={sx(p.duration_hr)} cy={sy(p.pmp_mm)} r={4}
                    fill={s.colour} stroke="var(--color-panel)" strokeWidth={2} /> : null;
                })()}
                {labelled && (
                  <text x={sx(last.duration_hr) + 8} y={sy(last.pmp_mm) + 4} fontSize={11} fill="#898781">
                    {s.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hover && hoverRows.length > 0 && (
          <div
            style={{
              position: "absolute", left: `${(hover.x / W) * 100}%`, top: 0,
              transform: hover.x > W * 0.6 ? "translate(-108%, 0)" : "translate(8px, 0)",
              backgroundColor: "var(--color-elevated)", border: "1px solid var(--color-border)",
              borderRadius: 8, padding: "8px 10px", pointerEvents: "none", minWidth: 150,
            }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
              {hover.dur} hr
            </p>
            {hoverRows.map(r => (
              <p key={r.name} className="text-xs flex items-center justify-between gap-3"
                style={{ color: "var(--color-text-secondary)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: r.colour, display: "inline-block" }} />
                  {r.name}
                </span>
                <span style={{ color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>
                  {r.v!.toFixed(0)}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
        Ringed marker = controlling duration for that method.
      </p>
    </div>
  );
}

function niceStep(raw: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

/** Toggle revealing the values that came from the Bureau's data. */
function DerivedToggle({ open, count, onClick }:
  { open: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 text-xs font-medium transition-opacity opacity-70 hover:opacity-100"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {open ? "▾" : "▸"} {open ? "Hide" : "Show"} the {count} value{count === 1 ? "" : "s"} read from the Bureau&apos;s data
    </button>
  );
}

/** A numbered step panel — "1. Catchment Profile", etc. */
function Panel({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl shadow-sm tb-card">
      <div className="flex items-center gap-3 px-6 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <span
          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: "var(--color-elevated)", color: "var(--color-accent)" }}
        >
          {step}
        </span>
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

/** Checkbox row used by the method picker. */
function MethodCheck({
  checked, onChange, label, hint,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer select-none rounded-lg px-4 py-3 transition-colors"
      style={{
        border: checked ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
        backgroundColor: checked ? "var(--color-elevated)" : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--color-accent)", width: 16, height: 16, marginTop: 2 }}
      />
      <span>
        <span className="block text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{label}</span>
        <span className="block text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{hint}</span>
      </span>
    </label>
  );
}

export default function PmpPage() {
  const [catchments, setCatchments] = useState<CatchmentForm[]>([makeCatchment("1")]);
  const [nextId, setNextId] = useState(2);
  const [activeId, setActiveId] = useState("1");
  const [results, setResults] = useState<CatchmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Fields the Bureau's data supplies are collapsed by default — they are there
     to be checked, not filled in. Fields the engineer must supply stay visible. */
  const [showDerived, setShowDerived] = useState<Record<string, boolean>>({});

  // The tab bar edits one catchment at a time; fall back to the first if the
  // active one was just removed.
  const active = catchments.find((c) => c.id === activeId) ?? catchments[0];

  function addCatchment() {
    const id = String(nextId);
    setCatchments((prev) => [...prev, makeCatchment(id)]);
    setNextId((n) => n + 1);
    setActiveId(id);
    setResults([]);
  }

  function removeCatchment(id: string) {
    setCatchments((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId && next.length) {
        setActiveId(next[Math.min(idx, next.length - 1)].id);
      }
      return next;
    });
    // results are matched to catchments by position, so drop them
    setResults([]);
  }

  /** GTSMR and GSAM are picked together as the one long-duration option. */
  function setLongDuration(id: string, on: boolean) {
    updateCatchment(id, { gtsmr_enabled: on, gsam_enabled: on });
  }

  // ---- GSDM MAF (Figure 3) and duration limit (Figure 2), from the centroid ----
  const [maf, setMaf] = useState<Record<string, MafState>>({});
  const [dur, setDur] = useState<Record<string, DurationLookup | undefined>>({});
  const [zone, setZone] = useState<Record<string, ZoneLookup | undefined>>({});
  const [gtf, setGtf] = useState<Record<string, GtsmrFactors | undefined>>({});
  // Grid-derived fields are read-only until the engineer deliberately unlocks them.
  const [gtUnlocked, setGtUnlocked] = useState<Record<string, boolean>>({});
  const mafTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeId_ = active?.id;
  const activeLat = active?.latitude;
  const activeLon = active?.longitude;

  useEffect(() => {
    if (!activeId_) return;
    const lat = parseFloat(activeLat ?? "");
    const lon = parseFloat(activeLon ?? "");
    if (isNaN(lat) || isNaN(lon)) {
      setMaf(m => ({ ...m, [activeId_]: { loading: false } }));
      return;
    }
    if (mafTimer.current) clearTimeout(mafTimer.current);
    mafTimer.current = setTimeout(async () => {
      setMaf(m => ({ ...m, [activeId_]: { ...m[activeId_], loading: true } }));
      try {
        const res = await fetch(`${API_URL}/tools/pmp/maf?lat=${lat}&lon=${lon}`);
        const body = await res.json();
        if (!res.ok) {
          setMaf(m => ({ ...m, [activeId_]: { loading: false, error: body?.detail ?? "Lookup failed." } }));
          return;
        }
        setMaf(m => ({ ...m, [activeId_]: { loading: false, data: body, applied: true } }));
        // Fill the GSDM moisture factor; the field stays editable.
        setCatchments(prev => prev.map(c =>
          c.id === activeId_ ? { ...c, gsdm: { ...c.gsdm, moisture_factor: String(body.maf) } } : c
        ));

        // Figure 2 gives the maximum duration for the same centroid.
        const dres = await fetch(`${API_URL}/tools/pmp/duration?lat=${lat}&lon=${lon}`);
        if (dres.ok) {
          const dbody: DurationLookup = await dres.json();
          setDur(m => ({ ...m, [activeId_]: dbody }));
          // Only fill it in when the zone is unambiguous; in the intermediate
          // zone the panel offers both and waits for a choice.
          if (dbody.recommended !== null) {
            setCatchments(prev => prev.map(c =>
              c.id === activeId_ ? { ...c, gsdm: { ...c.gsdm, duration_limit: String(dbody.recommended) } } : c
            ));
          }
        }

        // Figure 1 gives the GTSMR application zone.
        const zres = await fetch(`${API_URL}/tools/pmp/zones?lat=${lat}&lon=${lon}`);
        if (zres.ok) {
          const zbody: ZoneLookup = await zres.json();
          setZone(m => ({ ...m, [activeId_]: zbody }));
          setCatchments(prev => prev.map(c => {
            if (c.id !== activeId_) return c;
            const next = { ...c };
            if (zbody.gtsmr_summer) {
              const g = { ...c.gtsmr, zone_summer: zbody.gtsmr_summer };
              if (zbody.gtsmr_winter) g.zone_winter = zbody.gtsmr_winter;
              next.gtsmr = g;
            }
            if (zbody.gsam_summer) {
              const s = { ...c.gsam, zone_summer: zbody.gsam_summer };
              if (zbody.gsam_autumn) s.zone_autumn = zbody.gsam_autumn;
              next.gsam = s;
            }
            return next;
          }));
        }

        // GTSMR catchment factors straight off the Bureau's gridded data.
        const gres = await fetch(`${API_URL}/tools/pmp/gtsmr-factors?lat=${lat}&lon=${lon}`);
        if (gres.ok) {
          const gbody: GtsmrFactors = await gres.json();
          setGtf(m => ({ ...m, [activeId_]: gbody }));
          setCatchments(prev => prev.map(c => {
            if (c.id !== activeId_) return c;
            return {
              ...c,
              gtsmr: {
                ...c.gtsmr,
                epw_avg_summer: String(gbody.epw_summer),
                epw_std_summer: String(gbody.epw_standard_summer),
                ...(gbody.epw_winter !== null ? { epw_avg_winter: String(gbody.epw_winter) } : {}),
                epw_std_winter: String(gbody.epw_standard_winter),
                ...(gbody.taf !== null ? { topographic_factor: String(gbody.taf) } : {}),
                ...(gbody.daf !== null ? { decay_factor: String(gbody.daf) } : {}),
              },
            };
          }));
        }
      } catch {
        setMaf(m => ({ ...m, [activeId_]: { loading: false, error: "Could not reach the server." } }));
      }
    }, 400);
    return () => { if (mafTimer.current) clearTimeout(mafTimer.current); };
  }, [activeId_, activeLat, activeLon]);

  const activeMaf = activeId_ ? maf[activeId_] : undefined;
  const activeDur = activeId_ ? dur[activeId_] : undefined;
  const activeZone = activeId_ ? zone[activeId_] : undefined;
  const activeGtf = activeId_ ? gtf[activeId_] : undefined;
  // Results follow the selected tab; the backend returns them in catchment order.
  const activeIndex = catchments.findIndex(c => c.id === active?.id);
  const activeResult = activeIndex >= 0 ? results[activeIndex] : undefined;
  // A catchment with no method selected produces nothing, so guard the button.
  const hasMethod = (c: CatchmentForm) => c.gsdm_enabled || c.gtsmr_enabled || c.gsam_enabled;
  const withoutMethod = catchments.filter(c => !hasMethod(c));
  const canCalculate = withoutMethod.length < catchments.length;

  /** Any input change makes the shown results stale — drop them rather than
   *  leave charts on screen that no longer match the form (unticking a method
   *  used to leave its curves plotted). */
  function invalidateResults() {
    setResults((r) => (r.length ? [] : r));
  }

  function updateCatchment(id: string, patch: Partial<CatchmentForm>) {
    setCatchments((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    invalidateResults();
  }

  function updateGsdm(id: string, patch: Partial<GsdmForm>) {
    setCatchments((prev) => prev.map((c) => (c.id === id ? { ...c, gsdm: { ...c.gsdm, ...patch } } : c)));
    invalidateResults();
  }

  function updateGtsmr(id: string, patch: Partial<GtsmrForm>) {
    setCatchments((prev) => prev.map((c) => (c.id === id ? { ...c, gtsmr: { ...c.gtsmr, ...patch } } : c)));
    invalidateResults();
  }

  function updateGsam(id: string, patch: Partial<GsamForm>) {
    setCatchments((prev) => prev.map((c) => (c.id === id ? { ...c, gsam: { ...c.gsam, ...patch } } : c)));
    invalidateResults();
  }

  function buildPayload() {
    return catchments.map((c) => {
      // A method Figure 1 rules out for this catchment is hidden, so don't
      // calculate it either.
      const z = zone[c.id];
      const gtsmrOn = c.gtsmr_enabled && z?.gtsmr_applicable !== false;
      const gsamOn = c.gsam_enabled && z?.gsam_applicable !== false;
      const base: Record<string, unknown> = {
        name: c.name || `Catchment ${c.id}`,
        area: parseFloat(c.area),
        gsdm_enabled: c.gsdm_enabled,
        gtsmr_enabled: gtsmrOn,
        gsam_enabled: gsamOn,
      };
      if (c.gsdm_enabled) {
        base.gsdm = {
          duration_limit: parseFloat(c.gsdm.duration_limit),
          smooth_fraction: parseFloat(c.gsdm.smooth_fraction),
          rough_fraction: parseFloat(c.gsdm.rough_fraction),
          elevation_factor: parseFloat(c.gsdm.elevation_factor),
          moisture_factor: parseFloat(c.gsdm.moisture_factor),
        };
      }
      if (gtsmrOn) {
        base.gtsmr = {
          epw_avg_summer: parseFloat(c.gtsmr.epw_avg_summer),
          epw_std_summer: parseFloat(c.gtsmr.epw_std_summer),
          epw_avg_winter: parseFloat(c.gtsmr.epw_avg_winter),
          epw_std_winter: parseFloat(c.gtsmr.epw_std_winter),
          decay_factor: parseFloat(c.gtsmr.decay_factor),
          topographic_factor: parseFloat(c.gtsmr.topographic_factor),
          zone_summer: c.gtsmr.zone_summer,
          zone_winter: c.gtsmr.zone_winter,
        };
      }
      if (gsamOn) {
        base.gsam = {
          epw_avg_summer: parseFloat(c.gsam.epw_avg_summer),
          epw_std_summer: parseFloat(c.gsam.epw_std_summer),
          epw_avg_autumn: parseFloat(c.gsam.epw_avg_autumn),
          epw_std_autumn: parseFloat(c.gsam.epw_std_autumn),
          topographic_factor: parseFloat(c.gsam.topographic_factor),
          zone_summer: c.gsam.zone_summer,
          zone_autumn: c.gsam.zone_autumn,
        };
      }
      return base;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults([]);

    const payload = buildPayload();

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tools/pmp/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catchments: payload }),
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

  async function downloadXLSX() {
    if (!results.length || exporting) return;
    setError(null);
    setExporting(true);
    try {
      const res = await fetch(`${API_URL}/tools/pmp/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catchments: buildPayload() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pmp_results.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen tb-bg">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm hover:underline transition-colors" style={{ color: "var(--color-text-secondary)" }}>
            ← Back to Toolbox
          </Link>
          <h1 className="mt-4 text-3xl tb-h1">
            PMP Calculator
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Probable Maximum Precipitation using GSDM, GTSMR, and GSAM methods (ARR 2019).
          </p>
        </div>

        {/* Catchment tabs */}
        <div className="flex items-stretch gap-1 overflow-x-auto pb-px" style={{ borderBottom: "1px solid var(--color-border)" }}>
          {catchments.map((c, idx) => {
            const isActive = c.id === active.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer whitespace-nowrap rounded-t-lg transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--color-elevated)" : "transparent",
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                }}
              >
                {c.name.trim() || `Catchment ${idx + 1}`}
                {catchments.length > 1 && (
                  <span
                    role="button"
                    title="Remove catchment"
                    onClick={(e) => { e.stopPropagation(); removeCatchment(c.id); }}
                    className="text-xs leading-none opacity-40 hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addCatchment}
            title="Add catchment"
            className="px-3.5 py-2.5 text-base font-semibold rounded-t-lg transition-colors"
            style={{ color: "var(--color-text-secondary)", backgroundColor: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-elevated)"; e.currentTarget.style.color = "var(--color-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
          >
            +
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {[active].map((c) => {
            // Panels 3 onwards follow the methods picked in panel 2, numbered
            // without gaps so the sequence always reads 1, 2, 3, 4.
            const longOn = c.gtsmr_enabled || c.gsam_enabled;
            const gsdmStep = c.gsdm_enabled ? 3 : null;
            const longStep = longOn ? (c.gsdm_enabled ? 4 : 3) : null;
            // Lock the GTSMR values that came from the grids, unless unlocked.
            const gtLocked = !!activeGtf && !gtUnlocked[c.id];
            return (
            <div key={c.id} className="space-y-6">
              {/* 1. Catchment profile */}
              <Panel step={1} title="Catchment Profile">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <Field label="Catchment Name">
                      <input
                        type="text"
                        placeholder="e.g. Upper Creek"
                        value={c.name}
                        onChange={(e) => updateCatchment(c.id, { name: e.target.value })}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <Field label="Catchment Area (km²)">
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2.69"
                      value={c.area}
                      onChange={(e) => updateCatchment(c.id, { area: e.target.value })}
                      required
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Longitude (°)">
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 153.03"
                      value={c.longitude}
                      onChange={(e) => updateCatchment(c.id, { longitude: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Latitude (°)">
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. -27.47"
                      value={c.latitude}
                      onChange={(e) => updateCatchment(c.id, { latitude: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {/* progress hint only — the readouts live with their own method */}
                {activeMaf?.loading && (
                  <p className="mt-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    Reading the BoM figures for this centroid…
                  </p>
                )}
                {activeMaf?.error && (
                  <p className="mt-2 text-xs" style={{ color: "#f2a8a8" }}>{activeMaf.error}</p>
                )}

              </Panel>

              {/* 2. Apply method */}
              <Panel step={2} title="Apply Method">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MethodCheck
                    checked={c.gsdm_enabled}
                    onChange={(v) => updateCatchment(c.id, { gsdm_enabled: v })}
                    label="GSDM"
                    hint="Up to 6-hr"
                  />
                  <MethodCheck
                    checked={c.gtsmr_enabled || c.gsam_enabled}
                    onChange={(v) => setLongDuration(c.id, v)}
                    label="GTSMR / GSAM"
                    hint="Up to 120-hr"
                  />
                </div>
              </Panel>

              {/* What the figures give for this centroid — shown before Calculate,
                  since the duration limit in the intermediate zone is a choice. */}
              {/* read off BoM GSDM Figures 2 and 3 — only relevant while GSDM is picked */}
              {c.gsdm_enabled && activeMaf?.data && (
                <div className="mb-5 rounded-lg px-4 py-3 flex items-start justify-between gap-4 flex-wrap"
                  style={{ backgroundColor: "var(--color-elevated)", border: "1px solid var(--color-border)" }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                      Moisture Adjustment Factor
                    </p>
                    <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--color-accent)" }}>
                      {activeMaf.data.maf.toFixed(3)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      between the {activeMaf.data.lower.toFixed(2)} and {activeMaf.data.upper.toFixed(2)} contours
                    </p>
                    <button
                      type="button"
                      onClick={() => updateGsdm(c.id, { moisture_factor: String(activeMaf.data!.conservative) })}
                      className="mt-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={ghostBtnStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-panel)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      Use {activeMaf.data.conservative.toFixed(2)} instead
                    </button>
                  </div>

                  {activeDur && (
                    <div style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "1rem" }}>
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                        Max Duration
                      </p>
                      {activeDur.recommended !== null ? (
                        <>
                          <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--color-accent)" }}>
                            {activeDur.recommended} hr
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                            {activeDur.zone} zone
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex gap-2 mt-1">
                            {activeDur.options.map(o => {
                              const picked = c.gsdm.duration_limit === String(o);
                              return (
                                <button key={o} type="button"
                                  onClick={() => updateGsdm(c.id, { duration_limit: String(o) })}
                                  className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                                  style={{
                                    border: picked ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                                    color: picked ? "var(--color-accent)" : "var(--color-text-primary)",
                                    backgroundColor: picked ? "var(--color-panel)" : "transparent",
                                  }}>
                                  {o} hr
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs mt-1" style={{ color: "#F0D68A" }}>
                            intermediate zone — choose one
                            {activeDur.nearer ? ` (nearer the ${activeDur.nearer} hr side)` : ""}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="text-right">
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{activeMaf.data.source}</p>
                    {activeDur && (
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{activeDur.source}</p>
                    )}
                  </div>
                </div>
              )}

              {/* application zone — only relevant while GTSMR/GSAM is picked */}
              {longOn && activeZone && (
                <div className="mb-5 rounded-lg px-4 py-3"
                  style={{ backgroundColor: "var(--color-elevated)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                        Application Zone
                      </p>
                      <p className="text-xl font-bold mt-0.5"
                        style={{ color: activeZone.gtsmr_applicable ? "var(--color-accent)" : "#F0D68A" }}>
                        {activeZone.zone_label}
                      </p>
                      {activeZone.gtsmr_applicable && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                          GTSMR summer → {activeZone.gtsmr_summer}
                          {activeZone.gtsmr_winter ? ` · winter → ${activeZone.gtsmr_winter}` : " · winter left unset"}
                        </p>
                      )}
                      {activeZone.gsam_applicable && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                          GSAM summer → {activeZone.gsam_summer} · autumn → {activeZone.gsam_autumn}
                        </p>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {activeZone.source}
                    </p>
                  </div>
                  {activeZone.notes.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {activeZone.notes.map((n, i) => (
                        <li key={i} className="text-xs" style={{ color: "#F0D68A" }}>• {n}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)" }}>
                    Zones are read from the Bureau&apos;s own zone polygons; all fields below stay editable.
                  </p>
                </div>
              )}

              {/* Catchment factors — GTSMR grids, so only while GTSMR is picked */}
              {c.gtsmr_enabled && activeGtf && (
                <div className="mb-5 rounded-lg px-4 py-3"
                  style={{ backgroundColor: "var(--color-elevated)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                      Catchment Factors
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{activeGtf.source}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
                    <div>
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>EPW summer</p>
                      <p className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                        {activeGtf.epw_summer.toFixed(2)} <span className="text-xs font-normal">mm</span>
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        MAF {activeGtf.maf_summer.toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>EPW winter</p>
                      <p className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                        {activeGtf.epw_winter !== null ? activeGtf.epw_winter.toFixed(2) : "—"}
                        <span className="text-xs font-normal"> mm</span>
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        MAF {activeGtf.maf_winter !== null ? activeGtf.maf_winter.toFixed(3) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>TAF</p>
                      <p className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                        {activeGtf.taf !== null ? activeGtf.taf.toFixed(3) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>DAF</p>
                      <p className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                        {activeGtf.daf !== null ? activeGtf.daf.toFixed(3) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-4 flex-wrap">
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)", maxWidth: "40rem" }}>
                      Standard EPW {activeGtf.epw_standard_summer} mm annual / {activeGtf.epw_standard_winter} mm winter
                      (guidebook §2.3.1). Read at the catchment centroid, so the fields below are locked to the
                      Bureau&apos;s data. Unlock only to substitute a value you have derived yourself — for example an
                      EPW averaged over the catchment outline, which is what §2.3.1 actually asks for.
                    </p>
                    <button
                      type="button"
                      onClick={() => setGtUnlocked(u => ({ ...u, [c.id]: !u[c.id] }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                      style={{
                        border: gtLocked ? "1px solid var(--color-border)" : "1px solid #7a6a3a",
                        color: gtLocked ? "var(--color-text-secondary)" : "#F0D68A",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-panel)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {gtLocked ? "🔒 Unlock to override" : "🔓 Overridden — relock"}
                    </button>
                  </div>
                  {!gtLocked && (
                    <p className="text-xs mt-1" style={{ color: "#F0D68A" }}>
                      Unlocked — edits below replace the Bureau&apos;s gridded values. Re-entering the coordinates
                      will refill them.
                    </p>
                  )}
                </div>
              )}

              {/* 3. GSDM — only when picked in panel 2 */}
              {gsdmStep && (
              <Panel step={gsdmStep} title="GSDM">
                {c.gsdm_enabled && (
                  <>
                    {/* What the engineer has to judge — the figures cannot supply these */}
                    <Section title="Your inputs">
                      <Field label="Smooth Terrain (%)">
                        <input type="number" step="any" min="0" max="100" value={c.gsdm.smooth_fraction} onChange={(e) => updateGsdm(c.id, { smooth_fraction: e.target.value })} style={inputStyle} />
                      </Field>
                      <Field label="Rough Terrain (%)">
                        <input type="number" step="any" min="0" max="100" value={c.gsdm.rough_fraction} onChange={(e) => updateGsdm(c.id, { rough_fraction: e.target.value })} style={inputStyle} />
                      </Field>
                      <Field label="Elevation Factor (EAF)">
                        <input type="number" step="any" value={c.gsdm.elevation_factor} onChange={(e) => updateGsdm(c.id, { elevation_factor: e.target.value })} style={inputStyle} />
                      </Field>
                      {/* Figure 3 fills this in, but the reading is a judgement
                          between contours, so it stays an input you can override. */}
                      <Field label="Moisture Factor (MAF)">
                        <input
                          type="number" step="any" value={c.gsdm.moisture_factor}
                          onChange={(e) => updateGsdm(c.id, { moisture_factor: e.target.value })}
                          style={{
                            ...inputStyle,
                            borderColor: activeMaf?.data && c.gsdm.moisture_factor === String(activeMaf.data.maf)
                              ? "var(--color-accent)" : "var(--color-border)",
                          }}
                        />
                        {activeMaf?.data && c.gsdm.moisture_factor !== String(activeMaf.data.maf) && (
                          <button
                            type="button"
                            onClick={() => updateGsdm(c.id, { moisture_factor: String(activeMaf.data!.maf) })}
                            className="mt-1 text-[11px] underline transition-opacity opacity-70 hover:opacity-100"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            Fig 3 reads {activeMaf.data.maf.toFixed(3)} — restore
                          </button>
                        )}
                      </Field>
                    </Section>

                    <DerivedToggle
                      open={!!showDerived[c.id]}
                      count={1}
                      onClick={() => setShowDerived(s => ({ ...s, [c.id]: !s[c.id] }))}
                    />
                    {showDerived[c.id] && (
                      <Section title="From the figures">
                        <Field label="Duration Limit (hr) · Fig 2">
                          <select value={c.gsdm.duration_limit} onChange={(e) => updateGsdm(c.id, { duration_limit: e.target.value })} style={selectStyle}>
                            {[0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6].map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </Field>
                      </Section>
                    )}
                  </>
                )}
              </Panel>
              )}

              {/* 4. GTSMR / GSAM — only when picked in panel 2 */}
              {longStep && (
              <Panel step={longStep} title="GTSMR / GSAM">
                {c.gtsmr_enabled && activeZone?.gtsmr_applicable !== false && (
                  <>
                    {/* Every GTSMR value comes from the Bureau's grids, so the whole
                        block is collapsed — it is here to be checked, not filled in. */}
                    <DerivedToggle
                      open={!!showDerived[c.id + "_gt"]}
                      count={8}
                      onClick={() => setShowDerived(s => ({ ...s, [c.id + "_gt"]: !s[c.id + "_gt"] }))}
                    />
                    {showDerived[c.id + "_gt"] && (
                    <>
                    <Section title="GTSMR — Summer">
                      <LockedField label="EPW Avg Summer (mm)" locked={gtLocked}>
                        <input type="number" step="any" readOnly={gtLocked} value={c.gtsmr.epw_avg_summer}
                          onChange={(e) => updateGtsmr(c.id, { epw_avg_summer: e.target.value })}
                          style={gtLocked ? lockedInputStyle : inputStyle} />
                      </LockedField>
                      <LockedField label="EPW Std Summer (mm)" locked={gtLocked}>
                        <input type="number" step="any" readOnly={gtLocked} value={c.gtsmr.epw_std_summer}
                          onChange={(e) => updateGtsmr(c.id, { epw_std_summer: e.target.value })}
                          style={gtLocked ? lockedInputStyle : inputStyle} />
                      </LockedField>
                      <Field label="Summer Zone">
                        <select value={c.gtsmr.zone_summer} onChange={(e) => updateGtsmr(c.id, { zone_summer: e.target.value })} style={selectStyle}>
                          {GTSMR_ZONES_SUMMER.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </Field>
                    </Section>

                    <Section title="GTSMR — Winter">
                      <LockedField label="EPW Avg Winter (mm)" locked={gtLocked}>
                        <input type="number" step="any" readOnly={gtLocked} value={c.gtsmr.epw_avg_winter}
                          onChange={(e) => updateGtsmr(c.id, { epw_avg_winter: e.target.value })}
                          style={gtLocked ? lockedInputStyle : inputStyle} />
                      </LockedField>
                      <LockedField label="EPW Std Winter (mm)" locked={gtLocked}>
                        <input type="number" step="any" readOnly={gtLocked} value={c.gtsmr.epw_std_winter}
                          onChange={(e) => updateGtsmr(c.id, { epw_std_winter: e.target.value })}
                          style={gtLocked ? lockedInputStyle : inputStyle} />
                      </LockedField>
                      <Field label="Winter Zone">
                        <select value={c.gtsmr.zone_winter} onChange={(e) => updateGtsmr(c.id, { zone_winter: e.target.value })} style={selectStyle}>
                          {GTSMR_ZONES_WINTER.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </Field>
                    </Section>

                    {/* DAF and TAF are catchment-wide — they apply to both seasons */}
                    <Section title="GTSMR — Both Seasons">
                      <LockedField label="Decay Amplitude Factor" locked={gtLocked}>
                        <input type="number" step="any" readOnly={gtLocked} value={c.gtsmr.decay_factor}
                          onChange={(e) => updateGtsmr(c.id, { decay_factor: e.target.value })}
                          style={gtLocked ? lockedInputStyle : inputStyle} />
                      </LockedField>
                      <LockedField label="Topographic Factor (TAF)" locked={gtLocked}>
                        <input type="number" step="any" readOnly={gtLocked} value={c.gtsmr.topographic_factor}
                          onChange={(e) => updateGtsmr(c.id, { topographic_factor: e.target.value })}
                          style={gtLocked ? lockedInputStyle : inputStyle} />
                      </LockedField>
                    </Section>
                    </>
                    )}
                  </>
                )}

                {/* GSAM params — no grids ship for GSAM, so these are all yours */}
                {c.gsam_enabled && activeZone?.gsam_applicable !== false && (
                  <>
                    <Section title="GSAM — Summer">
                      <Field label="EPW Avg Summer (mm)">
                        <input type="number" step="any" value={c.gsam.epw_avg_summer} onChange={(e) => updateGsam(c.id, { epw_avg_summer: e.target.value })} style={inputStyle} />
                      </Field>
                      <Field label="EPW Std Summer (mm)">
                        <input type="number" step="any" value={c.gsam.epw_std_summer} onChange={(e) => updateGsam(c.id, { epw_std_summer: e.target.value })} style={inputStyle} />
                      </Field>
                      <Field label="Summer Zone">
                        <select value={c.gsam.zone_summer} onChange={(e) => updateGsam(c.id, { zone_summer: e.target.value })} style={selectStyle}>
                          {GSAM_ZONES_SUMMER.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </Field>
                    </Section>

                    <Section title="GSAM — Autumn">
                      <Field label="EPW Avg Autumn (mm)">
                        <input type="number" step="any" value={c.gsam.epw_avg_autumn} onChange={(e) => updateGsam(c.id, { epw_avg_autumn: e.target.value })} style={inputStyle} />
                      </Field>
                      <Field label="EPW Std Autumn (mm)">
                        <input type="number" step="any" value={c.gsam.epw_std_autumn} onChange={(e) => updateGsam(c.id, { epw_std_autumn: e.target.value })} style={inputStyle} />
                      </Field>
                      <Field label="Autumn Zone">
                        <select value={c.gsam.zone_autumn} onChange={(e) => updateGsam(c.id, { zone_autumn: e.target.value })} style={selectStyle}>
                          {GSAM_ZONES_AUTUMN.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </Field>
                    </Section>

                    <Section title="GSAM — Both Seasons">
                      <Field label="Topographic Factor (TAF)">
                        <input type="number" step="any" value={c.gsam.topographic_factor} onChange={(e) => updateGsam(c.id, { topographic_factor: e.target.value })} style={inputStyle} />
                      </Field>
                    </Section>
                  </>
                )}
              </Panel>
              )}
            </div>
            );
          })}

          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {catchments.length} catchment{catchments.length === 1 ? "" : "s"} · calculates all of them
              </span>
              {withoutMethod.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "#F0D68A" }}>
                  {canCalculate
                    ? `No method picked for ${withoutMethod.map(c => c.name.trim() || `Catchment ${catchments.indexOf(c) + 1}`).join(", ")} — ${withoutMethod.length === 1 ? "it returns" : "they return"} no depths.`
                    : "Pick at least one method in step 2 before calculating."}
                </p>
              )}
            </div>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={loading || !canCalculate}
              className="px-6 py-2 rounded-lg text-sm disabled:cursor-not-allowed transition-colors tb-btn-primary"
            >
              {loading ? "Calculating…" : "Calculate PMP"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-lg px-4 py-3 text-sm" style={{ background: "#2a1414", border: "1px solid #5c2323", color: "#f2a8a8" }}>
            {error}
          </div>
        )}

        {activeResult && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Results — {activeResult.name}
              </h2>
              <button
                onClick={downloadXLSX}
                disabled={exporting}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={ghostBtnStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {exporting
                  ? "Preparing…"
                  : `Download Excel${results.length > 1 ? ` (all ${results.length})` : ""}`}
              </button>
            </div>

            {/* Per-method breakdown for the selected catchment */}
            {[activeResult].map((r, i) => (
              <div key={i} className="rounded-xl shadow-sm tb-card">
                <div className="px-6 py-4 flex items-end justify-between gap-4 flex-wrap"
                  style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <div>
                    <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{r.name}</span>
                    <span className="ml-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{r.area} km²</span>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      {[
                        r.gsdm ? `GSDM ${r.gsdm.pmp_mm} mm @ ${r.gsdm.controlling_duration_hr} hr` : null,
                        r.gtsmr ? `GTSMR ${r.gtsmr.pmp_mm} mm @ ${r.gtsmr.controlling_duration_hr} hr (${r.gtsmr.governing_season})` : null,
                        r.gsam ? `GSAM ${r.gsam.pmp_mm} mm @ ${r.gsam.controlling_duration_hr} hr (${r.gsam.governing_season})` : null,
                      ].filter(Boolean).join("  ·  ")}
                    </p>
                  </div>
                  {r.governing_pmp_mm !== undefined && (
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                        Governing PMP
                      </p>
                      <p className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
                        {r.governing_pmp_mm} <span className="text-sm font-normal">mm</span>
                      </p>
                      {r.volume_m3 !== undefined && (
                        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {r.volume_m3.toLocaleString()} m³
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* depth-duration curves */}
                {!r.gsdm && !r.gtsmr && !r.gsam ? (
                  <div className="px-6 py-5">
                    <p className="text-sm" style={{ color: "#F0D68A" }}>
                      No method was applied to this catchment, so there is nothing to plot.
                      Pick GSDM or GTSMR/GSAM in step 2 and calculate again.
                    </p>
                  </div>
                ) : (
                  <div className="px-6 pt-4">
                    <PmpChart result={r} />
                  </div>
                )}
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {r.gsdm && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>GSDM</p>
                      <table className="text-xs w-full">
                        <thead><tr><th className="text-left pr-3" style={{ color: "var(--color-text-secondary)" }}>Duration (hr)</th><th className="text-right" style={{ color: "var(--color-text-secondary)" }}>PMP (mm)</th></tr></thead>
                        <tbody>
                          {r.gsdm.by_duration.map((row) => (
                            <tr key={row.duration_hr} style={{ fontWeight: row.duration_hr === r.gsdm!.controlling_duration_hr ? 700 : 400 }}>
                              <td className="pr-3 py-0.5 font-mono">{row.duration_hr}</td>
                              <td className="text-right font-mono">{row.pmp_mm}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {r.gtsmr && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>GTSMR</p>
                      {(["summer", "winter"] as const).map((season) => (
                        <div key={season} className="mb-3">
                          <p className="text-xs font-semibold mb-1 capitalize" style={{ color: "var(--color-text-primary)" }}>{season}</p>
                          <table className="text-xs w-full">
                            <thead><tr><th className="text-left pr-3" style={{ color: "var(--color-text-secondary)" }}>Duration (hr)</th><th className="text-right" style={{ color: "var(--color-text-secondary)" }}>PMP (mm)</th></tr></thead>
                            <tbody>
                              {r.gtsmr![season].by_duration.map((row) => (
                                <tr key={row.duration_hr} style={{ fontWeight: row.duration_hr === r.gtsmr![season].controlling_duration_hr ? 700 : 400 }}>
                                  <td className="pr-3 py-0.5 font-mono">{row.duration_hr}</td>
                                  <td className="text-right font-mono">{row.pmp_mm}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.gsam && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-accent)" }}>GSAM</p>
                      {(["summer", "autumn"] as const).map((season) => (
                        <div key={season} className="mb-3">
                          <p className="text-xs font-semibold mb-1 capitalize" style={{ color: "var(--color-text-primary)" }}>{season}</p>
                          <table className="text-xs w-full">
                            <thead><tr><th className="text-left pr-3" style={{ color: "var(--color-text-secondary)" }}>Duration (hr)</th><th className="text-right" style={{ color: "var(--color-text-secondary)" }}>PMP (mm)</th></tr></thead>
                            <tbody>
                              {r.gsam![season].by_duration.map((row) => (
                                <tr key={row.duration_hr} style={{ fontWeight: row.duration_hr === r.gsam![season].controlling_duration_hr ? 700 : 400 }}>
                                  <td className="pr-3 py-0.5 font-mono">{row.duration_hr}</td>
                                  <td className="text-right font-mono">{row.pmp_mm}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
