/**
 * The vehicle a tech is working on, and how closely shop records about other
 * vehicles apply to it.
 *
 * No imports, so the node test runner loads it directly (tests/vehicle.test.ts).
 */

export type VehicleDetail = { label: string; value: string };

export type Vehicle = {
  year: string;
  make: string;
  model: string;
  engine?: string;
  trim?: string;
  vin?: string;
  /** Decoded VIN facts: body, drive, transmission, plant… */
  details?: VehicleDetail[];
};

/** The vehicle columns every shop table stores. */
export type VehicleRow = {
  model_year: number | null;
  make: string | null;
  model: string | null;
  engine?: string | null;
};

/** "F-150" and "F150" are the same truck; so are "Grand Cherokee" and "GRAND CHEROKEE". */
export function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function vehicleTitle(v: Pick<Vehicle, 'year' | 'make' | 'model'>): string {
  return [v.year, v.make, v.model].filter(Boolean).join(' ');
}

export function vehicleSubtitle(v: Pick<Vehicle, 'engine' | 'trim'>): string {
  return [v.engine, v.trim].filter(Boolean).join(' · ');
}

export function vehicleKey(v: Pick<Vehicle, 'year' | 'make' | 'model' | 'engine'>): string {
  return [v.year, norm(v.make), norm(v.model), norm(v.engine)].join('|');
}

export function isCompleteVehicle(v: Partial<Vehicle> | null | undefined): v is Vehicle {
  return !!v && /^\d{4}$/.test(String(v.year ?? '')) && !!norm(v.make) && !!norm(v.model);
}

/** The vehicle columns to save with a shop record. */
export function vehicleColumns(v: Vehicle): { model_year: number; make: string; model: string; engine: string | null } {
  return {
    model_year: Number(v.year),
    make: v.make.trim(),
    model: v.model.trim(),
    engine: v.engine?.trim() || null,
  };
}

/** Same model when the names match, or one is the other plus a suffix
 *  ("Silverado" / "Silverado 1500"), as long as the shorter name is not a
 *  stub that would match everything ("3" vs "300"). */
export function sameModel(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && long.startsWith(short);
}

const TURBO = /turbo|ecoboost|tfsi|tsi\b|biturbo|supercharg|\bsc\b/i;

/** "3.5L V6 Turbo" → { liters: '3.5', boosted: true }. */
export function engineFacts(engine: string | null | undefined): { liters: string | null; boosted: boolean; diesel: boolean } {
  const s = String(engine ?? '');
  const m = /(\d{1,2}\.\d)\s*l?\b/i.exec(s) ?? /(\d{1,2}\.\d)/.exec(s);
  return { liters: m ? m[1] : null, boosted: TURBO.test(s), diesel: /diesel|tdi|duramax|power ?stroke|cummins|ecodiesel/i.test(s) };
}

/** Whether two engine descriptions are the same engine, as far as the text says. */
export function engineRelation(a: string | null | undefined, b: string | null | undefined): 'same' | 'different' | 'unknown' {
  const x = engineFacts(a);
  const y = engineFacts(b);
  if (!x.liters || !y.liters) return 'unknown';
  if (x.liters !== y.liters) return 'different';
  if (x.boosted !== y.boosted || x.diesel !== y.diesel) return 'different';
  return 'same';
}

export type MatchTier = 'exact' | 'near' | 'model' | 'engine' | 'make';

export type VehicleMatch = {
  tier: MatchTier;
  /** Higher is closer. */
  rank: number;
  label: string;
  yearDelta: number;
  engine: 'same' | 'different' | 'unknown';
};

const RANK: Record<MatchTier, number> = { exact: 50, near: 40, model: 30, engine: 20, make: 10 };

/**
 * How well a record made on one vehicle applies to another. Null when the make
 * differs: a Ford fix says nothing about a Honda.
 *
 *   exact   same model and year (and not a known-different engine)
 *   near    same model within 2 years: usually the same generation
 *   model   same model within 5 years
 *   engine  another model of the same make with the same engine (5.3L Silverado → Tahoe)
 *   make    anything else from the same make
 */
