/**
 * Cylinder numbering, bank 1 and firing order: what a tech needs to find
 * "cylinder 4", "bank 2 sensor 1" or "the bank 1 cam sensor".
 *
 * Only engine families whose numbering is well established are named here;
 * anything else gets the general rule (cylinder 1 is at the timing end; bank 1
 * is the bank with cylinder 1) and a prompt to confirm in the service
 * information. Written for AP Data from general shop knowledge.
 *
 * No imports, so the node test runner loads it directly.
 */

export type Orientation = 'longitudinal' | 'transverse';
export type BankLayout = 'inline' | 'v' | 'flat';

/** Which way the numbers run. sequential: 1, 2, 3 down bank 1, then bank 2. alternating: odd on bank 1, even on bank 2. */
export type Numbering = 'sequential' | 'alternating';

/** Where bank 1 sits. Longitudinal engines: driver or passenger side. Transverse: front (radiator) or rear (firewall) bank. */
export type Bank1Side = { longitudinal: 'driver' | 'passenger'; transverse: 'front' | 'rear' };

export type EngineFamily = {
  id: string;
  label: string;
  numbering: Numbering;
  bank1: Bank1Side;
  /** Firing orders by displacement ("5.0"), or "*" for any. */
  firing: Record<string, string>;
  note?: string;
};

export const FAMILIES: Record<string, EngineFamily> = {
  'gm-v8': {
    id: 'gm-v8',
    label: 'GM V8 (LS, LT, Vortec)',
    numbering: 'alternating',
    bank1: { longitudinal: 'driver', transverse: 'rear' },
    firing: { '*': '1-8-7-2-6-5-4-3' },
    note: 'LS and LT engines fire 1-8-7-2-6-5-4-3. The older Gen I 5.7 and 7.4 Vortec (through 2002) fire 1-8-4-3-6-5-7-2.',
  },
  'gm-43': {
    id: 'gm-43',
    label: 'GM 4.3L V6',
    numbering: 'alternating',
    bank1: { longitudinal: 'driver', transverse: 'rear' },
    firing: { '4.3': '1-6-5-4-3-2' },
  },
  'ford-v8': {
    id: 'ford-v8',
    label: 'Ford V8 (4.6, 5.4, 5.0 Coyote, 6.2)',
    numbering: 'sequential',
    bank1: { longitudinal: 'passenger', transverse: 'rear' },
    firing: { '4.6': '1-3-7-2-6-5-4-8', '5.4': '1-3-7-2-6-5-4-8', '5.0': '1-5-4-8-6-3-7-2', '6.2': '1-5-4-8-6-3-7-2', '6.7': '1-3-7-2-6-5-4-8' },
    note: 'Ford numbers the passenger bank 1–4 front to back, then the driver bank 5–8. The 6.0 and 6.4 Power Stroke diesels are numbered differently: check the service information.',
  },
  'ford-v10': {
    id: 'ford-v10',
    label: 'Ford 6.8L V10',
    numbering: 'sequential',
    bank1: { longitudinal: 'passenger', transverse: 'rear' },
    firing: { '6.8': '1-6-5-10-2-7-3-8-4-9' },
  },
  'ford-v6': {
    id: 'ford-v6',
    label: 'Ford V6 (2.7, 3.0, 3.3, 3.5, 3.7)',
    numbering: 'sequential',
    bank1: { longitudinal: 'passenger', transverse: 'rear' },
    firing: { '*': '1-4-2-5-3-6' },
    note: 'In trucks and rear-drive cars cylinders 1–3 are the passenger bank. In transverse Explorers (2011–2019), Edges, Taurus and Flex they are the rear bank, under the cowl.',
  },
  'chrysler-v8': {
    id: 'chrysler-v8',
    label: 'Chrysler V8 (Hemi 5.7, 6.1, 6.2, 6.4; 4.7)',
    numbering: 'alternating',
    bank1: { longitudinal: 'driver', transverse: 'rear' },
    firing: { '*': '1-8-4-3-6-5-7-2' },
  },
  'chrysler-v6': {
    id: 'chrysler-v6',
    label: 'Chrysler V6 (3.6 Pentastar, 3.2, 3.7)',
    numbering: 'alternating',
    bank1: { longitudinal: 'driver', transverse: 'rear' },
    firing: { '3.6': '1-2-3-4-5-6', '3.2': '1-2-3-4-5-6', '3.7': '1-6-5-4-3-2' },
  },
  'toyota-v': {
    id: 'toyota-v',
    label: 'Toyota / Lexus V6 and V8',
    numbering: 'alternating',
    bank1: { longitudinal: 'passenger', transverse: 'rear' },
    firing: { v6: '1-2-3-4-5-6', v8: '1-8-4-3-6-5-7-2' },
  },
  'honda-v6': {
    id: 'honda-v6',
    label: 'Honda / Acura V6',
    numbering: 'sequential',
    bank1: { longitudinal: 'passenger', transverse: 'rear' },
    firing: { '*': '1-4-2-5-3-6' },
    note: 'Cylinders 1–3 are the rear bank, 4–6 the front (radiator) bank.',
  },
  'subaru-flat': {
    id: 'subaru-flat',
    label: 'Subaru boxer',
    numbering: 'alternating',
    bank1: { longitudinal: 'passenger', transverse: 'rear' },
    firing: { flat4: '1-3-2-4' },
    note: 'Odd cylinders on the passenger side, even on the driver side, 1 and 2 at the front.',
  },
  inline: {
    id: 'inline',
    label: 'Inline engine',
    numbering: 'sequential',
    bank1: { longitudinal: 'passenger', transverse: 'rear' },
    firing: { i3: '1-2-3', i4: '1-3-4-2', i5: '1-2-4-5-3', i6: '1-5-3-6-2-4' },
    note: 'One bank, so every sensor is bank 1. Cylinder 1 is at the timing-drive end.',
  },
};

