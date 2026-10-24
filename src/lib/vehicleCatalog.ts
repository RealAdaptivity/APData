/**
 * The lists behind the year → make → model → trim → engine picker.
 *
 * Two free, keyless sources that a browser may call directly (both answer
 * with Access-Control-Allow-Origin: *):
 *
 *   NHTSA vPIC, served by Wenmar Open (open.wenmarpro.com): every make that
 *     registered vehicles for a model year (heavy trucks too), its models, the
 *     trims NHTSA lists, and each engine with its VIN code. Wenmar adds common
 *     trim names by hand ("presets"); those are not checked against the year,
 *     so the picker shows them apart.
 *   EPA fueleconomy.gov: the engines each light-duty model was sold with, per
 *     drive (FWD / AWD / 4WD).
 *
 * vPIC lists every engine any VIN of a model can carry, fleet-only ones
 * included: a 2015 Explorer shows the Police Interceptor's 3.7L. EPA's list
 * narrows that to the engines the model was sold with, and tells when one came
 * with only one drive ("AWD only"). Where EPA has nothing (heavy trucks,
 * police and fleet trims), the vPIC list stands. When vPIC is unreachable,
 * EPA's lists stand in for it.
 *
 * Answers are cached in this browser for two weeks; the catalog changes a few
 * times a year. Nothing here needs the DOM, so the node test runner loads it
 * directly (tests/catalog.test.ts).
 */
import { engineFacts, norm } from './vehicle.ts';
import { ROAD_MAKES } from '../data/roadMakes.ts';

export type CatalogSource = 'vpic' | 'epa';

export type MakeChoice = {
  id: string;
  name: string;
  /** light: cars, SUVs, pickups, vans. truck: commercial trucks. other: a year outside the road-make table. */
  kind: 'light' | 'truck' | 'other';
  source: CatalogSource;
  /** EPA's spelling of the make, when it differs from `name`. */
  epa?: string;
};

export type ModelChoice = {
  id: string;
  name: string;
  source: CatalogSource;
  /** The EPA model names this entry stands for ("Explorer AWD", "Explorer FWD"), when the list came from EPA. */
  epa?: string[];
};

export type TrimChoice = {
  id: string;
  name: string;
  /** 'trim': NHTSA lists it for this year. 'preset': a common name for the model, not checked against the year. */
  kind: 'trim' | 'preset';
};

export type EngineChoice = {
  id: string;
  /** "3.5L Turbo V6" — what is saved as the vehicle's engine. */
  name: string;
  /** The VIN's 8th character for this engine; several letters mean any of them. */
  vinCode?: string;
  cylinders?: number;
  /** The drives EPA lists this engine with. */
  drives?: string[];
  /** "AWD only", when EPA lists the engine with fewer drives than the model has. */
  driveNote?: string;
};

export type EngineList = {
  engines: EngineChoice[];
  /** True when EPA's list confirmed which engines the model was sold with. */
  checked: boolean;
};

/* ---------------------------------------------------------------- parsing */

type Row = Record<string, unknown>;

const isRow = (x: unknown): x is Row => !!x && typeof x === 'object' && !Array.isArray(x);

const text = (x: unknown): string => (typeof x === 'string' ? x.trim() : typeof x === 'number' ? String(x) : '');

const rows = (json: unknown): Row[] => (Array.isArray(json) ? json.filter(isRow) : []);

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });

