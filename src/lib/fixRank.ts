/**
 * Ranking confirmed fixes for the vehicle on the lift, the way Identifix ranks
 * its fixes: how closely the fix's vehicle matches, then how many techs have
 * confirmed it, then how recent it is.
 *
 * No imports beyond vehicle.ts, so the node test runner loads it directly.
 */

import { matchVehicle, type MatchTier, type Vehicle, type VehicleMatch } from './vehicle.ts';

const TIER_ORDER: Record<MatchTier, number> = { exact: 5, near: 4, model: 3, engine: 2, make: 1 };

export type RankableFix = {
  id: string;
  model_year: number;
  make: string;
  model: string;
  engine: string | null;
  dtc_codes: string[];
  created_at: string;
  confirmations: { user_id: string }[];
};

export type RankedFix<T extends RankableFix> = { fix: T; match: VehicleMatch | null; codeHits: number };

/**
 * @param codes trouble codes the vehicle has right now; fixes that share them rank higher.
 * @param includeOtherMakes keep fixes from other makes (code search across the whole shop).
 */
export function rankFixes<T extends RankableFix>(
  fixes: T[],
  vehicle: Vehicle | null,
  opts: { codes?: string[]; includeOtherMakes?: boolean } = {}
): RankedFix<T>[] {
  const codes = new Set((opts.codes ?? []).map((c) => c.toUpperCase()));
  const out: RankedFix<T>[] = [];
  for (const fix of fixes) {
    const match = vehicle ? matchVehicle(vehicle, fix) : null;
    if (vehicle && !match && !opts.includeOtherMakes) continue;
    const codeHits = fix.dtc_codes.filter((c) => codes.has(c)).length;
    out.push({ fix, match, codeHits });
  }
  return out.sort((a, b) => {
    // Tier first, then shared codes, then confirmations, then closeness within the tier, then newest.
    const ta = a.match ? TIER_ORDER[a.match.tier] : 0;
    const tb = b.match ? TIER_ORDER[b.match.tier] : 0;
    if (ta !== tb) return tb - ta;
    const ra = a.match?.rank ?? 0;
    const rb = b.match?.rank ?? 0;
    if (a.codeHits !== b.codeHits) return b.codeHits - a.codeHits;
    const ca = a.fix.confirmations.length;
    const cb = b.fix.confirmations.length;
    if (ca !== cb) return cb - ca;
    if (ra !== rb) return rb - ra;
    return b.fix.created_at.localeCompare(a.fix.created_at);
  });
}

/** How many techs this fix has worked for: the author plus everyone who confirmed it. */
export function timesFixed(f: RankableFix): number {
  return 1 + f.confirmations.length;
}
