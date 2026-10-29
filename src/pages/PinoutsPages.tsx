import { useMemo, useState, type FormEvent } from 'react';
import { Cable, ChevronRight, Pencil, Plus, Printer, Trash2, X } from 'lucide-react';
import { Link, navigate, type Route } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { useAsync } from '../lib/useAsync';
import { errorText } from '../lib/errors';
import { vehicleTitle, type Vehicle } from '../lib/vehicle';
import { MAX_PINS, colorWords, emptyPin, type PinRow, type PinoutInput } from '../lib/pinouts';
import { COMPONENT_LOCATIONS } from '../data/locations';
import { addPinout, deletePinout, getPinout, pinoutsForVehicle, updatePinout, type Pinout } from '../api/pinouts';
import { NeedVehicle } from '../components/NeedVehicle';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, LinkButton, Loading, Notice, Page, Section, Select, Textarea, shortDate } from '../components/ui';

/** #/pinouts — every connector pinout the shop has recorded for this vehicle. */
export function PinoutsPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  const filter = (route.query.get('component') ?? '').toLowerCase();
  const list = useAsync(() => (vehicle ? pinoutsForVehicle(vehicle) : Promise.resolve([])), [vehicle?.year, vehicle?.make, vehicle?.model, vehicle?.engine]);
  if (!vehicle) return <NeedVehicle title="Connector pinouts" why="Pinouts are recorded per vehicle — choose the one on the lift." />;
  const shown = (list.data ?? []).filter((p) => !filter || p.component.toLowerCase().includes(filter));

  return (
    <Page
      title="Connector pinouts"
      subtitle={vehicleTitle(vehicle)}
      back="/"
      actions={
        <LinkButton to={`/pinouts/new${filter ? `?component=${encodeURIComponent(filter)}` : ''}`} variant="primary" icon={<Plus className="h-4 w-4" />}>
          <span className="hidden sm:inline">Add pinout</span>
        </LinkButton>
      }
    >
      <Notice>
        Pin numbers, circuits and wire colors recorded by Adaptivity techs at the connector — plus what they measured. Note which side you viewed it from: the harness side is the mirror image of the component side.
      </Notice>
      {filter && (
        <Link to="/pinouts" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-soft">
          Showing “{filter}” <X className="h-3.5 w-3.5" />
        </Link>
      )}
      {list.loading && <Loading />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && shown.length === 0 && (
        <Empty icon={<Cable className="h-8 w-8" />} title="No pinouts recorded yet" action={<LinkButton to="/pinouts/new" variant="primary">Record the first one</LinkButton>}>
          When you work out a connector — the PCM, a sensor, a module — write it down here so the next tech has it in seconds.
        </Empty>
      )}
      {shown.length > 0 && (
        <Card className="p-2">
          <ul className="divide-y divide-white/5">
            {shown.map((p) => (
              <li key={p.id}>
                <Link to={`/pinouts/${p.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-white/5">
                  <Cable className="h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-white">
                      {p.component}
                      {p.connector ? ` · ${p.connector}` : ''}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {p.pins.length} pin{p.pins.length === 1 ? '' : 's'}
                      {p.engine ? ` · ${p.engine}` : ''} · {p.author ?? 'A tech'}
                    </span>
                  </span>
                  {p.match.tier !== 'exact' && <Badge tone="blue">{p.match.label}</Badge>}
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  );
}

function PinoutForm({ vehicle, initial, editingId }: { vehicle: Vehicle; initial: PinoutInput; editingId?: string }) {
  const [p, setP] = useState<PinoutInput>(initial);
  const [count, setCount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PinoutInput>(k: K, v: PinoutInput[K]) => setP((x) => ({ ...x, [k]: v }));
  const setPin = (i: number, k: keyof PinRow, v: string) => setP((x) => ({ ...x, pins: x.pins.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const names = useMemo(() => COMPONENT_LOCATIONS.map((c) => c.name), []);

  const fill = () => {
    const n = Math.min(MAX_PINS, Math.max(0, Math.floor(Number(count))));
    if (!n) return;
    setP((x) => {
      const have = new Set(x.pins.map((r) => r.pin.trim()));
      const blank = x.pins.filter((r) => r.pin || r.function || r.color || r.value);
      const add = Array.from({ length: n }, (_, i) => String(i + 1)).filter((k) => !have.has(k)).map((pin) => ({ ...emptyPin(), pin }));
      return { ...x, pins: [...blank, ...add] };
    });
    setCount('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const id = editingId ? (await updatePinout(editingId, p), editingId) : await addPinout(vehicle, p);
      navigate(`/pinouts/${id}`, { replace: true });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-3">
        <Field label="Component" hint="The part or module the connector plugs into">
          <Input value={p.component} onChange={(e) => set('component', e.target.value)} list="apdata-pinout-components" placeholder="PCM, crank sensor, ABS module…" required />
          <datalist id="apdata-pinout-components">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Connector" hint="Name or number, if it has one">
            <Input value={p.connector} onChange={(e) => set('connector', e.target.value)} placeholder="C1, 58-pin, black" />
          </Field>
          <Field label="Viewed from">
            <Select value={p.viewFrom} onChange={(e) => set('viewFrom', e.target.value as PinoutInput['viewFrom'])}>
              <option value="">Not noted</option>
              <option value="harness">Harness side (wire end)</option>
              <option value="component">Component side</option>
            </Select>
          </Field>
          <Field label="Engine">
            <Input value={p.engine} onChange={(e) => set('engine', e.target.value)} placeholder="2.0L I4" />
          </Field>
        </div>
      </Card>

      <Section title="Pins" aside={`${p.pins.length} row${p.pins.length === 1 ? '' : 's'}`}>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Number the pins 1 to" className="w-40">
            <Input value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="58" />
          </Field>
          <Button type="button" onClick={fill} size="sm">
            Fill rows
          </Button>
        </div>
        <div className="space-y-2">
          {p.pins.map((r, i) => (
            <div key={i} className="grid grid-cols-[4.5rem_1fr_auto] gap-2 rounded-xl border border-white/10 bg-ink p-2 sm:grid-cols-[4rem_2fr_1fr_1fr_auto]">
              <Input value={r.pin} onChange={(e) => setPin(i, 'pin', e.target.value)} placeholder="Pin" aria-label={`Pin ${i + 1} number`} className="px-2 font-mono" />
              <Input value={r.function} onChange={(e) => setPin(i, 'function', e.target.value)} placeholder="Circuit / what it does" aria-label={`Pin ${i + 1} circuit`} />
              <button type="button" onClick={() => setP((x) => ({ ...x, pins: x.pins.filter((_, j) => j !== i) }))} className="row-span-2 self-center rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-red-300 sm:order-last sm:row-span-1" aria-label={`Remove pin row ${i + 1}`}>
                <X className="h-4 w-4" />
              </button>
              <div className="col-span-2 grid grid-cols-2 gap-2 sm:contents">
                <Input value={r.color} onChange={(e) => setPin(i, 'color', e.target.value)} placeholder="Wire color" aria-label={`Pin ${i + 1} wire color`} />
                <Input value={r.value} onChange={(e) => setPin(i, 'value', e.target.value)} placeholder="Measured" aria-label={`Pin ${i + 1} measured value`} />
              </div>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" onClick={() => setP((x) => ({ ...x, pins: [...x.pins, emptyPin()] }))} icon={<Plus className="h-3.5 w-3.5" />} disabled={p.pins.length >= MAX_PINS}>
          Add a pin
        </Button>
      </Section>

      <Field label="Notes" hint="Connector color, where it is, terminal type, anything that trips people up">
        <Textarea value={p.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
      </Field>
      {error && <ErrorNote message={error} />}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save pinout'}
        </Button>
        <LinkButton to={editingId ? `/pinouts/${editingId}` : '/pinouts'}>Cancel</LinkButton>
      </div>
    </form>
  );
}

/** #/pinouts/new?component=… */
export function PinoutNewPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  if (!vehicle) return <NeedVehicle title="Record a pinout" why="A pinout belongs to a vehicle — choose the one on the lift." />;
  const initial: PinoutInput = {
    component: route.query.get('component') ?? '',
    connector: '',
    viewFrom: '',
    engine: vehicle.engine ?? '',
    notes: '',
    pins: Array.from({ length: 4 }, (_, i) => ({ ...emptyPin(), pin: String(i + 1) })),
  };
  return (
    <Page title="Record a pinout" subtitle={vehicleTitle(vehicle)} back="/pinouts">
      <PinoutForm vehicle={vehicle} initial={initial} />
    </Page>
  );
}

function usePinout(id: string) {
  return useAsync<Pinout | null>(() => getPinout(id), [id]);
}

/** #/pinouts/:id/edit */
export function PinoutEditPage({ id }: { id: string }) {
  const { vehicle } = useVehicle();
  const p = usePinout(id);
  if (p.loading) return <Loading />;
  if (p.error) return <ErrorNote message={p.error} onRetry={p.reload} />;
  if (!p.data) return <Empty title="That pinout is gone." action={<LinkButton to="/pinouts">All pinouts</LinkButton>} />;
  const d = p.data;
  const v: Vehicle = vehicle ?? { year: String(d.model_year ?? ''), make: d.make, model: d.model ?? '' };
  return (
    <Page title="Edit pinout" subtitle={d.component} back={`/pinouts/${id}`}>
      <PinoutForm vehicle={v} editingId={id} initial={{ component: d.component, connector: d.connector ?? '', viewFrom: d.view_from ?? '', engine: d.engine ?? '', notes: d.notes ?? '', pins: d.pins.length ? d.pins : [emptyPin()] }} />
    </Page>
  );
}

/** #/pinouts/:id — the pin table, ready to read at the connector or print. */
export function PinoutDetailPage({ id }: { id: string }) {
  const staff = useStaff();
  const p = usePinout(id);
  const [error, setError] = useState<string | null>(null);
  if (p.loading) return <Loading />;
  if (p.error) return <ErrorNote message={p.error} onRetry={p.reload} />;
  if (!p.data) return <Empty title="That pinout is gone." action={<LinkButton to="/pinouts">All pinouts</LinkButton>} />;
  const d = p.data;
  const canEdit = d.created_by === staff.id || staff.role === 'admin';
  const remove = async () => {
    if (!window.confirm(`Delete the ${d.component} pinout?`)) return;
    try {
      await deletePinout(d.id);
      navigate('/pinouts', { replace: true });
    } catch (e) {
      setError(errorText(e));
    }
  };
  const anyValue = d.pins.some((r) => r.value);

  return (
    <Page
      title={`${d.component}${d.connector ? ` · ${d.connector}` : ''}`}
      subtitle={[d.model_year, d.make, d.model, d.engine].filter(Boolean).join(' ')}
      back="/pinouts"
      actions={
        <>
          <Button size="sm" onClick={() => window.print()} icon={<Printer className="h-3.5 w-3.5" />}>
            <span className="hidden sm:inline">Print</span>
          </Button>
          {canEdit && (
            <LinkButton to={`/pinouts/${d.id}/edit`} size="sm" icon={<Pencil className="h-3.5 w-3.5" />}>
              <span className="hidden sm:inline">Edit</span>
            </LinkButton>
          )}
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5 text-xs text-slate-400">
        <Badge>{d.pins.length} pins</Badge>
        {d.view_from && <Badge tone="blue">Viewed from the {d.view_from === 'harness' ? 'harness side' : 'component side'}</Badge>}
        <span className="self-center">
          {d.author ?? 'A tech'} · {shortDate(d.created_at)}
        </span>
      </div>
      <Card className="p-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-1.5 font-semibold">Pin</th>
                <th className="px-2 py-1.5 font-semibold">Circuit</th>
                <th className="px-2 py-1.5 font-semibold">Wire</th>
                {anyValue && <th className="px-2 py-1.5 font-semibold">Measured</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {d.pins.map((r) => (
                <tr key={r.pin}>
                  <td className="px-2 py-2 font-mono font-bold text-brand-soft">{r.pin}</td>
                  <td className="px-2 py-2 text-slate-100">{r.function}</td>
                  <td className="px-2 py-2 text-slate-300">
                    {r.color}
                    {colorWords(r.color) && colorWords(r.color) !== r.color && <span className="block text-[11px] text-slate-500">{colorWords(r.color)}</span>}
                  </td>
                  {anyValue && <td className="px-2 py-2 text-slate-300">{r.value}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {d.notes && (
        <Section title="Notes">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-200">{d.notes}</p>
        </Section>
      )}
      {error && <ErrorNote message={error} />}
      {canEdit && (
        <Button variant="danger" size="sm" onClick={() => void remove()} icon={<Trash2 className="h-3.5 w-3.5" />}>
          Delete pinout
        </Button>
      )}
    </Page>
  );
}
