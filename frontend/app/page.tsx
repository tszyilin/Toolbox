"use client";

import Link from "next/link";

const tools = [
  {
    name: "Equal Area Slope",
    description: "Calculate equal area slope from surveyed cross-section data.",
    href: "/tools/equal-area-slope",
    category: "Hydrology",
  },
  {
    name: "IFD Climate Change Adjustment",
    description: "Adjust 2016 IFD curves for climate change per ARR Book 1 Ch. 6 (SSP scenarios, loss parameters).",
    href: "/tools/ifd-climate-change",
    category: "Hydrology",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Toolbox</h1>
          <p className="mt-3 text-lg" style={{ color: "#6096B4" }}>Engineering calculation tools</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group block rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200"
              style={{ borderColor: "#BDCDD6" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6096B4")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#BDCDD6")}
            >
              <span
                className="inline-block text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#93BFCF" }}
              >
                {tool.category}
              </span>
              <h2
                className="text-lg font-semibold transition-colors"
                style={{ color: "#1e2a35" }}
              >
                {tool.name}
              </h2>
              <p className="mt-2 text-sm text-gray-500">{tool.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
