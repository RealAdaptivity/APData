import { useMemo, useState, type FormEvent } from 'react';
import { BadgeCheck, Gauge, Pencil, Plus, Trash2 } from 'lucide-react';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { useAsync } from '../lib/useAsync';
import { errorText } from '../lib/errors';
import { vehicleKey, vehicleTitle, type Vehicle } from '../lib/vehicle';
import {
  SPEC_CATEGORIES,
  SPEC_SOURCES,
  addSpec,
  deleteSpec,
  specsForVehicle,
  updateSpec,
  verifySpec,
  type SpecForVehicle,
  type SpecInput,
} from '../api/specs';
import { NeedVehicle } from '../components/NeedVehicle';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, Loading, Notice, Page, Section, Select, shortDate } from '../components/ui';

const LABEL_SUGGESTIONS: Record<string, string[]> = {
  fluid: ['Engine oil', 'Coolant type', 'Automatic transmission fluid', 'Manual transmission fluid', 'Brake fluid', 'Power steering fluid', 'Front differential oil', 'Rear differential oil', 'Transfer case fluid', 'A/C refrigerant type', 'A/C compressor oil type'],
  capacity: ['Engine oil with filter', 'Cooling system', 'Transmission drain and fill', 'Transmission total', 'A/C refrigerant charge', 'A/C compressor oil', 'Rear differential', 'Fuel tank'],
  torque: ['Lug nuts', 'Front caliper bracket bolts', 'Front caliper guide pin bolts', 'Rear caliper bracket bolts', 'Oil drain plug', 'Oil filter housing cap', 'Spark plugs', 'Axle nut', 'Hub bearing bolts', 'Strut top nuts', 'Lower ball joint nut', 'Tie rod end nut'],
  tire: ['Tire size', 'Tire pressure front', 'Tire pressure rear', 'Spare tire pressure', 'Bolt pattern', 'Lug thread size'],
  electrical: ['Battery group size', 'Battery CCA', 'Headlamp bulb low beam', 'Headlamp bulb high beam', 'Fog lamp bulb', 'Brake lamp bulb'],
  dimension: ['Front rotor minimum thickness', 'Rear rotor minimum thickness', 'Maximum rotor runout', 'Spark plug gap', 'Spark plug part number', 'Drive belt part number', 'Wiper blade sizes'],
  other: [],
};

function blank(v: Vehicle, category = 'fluid'): SpecInput {
  return { category, label: '', value: '', source: SPEC_SOURCES[0], engine: v.engine ?? '' };
}

