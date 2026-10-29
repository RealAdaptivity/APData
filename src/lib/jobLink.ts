/**
 * Opening AP Data from an Adaptivity job: the tech job screen and the admin
 * dispatch console link to
 *
 *   #/go?job=AP-ZA4DHQ7B&vin=…&year=2015&make=Ford&model=Explorer&engine=3.5L&issue=…&codes=P0301
 *
 * AP Data sets the vehicle, remembers the job for this browser tab (so the fix
 * the tech records is tied to it), and opens the vehicle dashboard.
 *
 * No imports except pure helpers, so the node test runner loads it directly.
 */
import { normalizeVin, isVinShaped } from './vin.ts';

export type JobContext = {
  /** The booking's reference code, e.g. AP-ZA4DHQ7B. */
  ref: string;
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  engine?: string;
  /** What the customer said, from the booking. */
  issue?: string;
  codes: string[];
};

const clean = (s: string | null, max: number) => {
  const t = (s ?? '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, max) : undefined;
};

/** The job a #/go link describes, or null when it names no valid job. */
export function parseJobLink(query: URLSearchParams): JobContext | null {
  const ref = clean(query.get('job'), 40);
  if (!ref || !/^[A-Za-z0-9-]{3,40}$/.test(ref)) return null;
  const vin = normalizeVin(query.get('vin') ?? '');
  const year = clean(query.get('year'), 4);
  const codes = (query.get('codes') ?? '')
    .toUpperCase()
    .split(/[\s,;]+/)
    .filter((c) => /^[PBCU][0-3][0-9A-F]{3}$/.test(c))
    .slice(0, 20);
  return {
    ref,
    ...(isVinShaped(vin) ? { vin } : {}),
    ...(year && /^\d{4}$/.test(year) ? { year } : {}),
    ...(clean(query.get('make'), 40) ? { make: clean(query.get('make'), 40) } : {}),
    ...(clean(query.get('model'), 60) ? { model: clean(query.get('model'), 60) } : {}),
    ...(clean(query.get('engine'), 60) ? { engine: clean(query.get('engine'), 60) } : {}),
    ...(clean(query.get('issue'), 500) ? { issue: clean(query.get('issue'), 500) } : {}),
    codes: [...new Set(codes)],
  };
}

/**
 * Whether the job is about this vehicle: same VIN when both have one,
 * otherwise the same year, make and model.
 */
export function jobMatchesVehicle(job: JobContext, v: { vin?: string; year: string; make: string; model: string }): boolean {
  if (job.vin && v.vin) return job.vin === normalizeVin(v.vin);
  const n = (s: string | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return !!job.year && job.year === v.year && n(job.make) === n(v.make) && !!n(job.model) && n(job.model) === n(v.model);
}