export function matchVehicle(target: Pick<Vehicle, 'year' | 'make' | 'model' | 'engine'>, row: VehicleRow): VehicleMatch | null {
  if (!norm(row.make) || norm(row.make) !== norm(target.make)) return null;
  const ty = Number(target.year);
  const ry = Number(row.model_year);
  const yearDelta = Number.isFinite(ty) && Number.isFinite(ry) && ry > 0 ? Math.abs(ty - ry) : 99;
  const engine = engineRelation(target.engine, row.engine);
  const yrs = (n: number) => `${n} yr${n === 1 ? '' : 's'}`;

  let tier: MatchTier;
  let label: string;
  if (sameModel(target.model, row.model)) {
    if (yearDelta === 0 && engine !== 'different') {
      tier = 'exact';
      label = 'This vehicle';
    } else if (yearDelta <= 2) {
      tier = 'near';
      label = yearDelta === 0 ? 'Same model, other engine' : `Same model, ${yrs(yearDelta)} apart`;
    } else if (yearDelta <= 5) {
      tier = 'model';
      label = `Same model, ${yrs(yearDelta)} apart`;
    } else {
      tier = 'make';
      label = `Same model, ${yrs(yearDelta)} apart`;
    }
  } else if (engine === 'same' && yearDelta <= 5) {
    tier = 'engine';
    label = `Same engine · ${row.model ?? 'other model'}`;
  } else {
    tier = 'make';
    label = `Same make · ${row.model ?? ''}`.trim();
  }

  // Within a tier: a known-same engine beats unknown beats different, then nearer years.
  const engineBonus = engine === 'same' ? 3 : engine === 'unknown' ? 1 : 0;
  const rank = RANK[tier] + engineBonus - Math.min(yearDelta, 9) * 0.1;
  return { tier, rank, label, yearDelta, engine };
}

/** Records that apply to a scope (generic, a make, a model, a year range). */
export type ScopeRow = {
  make: string | null;
  model: string | null;
  engine?: string | null;
  year_from?: number | null;
  year_to?: number | null;
  model_year?: number | null;
};

/**
 * Whether a record scoped to a make / model / year range covers this vehicle,
 * and how specifically (higher = more specific). Null = does not apply.
 */
export function scopeFit(target: Pick<Vehicle, 'year' | 'make' | 'model' | 'engine'>, row: ScopeRow): number | null {
  if (!norm(row.make)) return 0; // applies to every vehicle
  if (norm(row.make) !== norm(target.make)) return null;
  let score = 1;
  if (norm(row.model)) {
    if (!sameModel(row.model, target.model)) return null;
    score += 2;
  }
  const y = Number(target.year);
  const from = row.year_from ?? row.model_year ?? null;
  const to = row.year_to ?? row.model_year ?? null;
  if (from != null || to != null) {
    if (!Number.isFinite(y)) return null;
    if (from != null && y < from) return null;
    if (to != null && y > to) return null;
    score += 1;
  }
  if (row.engine) {
    const rel = engineRelation(target.engine, row.engine);
    if (rel === 'different') return null;
    if (rel === 'same') score += 1;
  }
  return score;
}

export function scopeLabel(row: ScopeRow): string {
  if (!row.make) return 'All vehicles';
  const years =
    row.year_from && row.year_to
      ? row.year_from === row.year_to
        ? `${row.year_from}`
        : `${row.year_from}–${row.year_to}`
      : row.year_from
        ? `${row.year_from}+`
        : row.year_to
          ? `up to ${row.year_to}`
          : row.model_year
            ? `${row.model_year}`
            : '';
  return [years, row.make, row.model, row.engine].filter(Boolean).join(' ');
}

/** ilike treats % and _ as wildcards; a make or model is matched literally. */
export function ilikeLiteral(s: string): string {
  return s.trim().replace(/[\\%_]/g, '\\$&');
}
