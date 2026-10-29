/**
 * The owner's view of AP Data: who is adding knowledge, which codes and
 * vehicles the shop sees most, which jobs run over book time, and how many
 * finished Adaptivity jobs got a confirmed fix recorded.
 *
 * Pure aggregation over rows the page loads; no imports, so the node test
 * runner loads it directly (tests/ownerStats.test.ts).
 */

export type Dated = { by: string | null; at: string };

export type TechRow = { id: string; name: string; fixes: number; confirmations: number; photos: number; notes: number; specs: number; labor: number; total: number };

const since = (at: string, days: number, now: number) => now - new Date(at).getTime() <= days * 86_400_000;

/** Contributions per staff member within the last `days`, most first. Unknown authors are dropped. */
export function perTech(
  staff: { id: string; name: string }[],
  rows: { fixes: Dated[]; confirmations: Dated[]; photos: Dated[]; notes: Dated[]; specs: Dated[]; labor: Dated[] },
  days: number,
  now = Date.now()
): TechRow[] {
  const out = new Map(staff.map((s) => [s.id, { id: s.id, name: s.name, fixes: 0, confirmations: 0, photos: 0, notes: 0, specs: 0, labor: 0, total: 0 }]));
  for (const key of ['fixes', 'confirmations', 'photos', 'notes', 'specs', 'labor'] as const) {
    for (const r of rows[key]) {
      const t = r.by ? out.get(r.by) : undefined;
      if (!t || !since(r.at, days, now)) continue;
      t[key] += 1;
      t.total += 1;
    }
  }
  return [...out.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function topCounts(values: string[], limit = 10): { key: string; n: number }[] {
  const c = new Map<string, number>();
  for (const v of values) {
    const k = v.trim();
    if (k) c.set(k, (c.get(k) ?? 0) + 1);
  }
  return [...c.entries()]
    .map(([key, n]) => ({ key, n }))
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export type OverBook = { job: string; book: number; actual: number; count: number; overPct: number };

/** Jobs whose average actual time beats the shop's book time by more than `margin` (0.15 = 15%), worst first. */
export function laborOverBook(rows: { job_code: string; kind: string; hours: number | null }[], margin = 0.15): OverBook[] {
  const g = new Map<string, { book: number[]; actual: number[] }>();
  for (const r of rows) {
    if (r.hours == null || r.hours <= 0) continue;
    const e = g.get(r.job_code) ?? { book: [], actual: [] };
    (r.kind === 'book' ? e.book : e.actual).push(Number(r.hours));
    g.set(r.job_code, e);
  }
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const out: OverBook[] = [];
  for (const [job, e] of g) {
    if (!e.book.length || !e.actual.length) continue;
    const book = avg(e.book);
    const actual = avg(e.actual);
    if (actual > book * (1 + margin)) out.push({ job, book, actual, count: e.actual.length, overPct: Math.round((actual / book - 1) * 100) });
  }
  return out.sort((a, b) => b.overPct - a.overPct);
}

/** Of the Adaptivity jobs completed in the period, how many have a confirmed fix recorded against them. */
export function fixCapture(bookings: { reference_code: string; status: string | null; created_at: string }[], fixJobRefs: (string | null)[], days: number, now = Date.now()) {
  const done = bookings.filter((b) => String(b.status).toUpperCase() === 'COMPLETED' && since(b.created_at, days, now));
  const refs = new Set(fixJobRefs.filter((r): r is string => !!r));
  const withFix = done.filter((b) => refs.has(b.reference_code)).length;
  return { completed: done.length, withFix, pct: done.length ? Math.round((withFix / done.length) * 100) : null };
}
