import { useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  ExternalLink,
  FileText,
  Gauge,
  History,
  Plus,
  Printer,
  Receipt,
  ShieldAlert,
  StickyNote,
  ThumbsUp,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import { Link, navigate, type Route } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { useAsync } from '../lib/useAsync';
import { errorText } from '../lib/errors';
import { isVinShaped, normalizeVin } from '../lib/vin';
import { vehicleTitle } from '../lib/vehicle';
import { researchFor } from '../lib/research';
import { visitCount, type HistoryEntry, type HistoryKind } from '../lib/history';
import { EVENT_KINDS, EVENT_SOURCES, HISTORY_KINDS, freeChecks, kindInfo, summarize, validateEvent, type EventInput, type EventKind } from '../lib/vehicleReport';
import { historyForVin, type ReportEvent } from '../api/history';
import { addHistoryEvent, deleteHistoryEvent } from '../api/vehicleReport';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, Loading, Notice, Page, Section, Select, Textarea, cx, shortDate } from '../components/ui';

const ICON: Record<HistoryKind, ReactNode> = {
  job: <ClipboardList className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  quote: <FileText className="h-4 w-4" />,
  fix: <Wrench className="h-4 w-4" />,
  confirmation: <ThumbsUp className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  event: <CarFront className="h-4 w-4" />,
};

const TONE: Record<HistoryKind, string> = {
  job: 'bg-sky-500/15 text-sky-300',
  receipt: 'bg-emerald-500/15 text-emerald-300',
  quote: 'bg-white/5 text-slate-300',
  fix: 'bg-brand/20 text-brand-soft',
  confirmation: 'bg-brand/10 text-brand-soft',
  note: 'bg-amber-500/15 text-amber-200',
  event: 'bg-violet-500/15 text-violet-300',
};

function Entry({ e }: { e: HistoryEntry }) {
  const body = (
    <div className="flex gap-3">
      <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TONE[e.kind])}>{ICON[e.kind]}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {shortDate(e.date)}
          {e.job && e.kind !== 'job' && <span className="normal-case"> · job {e.job}</span>}
        </div>
        <div className="text-[14px] font-semibold text-white">{e.title}</div>
        {e.detail.map((d) => (
          <div key={d} className="text-[13px] leading-relaxed text-slate-300">
            {d}
          </div>
        ))}
      </div>
    </div>
  );
  return <li>{e.to ? <Link to={e.to} className="-mx-2 block rounded-xl px-2 py-2 hover:bg-white/5">{body}</Link> : <div className="py-2">{body}</div>}</li>;
}

function Flag({ tone, icon, value, label }: { tone: 'red' | 'amber' | 'green' | 'slate'; icon: ReactNode; value: ReactNode; label: string }) {
  const t = {
    red: 'border-red-500/40 bg-red-500/10 text-red-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    slate: 'border-white/10 bg-panel text-slate-200',
  }[tone];
  return (
    <div className={cx('rounded-2xl border p-3', t)}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[15px] font-bold">{value}</div>
    </div>
  );
}

const blankEvent = (kind: EventKind = 'accident'): EventInput => ({ kind, date: '', mileage: '', note: '', source: EVENT_SOURCES[0] });

