/**
 * Trouble-code parsing and lookup.
 *
 * No imports beyond the data files, so the node test runner loads it directly.
 */

import { DTC_ENTRIES, DTC_LIBRARY, type DtcEntry } from '../data/dtcLibrary.ts';

/** P, B, C or U; then 0–3; then three hex digits (P0A80, P242F, U0100). */
const CODE_SHAPE = /^[PBCU][0-3][0-9A-F]{3}$/;

/**
 * " p0300 " → "P0300"; "P0300-00" or "U0100:87" (with a failure-type byte) →
 * the base code; anything else → null.
 */
export function normalizeCode(input: string | null | undefined): string | null {
  const s = String(input ?? '')
    .toUpperCase()
    .replace(/\s+/g, '');
  const m = /^([PBCU][0-3][0-9A-F]{3})(?:[-:.]?[0-9A-F]{2})?$/.exec(s);
  return m ? m[1] : null;
}

export function isCode(s: string): boolean {
  return CODE_SHAPE.test(s);
}

/**
 * Every code in a block of text, in order, without repeats: what a tech gets
 * by pasting a scan-tool report ("P0301 Cyl 1 Misfire, P0171 lean…").
 */
export function parseCodes(text: string | null | undefined): string[] {
  const out: string[] = [];
  const re = /\b([PBCU][0-3][0-9A-F]{3})(?:[-:][0-9A-F]{2})?\b/gi;
  for (const m of String(text ?? '').matchAll(re)) {
    const code = m[1].toUpperCase();
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

export type CodeStructure = {
  code: string;
  area: string;
  /** Generic codes mean the same thing on every vehicle; manufacturer codes do not. */
  scope: 'generic' | 'manufacturer';
  scopeText: string;
  /** Usual subsystem group, from the third character (P0/P2 codes, U codes). */
  group: string | null;
};

const AREA: Record<string, string> = {
  P: 'Powertrain (engine, transmission, emissions)',
  B: 'Body (airbags, seats, locks, lighting, comfort)',
  C: 'Chassis (ABS, traction, steering, suspension)',
  U: 'Network (communication between modules)',
};

const P_GROUP: Record<string, string> = {
  '0': 'Fuel and air metering, auxiliary emission controls (often variable valve timing and O2 heaters)',
  '1': 'Fuel and air metering',
  '2': 'Fuel and air metering (injector circuits)',
  '3': 'Ignition system or misfire',
  '4': 'Auxiliary emission controls (EGR, EVAP, catalyst, secondary air)',
  '5': 'Vehicle speed, idle control and auxiliary inputs',
  '6': 'Computer and output circuits',
  '7': 'Transmission',
  '8': 'Transmission',
  '9': 'Transmission',
  A: 'Hybrid / electric propulsion',
  B: 'Hybrid / electric propulsion',
  C: 'Hybrid / electric propulsion',
};

/** What a code's characters say, even when the code is not in the library. */
export function describeCode(code: string): CodeStructure | null {
  const c = normalizeCode(code);
  if (!c) return null;
  const letter = c[0];
  const d2 = c[1];
  const d3 = c[2];

  let scope: CodeStructure['scope'];
  if (letter === 'P') {
    scope = d2 === '0' || d2 === '2' || (d2 === '3' && Number.parseInt(d3, 16) >= 4) ? 'generic' : 'manufacturer';
  } else {
    scope = d2 === '0' || d2 === '3' ? 'generic' : 'manufacturer';
  }

  let group: string | null = null;
  if (letter === 'P' && (d2 === '0' || d2 === '2')) {
    group = d2 === '2' && d3 === 'A' ? 'Fuel and air metering' : (P_GROUP[d3] ?? null);
  } else if (letter === 'U' && d2 === '0') {
    group =
      d3 === '0'
        ? 'Network wiring and bus faults'
        : d3 === '1' || d3 === '2'
          ? 'Lost communication with a module'
          : d3 === '3'
            ? 'Software or configuration incompatibility'
            : d3 === '4' || d3 === '5'
              ? 'Invalid data received from a module'
              : null;
  }

  return {
    code: c,
    area: AREA[letter],
    scope,
    scopeText:
      scope === 'generic'
        ? 'Generic (SAE) code: the same meaning on every make.'
        : 'Manufacturer-specific code: the meaning depends on the make (and sometimes the model). Check the factory service information or the shop code book.',
    group,
  };
}

export function lookupCode(code: string): DtcEntry | null {
  const c = normalizeCode(code);
  return c ? (DTC_LIBRARY.get(c) ?? null) : null;
}

/**
 * Library search: a full code is an exact hit; a partial code ("P03") lists
 * that family; words match titles and meanings ("misfire", "evap leak").
 */
export function searchCodes(query: string, limit = 50): DtcEntry[] {
  const q = query.trim();
  if (!q) return [];
  const exact = lookupCode(q);
  if (exact) return [exact];
  const upper = q.toUpperCase().replace(/\s+/g, '');
  if (/^[PBCU][0-3]?[0-9A-F]{0,3}$/.test(upper)) {
    return DTC_ENTRIES.filter((e) => e.code.startsWith(upper)).slice(0, limit);
  }
  const words = q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!words.length) return [];
  const scored: { e: DtcEntry; score: number }[] = [];
  for (const e of DTC_ENTRIES) {
    const title = e.title.toLowerCase();
    const body = `${e.meaning} ${e.causes.join(' ')} ${e.symptoms.join(' ')}`.toLowerCase();
    let score = 0;
    let all = true;
    for (const w of words) {
      if (title.includes(w)) score += 3;
      else if (body.includes(w)) score += 1;
      else all = false;
    }
    if (all && score > 0) scored.push({ e, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.e.code.localeCompare(b.e.code))
    .slice(0, limit)
    .map((x) => x.e);
}

/** Group label for browsing the library by code range. */
export const CODE_RANGES: { prefix: string; label: string }[] = [
  { prefix: 'P00', label: 'P00xx · Valve timing, O2 heaters, fuel pressure' },
  { prefix: 'P01', label: 'P01xx · Air and fuel metering, O2 sensors, fuel trim' },
  { prefix: 'P02', label: 'P02xx · Injectors, throttle "B", boost, overheating' },
  { prefix: 'P03', label: 'P03xx · Misfire, ignition coils, crank/cam, knock' },
  { prefix: 'P04', label: 'P04xx · EGR, secondary air, catalyst, EVAP' },
  { prefix: 'P05', label: 'P05xx · Speed, idle, oil pressure, system voltage' },
  { prefix: 'P06', label: 'P06xx · Computer and output circuits' },
  { prefix: 'P07', label: 'P07xx · Transmission' },
  { prefix: 'P08', label: 'P08xx · Transmission' },
  { prefix: 'P0A', label: 'P0Axx · Hybrid' },
  { prefix: 'P2', label: 'P2xxx · Throttle, fuel trim, O2, diesel aftertreatment' },
  { prefix: 'C', label: 'Cxxxx · Chassis (ABS)' },
  { prefix: 'U', label: 'Uxxxx · Network' },
];