function SpecForm({
  vehicle,
  initial,
  onDone,
  editingId,
}: {
  vehicle: Vehicle;
  initial: SpecInput;
  onDone: () => void;
  editingId?: string;
}) {
  const [s, setS] = useState<SpecInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof SpecInput, v: string) => setS((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editingId) await updateSpec(editingId, s);
      else await addSpec(vehicle, s);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category">
          <Select value={s.category} onChange={(e) => set('category', e.target.value)}>
            {SPEC_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Spec">
          <Input value={s.label} onChange={(e) => set('label', e.target.value)} list="apdata-spec-labels" placeholder="Lug nuts" required />
          <datalist id="apdata-spec-labels">
            {(LABEL_SUGGESTIONS[s.category] ?? []).map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
        <Field label="Value with unit" hint="140 ft-lb · 5.7 qt · 0W-20 dexos1 · 1.85 lb">
          <Input value={s.value} onChange={(e) => set('value', e.target.value)} required />
        </Field>
        <Field label="Source">
          <Select value={s.source} onChange={(e) => set('source', e.target.value)}>
            {SPEC_SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Engine" hint="Leave as is unless the spec is for a different engine option.">
        <Input value={s.engine} onChange={(e) => set('engine', e.target.value)} placeholder="All engines" />
      </Field>
      {error && <ErrorNote message={error} />}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={busy}>
          {editingId ? 'Save' : 'Add spec'}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function SpecsPage() {
  const { vehicle } = useVehicle();
  if (!vehicle) return <NeedVehicle title="Specs" why="Specs are kept per year, make and model." />;
  return <Specs key={vehicleKey(vehicle)} vehicle={vehicle} />;
}

function Specs({ vehicle }: { vehicle: Vehicle }) {
  const staff = useStaff();
  const specs = useAsync(() => specsForVehicle(vehicle), [vehicleKey(vehicle)]);
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<SpecForVehicle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, SpecForVehicle[]>();
    for (const s of specs.data ?? []) {
      const list = m.get(s.category) ?? [];
      list.push(s);
      m.set(s.category, list);
    }
    return m;
  }, [specs.data]);

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      specs.reload();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const done = () => {
    setAdding(null);
    setEditing(null);
    specs.reload();
  };

  return (
    <Page
      title="Specs"
      subtitle={vehicleTitle(vehicle)}
      back="/"
      actions={
        !adding && (
          <Button variant="primary" onClick={() => setAdding('fluid')} icon={<Plus className="h-4 w-4" />}>
            <span className="hidden sm:inline">Add spec</span>
          </Button>
        )
      }
    >
      <Notice>
        Specs here are written down by Adaptivity techs from the service information, labels and parts catalogs. <strong>Verified</strong> means a second tech checked it. Torque and capacity figures for safety-critical parts should always match the factory service information.
      </Notice>
      {adding && <SpecForm vehicle={vehicle} initial={blank(vehicle, adding)} onDone={done} />}
      {error && <ErrorNote message={error} />}
      {specs.loading && <Loading />}
      {specs.error && <ErrorNote message={specs.error} onRetry={specs.reload} />}
      {specs.data && specs.data.length === 0 && !adding && (
        <Empty icon={<Gauge className="h-8 w-8" />} title="No specs recorded for this vehicle yet" action={<Button variant="primary" onClick={() => setAdding('fluid')}>Add the first spec</Button>}>
          When you look up an oil capacity or a lug nut torque, add it here so nobody has to look it up again.
        </Empty>
      )}
      {SPEC_CATEGORIES.filter((c) => grouped.has(c.id)).map((c) => (
        <Section key={c.id} title={c.label}>
          <ul className="divide-y divide-white/5">
            {grouped.get(c.id)!.map((s) => {
              const own = s.created_by === staff.id;
              const canEdit = own || staff.role === 'admin';
              if (editing?.id === s.id) {
                return (
                  <li key={s.id} className="py-3">
                    <SpecForm
                      vehicle={vehicle}
                      editingId={s.id}
                      initial={{ category: s.category, label: s.label, value: s.value, source: s.source ?? SPEC_SOURCES[0], engine: s.engine ?? '' }}
                      onDone={done}
                    />
                  </li>
                );
              }
              return (
                <li key={s.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-slate-300">{s.label}</div>
                    <div className="text-[15px] font-bold text-white">{s.value}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      {s.verified_at ? (
                        <Badge tone="green">
                          <BadgeCheck className="h-3 w-3" /> Verified{s.verifier ? ` by ${s.verifier}` : ''}
                        </Badge>
                      ) : (
                        <Badge tone="amber">Not yet verified</Badge>
                      )}
                      {s.match.tier !== 'exact' && <Badge tone="blue">{s.match.label}</Badge>}
                      {s.engine && <span>{s.engine}</span>}
                      <span>
                        {s.source ? `${s.source} · ` : ''}
                        {s.author ?? 'A tech'} · {shortDate(s.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!s.verified_at && !own && (
                      <Button size="sm" onClick={() => void act(() => verifySpec(s.id))} icon={<BadgeCheck className="h-3.5 w-3.5" />}>
                        Verify
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <button type="button" onClick={() => setEditing(s)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label={`Edit ${s.label}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => window.confirm(`Delete “${s.label}”?`) && void act(() => deleteSpec(s.id))}
                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-red-300"
                          aria-label={`Delete ${s.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
      {specs.data && specs.data.length > 0 && !adding && (
        <Card className="flex flex-wrap gap-2">
          {SPEC_CATEGORIES.map((c) => (
            <Button key={c.id} size="sm" onClick={() => setAdding(c.id)} icon={<Plus className="h-3.5 w-3.5" />}>
              {c.label}
            </Button>
          ))}
        </Card>
      )}
    </Page>
  );
}