function EventForm({ vin, initialKind, onDone }: { vin: string; initialKind: EventKind; onDone: () => void }) {
  const [e, setE] = useState<EventInput>(blankEvent(initialKind));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setE((x) => ({ ...x, [k]: v }));
  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const problem = validateEvent(e);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await addHistoryEvent(vin, e);
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="no-print space-y-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="What happened">
          <Select value={e.kind} onChange={(x) => set('kind', x.target.value as EventKind)}>
            {(Object.keys(EVENT_KINDS) as EventKind[]).map((k) => (
              <option key={k} value={k}>
                {EVENT_KINDS[k].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Where it came from">
          <Select value={e.source} onChange={(x) => set('source', x.target.value)}>
            {EVENT_SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="When" hint="Leave blank if not known">
          <Input type="date" value={e.date} onChange={(x) => set('date', x.target.value)} />
        </Field>
        <Field label="Mileage" hint={e.kind === 'odometer' ? 'Required' : 'If known'}>
          <Input value={e.mileage} onChange={(x) => set('mileage', x.target.value)} inputMode="numeric" placeholder="128,400" />
        </Field>
      </div>
      <Field label="Details">
        <Textarea value={e.note} onChange={(x) => set('note', x.target.value)} rows={2} placeholder={EVENT_KINDS[e.kind].hint} />
      </Field>
      {error && <ErrorNote message={error} />}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EventRow({ e, canDelete, onDelete }: { e: ReportEvent; canDelete: boolean; onDelete: () => void }) {
  const info = kindInfo(e.kind);
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', info.flag === 'red' ? 'bg-red-400' : info.flag === 'amber' ? 'bg-amber-300' : 'bg-slate-500')} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-white">{info.label}</div>
        <div className="text-[13px] leading-relaxed text-slate-300">{e.note}</div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {[e.event_date ? shortDate(e.event_date) : 'Date not known', e.mileage ? `${e.mileage.toLocaleString('en-US')} mi` : '', e.source, `added by ${e.author ?? 'a tech'}`].filter(Boolean).join(' · ')}
        </div>
      </div>
      {canDelete && (
        <button type="button" onClick={onDelete} className="no-print rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-red-300" aria-label={`Delete ${info.label}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function Report({ vin }: { vin: string }) {
  const staff = useStaff();
  const h = useAsync(() => historyForVin(vin), [vin]);
  const research = useAsync(() => researchFor({ year: '', make: '', model: '', vin }), [vin]);
  const [adding, setAdding] = useState<EventKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (h.loading) return <Loading label="Building the vehicle history…" />;
  if (h.error) return <ErrorNote message={h.error} onRetry={h.reload} />;
  const { entries, events, odometer } = h.data!;
  const visits = visitCount(entries);
  const sum = summarize(events);
  const decoded = research.data?.vehicle.decoded;
  const recalls = research.data?.recalls;
  const lastMiles = odometer[odometer.length - 1];
  const drops = odometer.filter((o) => o.drop);
  const pastEvents = events.filter((e) => HISTORY_KINDS.includes(e.kind as EventKind));
  const remove = async (id: string) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await deleteHistoryEvent(id);
      h.reload();
    } catch (e) {
      setError(errorText(e));
    }
  };
  const done = () => {
    setAdding(null);
    h.reload();
  };

  return (
    <>
      <Card className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vehicle history report</div>
        <div className="font-heading text-lg font-bold text-white">{decoded ? [decoded.year, decoded.make, decoded.model, decoded.trim].filter(Boolean).join(' ') : research.loading ? 'Decoding the VIN…' : 'Vehicle'}</div>
        {decoded?.engine && <div className="text-[13px] text-slate-400">{decoded.engine}</div>}
        <div className="font-mono text-xs text-slate-500">{vin}</div>
        {decoded && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-[12px] sm:grid-cols-3">
            {decoded.details.slice(0, 6).map((d) => (
              <div key={d.label}>
                <dt className="text-slate-500">{d.label}</dt>
                <dd className="text-slate-200">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Flag
          tone={sum.accidents ? 'red' : sum.damage ? 'amber' : 'slate'}
          icon={<CarFront className="h-3.5 w-3.5" />}
          label="Accidents"
          value={sum.accidents ? `${sum.accidents} recorded` : sum.damage ? `${sum.damage} prior repair seen` : 'None recorded'}
        />
        <Flag tone={sum.titleBrands.length || sum.flood ? 'red' : 'slate'} icon={<FileText className="h-3.5 w-3.5" />} label="Title" value={sum.titleBrands.length ? sum.titleBrands.join(', ') : sum.flood ? 'Flood damage recorded' : 'No brand recorded'} />
        <Flag tone="slate" icon={<Users className="h-3.5 w-3.5" />} label="Owners" value={sum.ownerChanges ? `${sum.ownerChanges} owner change${sum.ownerChanges === 1 ? '' : 's'}` : 'None recorded'} />
        <Flag
          tone={drops.length ? 'red' : 'slate'}
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Odometer"
          value={drops.length ? 'Reading went down' : lastMiles ? `${lastMiles.miles.toLocaleString('en-US')} mi` : 'No readings yet'}
        />
        <Flag
          tone={recalls?.length ? 'amber' : 'slate'}
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          label="Recalls"
          value={research.loading ? '…' : recalls == null ? 'NHTSA did not answer' : recalls.length ? `${recalls.length} for this vehicle` : 'None'}
        />
        <Flag tone="slate" icon={<ClipboardList className="h-3.5 w-3.5" />} label="Shop visits" value={`${visits} job${visits === 1 ? '' : 's'}`} />
      </div>
      {(sum.theft || sum.airbag) && (
        <Notice tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>
          {[sum.theft && 'Theft recorded.', sum.airbag && 'Airbag deployment recorded — check the SRS module, belts and sensors were replaced.'].filter(Boolean).join(' ')}
        </Notice>
      )}

      <Section title="Wrecks, title and owners" aside="Shop records">
        {pastEvents.length ? (
          <ul className="divide-y divide-white/5">
            {pastEvents.map((e) => (
              <EventRow key={e.id} e={e} canDelete={e.created_by === staff.id || staff.role === 'admin'} onDelete={() => void remove(e.id)} />
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-slate-400">Nothing recorded. When a customer mentions a wreck, you spot prior repair, or a title or report shows a brand or owners, add it here.</p>
        )}
        {error && <ErrorNote message={error} />}
        {adding ? (
          <EventForm vin={vin} initialKind={adding} onDone={done} />
        ) : (
          <div className="no-print flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => setAdding('accident')} icon={<Plus className="h-3.5 w-3.5" />}>
              Add a record
            </Button>
            <Button size="sm" onClick={() => setAdding('odometer')} icon={<Gauge className="h-3.5 w-3.5" />}>
              Odometer reading
            </Button>
            <Button size="sm" onClick={() => setAdding('service_elsewhere')} icon={<Wrench className="h-3.5 w-3.5" />}>
              Service elsewhere
            </Button>
          </div>
        )}
      </Section>

      <Section title="Official checks" aside="Free">
        <ul className="-mx-2">
          {freeChecks(vin).map((c) => (
            <li key={c.label}>
              <a href={c.href} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-white">{c.label}</span>
                  <span className="block text-xs text-slate-400">{c.note}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500">Found something on one of these? Add it above with that source, so it stays on this VIN.</p>
      </Section>

      <Section title="Odometer readings" aside={odometer.length ? `${odometer.length} on record` : undefined}>
        {odometer.length ? (
          <>
            <ul className="divide-y divide-white/5">
              {odometer.map((o, i) => (
                <li key={`${o.date}-${i}`} className="flex items-center gap-3 py-2 text-[13px]">
                  <span className="w-24 shrink-0 text-slate-500">{shortDate(o.date)}</span>
                  <span className={cx('w-24 shrink-0 font-mono font-bold', o.drop ? 'text-red-300' : 'text-white')}>{o.miles.toLocaleString('en-US')}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-400">{o.from}</span>
                  {o.drop && <Badge tone="red">Lower</Badge>}
                </li>
              ))}
            </ul>
            {drops.length > 0 && <Notice tone="amber">A reading is lower than an earlier one: a rolled-back odometer, a replaced cluster, or a typo. Check the cluster and the records.</Notice>}
          </>
        ) : (
          <p className="text-[13px] text-slate-400">Mileage from recorded fixes and odometer readings shows here, with a warning if it ever goes down.</p>
        )}
      </Section>

      {recalls && recalls.length > 0 && (
        <Section title="Safety recalls" aside="NHTSA">
          <ul className="divide-y divide-white/5">
            {recalls.map((r) => (
              <li key={r.campaign} className="py-2">
                <div className="text-[14px] font-semibold text-white">{r.component}</div>
                <div className="text-[11px] text-slate-500">
                  Campaign {r.campaign}
                  {r.reportedOn ? ` · ${shortDate(r.reportedOn)}` : ''}
                </div>
                <div className="line-clamp-3 text-[13px] text-slate-300">{r.summary}</div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500">Whether a recall is still open on this VIN: check the NHTSA link above.</p>
        </Section>
      )}

      <Section title="Service and repairs" aside="Newest first">
        {entries.length === 0 ? (
          <Empty icon={<History className="h-8 w-8" />} title="Nothing recorded for this VIN yet">
            First visit. Record the fix when the job is done, and it shows here next time.
          </Empty>
        ) : (
          <ul className="divide-y divide-white/5">
            {entries.map((e, i) => (
              <Entry key={`${e.kind}-${e.date}-${i}`} e={e} />
            ))}
          </ul>
        )}
      </Section>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Built from Adaptivity’s own records (jobs, fixes, notes and what techs recorded), NHTSA recalls and the VIN decode. Wrecks, title brands and owners here are what the shop recorded and where it came from — not an official title history. Quotes and receipts show for admins only.
        {h.data?.partial ? ' Some records could not be loaded.' : ''}
      </p>
    </>
  );
}

/** #/history — the vehicle history report for one VIN. #/history?vin=… looks up another. */
export function HistoryPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  const asked = normalizeVin(route.query.get('vin') ?? '');
  const vin = isVinShaped(asked) ? asked : vehicle?.vin ? normalizeVin(vehicle.vin) : '';
  const [text, setText] = useState(asked);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = normalizeVin(text);
    if (isVinShaped(v)) navigate(`/history?vin=${v}`, { replace: true });
  };
  const forCurrent = vin && vehicle?.vin && normalizeVin(vehicle.vin) === vin;

  return (
    <Page
      title="Vehicle history"
      subtitle={forCurrent && vehicle ? vehicleTitle(vehicle) : vin || undefined}
      back="/"
      actions={
        vin ? (
          <Button size="sm" onClick={() => window.print()} icon={<Printer className="h-3.5 w-3.5" />}>
            <span className="hidden sm:inline">Print</span>
          </Button>
        ) : undefined
      }
    >
      <form onSubmit={submit} className="no-print flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value.toUpperCase())} placeholder="Look up another VIN" className="font-mono" maxLength={24} aria-label="VIN" />
        <Button type="submit" disabled={!isVinShaped(normalizeVin(text))}>
          Look up
        </Button>
      </form>
      {vin ? (
        <Report key={vin} vin={vin} />
      ) : (
        <Notice>
          History is kept by VIN. {vehicle ? 'This vehicle was picked by year, make and model —' : 'No vehicle is picked —'}{' '}
          <Link to="/vehicle" className="font-semibold underline">
            decode the VIN
          </Link>{' '}
          or type one above.
        </Notice>
      )}
    </Page>
  );
}