const GM = ['chevrolet', 'gmc', 'cadillac', 'buick', 'pontiac', 'hummer', 'oldsmobile', 'saturn'];
const FORD = ['ford', 'lincoln', 'mercury'];
const CHRYSLER = ['chrysler', 'dodge', 'jeep', 'ram', 'plymouth', 'srt'];
const TOYOTA = ['toyota', 'lexus', 'scion'];
const HONDA = ['honda', 'acura'];

const low = (s: string | null | undefined) => String(s ?? '').toLowerCase().trim();

/** Cylinder count and layout as far as the engine text says: "3.5L Turbo V6" → 6, v. */
export function engineShape(engine: string | null | undefined, make?: string | null): { cylinders: number | null; layout: BankLayout | null; liters: string | null; diesel: boolean } {
  const s = String(engine ?? '');
  const liters = /(\d{1,2}\.\d)/.exec(s)?.[1] ?? null;
  const diesel = /diesel|tdi|duramax|power ?stroke|cummins|ecodiesel/i.test(s);
  let cylinders: number | null = null;
  let layout: BankLayout | null = null;
  const v = /\b[VW]-?(\d{1,2})\b/i.exec(s);
  const inl = /\b(?:[IL]-?|inline[- ]?|straight[- ]?)(\d)\b/i.exec(s);
  const flat = /\b(?:H-?|flat[- ]?|boxer[- ]?)(\d)\b/i.exec(s);
  const cyl = /\b(\d{1,2})[- ]?cyl/i.exec(s);
  if (v) [cylinders, layout] = [Number(v[1]), 'v'];
  else if (inl) [cylinders, layout] = [Number(inl[1]), 'inline'];
  else if (flat) [cylinders, layout] = [Number(flat[1]), 'flat'];
  else if (cyl) cylinders = Number(cyl[1]);
  if (cylinders && !layout) {
    const m = low(make);
    if (m === 'subaru' && cylinders <= 6) layout = 'flat';
    else if (cylinders <= 5) layout = 'inline';
    else if (cylinders === 6 && (m === 'bmw' || /cummins|duramax 3\.0/i.test(s))) layout = 'inline';
    else layout = 'v';
  }
  return { cylinders, layout, liters, diesel };
}

/** The engine family for a vehicle, or null when only the general rule applies. */
export function familyFor(make: string | null | undefined, engine: string | null | undefined): EngineFamily | null {
  const m = low(make);
  const { cylinders, layout, liters, diesel } = engineShape(engine, make);
  if (!cylinders || !layout) return null;
  if (layout === 'inline') return FAMILIES.inline;
  if (layout === 'flat') return m === 'subaru' ? FAMILIES['subaru-flat'] : null;
  if (GM.includes(m)) {
    if (diesel) return null;
    if (cylinders === 8) return FAMILIES['gm-v8'];
    if (cylinders === 6 && liters === '4.3') return FAMILIES['gm-43'];
    return null;
  }
  if (FORD.includes(m)) {
    if (diesel && liters !== '6.7') return null;
    if (cylinders === 8) return FAMILIES['ford-v8'];
    if (cylinders === 10) return FAMILIES['ford-v10'];
    if (cylinders === 6) return FAMILIES['ford-v6'];
    return null;
  }
  if (CHRYSLER.includes(m) && !diesel) {
    if (cylinders === 8) return FAMILIES['chrysler-v8'];
    if (cylinders === 6) return FAMILIES['chrysler-v6'];
    return null;
  }
  if (TOYOTA.includes(m) && !diesel && (cylinders === 6 || cylinders === 8)) return FAMILIES['toyota-v'];
  if (HONDA.includes(m) && cylinders === 6) return FAMILIES['honda-v6'];
  return null;
}

