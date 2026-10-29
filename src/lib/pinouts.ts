/**
 * Connector pinouts the shop records: pin number, what the circuit does, wire
 * color, and what the tech measured there. Validation and tidying live here
 * so the node test runner can load them (tests/testing.test.ts).
 */

export type PinRow = { pin: string; function: string; color: string; value: string };

export type PinoutInput = {
  component: string;
  connector: string;
  viewFrom: '' | 'harness' | 'component';
  pins: PinRow[];
  notes: string;
  engine: string;
};

export const MAX_PINS = 200;

export const emptyPin = (): PinRow => ({ pin: '', function: '', color: '', value: '' });

/** Rows with nothing typed are dropped; text is trimmed and capped. */
export function cleanPins(rows: PinRow[]): PinRow[] {
  return rows
    .map((r) => ({
      pin: r.pin.trim().slice(0, 12),
      function: r.function.trim().slice(0, 120),
      color: r.color.trim().slice(0, 40),
      value: r.value.trim().slice(0, 80),
    }))
    .filter((r) => r.pin || r.function || r.color || r.value);
}

export function validatePinout(p: PinoutInput): string | null {
  if (!p.component.trim()) return 'Say which component the connector is on (for example “PCM” or “Crank sensor”).';
  if (p.component.trim().length > 120) return 'The component name is too long.';
  if (p.connector.trim().length > 80) return 'The connector name is too long.';
  if (p.notes.length > 2000) return 'Notes are too long (2,000 characters at most).';
  const pins = cleanPins(p.pins);
  if (!pins.length) return 'Add at least one pin.';
  if (pins.length > MAX_PINS) return `At most ${MAX_PINS} pins per connector.`;
  const missing = pins.find((r) => !r.pin || !r.function);
  if (missing) return 'Every pin needs its number and what it does.';
  const seen = new Set<string>();
  for (const r of pins) {
    const k = r.pin.toUpperCase();
    if (seen.has(k)) return `Pin ${r.pin} is listed twice.`;
    seen.add(k);
  }
  return null;
}

/** Pins read back from the database, whatever shape they were stored in. */
export function readPins(v: unknown): PinRow[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const s = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : typeof o[k] === 'number' ? String(o[k]) : '');
    return { pin: s('pin'), function: s('function'), color: s('color'), value: s('value') };
  });
}

/** Sort "1, 2, 10, A1, B2" the way they read on a connector. */
export function pinOrder(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}

/** Common wire color abbreviations to words: "BK/WH" → "Black/White". */
const COLORS: Record<string, string> = {
  BK: 'Black', BLK: 'Black', WH: 'White', WHT: 'White', RD: 'Red', RED: 'Red', GN: 'Green', GRN: 'Green', BU: 'Blue', BL: 'Blue', BLU: 'Blue',
  YE: 'Yellow', YL: 'Yellow', YEL: 'Yellow', BN: 'Brown', BR: 'Brown', BRN: 'Brown', GY: 'Gray', GR: 'Gray', GRY: 'Gray', OG: 'Orange', OR: 'Orange', ORN: 'Orange',
  VT: 'Violet', VI: 'Violet', PU: 'Purple', PK: 'Pink', PNK: 'Pink', TN: 'Tan', TAN: 'Tan', LG: 'Light green', LB: 'Light blue', DG: 'Dark green', DB: 'Dark blue', NA: 'Natural',
};

export function colorWords(code: string): string {
  const parts = code.trim().toUpperCase().split(/[/\-\s]+/).filter(Boolean);
  if (!parts.length || !parts.every((p) => COLORS[p])) return '';
  return parts.map((p) => COLORS[p]).join('/');
}

/**
 * Whether a pinout typed as "PCM C1", "Engine computer" or "crank sensor"
 * belongs to a component, given that component's names ("Crankshaft position
 * sensor (CKP)", "CKP", "crank sensor"…).
 */
export function pinoutMatches(component: string, names: string[]): boolean {
  const n = (s: string) => ` ${s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
  const text = n(component);
  if (!text.trim()) return false;
  return names.some((name) => {
    const k = n(name);
    return k.trim().length > 1 && (text.includes(k) || k.includes(text));
  });
}
