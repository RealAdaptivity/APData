/**
 * A vehicle's service history by VIN: Adaptivity jobs, quotes and receipts
 * from the shop app, and the fixes, confirmations and notes techs added in
 * AP Data, merged into one timeline, newest first.
 *
 * No imports, so the node test runner loads it directly (tests/history.test.ts).
 */

export type LineItem = { title?: unknown; note?: unknown; hours?: unknown };

export type HistoryRows = {
  jobs: { reference_code: string; created_at: string; preferred_date: string | null; status: string | null; services: unknown; issue_description: string | null; vehicle_description: string | null }[];
  receipts: { receipt_number: string | null; paid_on: string | null; created_at: string; total_cents: number | null; line_items: unknown; notes: string | null }[];
  quotes: { quote_number: string | null; created_at: string; status: string | null; total_cents: number | null; line_items: unknown }[];
  fixes: { id: string; created_at: string; mileage: number | null; dtc_codes: string[] | null; root_cause: string; fix: string; job_ref: string | null }[];
  confirmations: { fix_id: string; created_at: string; note: string | null; root_cause: string | null }[];
  notes: { id: string; created_at: string; note: string; job_ref: string | null }[];
  /** Vehicle history facts the shop recorded (vehicle_history_events). */
  events?: { id: string; created_at: string; kind: string; event_date: string | null; mileage: number | null; note: string; source: string | null; label: string }[];
};

export type HistoryKind = 'job' | 'receipt' | 'quote' | 'fix' | 'confirmation' | 'note' | 'event';

export type HistoryEntry = {
  kind: HistoryKind;
  /** ISO date or timestamp used for ordering. */
  date: string;
  title: string;
  detail: string[];
  /** AP Data route for the entry, when it has one. */
  to?: string;
  /** Booking reference, for jobs and anything tied to one. */
  job?: string;
};

const money = (cents: number | null) => (cents == null ? '' : `$${(cents / 100).toFixed(2)}`);

function itemTitles(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((i) => {
      const it = (i ?? {}) as LineItem;
      const title = typeof it.title === 'string' ? it.title.trim() : '';
      const hours = typeof it.hours === 'number' && it.hours > 0 ? ` (${it.hours} h)` : '';
      return title ? `${title}${hours}` : '';
    })
    .filter(Boolean);
}

function services(s: unknown): string[] {
  return Array.isArray(s) ? s.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];
}

const STATUS: Record<string, string> = {
  UNASSIGNED: 'Waiting for a tech',
  ASSIGNED: 'Assigned',
  EN_ROUTE: 'On the way',
  ARRIVED: 'Tech on site',
  ON_SITE: 'Tech on site',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

export function statusLabel(s: string | null | undefined): string {
  const k = String(s ?? '').toUpperCase();
  return STATUS[k] ?? (k ? k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, ' ') : '');
}

const KIND_ORDER: Record<HistoryKind, number> = { event: -1, note: 0, confirmation: 1, fix: 2, receipt: 3, quote: 4, job: 5 };

export function buildTimeline(r: HistoryRows): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const j of r.jobs) {
    out.push({
      kind: 'job',
      date: j.preferred_date || j.created_at,
      title: `Job ${j.reference_code}${j.status ? ` · ${statusLabel(j.status)}` : ''}`,
      detail: [services(j.services).join(', '), j.issue_description ? `Customer said: “${j.issue_description.trim()}”` : ''].filter(Boolean),
      job: j.reference_code,
    });
  }
  for (const q of r.receipts) {
    out.push({
      kind: 'receipt',
      date: q.paid_on || q.created_at,
      title: `Paid${q.receipt_number ? ` · receipt ${q.receipt_number}` : ''}${q.total_cents != null ? ` · ${money(q.total_cents)}` : ''}`,
      detail: [itemTitles(q.line_items).join(', '), q.notes?.trim() ?? ''].filter(Boolean),
    });
  }
  for (const q of r.quotes) {
    out.push({
      kind: 'quote',
      date: q.created_at,
      title: `Quote${q.quote_number ? ` ${q.quote_number}` : ''}${q.status ? ` · ${q.status.toLowerCase()}` : ''}${q.total_cents != null ? ` · ${money(q.total_cents)}` : ''}`,
      detail: [itemTitles(q.line_items).join(', ')].filter(Boolean),
    });
  }
  for (const f of r.fixes) {
    out.push({
      kind: 'fix',
      date: f.created_at,
      title: `Fixed: ${f.root_cause}`,
      detail: [f.fix, [f.dtc_codes?.join(' · '), f.mileage ? `${f.mileage.toLocaleString('en-US')} mi` : ''].filter(Boolean).join(' · ')].filter(Boolean),
      to: `/fixes/${f.id}`,
      ...(f.job_ref ? { job: f.job_ref } : {}),
    });
  }
  for (const c of r.confirmations) {
    out.push({
      kind: 'confirmation',
      date: c.created_at,
      title: `Same fix worked: ${c.root_cause ?? 'a shop fix'}`,
      detail: [c.note?.trim() ?? ''].filter(Boolean),
      to: `/fixes/${c.fix_id}`,
    });
  }
  for (const n of r.notes) {
    out.push({ kind: 'note', date: n.created_at, title: 'Note', detail: [n.note.trim()], ...(n.job_ref ? { job: n.job_ref } : {}) });
  }
  for (const e of r.events ?? []) {
    out.push({
      kind: 'event',
      date: e.event_date || e.created_at,
      title: e.label,
      detail: [e.note.trim(), [e.mileage ? `${e.mileage.toLocaleString('en-US')} mi` : '', e.source ? `Source: ${e.source}` : ''].filter(Boolean).join(' · ')].filter(Boolean),
    });
  }
  // Newest first; on the same day, later steps of a visit first (paid after quoted after booked).
  const time = (d: string) => Date.parse(d.length === 10 ? `${d}T12:00:00Z` : d) || 0;
  return out.sort((a, b) => time(b.date) - time(a.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/** How many times the vehicle has been in, counting jobs only. */
export function visitCount(entries: HistoryEntry[]): number {
  return entries.filter((e) => e.kind === 'job').length;
}
