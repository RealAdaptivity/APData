import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Car, History, ScanLine, Trash2, X } from 'lucide-react';
import { isVinShaped, normalizeVin, vinCheckDigitOk } from '../lib/vin';
import { rememberResearch, researchVin, vehicleFromDecode } from '../lib/research';
import { COMMON_MAKES, vehicleKey, vehicleSubtitle, vehicleTitle, type Vehicle } from '../lib/vehicle';
import { useVehicle } from '../lib/vehicleStore';
import { errorText } from '../lib/errors';
import { Button, cx, ErrorNote, Field, Input, Notice, Select } from './ui';

/**
 * Pick the vehicle on the lift: decode a VIN (typed or scanned from the door
 * jamb barcode), or enter year / make / model by hand. Recent vehicles are one
 * tap away.
 */

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 2 - 1981 }, (_, i) => String(THIS_YEAR + 1 - i));

type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

function barcodeDetector(): BarcodeDetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return typeof ctor === 'function' ? ctor : null;
}

/** Door-jamb and windshield VIN labels carry a Code 39, Code 128, Data Matrix or QR barcode. */
function VinScanner({ onVin, onClose }: { onVin: (vin: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(() =>
    barcodeDetector() ? null : 'This browser cannot scan barcodes. Type the VIN instead.'
  );
  // The parent passes a new callback each render; the camera must not restart for that.
  const onVinRef = useRef(onVin);
  useEffect(() => {
    onVinRef.current = onVin;
  }, [onVin]);

  useEffect(() => {
    const Ctor = barcodeDetector();
    if (!Ctor) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    const detector = new Ctor({ formats: ['code_39', 'code_128', 'data_matrix', 'qr_code'] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => undefined);
        }
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            for (const code of await detector.detect(video.current)) {
              // Labels often prefix the VIN with "I" (import) or wrap it in other text.
              const candidates = normalizeVin(code.rawValue).match(/[A-HJ-NPR-Z0-9]{17}/g) ?? [];
              const vin = candidates.find((c) => vinCheckDigitOk(c)) ?? candidates[0];
              if (vin) {
                onVinRef.current(vin);
                return;
              }
            }
          } catch {
            /* frame not ready */
          }
          timer = window.setTimeout(() => void tick(), 300);
        };
        void tick();
      })
      .catch(() => setError('Camera access was blocked. Allow the camera for this site, or type the VIN.'));
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-label="Scan VIN barcode">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-semibold text-white">Point at the VIN barcode (door jamb or windshield)</span>
        <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white" aria-label="Close scanner">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        {error ? (
          <div className="max-w-sm px-6 text-center text-sm text-slate-200">{error}</div>
        ) : (
          <>
            <video ref={video} className="h-full w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-brand" />
          </>
        )}
      </div>
    </div>
  );
}

