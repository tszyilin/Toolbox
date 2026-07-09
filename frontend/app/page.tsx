"use client";

import Link from "next/link";
import ChatBot from "./components/ChatBot";

const tools = [
  {
    name: "Equal Area Slope",
    description: "Calculate equal area slope from surveyed cross-section data.",
    href: "/tools/equal-area-slope",
    category: "Hydrology",
  },
  {
    name: "IFD Climate Change Adjustment",
    description: "Adjust 2016 BOM IFD curves for climate change per ARR Book 1 Ch. 6.",
    href: "/tools/ifd-climate-change",
    category: "Hydrology",
  },
  {
    name: "Loss Parameter Adjustment",
    description: "Adjust Initial Loss (IL) and Continuing Loss (CL) for climate change by NRM cluster.",
    href: "/tools/loss-climate-change",
    category: "Hydrology",
  },
  {
    name: "Interpolation / Extrapolation",
    description: "Paste or upload X,Y data and query any value — live linear interpolation and extrapolation.",
    href: "/tools/interpolation",
    category: "General",
  },
];

const externalLinks = [
  {
    name: "BOM Rainfall Data Extractor",
    description: "Extract and download rainfall data from the Bureau of Meteorology.",
    href: "https://bomextract.up.railway.app/",
    category: "External",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#8CB6D0" }}>
      {/* Header */}
      <div className="px-6 py-10" style={{ backgroundColor: "#1A72B5" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-white">Welcome to Toolbox</h1>
          <p className="mt-2 text-base text-white opacity-80">
            Tell the assistant what you want to do and it will guide you to the right tool.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-8" style={{ backgroundColor: "#8CB6D0" }}>
        <div className="max-w-3xl mx-auto space-y-8">

          <ChatBot />

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-white">
              All Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group block rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 bg-white"
                  style={{ borderColor: "#8CB6D0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#1A72B5")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#8CB6D0")}
                >
                  <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#1A72B5" }}>
                    {tool.category}
                  </span>
                  <h3 className="text-base font-semibold" style={{ color: "#1e2a35" }}>{tool.name}</h3>
                  <p className="mt-1 text-sm" style={{ color: "#145D96" }}>{tool.description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-white">
              External Resources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {externalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 bg-white"
                  style={{ borderColor: "#8CB6D0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#1A72B5")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#8CB6D0")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#1A72B5" }}>
                      {link.category}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "#8CB6D0" }}>
                      <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold" style={{ color: "#1e2a35" }}>{link.name}</h3>
                  <p className="mt-1 text-sm" style={{ color: "#145D96" }}>{link.description}</p>
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
