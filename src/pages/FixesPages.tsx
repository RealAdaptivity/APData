import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock, Pencil, Plus, Search, ThumbsUp, Trash2, Undo2, Wrench } from 'lucide-react';
import { useAsync } from '../lib/useAsync';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { rankFixes, timesFixed, type RankedFix } from '../lib/fixRank';
import { normalizeCode, parseCodes } from '../lib/dtc';
import { errorText } from '../lib/errors';
import { matchVehicle, sameModel, vehicleTitle, vehicleSubtitle, type Vehicle } from '../lib/vehicle';
import { Link, navigate, type Route } from '../lib/router';
import {
  confirmFix,
  createFix,
  deleteFix,
  fixesForCode,
  fixesNearVehicle,
  getFix,
  recentFixes,
  searchFixes,
  unconfirmFix,
  updateFix,
  type Fix,
  type FixInput,
} from '../api/fixes';
import { SYSTEMS, systemInfo } from '../data/systems';
import { lookupCode } from '../lib/dtc';
import { FixCard } from '../components/FixCard';
import { useJob } from '../lib/jobStore';
import { jobMatchesVehicle } from '../lib/jobLink';
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
  shortDate,
} from '../components/ui';

// ---------------------------------------------------------------------------
// Search / browse
// ---------------------------------------------------------------------------

async function loadFixes(codes: string[], q: string, vehicle: Vehicle | null): Promise<Fix[]> {
  if (codes.length) {
    const lists = await Promise.all(codes.map((c) => fixesForCode(c)));
    const byId = new Map<string, Fix>();
    for (const l of lists) for (const f of l) byId.set(f.id, f);
    let all = [...byId.values()];
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (words.length) {
      const hit = (f: Fix) => words.some((w) => `${f.symptom} ${f.root_cause} ${f.fix}`.toLowerCase().includes(w));
      all = [...all.filter(hit), ...all.filter((f) => !hit(f))];
    }
    return all;
  }
  if (q.trim()) return searchFixes(q);
  if (vehicle) return fixesNearVehicle(vehicle);
  return recentFixes(40);
}