function uniqueBy<T>(list: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((t) => {
    const k = key(t);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function parseMakes(json: unknown): MakeChoice[] {
  const list = rows(json).map((r) => ({ id: text(r.id), name: text(r.name), kind: r.popular === true ? ('light' as const) : ('other' as const), source: 'vpic' as const }));
  return uniqueBy(
    list.filter((m) => m.name),
    (m) => m.id
  ).sort(byName);
}

export function parseModels(json: unknown): ModelChoice[] {
  const list = rows(json).map((r) => ({ id: text(r.id), name: text(r.name), source: 'vpic' as const }));
  return uniqueBy(
    list.filter((m) => m.name),
    (m) => m.id
  ).sort(byName);
}

export function parseTrims(json: unknown): TrimChoice[] {
  const list = rows(json).map((r) => ({ id: text(r.id), name: text(r.name), kind: r.kind === 'preset' ? ('preset' as const) : ('trim' as const) }));
  return uniqueBy(
    list.filter((t) => t.name),
    (t) => t.id
  ).sort(byName);
}

/** Smallest displacement first, then by name: 2.0L Turbo, 3.5L Turbo V6, 3.5L V6, 3.7L V6. */
function byDisplacement(a: EngineChoice, b: EngineChoice): number {
  const la = Number(engineFacts(a.name).liters ?? 99);
  const lb = Number(engineFacts(b.name).liters ?? 99);
  return la - lb || byName(a, b);
}

export function parseEngines(json: unknown): EngineChoice[] {
  const list = rows(json).map((r): EngineChoice => {
    const name = text(r.label) || text(r.name);
    const vinCode = text(r.vin8).toUpperCase();
    const cylinders = cylindersOf(name);
    return {
      id: text(r.id) || norm(name),
      name,
      ...(vinCode ? { vinCode } : {}),
      ...(cylinders ? { cylinders } : {}),
    };
  });
  return uniqueBy(
    list.filter((e) => e.name),
    (e) => e.id
  ).sort(byDisplacement);
}

/** "3.5L V6" → 6, "2.0L I4" → 4, "5.7L 8-cyl" → 8, "2.0L Turbo" → null. */
export function cylindersOf(label: string): number | null {
  const m =
    /\b[VWHLI]-?(\d{1,2})\b/i.exec(label) ??
    /\b(\d{1,2})[- ]?cyl/i.exec(label) ??
    /\b(?:flat|boxer|inline|straight)[- ]?(\d{1,2})\b/i.exec(label);
  const n = m ? Number(m[1]) : NaN;
  return n >= 2 && n <= 16 ? n : null;
}

/** EPA menus answer { menuItem: [...] }, or { menuItem: {...} } when there is only one item. */
export function epaItems(json: unknown): { text: string; value: string }[] {
  const m = isRow(json) ? json.menuItem : undefined;
  const list = Array.isArray(m) ? m : isRow(m) ? [m] : [];
  return list
    .filter(isRow)
    .map((r) => ({ text: text(r.text), value: text(r.value) || text(r.text) }))
    .filter((r) => r.text);
}

export type EpaEngine = { liters: string | null; cylinders: number | null; boost: 'Turbo' | 'Supercharged' | null };

/** "Auto (S6), 6 cyl, 3.5 L, Turbo" → 3.5 L, 6 cylinders, turbo. Electric models have no displacement. */
export function parseEpaOption(option: string): EpaEngine {
  const l = /(\d{1,2}\.\d)\s*L\b/i.exec(option);
  const c = /(\d{1,2})\s*cyl/i.exec(option);
  const boost = /turbo/i.test(option) ? 'Turbo' : /super ?charg|s-charge/i.test(option) ? 'Supercharged' : null;
  return { liters: l ? l[1] : null, cylinders: c ? Number(c[1]) : null, boost };
}

/** "Explorer AWD FFV" → "AWD". */
export function epaDrive(model: string): string | null {
  const m = /\b(AWD|FWD|RWD|2WD|4WD)\b/i.exec(model);
  return m ? m[1].toUpperCase() : null;
}

/** "Explorer AWD FFV" → "Explorer": the model name without EPA's drive and fuel suffixes. */
export function epaBaseModel(model: string): string {
  return model
    .replace(/\b(AWD|FWD|RWD|2WD|4WD|FFV|CNG|Cab Chassis)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The EPA model list collapsed to one entry per model, for when vPIC is unreachable. */
export function modelsFromEpa(epaModels: string[]): ModelChoice[] {
  const groups = new Map<string, ModelChoice>();
  for (const e of epaModels) {
    const name = epaBaseModel(e) || e;
    const id = norm(name);
    const g = groups.get(id);
    if (g) g.epa!.push(e);
    else groups.set(id, { id, name, source: 'epa', epa: [e] });
  }
  return [...groups.values()].sort(byName);
}

/**
 * The EPA model names ("Explorer AWD", "Explorer FWD FFV") that are this
 * model, and not a sibling whose name starts the same way: "Transit Connect
 * Van" belongs to the Transit Connect, not the Transit.
 */
export function epaModelsFor(model: string, siblings: string[], epaModels: string[]): string[] {
  const target = norm(model);
  if (target.length < 2) return [];
  const longer = siblings.map(norm).filter((s) => s.length > target.length && s.startsWith(target));
  return epaModels.filter((e) => {
    const n = norm(e);
    return n.startsWith(target) && !longer.some((s) => n.startsWith(s));
  });
}

export type EpaModelOptions = { model: string; options: string[] };

type EngineFacts = { liters: string | null; boosted: boolean; cylinders: number | null };

function sameEngine(a: EngineFacts, b: EpaEngine): boolean {
  if (!a.liters || !b.liters || a.liters !== b.liters) return false;
  if (a.boosted !== (b.boost !== null)) return false;
  return a.cylinders == null || b.cylinders == null || a.cylinders === b.cylinders;
}

function driveNote(drives: string[], all: Set<string>): string | undefined {
  return drives.length > 0 && drives.length < all.size ? `${drives.join(' / ')} only` : undefined;
}

/**
 * Narrow vPIC's engine list to the engines EPA lists for the model, and note
 * the drives each came with. An engine EPA cannot judge (no displacement:
 * electric) stays. If EPA confirms none of them, its data is for something
 * else, so the vPIC list is returned untouched.
 */
export function refineEngines(engines: EngineChoice[], epa: EpaModelOptions[]): EngineList {
  const offered = epa.flatMap((m) => m.options.map((o) => ({ drive: epaDrive(m.model), engine: parseEpaOption(o) })));
  if (!offered.length || !engines.length) return { engines, checked: false };
  const allDrives = new Set(offered.map((o) => o.drive).filter((d): d is string => !!d));

  let confirmed = 0;
  const out: EngineChoice[] = [];
  for (const eng of engines) {
    const facts = { ...engineFacts(eng.name), cylinders: eng.cylinders ?? cylindersOf(eng.name) };
    if (!facts.liters) {
      out.push(eng);
      continue;
    }
    const hits = offered.filter((o) => sameEngine(facts, o.engine));
    if (!hits.length) continue;
    confirmed++;
    const drives = [...new Set(hits.map((h) => h.drive).filter((d): d is string => !!d))].sort();
    const cyls = [...new Set(hits.map((h) => h.engine.cylinders).filter((c): c is number => c != null))];
    const cylinders = facts.cylinders ?? (cyls.length === 1 ? cyls[0] : undefined);
    // "2.0L Turbo" says nothing about cylinders; EPA does.
    const name = !facts.cylinders && cylinders ? `${eng.name} ${cylinders}-cyl` : eng.name;
    const note = driveNote(drives, allDrives);
    out.push({
      ...eng,
      name,
      ...(cylinders ? { cylinders } : {}),
      ...(drives.length ? { drives } : {}),
      ...(note ? { driveNote: note } : {}),
    });
  }
  return confirmed ? { engines: out, checked: true } : { engines, checked: false };
}

/** Engines straight from EPA's options, for when vPIC has none: "3.5L 6-cyl Turbo". */
export function enginesFromEpa(epa: EpaModelOptions[]): EngineChoice[] {
  const offered = epa.flatMap((m) => m.options.map((o) => ({ drive: epaDrive(m.model), engine: parseEpaOption(o) })));
  const allDrives = new Set(offered.map((o) => o.drive).filter((d): d is string => !!d));
  const groups = new Map<string, { engine: EpaEngine; drives: Set<string> }>();
  for (const o of offered) {
    const e = o.engine;
    const key = e.liters ? `${e.liters}|${e.cylinders ?? ''}|${e.boost ?? ''}` : 'electric';
    const g = groups.get(key) ?? { engine: e, drives: new Set<string>() };
    if (o.drive) g.drives.add(o.drive);
    groups.set(key, g);
  }
  const out = [...groups.entries()].map(([key, g]): EngineChoice => {
    const e = g.engine;
    const name = e.liters ? [`${e.liters}L`, e.cylinders ? `${e.cylinders}-cyl` : '', e.boost ?? ''].filter(Boolean).join(' ') : 'Electric';
    const drives = [...g.drives].sort();
    const note = driveNote(drives, allDrives);
    return {
      id: `epa-${key}`,
      name,
      ...(e.cylinders ? { cylinders: e.cylinders } : {}),
      ...(drives.length ? { drives } : {}),
      ...(note ? { driveNote: note } : {}),
    };
  });
  return out.sort(byDisplacement);
}

/** Police, fleet and other special-service trims are not in EPA's consumer listings. */
export function isFleetTrim(trim: string | null | undefined): boolean {
  return /police|interceptor|pursuit|fleet|taxi|\bppv\b|\bssv\b|special service/i.test(trim ?? '');
}

/** "DF" → "D / F": vPIC gives every 8th-character code the engine appears under. */
export function vinCodeText(code: string | undefined): string {
  return (code ?? '').split('').join(' / ');
}

/** The option text in the engine list: "3.5L Turbo V6 · VIN 8th: T · AWD only". */
export function engineOptionText(e: EngineChoice): string {
  return [e.name, e.vinCode ? `VIN 8th: ${vinCodeText(e.vinCode)}` : '', e.driveNote ?? ''].filter(Boolean).join(' · ');
}

/**
 * The road-legal makes for a model year (src/data/roadMakes.ts), each tied to
 * NHTSA's entry when NHTSA lists it that year (so models, trims and engines
 * come from there), else to EPA's lists. Null for a year outside the table.
 */
export function roadMakesFor(year: string, vpicMakes: MakeChoice[]): MakeChoice[] | null {
  const y = Number(year);
  const brands = ROAD_MAKES.filter((m) => y >= m.from && y <= m.to);
  if (!brands.length) return null;
  const byName = new Map(vpicMakes.map((m) => [norm(m.name), m]));
  const used = new Set<string>();
  return brands
    .map((b): MakeChoice => {
      const names = [b.name, b.epa, ...(b.vpic ?? [])].filter((n): n is string => !!n).map(norm);
      const hit = names.map((n) => byName.get(n)).find((m) => m && !used.has(m.id));
      if (hit) used.add(hit.id);
      const epa = b.kind === 'light' && b.epa ? { epa: b.epa } : {};
      if (hit) return { id: hit.id, name: b.name, kind: b.kind, source: 'vpic', ...epa };
      // NHTSA's catalog lacks it (Scion, Roush…) or is unreachable: EPA's lists for a car brand,
      // and for a truck brand a typed model.
      return b.kind === 'light'
        ? { id: b.epa ?? b.name, name: b.name, kind: 'light', source: 'epa', ...epa }
        : { id: norm(b.name), name: b.name, kind: 'truck', source: 'vpic' };
    })
    .sort(byNameOrder);
}

const byNameOrder = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });

/** The name EPA files the make under. */
const epaMake = (make: MakeChoice) => make.epa ?? make.name;

/* ---------------------------------------------------------------- loading */

export type GetJson = (url: string) => Promise<unknown>;

const VPIC = 'https://open.wenmarpro.com/v1/vehicles';
const EPA = 'https://www.fueleconomy.gov/ws/rest/vehicle/menu';
const CACHE_PREFIX = 'apdata.catalog.v1|';
const TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 12_000;

type StorageLike = {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
};

function storage(): StorageLike | null {
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    return null;
  }
}

function readCache(url: string): unknown {
  try {
    const raw = storage()?.getItem(CACHE_PREFIX + url);
    if (!raw) return undefined;
    const { t, v } = JSON.parse(raw) as { t: number; v: unknown };
    return Date.now() - t < TTL_MS ? v : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(url: string, v: unknown) {
  const s = storage();
  if (!s) return;
  const entry = JSON.stringify({ t: Date.now(), v });
  try {
    s.setItem(CACHE_PREFIX + url, entry);
  } catch {
    // Full: drop the catalog cache (nothing else) and try once more.
    try {
      for (let i = s.length - 1; i >= 0; i--) {
        const k = s.key(i);
        if (k?.startsWith(CACHE_PREFIX)) s.removeItem(k);
      }
      s.setItem(CACHE_PREFIX + url, entry);
    } catch {
      /* the list still works for this visit */
    }
  }
}

/** This visit's answers (the only cache when storage is blocked), and requests still on the way. */
const answers = new Map<string, Promise<unknown>>();

/** GET a JSON list, from this browser's cache when it is fresh. A failure is not kept, so the next try asks again. */
export const getJson: GetJson = (url) => {
  const known = answers.get(url);
  if (known) return known;
  const cached = readCache(url);
  const p =
    cached !== undefined
      ? Promise.resolve(cached)
      : (async () => {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
          try {
            const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
            if (!res.ok) throw new Error(`The vehicle catalog answered ${res.status}.`);
            const json: unknown = await res.json();
            writeCache(url, json);
            return json;
          } finally {
            clearTimeout(timer);
          }
        })();
  answers.set(url, p);
  p.catch(() => {
    if (answers.get(url) === p) answers.delete(url);
  });
  return p;
};

const q = encodeURIComponent;

/** The road-legal makes for the year, tied to NHTSA's catalog where it lists them. */
export async function loadMakes(year: string, get: GetJson = getJson): Promise<MakeChoice[]> {
  let vpic: MakeChoice[] = [];
  try {
    vpic = parseMakes(await get(`${VPIC}/makes?year=${q(year)}`));
  } catch {
    /* the road-make table still answers, from EPA */
  }
  const road = roadMakesFor(year, vpic);
  if (road) return road;
  if (vpic.length) return vpic;
  return epaItems(await get(`${EPA}/make?year=${q(year)}`))
    .map((i): MakeChoice => ({ id: i.value, name: i.text, kind: 'light', source: 'epa' }))
    .sort(byName);
}

export async function loadModels(year: string, make: MakeChoice, get: GetJson = getJson): Promise<ModelChoice[]> {
  if (make.source === 'vpic') {
    try {
      const list = parseModels(await get(`${VPIC}/models?make=${q(make.id)}&year=${q(year)}`));
      if (list.length) return list;
    } catch {
      /* EPA below */
    }
  }
  return modelsFromEpa(epaItems(await get(`${EPA}/model?year=${q(year)}&make=${q(epaMake(make))}`)).map((i) => i.value));
}

/** Trims come from vPIC only; an EPA-listed model has none. */
export async function loadTrims(year: string, make: MakeChoice, model: ModelChoice, get: GetJson = getJson): Promise<TrimChoice[]> {
  if (make.source !== 'vpic' || model.source !== 'vpic') return [];
  return parseTrims(await get(`${VPIC}/submodels?make=${q(make.id)}&model=${q(model.id)}&year=${q(year)}`));
}

async function epaOptions(year: string, make: MakeChoice, model: ModelChoice, siblings: string[], get: GetJson): Promise<EpaModelOptions[]> {
  const names =
    model.epa ??
    epaModelsFor(
      model.name,
      siblings,
      epaItems(await get(`${EPA}/model?year=${q(year)}&make=${q(epaMake(make))}`)).map((i) => i.value)
    );
  return Promise.all(
    names.slice(0, 10).map(async (name) => ({
      model: name,
      options: epaItems(await get(`${EPA}/options?year=${q(year)}&make=${q(epaMake(make))}&model=${q(name)}`)).map((i) => i.text),
    }))
  );
}

/**
 * The engines for a model (and trim, when one is picked). `siblings` are the
 * other model names of the make that year, so "Explorer" does not borrow the
 * Explorer Sport Trac's engines from EPA.
 */
export async function loadEngines(
  year: string,
  make: MakeChoice,
  model: ModelChoice,
  trim: TrimChoice | null,
  siblings: string[],
  get: GetJson = getJson
): Promise<EngineList> {
  const vpicEngines = async (): Promise<EngineChoice[] | null> => {
    if (make.source !== 'vpic' || model.source !== 'vpic') return [];
    const base = `${VPIC}/engines?make=${q(make.id)}&model=${q(model.id)}&year=${q(year)}`;
    try {
      if (trim) {
        const forTrim = parseEngines(await get(`${base}&submodel=${q(trim.id)}`));
        if (forTrim.length) return forTrim;
      }
      return parseEngines(await get(base));
    } catch {
      return null;
    }
  };
  const epaFor = async (): Promise<EpaModelOptions[]> => {
    if (isFleetTrim(trim?.name)) return [];
    try {
      return await epaOptions(year, make, model, siblings, get);
    } catch {
      return [];
    }
  };

  const [vpic, epa] = await Promise.all([vpicEngines(), epaFor()]);
  if (vpic?.length) return refineEngines(vpic, epa);
  const fromEpa = enginesFromEpa(epa);
  if (fromEpa.length) return { engines: fromEpa, checked: true };
  if (vpic === null) throw new Error('Could not load the engine list.');
  return { engines: [], checked: false };
}
