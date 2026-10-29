import { useMemo, useState, type FormEvent } from 'react';
import { Calculator, ChevronRight, Clock, Copy, Plus, Printer, Search, Timer, Trash2, X } from 'lucide-react';
import { LABOR_JOBS, laborJob, searchLaborJobs } from '../data/laborJobs';
import { rangeText, typicalFor } from '../data/laborTypical';
import { SYSTEMS, systemInfo } from '../data/systems';
import { useAsync } from '../lib/useAsync';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { errorText } from '../lib/errors';
import { actualSummary, bookHoursFor, dollars, estimateTotals, round1, suggestedHours, type HoursStats } from '../lib/labor';
import { addToEstimate, useEstimate } from '../lib/estimateStore';
import { laborRateCentsForVehicle, vehicleLaborRateLabel } from '../lib/vehicleLaborRate';
import { scopeLabel, vehicleKey, vehicleSubtitle, vehicleTitle, type Vehicle } from '../lib/vehicle';
import { Link, navigate } from '../lib/router';
import { deleteLaborEntry, fetchShopLaborRateCents, laborCounts, laborForJob, laborForJobs, logActualTime, setBookTime, type BookScope } from '../api/labor';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, LinkButton, Loading, Notice, Page, Section, Select, Stat, shortDate } from '../components/ui';

// ---------------------------------------------------------------------------
// Job list
// ---------------------------------------------------------------------------