export function firingOrder(family: EngineFamily | null, engine: string | null | undefined, make?: string | null): string | null {
  if (!family) return null;
  const { cylinders, layout, liters } = engineShape(engine, make);
  const f = family.firing;
  if (liters && f[liters]) return f[liters];
  if (layout === 'inline' && cylinders && f[`i${cylinders}`]) return f[`i${cylinders}`];
  if (layout === 'flat' && cylinders && f[`flat${cylinders}`]) return f[`flat${cylinders}`];
  if (layout === 'v' && cylinders && f[`v${cylinders}`]) return f[`v${cylinders}`];
  return f['*'] ?? null;
}

/** Models (and makes) built with the engine lengthwise: trucks, body-on-frame SUVs, rear-drive cars. */
const LONGITUDINAL =
  /\b(f-?\d{3}|silverado|sierra|ram|1500|2500|3500|tundra|tacoma|titan|frontier|colorado|canyon|ranger|tahoe|suburban|yukon|escalade|expedition|navigator|4runner|sequoia|land cruiser|wrangler|gladiator|mustang|camaro|corvette|challenger|charger|300|magnum|durango|grand cherokee|commander|liberty|nitro|dakota|express|savana|e-\d{3}|econoline|transit|sprinter|bronco|aviator|armada|xterra|gx|lx|is|gs|ls|rc|lc|sc|crown victoria|grand marquis|town car|trailblazer|envoy|h2|h3|g8|cts|sts|xlr|ats|ct4|ct5|fj cruiser)\b/i;

/**
 * A first guess at how the engine sits. Rear-drive platforms and trucks are
 * lengthwise; most front-drive cars and crossovers are crosswise. The page lets
 * the tech flip it. (The 2020-on Explorer is lengthwise, the 2011–2019 one crosswise.)
 */
export function guessOrientation(make: string | null | undefined, model: string | null | undefined, year?: string | number | null): Orientation {
  const m = low(make);
  const mo = low(model);
  if (['bmw', 'mercedes-benz', 'genesis', 'maserati', 'rolls-royce', 'bentley', 'ferrari', 'lamborghini', 'aston martin', 'jaguar', 'infiniti'].includes(m)) return 'longitudinal';
  if (m === 'audi' || m === 'subaru' || m === 'porsche') return 'longitudinal';
  if (/explorer/.test(mo)) return Number(year) >= 2020 || Number(year) <= 2010 ? 'longitudinal' : 'transverse';
  if (/grand cherokee/.test(mo)) return 'longitudinal';
  if (/transit connect/.test(mo)) return 'transverse';
  return LONGITUDINAL.test(mo) ? 'longitudinal' : 'transverse';
}

export type CylinderSpot = { n: number; bank: 1 | 2; /** 0 = the timing end. */ index: number };

/** Every cylinder with its bank and its place along the bank, counted from the timing end. */
export function cylinderMap(cylinders: number, layout: BankLayout, numbering: Numbering): CylinderSpot[] {
  if (layout === 'inline') return Array.from({ length: cylinders }, (_, i) => ({ n: i + 1, bank: 1, index: i }));
  const per = Math.ceil(cylinders / 2);
  return Array.from({ length: cylinders }, (_, i) => {
    const n = i + 1;
    if (numbering === 'sequential') return { n, bank: n <= per ? 1 : 2, index: n <= per ? i : i - per };
    return { n, bank: n % 2 === 1 ? 1 : 2, index: Math.floor(i / 2) };
  });
}

/** "Bank 1 is the passenger side" in words, for the orientation shown. */
export function bank1Words(family: EngineFamily | null, orientation: Orientation): string {
  if (!family) return 'Bank 1 is the bank with cylinder 1.';
  if (family.id === 'inline') return 'One bank: every sensor is bank 1.';
  const side = family.bank1[orientation];
  const where = side === 'driver' ? 'driver side' : side === 'passenger' ? 'passenger side' : side === 'rear' ? 'rear bank (toward the firewall)' : 'front bank (toward the radiator)';
  return `Bank 1 is the ${where}.`;
}
