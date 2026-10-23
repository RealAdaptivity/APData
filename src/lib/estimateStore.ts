import { useCallback, useState } from 'react';
import type { EstimateLine } from './labor';

/**
 * The estimate being built, kept in this browser so it survives moving
 * between job pages. One estimate at a time, tied to the vehicle it was
 * started for.
 */

const KEY = 'apdata.estimate';

export type EstimateState = { vehicleKey: string; lines: EstimateLine[] };

function read(): EstimateState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as EstimateState) : null;
    return v && Array.isArray(v.lines) ? v : null;
  } catch {
    return null;
  }
}

function write(v: EstimateState | null) {
  try {
    if (v) window.localStorage.setItem(KEY, JSON.stringify(v));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the estimate lasts for this page only */
  }
}

export function useEstimate(vehicleKey: string) {
  const [state, setState] = useState<EstimateState>(() => {
    const saved = read();
    return saved && saved.vehicleKey === vehicleKey ? saved : { vehicleKey, lines: [] };
  });

  const update = useCallback(
    (fn: (lines: EstimateLine[]) => EstimateLine[]) =>
      setState((s) => {
        const next = { vehicleKey, lines: fn(s.vehicleKey === vehicleKey ? s.lines : []) };
        write(next);
        return next;
      }),
    [vehicleKey]
  );

  return { lines: state.vehicleKey === vehicleKey ? state.lines : [], update };
}

/** Add a job from a job page without mounting the estimate. */
export function addToEstimate(vehicleKey: string, line: EstimateLine) {
  const saved = read();
  const lines = saved && saved.vehicleKey === vehicleKey ? saved.lines : [];
  write({ vehicleKey, lines: [...lines.filter((l) => l.key !== line.key), line] });
}
