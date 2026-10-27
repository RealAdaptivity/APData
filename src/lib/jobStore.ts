import { useSyncExternalStore } from 'react';
import type { JobContext } from './jobLink';

/**
 * The Adaptivity job this browser tab was opened from (#/go?job=…). Kept in
 * session storage: it lasts while the tab is open, and a tech who opens AP
 * Data on its own is never tied to an old job. Storage can be blocked, so
 * every read and write tolerates failure.
 */

const KEY = 'apdata.job';
const listeners = new Set<() => void>();
let memory: JobContext | null = null;
let loaded = false;

function read(): JobContext | null {
  if (!loaded) {
    loaded = true;
    try {
      const raw = window.sessionStorage.getItem(KEY);
      memory = raw ? (JSON.parse(raw) as JobContext) : null;
    } catch {
      memory = null;
    }
  }
  return memory;
}

export function setJob(job: JobContext | null) {
  memory = job;
  loaded = true;
  try {
    if (job) window.sessionStorage.setItem(KEY, JSON.stringify(job));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* kept in memory for this visit */
  }
  listeners.forEach((l) => l());
}

export function currentJob(): JobContext | null {
  return read();
}

export function useJob(): JobContext | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null
  );
}
