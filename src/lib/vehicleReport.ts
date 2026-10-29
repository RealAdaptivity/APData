/**
 * The vehicle history report: what the shop knows about a VIN beyond its own
 * repairs — wrecks, damage seen, title brands, owner changes, theft, airbag
 * deployment, odometer readings and service done elsewhere — each with where
 * it came from. These are the shop's records, not official title data; the
 * report says so and links to the free official checks.
 *
 * No imports, so the node test runner loads it directly (tests/report.test.ts).
 */

export type EventKind = 'odometer' | 'accident' | 'damage_seen' | 'flood' | 'title_brand' | 'owner_change' | 'theft' | 'airbag' | 'service_elsewhere' | 'other';

export type KindInfo = {
  label: string;
  /** How serious it is for a buyer or a repair: red = major, amber = worth knowing. */
  flag: 'red' | 'amber' | null;
  /** What to write. */
  hint: string;
};

export const EVENT_KINDS: Record<EventKind, KindInfo> = {
  accident: { label: 'Accident / wreck', flag: 'red', hint: 'Front-end hit, rear-ended… where on the vehicle and how bad, if known' },
  damage_seen: { label: 'Prior damage or repair seen', flag: 'amber', hint: 'Overspray, mismatched paint, replaced panel, bent subframe…' },
  flood: { label: 'Flood or water damage', flag: 'red', hint: 'Silt under the carpet, corroded connectors, water line…' },
  title_brand: { label: 'Title brand', flag: 'red', hint: 'Salvage, rebuilt, flood, lemon buyback, junk…' },
  owner_change: { label: 'Owner change', flag: null, hint: 'Bought used from…, 3rd owner, fleet / rental before…' },
  theft: { label: 'Theft or recovered theft', flag: 'red', hint: 'Reported stolen, recovered, ignition or steering column damage' },
  airbag: { label: 'Airbag deployed', flag: 'red', hint: 'Which airbags, and whether the SRS module and belts were replaced' },
  odometer: { label: 'Odometer reading', flag: null, hint: 'Reading on the dash (and if the cluster was replaced)' },
  service_elsewhere: { label: 'Service done elsewhere', flag: null, hint: 'Timing belt at 95k at the dealer, trans replaced…' },
  other: { label: 'Other', flag: null, hint: 'Anything else worth knowing about this vehicle’s past' },
};

/** The kinds the report groups as "title, wrecks and owners". */
export const HISTORY_KINDS: EventKind[] = ['accident', 'damage_seen', 'flood', 'airbag', 'title_brand', 'theft', 'owner_change'];

export const EVENT_SOURCES = ['Customer said', 'Seen on the vehicle', 'Title or registration', 'CARFAX / AutoCheck report', 'NICB VINCheck', 'NMVTIS report', 'Insurance or police report', 'Service records', 'Other'];

export type HistoryEvent = {
  id: string;
  kind: EventKind | string;
  event_date: string | null;
  mileage: number | null;
  note: string;
  source: string | null;
  created_at: string;
};

export function kindInfo(kind: string): KindInfo {
  return EVENT_KINDS[kind as EventKind] ?? EVENT_KINDS.other;
}

export type EventInput = { kind: EventKind; date: string; mileage: string; note: string; source: string };

export function validateEvent(e: EventInput, today = new Date()): string | null {
  if (!EVENT_KINDS[e.kind]) return 'Pick what happened.';
  const note = e.note.trim();
  if (!note && e.kind !== 'odometer') return 'Say what happened.';
  if (note.length > 2000) return 'That note is too long (2,000 characters at most).';
  const miles = e.mileage.replace(/[,\s]/g, '');
  if (miles && !/^\d{1,7}$/.test(miles)) return 'Mileage is a whole number, like 128400.';
  if (e.kind === 'odometer' && !miles) return 'Enter the odometer reading.';
  if (e.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || Number.isNaN(Date.parse(e.date))) return 'Use a full date.';
    if (e.date < '1950-01-01') return 'That date is too early.';
    if (Date.parse(e.date) > today.getTime() + 86_400_000) return 'That date is in the future.';
  }
  return null;
}

export type OdometerReading = { date: string; miles: number; from: string; drop: boolean };

/**
 * Every mileage the shop has for the VIN, oldest first. A reading lower than
 * an earlier one is flagged: a rollback, a replaced cluster or a typo — worth
 * a look either way.
 */
export function odometerReadings(rows: { date: string; miles: number | null; from: string }[]): OdometerReading[] {
  const t = (d: string) => Date.parse(d.length === 10 ? `${d}T12:00:00Z` : d) || 0;
  const sorted = rows
    .filter((r): r is { date: string; miles: number; from: string } => typeof r.miles === 'number' && r.miles > 0)
    .sort((a, b) => t(a.date) - t(b.date) || a.miles - b.miles);
  let high = 0;
  return sorted.map((r) => {
    const drop = r.miles < high;
    high = Math.max(high, r.miles);
    return { ...r, drop };
  });
}

export type ReportSummary = {
  accidents: number;
  damage: number;
  titleBrands: string[];
  ownerChanges: number;
  flood: boolean;
  theft: boolean;
  airbag: boolean;
  /** True when anything red was recorded. */
  major: boolean;
};

export function summarize(events: HistoryEvent[]): ReportSummary {
  const of = (k: EventKind) => events.filter((e) => e.kind === k);
  const s: ReportSummary = {
    accidents: of('accident').length,
    damage: of('damage_seen').length,
    titleBrands: [...new Set(of('title_brand').map((e) => e.note.trim()).filter(Boolean))],
    ownerChanges: of('owner_change').length,
    flood: of('flood').length > 0,
    theft: of('theft').length > 0,
    airbag: of('airbag').length > 0,
    major: false,
  };
  s.major = s.accidents > 0 || s.titleBrands.length > 0 || s.flood || s.theft || s.airbag;
  return s;
}

/** Free official checks for a VIN — the report links to them rather than copying them. */
export function freeChecks(vin: string): { label: string; href: string; note: string }[] {
  return [
    { label: 'NICB VINCheck', href: 'https://www.nicb.org/vincheck', note: 'Free: reported theft and insurance total-loss (salvage) records' },
    { label: 'NMVTIS', href: 'https://vehiclehistory.bja.ojp.gov/', note: 'Official title, brand, junk and salvage history — low-cost reports from approved providers' },
    { label: 'NHTSA recalls', href: `https://www.nhtsa.gov/recalls?vin=${encodeURIComponent(vin)}`, note: 'Free: open safety recalls for this exact VIN' },
  ];
}