export function LaborPage() {
  const { vehicle } = useVehicle();
  const [q, setQ] = useState('');
  const counts = useAsync(() => laborCounts(), []);
  const jobs = useMemo(() => searchLaborJobs(q), [q]);
  const bySystem = useMemo(() => {
    const m = new Map<string, typeof jobs>();
    for (const j of jobs) m.set(j.system, [...(m.get(j.system) ?? []), j]);
    return SYSTEMS.filter((s) => m.has(s.id)).map((s) => ({ system: s, jobs: m.get(s.id)! }));
  }, [jobs]);

  return (
    <Page
      title="Labor guide"
      subtitle={vehicle ? `Book hours and real shop times · ${vehicleTitle(vehicle)}` : 'Book hours and real shop times'}
      actions={
        <LinkButton to="/labor/estimate" variant="primary" icon={<Calculator className="h-4 w-4" />}>
          <span className="hidden sm:inline">Estimate</span>
        </LinkButton>
      }
    >
      <Notice>
        This is the shop’s own labor guide: admins set the book hours Adaptivity charges, and techs log how long each job really took. The more times get logged, the better the numbers get.
      </Notice>
      {counts.error && <ErrorNote message={counts.error} onRetry={counts.reload} />}
      <label className="relative block">
        <span className="sr-only">Search jobs</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs: pads, water pump, alternator…" className="pl-9" />
      </label>
      {bySystem.length === 0 && <Empty title="No jobs match that search" />}
      {bySystem.map(({ system, jobs: list }) => (
        <Section key={system.id} title={system.label}>
          <ul className="-mx-2">
            {list.map((j) => {
              const c = counts.data?.get(j.code);
              return (
                <li key={j.code}>
                  <Link to={`/labor/${j.code}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                    <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1 text-[14px] text-slate-100">{j.name}</span>
                    {!c?.book && typicalFor(j.code, vehicle?.engine) && <span className="shrink-0 text-xs text-slate-500">{rangeText(typicalFor(j.code, vehicle?.engine)!)}</span>}
                    {c?.book ? <Badge tone="orange">Book</Badge> : null}
                    {c?.actual ? <Badge>{c.actual} logged</Badge> : null}
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// One job
// ---------------------------------------------------------------------------

function StatsLine({ label, s }: { label: string; s: HoursStats | null }) {
  if (!s) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 py-2 text-[14px]">
      <span className="text-slate-400">{label}</span>
      <span className="text-right">
        <span className="font-bold text-white">{s.median} h</span>
        <span className="text-xs text-slate-500">
          {' '}
          median · {s.min}–{s.max} h · {s.count} job{s.count === 1 ? '' : 's'}
        </span>
      </span>
    </div>
  );
}

export function LaborJobPage({ code }: { code: string }) {
  const staff = useStaff();
  const { vehicle } = useVehicle();
  const job = laborJob(code);
  const entries = useAsync(() => laborForJob(code), [code]);
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [bookHours, setBookHours] = useState('');
  const [bookScope, setBookScope] = useState<BookScope>(vehicle ? 'model' : 'all');
  const [busy, setBusy] = useState<'log' | 'book' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const list = entries.data ?? [];
  const book = bookHoursFor(list, vehicle);
  const actual = actualSummary(list, vehicle);
  const suggestion = suggestedHours(list, vehicle, code);
  const typical = typicalFor(code, vehicle?.engine);
  const shopRate = useAsync(() => fetchShopLaborRateCents(), []);
  const rateCents = vehicle ? laborRateCentsForVehicle(vehicleTitle(vehicle) + (vehicle.engine ? ` ${vehicle.engine}` : ''), shopRate.data ?? 15000) : shopRate.data ?? 15000;

  const log = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    setBusy('log');
    setError(null);
    try {
      await logActualTime(code, vehicle, hours, note);
      setHours('');
      setNote('');
      setSaved('Time logged. Thanks — it improves the guide for everyone.');
      entries.reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const saveBook = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('book');
    setError(null);
    try {
      await setBookTime(code, bookScope, vehicle, bookHours, '');
      setBookHours('');
      setSaved('Book time saved.');
      entries.reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteLaborEntry(id);
      entries.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const toEstimate = () => {
    if (!vehicle) return;
    addToEstimate(vehicleKey(vehicle), { key: code, name: job.name, hours: suggestion?.hours ?? 1, partsCents: 0 });
    navigate('/labor/estimate');
  };

  return (
    <Page title={job.name} subtitle={systemInfo(job.system).label} back="/labor">
      {job.note && <Notice>{job.note}</Notice>}
      {entries.loading && <Loading />}
      {entries.error && <ErrorNote message={entries.error} onRetry={entries.reload} />}

      {entries.data && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Quote" value={suggestion ? `${suggestion.hours} h` : '—'} tone={suggestion ? 'green' : undefined} />
            <Stat label="Labor at shop rate" value={suggestion ? dollars(Math.round(suggestion.hours * rateCents)) : '—'} />
            <Stat label="Typical time" value={typical ? rangeText(typical) : '—'} />
            <Stat label={book ? `Book · ${book.make ? scopeLabel(book) : 'all vehicles'}` : 'Shop book time'} value={book ? `${book.hours} h` : 'Not set'} />
            <Stat label="Shop median, this model" value={actual.thisVehicle ? `${actual.thisVehicle.median} h` : 'None logged'} />
          </div>
          {suggestion && <p className="text-xs text-slate-500">Quote basis: {suggestion.basis}. Labor at {dollars(rateCents)}/h.</p>}
          {typical?.note && <Notice>{typical.note}</Notice>}

          {vehicle ? (
            <Button variant="primary" onClick={toEstimate} icon={<Calculator className="h-4 w-4" />}>
              Add to estimate for {vehicleTitle(vehicle)}
            </Button>
          ) : (
            <Notice tone="amber">
              <Link to="/vehicle" className="font-semibold underline">
                Choose a vehicle
              </Link>{' '}
              to see times for it and log your own.
            </Notice>
          )}

          {(actual.thisVehicle || actual.sameMake || actual.all) && (
            <Section title="What the job really took">
              <StatsLine label="This model (±2 years)" s={actual.thisVehicle} />
              <StatsLine label={vehicle ? `Any ${vehicle.make}` : 'Same make'} s={actual.sameMake} />
              <StatsLine label="All vehicles" s={actual.all} />
            </Section>
          )}
        </>
      )}

      {saved && <Notice tone="blue">{saved}</Notice>}
      {error && <ErrorNote message={error} />}

      {vehicle && (
        <Section title="Log your time">
          <form onSubmit={log} className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
            <Field label="Hours">
              <Input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" placeholder="1.6" required />
            </Field>
            <Field label="Note (optional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Seized caliper bolts added 0.4" />
            </Field>
            <Button type="submit" variant="primary" loading={busy === 'log'} icon={<Timer className="h-4 w-4" />}>
              Log
            </Button>
          </form>
          <p className="text-xs text-slate-500">
            Logged against {vehicleTitle(vehicle)}
            {vehicleSubtitle(vehicle) ? ` · ${vehicleSubtitle(vehicle)}` : ''}. Count the time on the job, not travel.
          </p>
        </Section>
      )}

      {staff.role === 'admin' && (
        <Section title="Set book time (admin)">
          <form onSubmit={saveBook} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <Field label="Applies to">
              <Select value={bookScope} onChange={(e) => setBookScope(e.target.value as BookScope)}>
                <option value="all">All vehicles (default)</option>
                {vehicle && <option value="make">Every {vehicle.make}</option>}
                {vehicle && (
                  <option value="model">
                    {vehicle.make} {vehicle.model}, any year
                  </option>
                )}
                {vehicle && <option value="vehicle">Only {vehicleTitle(vehicle)}</option>}
              </Select>
            </Field>
            <Field label="Hours">
              <Input value={bookHours} onChange={(e) => setBookHours(e.target.value)} inputMode="decimal" placeholder="1.5" required />
            </Field>
            <Button type="submit" variant="primary" loading={busy === 'book'}>
              Save
            </Button>
          </form>
          <p className="text-xs text-slate-500">The most specific book time wins: this exact vehicle, then the model, then the make, then the default.</p>
        </Section>
      )}

      {list.length > 0 && (
        <Section title="History" aside={`${list.length}`}>
          <ul className="divide-y divide-white/5">
            {list.slice(0, 100).map((e) => (
              <li key={e.id} className="flex items-start gap-3 py-2.5">
                <div className="w-14 shrink-0 text-right font-heading text-[15px] font-bold text-white">{round1(e.hours)} h</div>
                <div className="min-w-0 flex-1 text-[13px]">
                  <div className="text-slate-200">
                    {e.kind === 'book' ? (
                      <Badge tone="orange" className="mr-1.5">
                        Book
                      </Badge>
                    ) : null}
                    {e.make ? scopeLabel(e) : 'All vehicles'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {e.author ?? 'A tech'} · {shortDate(e.created_at)}
                    {e.note ? ` · ${e.note}` : ''}
                  </div>
                </div>
                {(e.created_by === staff.id || staff.role === 'admin') && (
                  <button type="button" onClick={() => void remove(e.id)} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-red-300" aria-label="Delete entry">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Estimate
// ---------------------------------------------------------------------------

/** A number box that lets the tech type "1." on the way to "1.5". */
function DecimalInput({ value, onValue, placeholder }: { value: number; onValue: (n: number) => void; placeholder?: string }) {
  const [text, setText] = useState(value ? String(value) : '');
  return (
    <Input
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.]/g, '');
        setText(t);
        const n = Number(t);
        onValue(Number.isFinite(n) ? n : 0);
      }}
      inputMode="decimal"
      placeholder={placeholder}
    />
  );
}

export function EstimatePage() {
  const { vehicle } = useVehicle();
  if (!vehicle) {
    return (
      <Page title="Labor estimate" back="/labor">
        <Empty title="Choose a vehicle first" action={<LinkButton to="/vehicle" variant="primary">Choose vehicle</LinkButton>}>
          The estimate uses the book hours and shop times for the vehicle, and the right hourly rate for it.
        </Empty>
      </Page>
    );
  }
  return <Estimate key={vehicleKey(vehicle)} vehicle={vehicle} />;
}

function Estimate({ vehicle }: { vehicle: Vehicle }) {
  const vkey = vehicleKey(vehicle);
  const { lines, update } = useEstimate(vkey);
  const [adding, setAdding] = useState('');
  const [copied, setCopied] = useState(false);
  const shopRate = useAsync(() => fetchShopLaborRateCents(), []);
  const codes = lines.map((l) => l.key);
  const entries = useAsync(() => laborForJobs(codes), [codes.join(',')]);

  const line = vehicleTitle(vehicle) + (vehicle.engine ? ` ${vehicle.engine}` : '');
  const rateCents = laborRateCentsForVehicle(line, shopRate.data ?? 15000);
  const rateLabel = vehicleLaborRateLabel(line);
  const totals = estimateTotals(lines, rateCents);
  const matches = searchLaborJobs(adding).filter((j) => !codes.includes(j.code)).slice(0, 8);

  const add = async (code: string) => {
    const job = laborJob(code);
    setAdding('');
    let hours = 1;
    try {
      hours = suggestedHours(await laborForJob(code), vehicle, code)?.hours ?? typicalFor(code, vehicle?.engine)?.hours ?? 1;
    } catch {
      /* no times available: start at 1 h and let the tech change it */
    }
    update((ls) => (ls.some((x) => x.key === code) ? ls : [...ls, { key: code, name: job.name, hours, partsCents: 0 }]));
  };

  const text = [
    `Estimate — ${vehicleTitle(vehicle)}${vehicle.engine ? ` (${vehicle.engine})` : ''}${vehicle.vin ? ` · VIN ${vehicle.vin}` : ''}`,
    ...lines.map((l) => `• ${l.name}: ${round1(l.hours)} h${l.partsCents ? ` + parts ${dollars(l.partsCents)}` : ''}`),
    `Labor ${totals.hours} h @ ${dollars(rateCents)}/h = ${dollars(totals.laborCents)}`,
    totals.partsCents ? `Parts ${dollars(totals.partsCents)}` : null,
    `Total before tax ${dollars(totals.totalCents)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy the estimate:', text);
    }
  };

  return (
    <Page
      title="Labor estimate"
      subtitle={`${vehicleTitle(vehicle)}${vehicle.engine ? ` · ${vehicle.engine}` : ''}`}
      back="/labor"
      actions={
        lines.length > 0 && (
          <>
            <Button size="sm" onClick={() => void copy()} icon={<Copy className="h-3.5 w-3.5" />}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" onClick={() => window.print()} icon={<Printer className="h-3.5 w-3.5" />} aria-label="Print" />
          </>
        )
      }
    >
      {rateLabel && <Notice tone="blue">Billed at the {rateLabel} rate.</Notice>}
      {entries.error && <ErrorNote message={entries.error} />}

      <Card className="space-y-3">
        {lines.length === 0 && <p className="text-[13px] text-slate-400">Add the jobs for this vehicle. Hours start from the shop’s book time, the median of real times, or AP Data’s typical time — change them as needed.</p>}
        {lines.map((l) => {
          const s = suggestedHours((entries.data ?? []).filter((e) => e.job_code === l.key), vehicle, l.key);
          return (
            <div key={l.key} className="space-y-2 border-b border-white/5 pb-3">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/labor/${l.key}`} className="text-[14px] font-semibold text-white hover:text-brand-soft">
                  {l.name}
                </Link>
                <button type="button" onClick={() => update((ls) => ls.filter((x) => x.key !== l.key))} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-red-300" aria-label={`Remove ${l.name}`}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Hours" hint={s ? `${s.basis}: ${s.hours} h` : 'No book or logged time yet'}>
                  <DecimalInput value={l.hours} onValue={(n) => update((ls) => ls.map((x) => (x.key === l.key ? { ...x, hours: n } : x)))} />
                </Field>
                <Field label="Parts $">
                  <DecimalInput
                    value={l.partsCents / 100}
                    onValue={(n) => update((ls) => ls.map((x) => (x.key === l.key ? { ...x, partsCents: Math.round(n * 100) } : x)))}
                    placeholder="0.00"
                  />
                </Field>
              </div>
            </div>
          );
        })}
        <div className="space-y-2">
          <label className="relative block">
            <span className="sr-only">Add a job</span>
            <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a job: brakes, alternator, diagnosis…" className="pl-9" />
          </label>
          {adding.trim() && (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {matches.map((j) => (
                <li key={j.code}>
                  <button type="button" onClick={() => void add(j.code)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] text-slate-200 hover:bg-white/5">
                    <Plus className="h-4 w-4 text-brand" /> {j.name}
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="px-3 py-2.5 text-[13px] text-slate-500">No job matches. Jobs come from the shop’s job list ({LABOR_JOBS.length} jobs).</li>}
            </ul>
          )}
        </div>
      </Card>

      {lines.length > 0 && (
        <Card className="space-y-2">
          <div className="flex justify-between text-[14px]">
            <span className="text-slate-400">
              Labor · {totals.hours} h × {dollars(rateCents)}/h
            </span>
            <span className="font-semibold text-white">{dollars(totals.laborCents)}</span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-slate-400">Parts</span>
            <span className="font-semibold text-white">{dollars(totals.partsCents)}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-[16px]">
            <span className="font-bold text-white">Total before tax</span>
            <span className="font-heading font-bold text-brand-soft">{dollars(totals.totalCents)}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            A working estimate for the tech and dispatcher. Customer quotes and receipts are made in the Adaptivity admin portal, which adds tax and fees.
          </p>
          <Button variant="ghost" size="sm" onClick={() => window.confirm('Clear this estimate?') && update(() => [])} icon={<Trash2 className="h-3.5 w-3.5" />}>
            Clear estimate
          </Button>
        </Card>
      )}
    </Page>
  );
}
