"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, ToolIcon } from "./toolCategories";

export default function Sidebar() {
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: "home" as const },
    ...CATEGORIES.map((cat) => ({ name: cat.name, href: `/category/${cat.slug}`, icon: "grid" as const })),
  ];

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return CATEGORIES.flatMap((cat) =>
      cat.tools
        .filter((t) => t.name.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q))
        .map((t) => ({ ...t, categoryName: cat.name }))
    );
  }, [query]);

  return (
    <aside className="tb-panel flex-shrink-0 h-screen sticky top-0 flex flex-col overflow-hidden" style={{ width: "220px" }}>
      {/* Header: search bar */}
      <div className="flex items-center px-3 py-3" style={{ minHeight: "56px" }}>
        <div
          className="tb-input flex-1 flex items-center gap-2 px-3 py-2 min-w-0"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {/* Category links / search results */}
      <nav className="flex-1 pt-1 pb-3 overflow-y-auto overflow-x-hidden px-3 space-y-0.5">
        {searchResults ? (
          searchResults.length === 0 ? (
            <p className="px-2 py-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              No tools match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            searchResults.map((tool) => {
              const active = pathname === tool.href;
              const LinkComp = tool.external ? "a" : Link;
              return (
                <LinkComp
                  key={tool.href}
                  href={tool.href}
                  {...(tool.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`flex items-center gap-3 transition-colors tb-nav-item ${active ? "tb-nav-item--active" : ""}`}
                >
                  <span className="flex-shrink-0 w-5 flex items-center justify-center">
                    <ToolIcon icon={tool.icon} />
                  </span>
                  <span className="min-w-0 truncate">
                    <span className="text-sm font-medium leading-tight">{tool.name}</span>
                    <span className="block text-[10px] leading-tight" style={{ color: "var(--color-text-muted)" }}>{tool.categoryName}</span>
                  </span>
                </LinkComp>
              );
            })
          )
        ) : (
          navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 transition-colors tb-nav-item ${active ? "tb-nav-item--active" : ""}`}
              >
                <span className="flex-shrink-0 w-5 flex items-center justify-center">
                  <ToolIcon icon={item.icon} />
                </span>
                <span className="text-sm font-medium leading-tight truncate">{item.name}</span>
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}