export function VehiclePicker({ onPicked }: { onPicked?: (v: Vehicle) => void }) {
  const { recent, setVehicle, forgetRecent, vehicle: current } = useVehicle();
  const [mode, setMode] = useState<'vin' | 'ymm'>('vin');
  const [vin, setVin] = useState(current?.vin ?? '');
  const [year, setYear] = useState(current && !current.vin ? current.year : '');
  const [make, setMake] = useState(current && !current.vin ? current.make : '');
  const [model, setModel] = useState(current && !current.vin ? current.model : '');
  const [engine, setEngine] = useState(current && !current.vin ? (current.engine ?? '') : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const cleanVin = normalizeVin(vin);
  const vinReady = isVinShaped(cleanVin);
  const checkDigitBad = vinReady && !vinCheckDigitOk(cleanVin);

  const pick = (v: Vehicle) => {
    setVehicle(v);
    onPicked?.(v);
  };

  const decode = async (raw = cleanVin) => {
    if (!isVinShaped(raw) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await researchVin(raw);
      const v = vehicleFromDecode(r);
      rememberResearch(v, r);
      pick(v);
    } catch (e) {
      setError(errorText(e, 'Could not decode that VIN.'));
    } finally {
      setBusy(false);
    }
  };

  const submitYmm = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(year) || !make.trim() || !model.trim()) {
      setError('Pick the year, then type the make and model.');
      return;
    }
    setError(null);
    pick({ year, make: make.trim(), model: model.trim(), engine: engine.trim() || undefined });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-panel p-1" role="tablist">
        {(['vin', 'ymm'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cx('min-h-[40px] rounded-lg text-sm font-semibold', mode === m ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/5')}
          >
            {m === 'vin' ? 'VIN' : 'Year / make / model'}
          </button>
        ))}
      </div>

      {mode === 'vin' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void decode();
          }}
          className="space-y-3"
        >
          <Field
            label="VIN"
            hint={
              <span className="flex justify-between">
                <span>17 characters — the letters I, O and Q are never used.</span>
                <span className={cx('font-mono', vinReady ? 'text-emerald-400' : '')}>{cleanVin.length}/17</span>
              </span>
            }
          >
            <Input
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="1FTEW1EG5GFA00000"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={24}
              className="font-mono tracking-wider"
              inputMode="text"
            />
          </Field>
          {checkDigitBad && (
            <Notice tone="amber">
              The check digit (9th character) does not match. Look for a mistyped 8/B, 5/S, 0/D or 1/7 — or decode anyway if the VIN is from outside North America.
            </Notice>
          )}
          {error && <ErrorNote message={error} />}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" loading={busy} disabled={!vinReady} icon={<Car className="h-4 w-4" />} className="flex-1">
              Decode VIN
            </Button>
            {barcodeDetector() && (
              <Button type="button" onClick={() => setScanning(true)} icon={<Camera className="h-4 w-4" />}>
                Scan
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">Decoded by NHTSA. Brings in the recalls and complaints for this vehicle too.</p>
        </form>
      ) : (
        <form onSubmit={submitYmm} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year">
              <Select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Make">
              <Input value={make} onChange={(e) => setMake(e.target.value)} list="apdata-makes" placeholder="Ford" autoComplete="off" />
              <datalist id="apdata-makes">
                {COMMON_MAKES.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Model" hint="As NHTSA writes it, so recalls match: F-150, Silverado 1500, Camry, CR-V.">
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="F-150" autoComplete="off" />
          </Field>
          <Field label="Engine (optional)" hint="Helps match fixes and specs: 3.5L V6 Turbo, 5.3L V8, 2.0L I4.">
            <Input value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="3.5L V6 Turbo" autoComplete="off" />
          </Field>
          {error && <ErrorNote message={error} />}
          <Button type="submit" variant="primary" icon={<ScanLine className="h-4 w-4" />} className="w-full">
            Use this vehicle
          </Button>
        </form>
      )}

      {recent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <History className="h-3.5 w-3.5" /> Recent vehicles
          </div>
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-panel">
            {recent.map((v) => (
              <li key={vehicleKey(v) + (v.vin ?? '')} className="flex items-center">
                <button type="button" onClick={() => pick(v)} className="min-h-[52px] min-w-0 flex-1 px-4 py-2 text-left hover:bg-white/5">
                  <div className="truncate text-sm font-semibold text-white">{vehicleTitle(v)}</div>
                  <div className="truncate text-xs text-slate-500">{[vehicleSubtitle(v), v.vin].filter(Boolean).join(' · ') || 'Entered by hand'}</div>
                </button>
                <button
                  type="button"
                  onClick={() => forgetRecent(v)}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center text-slate-600 hover:text-red-300"
                  aria-label={`Remove ${vehicleTitle(v)} from recent vehicles`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {scanning && (
        <VinScanner
          onClose={() => setScanning(false)}
          onVin={(v) => {
            setScanning(false);
            setVin(v);
            void decode(v);
          }}
        />
      )}
    </div>
  );
}
