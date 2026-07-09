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
    description: "Adjust 2016 IFD curves for climate change per ARR Book 1 Ch. 6 (SSP scenarios, loss parameters).",
    href: "/tools/ifd-climate-change",
    category: "Hydrology",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#BDCDD6" }}>
      {/* Hero header band — #6096B4 dominant */}
      <div className="px-6 py-10" style={{ backgroundColor: "#6096B4" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-white">Welcome to Toolbox</h1>
          <p className="mt-2 text-base" style={{ color: "#EEE9DA" }}>
            Tell the assistant what you want to do and it will guide you to the right tool.
          </p>
        </div>
      </div>

      {/* #93BFCF band — chatbot sits here */}
      <div className="px-6 py-8" style={{ backgroundColor: "#93BFCF" }}>
        <div className="max-w-3xl mx-auto">

        {/* Chatbot */}
        <ChatBot />
        </div>
      </div>

      {/* #BDCDD6 band — tool cards */}
      <div className="px-6 py-8" style={{ backgroundColor: "#BDCDD6" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-4 text-white">
            All Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group block rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-200"
                style={{ backgroundColor: "#EEE9DA", borderColor: "#93BFCF" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6096B4")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#93BFCF")}
              >
                <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#6096B4" }}>
                  {tool.category}
                </span>
                <h3 className="text-base font-semibold" style={{ color: "#1e2a35" }}>{tool.name}</h3>
                <p className="mt-1 text-sm" style={{ color: "#4d7d99" }}>{tool.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
