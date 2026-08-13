"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBar from "./SearchBar";
import { CATEGORIES, ToolIcon } from "./toolCategories";

export default function FloatingSearch() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Cmd/Ctrl+K opens the panel, Escape closes it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close whenever we land on a new page.
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.flatMap((cat) =>
      cat.tools
        .filter(
          (t) =>
            !q ||
            t.name.toLowerCase().includes(q) ||
            (t.description?.toLowerCase().includes(q) ?? false) ||
            cat.name.toLowerCase().includes(q)
        )
        .map((t) => ({ tool: t, categoryName: cat.name }))
    );
  }, [query]);

  // The home page has its own search bar front and centre.
  if (pathname === "/") return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          className="flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: "340px",
            maxHeight: "460px",
            backgroundColor: "var(--color-panel)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="p-2.5 flex-shrink-0">
            <SearchBar value={query} onChange={setQuery} placeholder="Search tools…" autoFocus />
          </div>

          <div className="flex-1 overflow-y-auto pb-2">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                No tools match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              results.map(({ tool, categoryName }) => {
                const LinkComp = tool.external ? "a" : Link;
                const active = pathname === tool.href;
                return (
                  <LinkComp
                    key={tool.href}
                    href={tool.href}
                    {...(tool.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 mx-2 tb-nav-item ${active ? "tb-nav-item--active" : ""}`}
                  >
                    <span className="flex-shrink-0 w-5 flex items-center justify-center">
                      <ToolIcon icon={tool.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium leading-tight truncate">{tool.name}</span>
                      <span className="block text-[10px] leading-tight" style={{ color: "var(--color-text-muted)" }}>{categoryName}</span>
                    </span>
                  </LinkComp>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: "var(--color-accent)" }}
        title="Search tools (Ctrl+K)"
        aria-label="Search tools"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4L14 14M14 4L4 14" stroke="var(--color-accent-text)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="var(--color-accent-text)" strokeWidth="2" />
            <path d="M13.5 13.5L18 18" stroke="var(--color-accent-text)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
