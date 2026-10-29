/**
 * Labor guide math: which book hours apply to a vehicle, what the shop's
 * actual times say, and what an estimate comes to.
 *
 * No imports beyond vehicle.ts, so the node test runner loads it directly.
 */

import { matchVehicle, scopeFit, type Vehicle } from './vehicle.ts';
import { rangeText, typicalFor } from '../data/laborTypical.ts';

export type LaborEntry = {
  id: string;
  job_code: string;
  kind: 'book' | 'actual';
  model_year: number | null;
  make: string | null;
  model: string | null;
  engine: string | null;
  hours: number;
  note: string | null;
  created_at: string;
  created_by: string | null;
  author?: string | null;
};

export type HoursStats = { count: number; average: number; median: number; min: number; max: number };

export function hoursStats(hours: number[]): HoursStats | null {
  const xs = hours.filter((h) => Number.isFinite(h) && h > 0).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  const median = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  const average = xs.reduce((s, h) => s + h, 0) / xs.length;
  return { count: xs.length, average: round1(average), median: round1(median), min: xs[0], max: xs[xs.length - 1] };
}

/** One decimal: 1.25 → 1.3. Labor is quoted in tenths. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * The book hours the shop charges for this job on this vehicle: the most
 * specific entry that covers it (model + years beats model beats make beats
 * all vehicles), newest first among equals. Null when none is set.
 */
export function bookHoursFor(entries: LaborEntry[], v: Vehicle | null): LaborEntry | null {
  let best: { e: LaborEntry; fit: number } | null = null;
  for (const e of entries) {
    if (e.kind !== 'book') continue;
    const fit = v
      ? scopeFit(v, { make: e.make, model: e.model, engine: e.engine, model_year: e.model_year })
      : e.make
        ? null
        : 0;
    if (fit == null) continue;
    if (!best || fit > best.fit || (fit === best.fit && e.created_at > best.e.created_at)) best = { e, fit };
  }
  return best?.e ?? null;
}

export type ActualSummary = {
  /** Same model within 2 years. */
  thisVehicle: HoursStats | null;
  /** Same make. */
  sameMake: HoursStats | null;
  /** Every vehicle. */
  all: HoursStats | null;
};

export function actualSummary(entries: LaborEntry[], v: Vehicle | null): ActualSummary {
  const actual = entries.filter((e) => e.kind === 'actual');
  const close: number[] = [];
  const make: number[] = [];
  for (const e of actual) {
    if (!v) continue;
    const m = matchVehicle(v, e);
    if (!m) continue;
    make.push(e.hours);
    if (m.tier === 'exact' || m.tier === 'near') close.push(e.hours);
  }
  return {
    thisVehicle: hoursStats(close),
    sameMake: hoursStats(make),
    all: hoursStats(actual.map((e) => e.hours)),
  };
}

/**
 * The hours to quote: the shop's book time if set, otherwise the median of
 * what the job really took on this kind of vehicle, otherwise AP Data's
 * typical time for the job (when `code` is given), otherwise null.
 */
export function suggestedHours(entries: LaborEntry[], v: Vehicle | null, code?: string): { hours: number; basis: string } | null {
  const book = bookHoursFor(entries, v);
  if (book) return { hours: book.hours, basis: book.make ? 'Shop book time for this vehicle' : 'Shop book time' };
  const s = actualSummary(entries, v);
  if (s.thisVehicle && s.thisVehicle.count >= 2) return { hours: s.thisVehicle.median, basis: `Median of ${s.thisVehicle.count} jobs on this model` };
  if (s.sameMake && s.sameMake.count >= 3) return { hours: s.sameMake.median, basis: `Median of ${s.sameMake.count} jobs on this make` };
  if (s.all && s.all.count >= 3) return { hours: s.all.median, basis: `Median of ${s.all.count} jobs, all vehicles` };
  const t = code ? typicalFor(code, v?.engine) : null;
  if (t) return { hours: t.hours, basis: `AP Data typical time (${rangeText(t)}${t.engine !== 'other' ? `, ${t.engine.toUpperCase()}` : ''}) — set a shop book time to replace it` };
  return null;
}

export type EstimateLine = { key: string; name: string; hours: number; partsCents: number };

export function estimateTotals(lines: EstimateLine[], rateCents: number) {
  const hours = round1(lines.reduce((s, l) => s + (Number.isFinite(l.hours) && l.hours > 0 ? l.hours : 0), 0));
  const laborCents = Math.round(hours * rateCents);
  const partsCents = lines.reduce((s, l) => s + (Number.isFinite(l.partsCents) && l.partsCents > 0 ? Math.round(l.partsCents) : 0), 0);
  return { hours, laborCents, partsCents, totalCents: laborCents + partsCents };
}

export function dollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
