"use client";

import { useSyncExternalStore } from "react";
import { CATEGORIES, type IconKey, type ToolLink } from "./toolCategories";

const STORAGE_KEY = "toolbox.jobs";
/** Key used by the first version of this feature, before jobs held state. */
const LEGACY_KEY = "toolbox.recentTools";
const MAX_JOBS = 20;

export interface Job {
  id: string;
  /** Tool page this job belongs to. */
  href: string;
  /** Display name — the tool's name by default, renameable. */
  name: string;
  icon: IconKey;
  updatedAt: number;
  /** Tool-specific form state; absent until the tool saves something. */
  state?: unknown;
}

/* ---- store ------------------------------------------------------------- */

const EMPTY: Job[] = [];
let cache: Job[] | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): Job[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (j): j is Job =>
        !!j && typeof j.id === "string" && typeof j.href === "string" &&
        typeof j.name === "string" && typeof j.updatedAt === "number"
    );
  } catch {
    return [];
  }
}

interface LegacyRecent {
  href: string;
  name: string;
  icon?: IconKey;
  /** The old shape's name for updatedAt. */
  visitedAt?: number;
}

/** Carry over entries written by the earlier recent-tools list. */
function migrateLegacy(): Job[] {
  let legacy: LegacyRecent[];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "null");
    if (!Array.isArray(parsed)) return [];
    legacy = parsed.filter(
      (e): e is LegacyRecent => !!e && typeof e.href === "string" && typeof e.name === "string"
    );
  } catch {
    return [];
  }
  return legacy.map((e, i) => ({
    id: `legacy-${i}-${e.visitedAt ?? Date.now()}`,
    href: e.href,
    name: e.name,
    icon: e.icon ?? "grid",
    updatedAt: e.visitedAt ?? Date.now(),
  }));
}

function load(): Job[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  cache = raw === null ? migrateLegacy() : parse(raw);
  return cache;
}

function commit(next: Job[]) {
  cache = next.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_JOBS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked — jobs are best-effort */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Live list of jobs, most recently updated first. */
export function useJobs(): Job[] {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export function getJobs(): Job[] {
  return load();
}

export function getJob(id: string): Job | undefined {
  return load().find((j) => j.id === id);
}

export function jobsFor(href: string): Job[] {
  return load().filter((j) => j.href === href);
}

/* ---- mutations --------------------------------------------------------- */

function lookupTool(href: string): ToolLink | undefined {
  for (const cat of CATEGORIES) {
    const tool = cat.tools.find((t) => t.href === href);
    if (tool) return tool;
  }
  return undefined;
}

function uniqueName(base: string, existing: Job[]): string {
  if (!existing.some((j) => j.name === base)) return base;
  let n = 2;
  while (existing.some((j) => j.name === `${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}

/**
 * Start a job for a tool. Any earlier job for the same tool that was never
 * edited is dropped, so opening a tool repeatedly doesn't pile up blanks.
 */
export function createJob(href: string): Job {
  const tool = lookupTool(href);
  const kept = load().filter((j) => j.href !== href || j.state !== undefined);
  const job: Job = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    href,
    name: uniqueName(tool?.name ?? "Job", kept.filter((j) => j.href === href)),
    icon: tool?.icon ?? "grid",
    updatedAt: Date.now(),
  };
  commit([job, ...kept]);
  return job;
}

export function saveJobState(id: string, state: unknown) {
  const jobs = load();
  if (!jobs.some((j) => j.id === id)) return;
  commit(jobs.map((j) => (j.id === id ? { ...j, state, updatedAt: Date.now() } : j)));
}

export function renameJob(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  commit(load().map((j) => (j.id === id ? { ...j, name: trimmed } : j)));
}

export function removeJob(id: string) {
  commit(load().filter((j) => j.id !== id));
}

/* ---- helpers ----------------------------------------------------------- */

export function describeAge(timestamp: number): string {
  const mins = Math.round((Date.now() - timestamp) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
