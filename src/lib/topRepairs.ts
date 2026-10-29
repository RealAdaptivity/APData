/**
 * Top Repairs: the shop's confirmed fixes for a code (or symptom), grouped by
 * what was actually wrong and ranked by how many times it fixed the problem,
 * with the mileage each one happened at. This is AP Data's answer to
 * ProDemand's SureTrack Top Repairs — built only from the shop's own fixes.
 *
 * No imports, so the node test runner loads it directly (tests/testing.test.ts).
 */

export type RepairInput = {
  id: string;
  root_cause: string;
  fix: string;
  parts: string | null;
  mileage: number | null;
  labor_hours: number | null;
  confirmations: { length: number } | unknown[];
};

export type TopRepair = {
  /** The root cause as first written. */
  cause: string;
  /** Fixes plus confirmations: how many times this fixed it. */
  times: number;
  fixIds: string[];
  /** Mileages recorded on the fixes. */
  miles: number[];
  /** Distinct parts lines, most common first. */
  parts: string[];
  /** Average labor hours where recorded. */
  avgLabor: number | null;
  /** Share of all fixes for the search, 0–100. */
  pct: number;
};

/** "Failed VCT solenoid (bank 1)!" and "failed vct solenoid bank 1" group together. */
export function causeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|was|is|bad|failed|faulty|replaced|replace)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function topRepairs(fixes: RepairInput[]): TopRepair[] {
  const groups = new Map<string, { cause: string; times: number; fixIds: string[]; miles: number[]; parts: Map<string, number>; labor: number[] }>();
  for (const f of fixes) {
    const key = causeKey(f.root_cause) || causeKey(f.fix);
    if (!key) continue;
    const g = groups.get(key) ?? { cause: f.root_cause.trim() || f.fix.trim(), times: 0, fixIds: [] as string[], miles: [] as number[], parts: new Map<string, number>(), labor: [] as number[] };
    g.times += 1 + (Array.isArray(f.confirmations) ? f.confirmations.length : 0);
    g.fixIds.push(f.id);
    if (f.mileage && f.mileage > 0) g.miles.push(f.mileage);
    const part = f.parts?.trim();
    if (part) g.parts.set(part, (g.parts.get(part) ?? 0) + 1);
    if (f.labor_hours && f.labor_hours > 0) g.labor.push(f.labor_hours);
    groups.set(key, g);
  }
  const total = [...groups.values()].reduce((s, g) => s + g.times, 0);
  return [...groups.values()]
    .map((g) => ({
      cause: g.cause,
      times: g.times,
      fixIds: g.fixIds,
      miles: g.miles.sort((a, b) => a - b),
      parts: [...g.parts.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p),
      avgLabor: g.labor.length ? Math.round((g.labor.reduce((s, x) => s + x, 0) / g.labor.length) * 10) / 10 : null,
      pct: total ? Math.round((g.times / total) * 100) : 0,
    }))
    .sort((a, b) => b.times - a.times || a.cause.localeCompare(b.cause));
}

export type MileBucket = { from: number; to: number; n: number };

/** Fixes per mileage band (0–25k, 25–50k…), from 0 up to the highest band used. */
export function mileageBuckets(miles: number[], size = 25_000): MileBucket[] {
  const valid = miles.filter((m) => Number.isFinite(m) && m > 0);
  if (!valid.length) return [];
  const top = Math.floor(Math.max(...valid) / size);
  const out: MileBucket[] = Array.from({ length: top + 1 }, (_, i) => ({ from: i * size, to: (i + 1) * size, n: 0 }));
  for (const m of valid) out[Math.floor(m / size)].n += 1;
  return out;
}

export function bucketLabel(b: MileBucket): string {
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  return `${k(b.from)}–${k(b.to)}`;
}
