"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createJob, getJob, saveJobState } from "./jobs";

const SAVE_DEBOUNCE_MS = 400;

/**
 * Reports the ?job= parameter and nothing else. useSearchParams() opts its
 * subtree out of prerendering, so it is isolated here behind its own Suspense
 * boundary — that keeps the tool page itself static instead of rendering an
 * empty shell until hydration.
 */
function JobParam({ onChange }: { onChange: (id: string | null) => void }) {
  const id = useSearchParams().get("job");
  useEffect(() => {
    onChange(id);
  }, [id, onChange]);
  return null;
}

/**
 * Ties a tool page to a job: restores the saved form state on open and writes
 * changes back as you work.
 *
 * `snapshot` is the state worth keeping — pass it fresh on every render.
 * `restore` is called once per job with whatever was saved for it.
 *
 * With no `?job=` in the URL a new job is started, which is what "start a new
 * one" does: it navigates to the tool without the parameter.
 *
 * Returns a node the page must render; it carries the URL reader.
 */
export function useJobSession<T>(href: string, snapshot: T, restore: (state: T) => void) {
  const router = useRouter();
  // undefined until the URL has been read on the client.
  const [paramId, setParamId] = useState<string | null | undefined>(undefined);
  const [jobId, setJobId] = useState<string | null>(null);
  const restoredFor = useRef<string | null>(null);
  const creating = useRef(false);
  // Kept in a ref so a new closure each render doesn't re-trigger the restore.
  // Updated in an effect that is declared first, so it is current before the
  // restore below runs.
  const restoreRef = useRef(restore);
  useEffect(() => {
    restoreRef.current = restore;
  });

  // Resolve the job named in the URL, or start one.
  useEffect(() => {
    if (paramId === undefined) return;
    if (paramId && getJob(paramId)) {
      setJobId(paramId);
      return;
    }
    if (creating.current) return;
    creating.current = true;
    const job = createJob(href);
    setJobId(job.id);
    router.replace(`${href}?job=${job.id}`, { scroll: false });
  }, [paramId, href, router]);

  // Load the saved state whenever the active job changes.
  useEffect(() => {
    if (!jobId || restoredFor.current === jobId) return;
    const job = getJob(jobId);
    restoredFor.current = jobId;
    if (job?.state !== undefined) restoreRef.current(job.state as T);
  }, [jobId]);

  // Write changes back, debounced. Serialising here also means an unchanged
  // form doesn't churn storage on every render.
  const serialised = JSON.stringify(snapshot);
  useEffect(() => {
    if (!jobId || restoredFor.current !== jobId) return;
    const timer = setTimeout(() => saveJobState(jobId, JSON.parse(serialised)), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [jobId, serialised]);

  return (
    <Suspense fallback={null}>
      <JobParam onChange={setParamId} />
    </Suspense>
  );
}