export function FixesPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  const codesParam = route.query.get('codes') ?? '';
  const qParam = route.query.get('q') ?? '';
  const codes = useMemo(() => parseCodes(codesParam), [codesParam]);
  const [codesText, setCodesText] = useState(codes.join(' '));
  const [text, setText] = useState(qParam);

  const result = useAsync(() => loadFixes(codes, qParam, vehicle), [codes.join(','), qParam, vehicle ? `${vehicle.year}|${vehicle.make}|${vehicle.model}|${vehicle.engine ?? ''}` : '']);

  const ranked = useMemo<RankedFix<Fix>[]>(
    () => (result.data ? rankFixes(result.data, vehicle, { codes, includeOtherMakes: codes.length > 0 || !!qParam || !vehicle }) : []),
    [result.data, vehicle, codes, qParam]
  );
  const close = ranked.filter((r) => r.match && r.match.tier !== 'make');
  const other = ranked.filter((r) => !r.match || r.match.tier === 'make');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = parseCodes(codesText);
    const params = new URLSearchParams();
    if (c.length) params.set('codes', c.join(','));
    if (text.trim()) params.set('q', text.trim());
    navigate(`/fixes${params.toString() ? `?${params}` : ''}`);
  };

  const searching = codes.length > 0 || !!qParam;
  const heading = codes.length
    ? `Fixes with ${codes.join(', ')}`
    : qParam
      ? `Fixes matching “${qParam}”`
      : vehicle
        ? `Fixes on ${vehicleTitle(vehicle)} and similar`
        : 'Latest confirmed fixes';

  return (
    <Page
      title="Confirmed fixes"
      subtitle="What fixed it, from techs in this shop — ranked by how close the vehicle is and how many techs it worked for."
      actions={
        <LinkButton to={`/fixes/new${codes.length ? `?codes=${codes.join(',')}` : ''}`} variant="primary" icon={<Plus className="h-4 w-4" />}>
          <span className="hidden sm:inline">Add fix</span>
        </LinkButton>
      }
    >
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]" role="search">
        <Input
          value={codesText}
          onChange={(e) => setCodesText(e.target.value.toUpperCase())}
          placeholder="Codes: P0301 P0171"
          className="font-mono"
          aria-label="Trouble codes"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Symptom or part: hard start hot, coil boot" aria-label="Symptom" />
        <Button type="submit" variant="primary" icon={<Search className="h-4 w-4" />}>
          Search
        </Button>
      </form>

      {result.loading && <Loading label="Looking through shop fixes…" />}
      {result.error && <ErrorNote message={result.error} onRetry={result.reload} />}

      {result.data && ranked.length === 0 && (
        <Empty
          icon={<ThumbsUp className="h-8 w-8" />}
          title={searching ? 'No confirmed fixes match yet' : 'No confirmed fixes yet'}
          action={
            <LinkButton to={`/fixes/new${codes.length ? `?codes=${codes.join(',')}` : ''}`} variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add the first one
            </LinkButton>
          }
        >
          Every fix a tech records here helps the next one. Add the vehicle, the codes, what you tested, what was wrong and what fixed it.
          {codes.length > 0 && (
            <span className="mt-3 flex flex-wrap justify-center gap-2">
              {codes.map((c) => (
                <CodeChip key={c} code={c} />
              ))}
            </span>
          )}
        </Empty>
      )}

      {close.length > 0 && (
        <Section title={vehicle ? `${heading}` : heading} aside={`${close.length}`}>
          <div className="space-y-3">
            {close.map((r) => (
              <FixCard key={r.fix.id} fix={r.fix} match={r.match} highlightCodes={codes} />
            ))}
          </div>
        </Section>
      )}
      {other.length > 0 && (
        <Section title={close.length || vehicle ? 'Other vehicles' : heading} aside={`${other.length}`}>
          <div className="space-y-3">
            {other.slice(0, 60).map((r) => (
              <FixCard key={r.fix.id} fix={r.fix} match={r.match} highlightCodes={codes} />
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// One fix
// ---------------------------------------------------------------------------

function Block({ title, children, tone }: { title: string; children: string | null; tone?: 'green' | 'amber' }) {
  if (!children) return null;
  return (
    <div
      className={
        tone === 'green'
          ? 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3'
          : tone === 'amber'
            ? 'rounded-xl border border-amber-500/30 bg-amber-500/10 p-3'
            : 'rounded-xl border border-white/10 bg-ink/40 p-3'
      }
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <p className="prose-pre text-[14px] leading-relaxed text-slate-100">{children}</p>
    </div>
  );
}

export function FixDetailPage({ id }: { id: string }) {
  const staff = useStaff();
  const { vehicle } = useVehicle();
  const fix = useAsync(() => getFix(id), [id]);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (fix.loading) return <Loading />;
  if (fix.error) return <ErrorNote message={fix.error} onRetry={fix.reload} />;
  const f = fix.data;
  if (!f) {
    return (
      <Page title="Fix not found" back="/fixes">
        <Empty title="This fix was deleted or the link is wrong." />
      </Page>
    );
  }

  const mine = f.created_by === staff.id;
  const canEdit = mine || staff.role === 'admin';
  const iConfirmed = f.confirmations.some((c) => c.user_id === staff.id);
  const match = vehicle ? matchVehicle(vehicle, f) : null;
  const n = timesFixed(f);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setConfirming(false);
      setNote('');
      fix.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this confirmed fix for everyone?')) return;
    setBusy(true);
    try {
      await deleteFix(f.id);
      navigate('/fixes', { replace: true });
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const vinForConfirm = vehicle?.vin && match && (match.tier === 'exact' || match.tier === 'near' || sameModel(vehicle.model, f.model)) ? vehicle.vin : undefined;

  return (
    <Page
      title={f.symptom}
      subtitle={`${f.model_year} ${f.make} ${f.model}${f.engine ? ` · ${f.engine}` : ''}${f.mileage ? ` · ${f.mileage.toLocaleString()} mi` : ''}`}
      back="/fixes"
      actions={
        canEdit && (
          <>
            <LinkButton to={`/fixes/${f.id}/edit`} size="sm" icon={<Pencil className="h-3.5 w-3.5" />}>
              Edit
            </LinkButton>
            <Button size="sm" variant="danger" onClick={() => void remove()} disabled={busy} icon={<Trash2 className="h-3.5 w-3.5" />} aria-label="Delete fix" />
          </>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={n > 1 ? 'green' : 'slate'}>
          <ThumbsUp className="h-3 w-3" /> Fixed {n} {n === 1 ? 'vehicle' : 'vehicles'}
        </Badge>
        {match && <Badge tone={match.tier === 'exact' ? 'green' : 'orange'}>{match.label}</Badge>}
        <Badge>{systemInfo(f.system).label}</Badge>
        {f.labor_hours != null && (
          <Badge>
            <Clock className="h-3 w-3" /> {f.labor_hours} h
          </Badge>
        )}
      </div>

      {f.dtc_codes.length > 0 && (
        <Card className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Codes</div>
          <ul className="space-y-1.5">
            {f.dtc_codes.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <CodeChip code={c} />
                <span className="text-[13px] text-slate-300">{lookupCode(c)?.title ?? ''}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        <Block title="Tests performed">{f.tests_performed}</Block>
        <Block title="Root cause" tone="amber">
          {f.root_cause}
        </Block>
        <Block title="Fix" tone="green">
          {f.fix}
        </Block>
        <Block title="Parts">{f.parts}</Block>
      </div>

      <p className="text-xs text-slate-500">
        Added by {f.author ?? 'a tech'} on {shortDate(f.created_at)}
        {f.updated_at.slice(0, 16) !== f.created_at.slice(0, 16) ? ` · edited ${shortDate(f.updated_at)}` : ''}
        {f.vin ? ` · VIN ${f.vin}` : ''}
      </p>

      <Section title="Did this fix yours too?" aside={f.confirmations.length ? `${f.confirmations.length} confirmation${f.confirmations.length === 1 ? '' : 's'}` : undefined}>
        {mine ? (
          <p className="text-[13px] text-slate-400">This is your fix. Other techs confirm it when it fixes their vehicle too — that is what ranks it.</p>
        ) : iConfirmed ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> You confirmed this fix
            </span>
            <Button size="sm" variant="ghost" loading={busy} onClick={() => void act(() => unconfirmFix(f.id))} icon={<Undo2 className="h-3.5 w-3.5" />}>
              Undo
            </Button>
          </div>
        ) : confirming ? (
          <div className="space-y-3">
            <Field label="Anything different on yours? (optional)">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Same coil boot, but also had a cracked intake boot" />
            </Field>
            <div className="flex gap-2">
              <Button variant="primary" loading={busy} onClick={() => void act(() => confirmFix(f.id, note, vinForConfirm))} icon={<ThumbsUp className="h-4 w-4" />}>
                Confirm fix
              </Button>
              <Button onClick={() => setConfirming(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="primary" onClick={() => setConfirming(true)} icon={<ThumbsUp className="h-4 w-4" />}>
            This fixed mine too
          </Button>
        )}
        {error && <ErrorNote message={error} />}
        {f.confirmations.length > 0 && (
          <ul className="divide-y divide-white/5">
            {f.confirmations.map((c) => (
              <li key={c.user_id} className="py-2 text-[13px]">
                <span className="font-semibold text-slate-200">{c.name ?? 'A tech'}</span>
                <span className="text-slate-500"> · {shortDate(c.created_at)}</span>
                {c.note && <p className="prose-pre text-slate-300">{c.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Add / edit
// ---------------------------------------------------------------------------

function blankInput(v: Vehicle | null, codes: string[]): FixInput {
  return {
    vehicle: v ?? { year: '', make: '', model: '' },
    mileage: '',
    system: 'driveability',
    codes,
    symptom: '',
    tests: '',
    rootCause: '',
    fix: '',
    parts: '',
    laborHours: '',
  };
}

function inputFromFix(f: Fix): FixInput {
  return {
    vehicle: { year: String(f.model_year), make: f.make, model: f.model, engine: f.engine ?? undefined, vin: f.vin ?? undefined },
    mileage: f.mileage != null ? String(f.mileage) : '',
    system: f.system,
    codes: f.dtc_codes,
    symptom: f.symptom,
    tests: f.tests_performed ?? '',
    rootCause: f.root_cause,
    fix: f.fix,
    parts: f.parts ?? '',
    laborHours: f.labor_hours != null ? String(f.labor_hours) : '',
  };
}

function FixForm({ initial, onSave, saveLabel, lockVehicle }: { initial: FixInput; onSave: (f: FixInput) => Promise<void>; saveLabel: string; lockVehicle: boolean }) {
  const [f, setF] = useState<FixInput>(initial);
  const [codesText, setCodesText] = useState(initial.codes.join(' '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FixInput>(k: K, v: FixInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const setV = (k: keyof Vehicle, v: string) => setF((x) => ({ ...x, vehicle: { ...x.vehicle, [k]: v } }));
  const parsed = parseCodes(codesText);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...f, codes: parsed });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-200">Vehicle</h2>
          {lockVehicle && (
            <Link to="/vehicle" className="text-xs font-semibold text-brand-soft">
              Change vehicle
            </Link>
          )}
        </div>
        {lockVehicle ? (
          <div>
            <div className="text-sm font-semibold text-white">{vehicleTitle(f.vehicle)}</div>
            <div className="text-xs text-slate-400">{[vehicleSubtitle(f.vehicle), f.vehicle.vin].filter(Boolean).join(' · ')}</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Year">
              <Input value={f.vehicle.year} onChange={(e) => setV('year', e.target.value)} inputMode="numeric" maxLength={4} />
            </Field>
            <Field label="Make">
              <Input value={f.vehicle.make} onChange={(e) => setV('make', e.target.value)} />
            </Field>
            <Field label="Model">
              <Input value={f.vehicle.model} onChange={(e) => setV('model', e.target.value)} />
            </Field>
            <Field label="Engine">
              <Input value={f.vehicle.engine ?? ''} onChange={(e) => setV('engine', e.target.value)} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mileage">
            <Input value={f.mileage} onChange={(e) => set('mileage', e.target.value)} inputMode="numeric" placeholder="128000" />
          </Field>
          <Field label="System">
            <Select value={f.system} onChange={(e) => set('system', e.target.value)}>
              {SYSTEMS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <Field label="Trouble codes" hint={parsed.length ? `Saved as: ${parsed.join(', ')}` : 'Type or paste them; leave blank if there were none.'}>
          <Input value={codesText} onChange={(e) => setCodesText(e.target.value.toUpperCase())} className="font-mono" placeholder="P0302 P0300" spellCheck={false} />
        </Field>
        <Field label="Symptom / customer concern">
          <Textarea value={f.symptom} onChange={(e) => set('symptom', e.target.value)} rows={2} placeholder="Misfire under load, flashing MIL going uphill" required />
        </Field>
        <Field label="What you tested" hint="The checks that led you to the cause — the most useful part for the next tech.">
          <Textarea value={f.tests} onChange={(e) => set('tests', e.target.value)} rows={3} placeholder="Swapped coil 2 to 4, misfire followed the coil. Plug OK. Compression 165 all." />
        </Field>
        <Field label="Root cause">
          <Textarea value={f.rootCause} onChange={(e) => set('rootCause', e.target.value)} rows={2} placeholder="Cracked coil boot on cylinder 2 arcing to the head" required />
        </Field>
        <Field label="Fix">
          <Textarea value={f.fix} onChange={(e) => set('fix', e.target.value)} rows={2} placeholder="Replaced cylinder 2 coil and plug" required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="Parts" hint="Brand and part number if you have them.">
            <Input value={f.parts} onChange={(e) => set('parts', e.target.value)} placeholder="Motorcraft DG-549, SP-534" />
          </Field>
          <Field label="Labor hours">
            <Input value={f.laborHours} onChange={(e) => set('laborHours', e.target.value)} inputMode="decimal" placeholder="1.2" />
          </Field>
        </div>
      </Card>

      {error && <ErrorNote message={error} />}
      <Button type="submit" variant="primary" loading={busy} icon={<Wrench className="h-4 w-4" />} className="w-full sm:w-auto">
        {saveLabel}
      </Button>
    </form>
  );
}

export function FixNewPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  const job = useJob();
  const forJob = job && vehicle && jobMatchesVehicle(job, vehicle) ? job : null;
  const codes = [...new Set([...parseCodes(route.query.get('codes') ?? ''), ...(forJob?.codes ?? [])])].filter((c) => normalizeCode(c));
  if (!vehicle) {
    return (
      <Page title="Add a confirmed fix" back="/fixes">
        <Empty title="Choose the vehicle first" action={<LinkButton to="/vehicle" variant="primary">Choose vehicle</LinkButton>}>
          A fix is recorded against the vehicle it was done on, so it ranks for the same year, make and model next time.
        </Empty>
      </Page>
    );
  }
  return (
    <Page title="Add a confirmed fix" subtitle="Only add fixes that you verified fixed the problem." back="/fixes">
      <Notice>Write it for the next tech: what you saw, what you tested, what was really wrong, and what fixed it.</Notice>
      {forJob && <Notice tone="blue">Saved with job {forJob.ref}, so it shows on that job in the Adaptivity app.</Notice>}
      <FixForm
        key={vehicle.year + vehicle.make + vehicle.model}
        initial={{ ...blankInput(vehicle, codes), symptom: forJob?.issue ?? '' }}
        lockVehicle
        saveLabel="Save fix"
        onSave={async (input) => {
          const id = await createFix({ ...input, vehicle, jobRef: forJob?.ref ?? null });
          navigate(`/fixes/${id}`, { replace: true });
        }}
      />
    </Page>
  );
}

export function FixEditPage({ id }: { id: string }) {
  const fix = useAsync(() => getFix(id), [id]);
  if (fix.loading) return <Loading />;
  if (fix.error) return <ErrorNote message={fix.error} onRetry={fix.reload} />;
  if (!fix.data) return <ErrorNote message="This fix was deleted." />;
  return (
    <Page title="Edit fix" back={`/fixes/${id}`}>
      <FixForm
        initial={inputFromFix(fix.data)}
        lockVehicle={false}
        saveLabel="Save changes"
        onSave={async (input) => {
          await updateFix(id, input);
          navigate(`/fixes/${id}`, { replace: true });
        }}
      />
    </Page>
  );
}
