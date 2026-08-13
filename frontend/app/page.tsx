"use client";

import { useMemo, useState } from "react";
import SearchBar from "./components/SearchBar";
import ToolOpenLink from "./components/ToolOpenLink";
import { CATEGORIES, ToolIcon, type ToolLink } from "./components/toolCategories";

function ToolRow({ tool, categoryName }: { tool: ToolLink; categoryName?: string }) {
  return (
    <ToolOpenLink
      tool={tool}
      className="flex items-start gap-3 px-4 py-3 transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
        <ToolIcon icon={tool.icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{tool.name}</span>
        {categoryName && (
          <span className="block text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "var(--color-text-muted)" }}>{categoryName}</span>
        )}
        {tool.description && (
          <span className="block mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{tool.description}</span>
        )}
      </span>
    </ToolOpenLink>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.name, true]))
  );

  function toggleCategory(name: string) {
    setOpenCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return CATEGORIES.flatMap((cat) =>
      cat.tools
        .filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.description?.toLowerCase().includes(q) ?? false) ||
            cat.name.toLowerCase().includes(q)
        )
        .map((t) => ({ tool: t, categoryName: cat.name }))
    );
  }, [query]);

  return (
    <main className="min-h-screen tb-bg">
      {/* Body */}
      <div className="px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-8">

          <div className="flex flex-col items-center pt-10 pb-2">
            <h2 className="text-2xl tb-h1 mb-6">Where do we start?</h2>
            <SearchBar value={query} onChange={setQuery} placeholder="Search tools…" />
          </div>

          {results ? (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              {results.length === 0 ? (
                <p className="px-4 py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No tools match &ldquo;{query}&rdquo;.
                </p>
              ) : (
                results.map(({ tool, categoryName }) => (
                  <ToolRow key={tool.href} tool={tool} categoryName={categoryName} />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const isOpen = openCategories[cat.name];
                return (
                  <div
                    key={cat.name}
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--color-border)" }}
                  >
                    <button
                      onClick={() => toggleCategory(cat.name)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                      style={{ backgroundColor: "var(--color-panel)", color: "var(--color-text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-panel)")}
                    >
                      <span>{cat.name}</span>
                      <svg
                        width="12" height="12" viewBox="0 0 12 12" fill="none"
                        className="flex-shrink-0"
                        style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                      >
                        <path d="M2.5 4.25l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div style={{ backgroundColor: "var(--color-bg)" }}>
                        {cat.tools.map((tool) => (
                          <ToolRow key={tool.href} tool={tool} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
