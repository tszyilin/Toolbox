"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { describeAge, useJobs, type Job } from "./jobs";
import type { ToolLink } from "./toolCategories";

/**
 * Opens a tool, asking first when there is already saved work for it: continue
 * that job, or start a new one. External tools are ordinary links.
 */
export default function ToolOpenLink({
  tool,
  className,
  style,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  tool: ToolLink;
  className?: string;
  style?: React.CSSProperties;
  onNavigate?: () => void;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const jobs = useJobs();
  const [asking, setAsking] = useState(false);

  if (tool.external) {
    return (
      <a
        href={tool.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </a>
    );
  }

  // Only jobs with saved work are worth resuming.
  const saved = jobs.filter((j) => j.href === tool.href && j.state !== undefined);

  function open(job?: Job) {
    setAsking(false);
    onNavigate?.();
    router.push(job ? `${tool.href}?job=${job.id}` : tool.href);
  }

  return (
    <>
      <Link
        href={tool.href}
        className={className}
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={(e) => {
          if (!saved.length) {
            onNavigate?.();
            return;
          }
          e.preventDefault();
          setAsking(true);
        }}
      >
        {children}
      </Link>

      {asking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setAsking(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: "var(--color-panel)", border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                You have saved work in {tool.name}
              </h2>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Pick up where you left off, or start a new one.
              </p>
            </div>

            <div className="px-3 pb-2 max-h-56 overflow-y-auto">
              {saved.map((job) => (
                <button
                  key={job.id}
                  onClick={() => open(job)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                      {job.name}
                    </span>
                    <span className="block text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      last opened {describeAge(job.updatedAt)}
                    </span>
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                    Continue →
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
              <button
                onClick={() => open()}
                className="flex-1 px-4 py-2 rounded-lg text-sm tb-btn-primary"
              >
                Start a new one
              </button>
              <button
                onClick={() => setAsking(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
