import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { vehicleKey, type Vehicle } from './vehicle';

/**
 * NHTSA data for a vehicle — VIN decode, safety recalls and owner complaints —
 * through the AdaptivityPerformance `vehicle-research` edge function. NHTSA's
 * APIs send no CORS headers, so a browser cannot ask them directly; the
 * function is staff-only and does the asking. These types mirror
 * src/services/vehicleResearch.ts and vinDecode.ts in that repo.
 */

export type VinDetail = { label: string; value: string };

export type VinSummary = {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
  description: string;
  details: VinDetail[];
  warnings: string[];
  checkDigitOk: boolean;
};

export type RecallItem = {
  campaign: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  reportedOn: string | null;
  parkIt: boolean;
  parkOutside: boolean;
  overTheAir: boolean;
};

export type ComplaintItem = {
  id: string;
  filedOn: string | null;
  incidentOn: string | null;
  components: string[];
  summary: string;
  crash: boolean;
  fire: boolean;
  injuries: number;
  deaths: number;
};

export type ComponentCount = { component: string; count: number };

export type ComplaintSummary = {
  total: number;
  crashes: number;
  fires: number;
  injuries: number;
  deaths: number;
  byComponent: ComponentCount[];
  recent: ComplaintItem[];
};

export type ResearchLink = { label: string; href: string; note: string };

export type VehicleResearchResult = {
  vehicle: { vin: string | null; year: string; make: string; model: string; decoded: VinSummary | null };
  /** Null when NHTSA did not answer, which is different from "no recalls". */
  recalls: RecallItem[] | null;
  complaints: ComplaintSummary | null;
  links: ResearchLink[];
};

async function invokeResearch(body: Record<string, string>): Promise<VehicleResearchResult> {
  const { data, error } = await supabase.functions.invoke('vehicle-research', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const parsed = (await error.context.json().catch(() => null)) as { error?: string } | null;
      if (parsed?.error) throw new Error(parsed.error);
    }
    throw new Error(/fetch|network/i.test(error.message) ? 'No connection to NHTSA lookup. Try again.' : error.message);
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as VehicleResearchResult;
}

/** VIN → decoded vehicle plus its recalls and complaints, in one call. */
export function researchVin(vin: string): Promise<VehicleResearchResult> {
  return invokeResearch({ vin });
}

const cache = new Map<string, Promise<VehicleResearchResult>>();

/**
 * Recalls and complaints for the current vehicle. Cached for the session per
 * vehicle, so moving between the dashboard, Recalls and Problems does not ask
 * NHTSA three times. A failed lookup is not cached.
 */
export function researchFor(v: Vehicle, opts: { fresh?: boolean } = {}): Promise<VehicleResearchResult> {
  const key = v.vin ? `vin:${v.vin}` : vehicleKey({ ...v, engine: '' });
  if (!opts.fresh) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const p = (v.vin ? researchVin(v.vin) : invokeResearch({ year: v.year, make: v.make, model: v.model })).catch((e) => {
    cache.delete(key);
    throw e;
  });
  cache.set(key, p);
  return p;
}

/** Seed the cache with a lookup the picker already made. */
export function rememberResearch(v: Vehicle, r: VehicleResearchResult) {
  const key = v.vin ? `vin:${v.vin}` : vehicleKey({ ...v, engine: '' });
  cache.set(key, Promise.resolve(r));
}

/** A VIN decode as the vehicle the rest of the app works with. */
export function vehicleFromDecode(r: VehicleResearchResult): Vehicle {
  const d = r.vehicle.decoded;
  return {
    year: d?.year || r.vehicle.year,
    make: d?.make || r.vehicle.make,
    model: d?.model || r.vehicle.model,
    engine: d?.engine || undefined,
    trim: d?.trim || undefined,
    vin: r.vehicle.vin ?? undefined,
    details: d?.details?.length ? d.details : undefined,
  };
}
