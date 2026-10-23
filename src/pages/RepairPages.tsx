import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, BookOpen, ChevronRight, Clock, ListChecks, Pencil, Plus, Printer, Search, ShieldAlert, Trash2, Wrench, X } from 'lucide-react';
import { ARTICLE_BY_SLUG, ARTICLES, KIND_LABEL, searchArticles, type Article } from '../data/articles';
import { SYSTEMS, systemInfo } from '../data/systems';
import { useAsync } from '../lib/useAsync';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { errorText } from '../lib/errors';
import { scopeFit, scopeLabel, vehicleTitle } from '../lib/vehicle';
import { Link, navigate } from '../lib/router';
import {
  createProcedure,
  deleteProcedure,
  getProcedure,
  listProcedures,
  updateProcedure,
  type Procedure,
  type ProcedureInput,
  type ProcedureSpec,
} from '../api/procedures';
import {
  Badge,
  Button,
  Card,
  CodeChip,
  Empty,
  ErrorNote,
  Field,
  Input,
  LinkButton,
  Loading,
  Notice,
  Page,
  Section,
  Select,
  Textarea,
  cx,
  shortDate,
} from '../components/ui';

// ---------------------------------------------------------------------------
// Browse
// ---------------------------------------------------------------------------

export function RepairPage() {
  const { vehicle } = useVehicle();
  const [system, setSystem] = useState<string>('all');
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'vehicle' | 'all'>(vehicle ? 'vehicle' : 'all');
  const procs = useAsync(() => listProcedures(), []);

  const shop = useMemo(() => {
    const list = procs.data ?? [];
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    return list
      .map((p) => ({ p, fit: vehicle && scope === 'vehicle' ? scopeFit(vehicle, p) : 0 }))
      .filter(({ p, fit }) => fit != null && (system === 'all' || p.system === system))
      .filter(({ p }) => !words.length || words.every((w) => `${p.title} ${p.summary ?? ''} ${p.notes ?? ''} ${p.make ?? ''} ${p.model ?? ''}`.toLowerCase().includes(w)))
      .sort((a, b) => (b.fit ?? 0) - (a.fit ?? 0) || a.p.title.localeCompare(b.p.title))
      .map(({ p }) => p);
  }, [procs.data, vehicle, scope, system, q]);

  const builtIn = useMemo(() => {
    const base = q.trim() ? searchArticles(q) : ARTICLES;
    return base.filter((a) => system === 'all' || a.system === system);
  }, [q, system]);

  const systemsUsed = new Set([...ARTICLES.map((a) => a.system), ...(procs.data ?? []).map((p) => p.system)]);

  return (
    <Page
      title="Repair information"
      subtitle="Tests, procedures and the shop’s own write-ups for this vehicle."
      actions={
        <LinkButton to="/repair/p/new" variant="primary" icon={<Plus className="h-4 w-4" />}>
          <span className="hidden sm:inline">Write procedure</span>
        </LinkButton>
      }
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
        <label className="relative block">
          <span className="sr-only">Search repair information</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: compression, brake bleed, timing chain…" className="pl-9" />
        </label>
        <Select value={system} onChange={(e) => setSystem(e.target.value)} aria-label="System">
          <option value="all">All systems</option>
          {SYSTEMS.filter((s) => systemsUsed.has(s.id)).map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      <Section
        title={vehicle && scope === 'vehicle' ? `Shop procedures · ${vehicleTitle(vehicle)}` : 'Shop procedures'}
        aside={
          vehicle && (
            <button type="button" onClick={() => setScope((s) => (s === 'vehicle' ? 'all' : 'vehicle'))} className="font-semibold text-brand-soft">
              {scope === 'vehicle' ? 'Show all vehicles' : 'Only this vehicle'}
            </button>
          )
        }
      >
        {procs.loading && <Loading />}
        {procs.error && <ErrorNote message={procs.error} onRetry={procs.reload} />}
        {procs.data && shop.length === 0 && (
          <p className="text-[13px] text-slate-400">
            No shop procedures {vehicle && scope === 'vehicle' ? 'for this vehicle ' : ''}yet. When you work out how to do a job on a vehicle — the trick to getting a part out, the order that works — write it up so the next tech has it.
          </p>
        )}
        <ul className="-mx-2 space-y-1">
          {shop.map((p) => (
            <li key={p.id}>
              <Link to={`/repair/p/${p.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                <Wrench className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-slate-100">{p.title}</span>
                  <span className="block text-xs text-slate-500">
                    {scopeLabel(p)} · {systemInfo(p.system).label}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tests and procedures (all vehicles)" aside={`${builtIn.length}`}>
        {builtIn.length === 0 && <p className="text-[13px] text-slate-400">Nothing matches that search.</p>}
        <ul className="-mx-2 space-y-1">
          {builtIn.map((a) => (
            <li key={a.slug}>
              <Link to={`/repair/a/${a.slug}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                <BookOpen className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-slate-100">{a.title}</span>
                  <span className="block text-xs text-slate-500">
                    {KIND_LABEL[a.kind]} · {systemInfo(a.system).label}
                    {a.minutes ? ` · about ${a.minutes} min` : ''}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Built-in article
// ---------------------------------------------------------------------------

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-[14px] leading-relaxed text-slate-200">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Steps({ steps }: { steps: { title?: string; detail: string }[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setDone((d) => {
      const n = new Set(d);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <button
            type="button"
            onClick={() => toggle(i)}
            aria-pressed={done.has(i)}
            aria-label={`Mark step ${i + 1} ${done.has(i) ? 'not done' : 'done'}`}
            className={cx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
              done.has(i) ? 'bg-emerald-500 text-white' : 'bg-brand/20 text-brand-soft hover:bg-brand/30'
            )}
          >
            {done.has(i) ? '✓' : i + 1}
          </button>
          <div className={cx('min-w-0 flex-1', done.has(i) && 'opacity-50')}>
            {s.title && <div className="text-[14px] font-semibold text-white">{s.title}</div>}
            <p className="prose-pre text-[14px] leading-relaxed text-slate-300">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ArticlePage({ slug }: { slug: string }) {
  const a: Article | undefined = ARTICLE_BY_SLUG.get(slug);
  if (!a) {
    return (
      <Page title="Article not found" back="/repair">
        <Empty title="That article does not exist." />
      </Page>
    );
  }
  return (
    <Page
      title={a.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="orange">{KIND_LABEL[a.kind]}</Badge>
          <Badge>{systemInfo(a.system).label}</Badge>
          {a.minutes && (
            <Badge>
              <Clock className="h-3 w-3" /> about {a.minutes} min
            </Badge>
          )}
        </span>
      }
      back="/repair"
      actions={<Button size="sm" onClick={() => window.print()} icon={<Printer className="h-3.5 w-3.5" />} aria-label="Print" />}
    >
      <p className="text-[15px] leading-relaxed text-slate-200">{a.summary}</p>
      {a.safety.length > 0 && (
        <div className="space-y-1.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-red-200">
            <ShieldAlert className="h-4 w-4" /> Safety
          </div>
          <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-red-100">
            {a.safety.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Use it when">
          <Bullets items={a.useWhen} />
        </Section>
        <Section title="Tools">
          <Bullets items={a.tools} />
        </Section>
      </div>
      <Section title="Steps" aside="Tap a number to tick it off">
        <Steps steps={a.steps.map((s) => ({ title: s.title, detail: s.detail }))} />
      </Section>
      {a.results && a.results.length > 0 && (
        <Section title="Reading the results">
          <div className="divide-y divide-white/5">
            {a.results.map((r) => (
              <div key={r.reading} className="grid gap-1 py-2 sm:grid-cols-[1fr_1.2fr] sm:gap-4">
                <div className="text-[14px] font-semibold text-white">{r.reading}</div>
                <div className="text-[14px] text-slate-300">{r.meaning}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section title="Look up for this vehicle">
        <Bullets items={a.lookUp} />
        <p className="text-[11px] text-slate-500">From the factory service information. Record what you find in Specs so the next tech does not have to look again.</p>
      </Section>
      {a.tips.length > 0 && (
        <Section title="Shop tips">
          <Bullets items={a.tips} />
        </Section>
      )}
      {a.codes && a.codes.length > 0 && (
        <Section title="Related codes">
          <div className="flex flex-wrap gap-2">
            {a.codes.map((c) => (
              <CodeChip key={c} code={c} />
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Shop procedure
// ---------------------------------------------------------------------------

export function ProcedurePage({ id }: { id: string }) {
  const staff = useStaff();
  const { vehicle } = useVehicle();
  const proc = useAsync(() => getProcedure(id), [id]);
  const [error, setError] = useState<string | null>(null);

  if (proc.loading) return <Loading />;
  if (proc.error) return <ErrorNote message={proc.error} onRetry={proc.reload} />;
  const p = proc.data;
  if (!p) {
    return (
      <Page title="Procedure not found" back="/repair">
        <Empty title="This procedure was deleted or the link is wrong." />
      </Page>
    );
  }
  const canEdit = p.created_by === staff.id || staff.role === 'admin';
  const fits = vehicle ? scopeFit(vehicle, p) : 0;

  const remove = async () => {
    if (!window.confirm(`Delete “${p.title}” for everyone?`)) return;
    try {
      await deleteProcedure(p.id);
      navigate('/repair', { replace: true });
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Page
      title={p.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="orange">Shop procedure</Badge>
          <Badge>{scopeLabel(p)}</Badge>
          <Badge>{systemInfo(p.system).label}</Badge>
        </span>
      }
      back="/repair"
      actions={
        <>
          <Button size="sm" onClick={() => window.print()} icon={<Printer className="h-3.5 w-3.5" />} aria-label="Print" />
          {canEdit && (
            <>
              <LinkButton to={`/repair/p/${p.id}/edit`} size="sm" icon={<Pencil className="h-3.5 w-3.5" />}>
                Edit
              </LinkButton>
              <Button size="sm" variant="danger" onClick={() => void remove()} icon={<Trash2 className="h-3.5 w-3.5" />} aria-label="Delete procedure" />
            </>
          )}
        </>
      }
    >
      {vehicle && fits == null && <Notice tone="amber">This procedure is written for {scopeLabel(p)}, not the {vehicleTitle(vehicle)} you have selected.</Notice>}
      {error && <ErrorNote message={error} />}
      {p.summary && <p className="prose-pre text-[15px] leading-relaxed text-slate-200">{p.summary}</p>}
      {p.warnings && (
        <div className="flex gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-[14px] text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="prose-pre">{p.warnings}</p>
        </div>
      )}
      {p.tools && (
        <Section title="Tools and parts">
          <p className="prose-pre text-[14px] text-slate-200">{p.tools}</p>
        </Section>
      )}
      {p.steps.length > 0 && (
        <Section title="Steps" aside="Tap a number to tick it off">
          <Steps steps={p.steps.map((s) => ({ detail: s.text }))} />
        </Section>
      )}
      {p.specs.length > 0 && (
        <Section title="Specs used">
          <dl className="divide-y divide-white/5">
            {p.specs.map((s) => (
              <div key={s.label} className="flex justify-between gap-4 py-2 text-[14px]">
                <dt className="text-slate-400">{s.label}</dt>
                <dd className="text-right font-semibold text-white">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      {p.notes && (
        <Section title="Notes">
          <p className="prose-pre text-[14px] leading-relaxed text-slate-200">{p.notes}</p>
        </Section>
      )}
      <p className="text-xs text-slate-500">
        Written by {p.author ?? 'a tech'} on {shortDate(p.created_at)}
        {p.updated_at.slice(0, 16) !== p.created_at.slice(0, 16) ? ` · last edited by ${p.editor ?? 'a tech'} on ${shortDate(p.updated_at)}` : ''}
      </p>
    </Page>
  );
}

function ProcedureForm({ initial, onSave, saveLabel }: { initial: ProcedureInput; onSave: (p: ProcedureInput) => Promise<void>; saveLabel: string }) {
  const [p, setP] = useState<ProcedureInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ProcedureInput>(k: K, v: ProcedureInput[K]) => setP((x) => ({ ...x, [k]: v }));

  const setStep = (i: number, v: string) => set('steps', p.steps.map((s, j) => (j === i ? v : s)));
  const setSpec = (i: number, k: keyof ProcedureSpec, v: string) => set('specs', p.specs.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(p);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-3">
        <Field label="Title">
          <Input value={p.title} onChange={(e) => set('title', e.target.value)} placeholder="Rear brake pads with electronic parking brake" required />
        </Field>
        <Field label="System">
          <Select value={p.system} onChange={(e) => set('system', e.target.value)}>
            {SYSTEMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-200">Applies to</h2>
          <p className="text-xs text-slate-500">Leave make blank for a procedure that works on any vehicle. Narrow it with model, years and engine.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Make">
            <Input value={p.make} onChange={(e) => set('make', e.target.value)} placeholder="Any" />
          </Field>
          <Field label="Model">
            <Input value={p.model} onChange={(e) => set('model', e.target.value)} placeholder="Any" />
          </Field>
          <Field label="From year">
            <Input value={p.yearFrom} onChange={(e) => set('yearFrom', e.target.value)} inputMode="numeric" maxLength={4} placeholder="2015" />
          </Field>
          <Field label="To year">
            <Input value={p.yearTo} onChange={(e) => set('yearTo', e.target.value)} inputMode="numeric" maxLength={4} placeholder="2020" />
          </Field>
        </div>
        <Field label="Engine (optional)">
          <Input value={p.engine} onChange={(e) => set('engine', e.target.value)} placeholder="3.5L V6 Turbo" />
        </Field>
      </Card>

      <Card className="space-y-3">
        <Field label="Summary">
          <Textarea value={p.summary} onChange={(e) => set('summary', e.target.value)} rows={2} placeholder="What the job is and when you need it" />
        </Field>
        <Field label="Warnings">
          <Textarea value={p.warnings} onChange={(e) => set('warnings', e.target.value)} rows={2} placeholder="Things that break, single-use bolts, safety" />
        </Field>
        <Field label="Tools and parts">
          <Textarea value={p.tools} onChange={(e) => set('tools', e.target.value)} rows={2} placeholder="10 mm swivel socket, scan tool for EPB service mode" />
        </Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-200">Steps</h2>
        {p.steps.map((s, i) => (
          <div key={i} className="flex gap-2">
            <span className="mt-2.5 w-6 shrink-0 text-right font-mono text-xs text-slate-500">{i + 1}</span>
            <Textarea value={s} onChange={(e) => setStep(i, e.target.value)} rows={2} className="flex-1" />
            <button
              type="button"
              onClick={() => set('steps', p.steps.filter((_, j) => j !== i))}
              className="h-10 w-10 shrink-0 rounded-lg text-slate-500 hover:bg-white/5 hover:text-red-300"
              aria-label={`Remove step ${i + 1}`}
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
        ))}
        <Button size="sm" onClick={() => set('steps', [...p.steps, ''])} icon={<Plus className="h-3.5 w-3.5" />}>
          Add step
        </Button>
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-200">Specs used</h2>
          <p className="text-xs text-slate-500">Torque values and capacities from the service information, with units.</p>
        </div>
        {p.specs.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input value={s.label} onChange={(e) => setSpec(i, 'label', e.target.value)} placeholder="Caliper bracket bolts" aria-label="Spec" />
            <Input value={s.value} onChange={(e) => setSpec(i, 'value', e.target.value)} placeholder="Value with unit" aria-label="Value" />
            <button
              type="button"
              onClick={() => set('specs', p.specs.filter((_, j) => j !== i))}
              className="h-11 w-10 rounded-lg text-slate-500 hover:bg-white/5 hover:text-red-300"
              aria-label="Remove spec"
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
        ))}
        <Button size="sm" onClick={() => set('specs', [...p.specs, { label: '', value: '' }])} icon={<Plus className="h-3.5 w-3.5" />}>
          Add spec
        </Button>
      </Card>

      <Card>
        <Field label="Notes">
          <Textarea value={p.notes} onChange={(e) => set('notes', e.target.value)} rows={4} placeholder="Anything else: part numbers, gotchas, what you would do differently" />
        </Field>
      </Card>

      {error && <ErrorNote message={error} />}
      <Button type="submit" variant="primary" loading={busy} icon={<ListChecks className="h-4 w-4" />} className="w-full sm:w-auto">
        {saveLabel}
      </Button>
    </form>
  );
}

function inputFromProcedure(p: Procedure): ProcedureInput {
  return {
    title: p.title,
    system: p.system,
    make: p.make ?? '',
    model: p.model ?? '',
    engine: p.engine ?? '',
    yearFrom: p.year_from ? String(p.year_from) : '',
    yearTo: p.year_to ? String(p.year_to) : '',
    summary: p.summary ?? '',
    tools: p.tools ?? '',
    warnings: p.warnings ?? '',
    steps: p.steps.length ? p.steps.map((s) => s.text) : [''],
    specs: p.specs,
    notes: p.notes ?? '',
  };
}

export function ProcedureNewPage() {
  const { vehicle } = useVehicle();
  const initial: ProcedureInput = {
    title: '',
    system: 'maintenance',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    engine: '',
    yearFrom: vehicle?.year ?? '',
    yearTo: vehicle?.year ?? '',
    summary: '',
    tools: '',
    warnings: '',
    steps: ['', '', ''],
    specs: [],
    notes: '',
  };
  return (
    <Page title="Write a shop procedure" subtitle="How this shop does a job — the steps, the tricks and the specs." back="/repair">
      <ProcedureForm
        initial={initial}
        saveLabel="Save procedure"
        onSave={async (input) => {
          const id = await createProcedure(input);
          navigate(`/repair/p/${id}`, { replace: true });
        }}
      />
    </Page>
  );
}

export function ProcedureEditPage({ id }: { id: string }) {
  const proc = useAsync(() => getProcedure(id), [id]);
  if (proc.loading) return <Loading />;
  if (proc.error) return <ErrorNote message={proc.error} onRetry={proc.reload} />;
  if (!proc.data) return <ErrorNote message="This procedure was deleted." />;
  return (
    <Page title="Edit procedure" back={`/repair/p/${id}`}>
      <ProcedureForm
        initial={inputFromProcedure(proc.data)}
        saveLabel="Save changes"
        onSave={async (input) => {
          await updateProcedure(id, input);
          navigate(`/repair/p/${id}`, { replace: true });
        }}
      />
    </Page>
  );
}
