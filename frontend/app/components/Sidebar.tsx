"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tools = [
  {
    name: "Equal Area Slope",
    href: "/tools/equal-area-slope",
    category: "Hydrology",
    icon: "〰",
  },
  {
    name: "IFD Climate Change Adjustment",
    href: "/tools/ifd-climate-change",
    category: "Hydrology",
    icon: "🌡",
  },
  {
    name: "Loss Parameter Adjustment",
    href: "/tools/loss-climate-change",
    category: "Hydrology",
    icon: "💧",
  },
  {
    name: "Interpolation / Extrapolation",
    href: "/tools/interpolation",
    category: "General",
    icon: "📈",
  },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();

  return (
    <aside
      className="flex-shrink-0 h-screen sticky top-0 flex flex-col transition-all duration-300 overflow-hidden"
      style={{
        width: expanded ? "220px" : "52px",
        background: "linear-gradient(180deg, #1A72B5 0%, #7aaec4 55%, #4AADC4 100%)",
        borderRight: "1px solid #145D96",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4" style={{ minHeight: "56px" }}>
        {expanded && (
          <Link href="/" className="text-white font-bold text-base tracking-tight truncate">
            Toolbox
          </Link>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white rounded p-1 hover:bg-white/20 transition-colors ml-auto flex-shrink-0"
          title={expanded ? "Collapse" : "Expand"}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            {expanded ? (
              <path d="M11 4L6 9L11 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M7 4L12 9L7 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      <div className="h-px mx-3" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />

      {/* Tool links */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {expanded && (
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>
            Tools
          </p>
        )}
        {tools.map((tool) => {
          const active = pathname === tool.href;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              title={!expanded ? tool.name : undefined}
              className="flex items-center gap-3 mx-2 my-0.5 rounded-lg px-2 py-2.5 transition-colors"
              style={{
                backgroundColor: active ? "rgba(255,255,255,0.25)" : "transparent",
                color: "white",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <span className="flex-shrink-0 text-base w-5 text-center">{tool.icon}</span>
              {expanded && (
                <span className="text-sm font-medium leading-tight truncate">{tool.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
