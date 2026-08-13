"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, type IconKey } from "./toolCategories";

const STORAGE_KEY = "toolbox.recentTools";
const MAX_RECENT = 8;

export interface RecentTool {
  href: string;
  /** Display name — may have been renamed by the user. */
  name: string;
  icon: IconKey;
  visitedAt: number;
}

function read(): RecentTool[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentTool =>
        !!e && typeof e.href === "string" && typeof e.name === "string" && typeof e.visitedAt === "number"
    );
  } catch {
    return [];
  }
}

function write(entries: RecentTool[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full or blocked — recents are best-effort */
  }
}

/** The tool registry entry for a path, if that path is a tool page. */
function lookupTool(href: string) {
  for (const cat of CATEGORIES) {
    const tool = cat.tools.find((t) => t.href === href && !t.external);
    if (tool) return tool;
  }
  return null;
}

/**
 * Recently-visited tools, persisted in localStorage.
 * Pass the current pathname and it records the visit itself.
 */
export function useRecentTools(pathname: string) {
  const [recents, setRecents] = useState<RecentTool[]>([]);

  // Load once on mount — localStorage is not available during SSR.
  useEffect(() => {
    setRecents(read());
  }, []);

  // Record a visit whenever the path lands on a known tool page.
  useEffect(() => {
    const tool = lookupTool(pathname);
    if (!tool) return;
    setRecents((prev) => {
      const existing = prev.find((e) => e.href === tool.href);
      const entry: RecentTool = {
        href: tool.href,
        // Keep a user-renamed label; only fall back to the registry name.
        name: existing?.name ?? tool.name,
        icon: tool.icon,
        visitedAt: Date.now(),
      };
      const next = [entry, ...prev.filter((e) => e.href !== tool.href)].slice(0, MAX_RECENT);
      write(next);
      return next;
    });
  }, [pathname]);

  const rename = useCallback((href: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRecents((prev) => {
      const next = prev.map((e) => (e.href === href ? { ...e, name: trimmed } : e));
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((href: string) => {
    setRecents((prev) => {
      const next = prev.filter((e) => e.href !== href);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecents([]);
    write([]);
  }, []);

  return { recents, rename, remove, clear };
}
