"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, ToolIcon } from "./toolCategories";
import ToolOpenLink from "./ToolOpenLink";
import { removeJob, renameJob, useJobs, type Job } from "./jobs";

function JobRow({ job, active }: { job: Job; active: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(job.name);

  function commit() {
    renameJob(job.id, draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(job.name);
              setEditing(false);
            }
          }}
          className="tb-input flex-1 min-w-0 px-2 py-1 text-xs outline-none"
        />
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-1 tb-nav-item ${active ? "tb-nav-item--active" : ""}`} style={{ padding: "4px 6px" }}>
      {/* Straight into this job's saved state — no prompt, the choice is made. */}
      <Link href={`${job.href}?job=${job.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 px-1 py-1">
        <span className="flex-shrink-0 w-4 flex items-center justify-center">
          <ToolIcon icon={job.icon} />
        </span>
        <span className="text-xs font-medium leading-tight truncate" title={job.name}>{job.name}</span>
      </Link>

      <span className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setDraft(job.name);
            setEditing(true);
          }}
          className="w-5 h-5 flex items-center justify-center rounded"
          style={{ color: "var(--color-text-secondary)" }}
          title="Rename"
          aria-label={`Rename ${job.name}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8.2 1.8l2 2L4.4 9.6l-2.6.6.6-2.6 5.8-5.8z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => removeJob(job.id)}
          className="w-5 h-5 flex items-center justify-center rounded"
          style={{ color: "var(--color-text-secondary)" }}
          title="Delete this job"
          aria-label={`Delete ${job.name}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 3.5h7M5 3.5V2.5h2v1M3.4 3.5l.4 6h4.4l.4-6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </span>
    </div>
  );
}

export default function Sidebar() {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const jobs = useJobs();

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
              return (
                <ToolOpenLink
                  key={tool.href}
                  tool={tool}
                  className={`flex items-center gap-3 transition-colors tb-nav-item ${active ? "tb-nav-item--active" : ""}`}
                >
                  <span className="flex-shrink-0 w-5 flex items-center justify-center">
                    <ToolIcon icon={tool.icon} />
                  </span>
                  <span className="min-w-0 truncate">
                    <span className="text-sm font-medium leading-tight">{tool.name}</span>
                    <span className="block text-[10px] leading-tight" style={{ color: "var(--color-text-muted)" }}>{tool.categoryName}</span>
                  </span>
                </ToolOpenLink>
              );
            })
          )
        ) : (
          <>
            {navItems.map((item) => {
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
            })}

            {/* Divider below the category list */}
            <hr className="my-3 border-0" style={{ borderTop: "1px solid var(--color-border)" }} />

            {/* Saved jobs, most recently worked on first */}
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              Recent
            </p>
            {jobs.length === 0 ? (
              <p className="px-2 py-1 text-[11px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
                Tools you open show up here.
              </p>
            ) : (
              jobs.map((job) => (
                <JobRow key={job.id} job={job} active={pathname === job.href} />
              ))
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
