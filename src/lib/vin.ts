/**
 * VIN helpers. The decoding itself happens in the vehicle-research edge
 * function (AdaptivityPerformance repo), because NHTSA's vPIC service sends no
 * CORS headers; these are the checks the picker runs before asking.
 *
 * No imports, so the node test runner loads it directly.
 */

/** 17 characters; I, O and Q are never used in a VIN. */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Upper case, without spaces or dashes. */
export function normalizeVin(input: string): string {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function isVinShaped(vin: string): boolean {
  return VIN_PATTERN.test(vin);
}

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** The 9th-character check digit North American VINs carry. A mismatch is
 *  usually a typo (8 for B, 5 for S), so the picker warns rather than refuses. */
export function vinCheckDigitOk(vin: string): boolean {
  if (!isVinShaped(vin)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const v = /\d/.test(c) ? Number(c) : TRANSLITERATION[c];
    if (v === undefined) return false;
    sum += v * WEIGHTS[i];
  }
  const r = sum % 11;
  return vin[8] === (r === 10 ? 'X' : String(r));
}

/** Where a VIN says it was built, from its first character. */
export function vinRegion(vin: string): string | null {
  const c = vin[0];
  if (!c) return null;
  if ('12345'.includes(c)) return 'North America';
  if ('67'.includes(c)) return 'Oceania';
  if ('89'.includes(c)) return 'South America';
  if (c === 'J') return 'Japan';
  if (c === 'K') return 'South Korea';
  if (c === 'L') return 'China';
  if (c >= 'S' && c <= 'Z') return 'Europe';
  if (c >= 'M' && c <= 'R') return 'Asia';
  if (c >= 'A' && c <= 'H') return 'Africa';
  return null;
}
