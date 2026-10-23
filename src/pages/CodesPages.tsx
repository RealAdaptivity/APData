import { useMemo, useState, type FormEvent } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Pencil, Plus, ScanLine, Search, ThumbsUp, Trash2 } from 'lucide-react';
import { CODE_RANGES, describeCode, lookupCode, normalizeCode, parseCodes, searchCodes } from '../lib/dtc';
import { DTC_ENTRIES, SEVERITY_LABEL, type DtcEntry, type Severity } from '../data/dtcLibrary';
import { ARTICLE_BY_SLUG } from '../data/articles';
import { systemInfo } from '../data/systems';
import { useAsync } from '../lib/useAsync';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { rankFixes } from '../lib/fixRank';
import { errorText } from '../lib/errors';
import { Link, navigate } from '../lib/router';
import { fixesForCode } from '../api/fixes';
import { deleteShopDefinition, saveShopDefinition, searchShopDefinitions, shopDefinitions, type ShopCode } from '../api/codes';
import { FixCard } from '../components/FixCard';
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
  Textarea,
  cx,
} from '../components/ui';

const SEVERITY_TONE: Record<Severity, 'slate' | 'amber' | 'orange' | 'red'> = {
  low: 'slate',
  medium: 'amber',
  high: 'orange',
  critical: 'red',
};

function CodeRow({ e }: { e: DtcEntry }) {
  return (
    <li>
      <Link to={`/codes/${e.code}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5">
        <span className="w-14 shrink-0 font-mono text-sm font-bold text-brand-soft">{e.code}</span>
        <span className="min-w-0 flex-1 text-[13px] leading-snug text-slate-200">{e.title}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
      </Link>
    </li>
  );
}

export function CodesPage() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const query = q.trim();
  const results = useMemo(() => searchCodes(query), [query]);
  const pasted = useMemo(() => parseCodes(query), [query]);
  const exact = normalizeCode(query);
  const shop = useAsync(() => (query.length >= 2 ? searchShopDefinitions(query) : Promise.resolve([] as ShopCode[])), [query]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (exact) navigate(`/codes/${exact}`);
    else if (pasted.length === 1) navigate(`/codes/${pasted[0]}`);
  };

  return (
    <Page title="Trouble codes" subtitle={`${DTC_ENTRIES.length} generic OBD-II codes with causes and test steps, plus the shop’s own code book for manufacturer codes.`}>
      <form onSubmit={submit} role="search">
        <label className="relative block">
          <span className="sr-only">Search codes</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="P0420, P03, “evap leak”, “misfire”…"
            className="pl-9 font-mono"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </label>
      </form>

      {query ? (
        <div className="space-y-4">
          {pasted.length > 1 && (
            <Card className="space-y-2">
              <div className="text-sm font-semibold text-white">{pasted.length} codes found in what you typed</div>
              <div className="flex flex-wrap gap-2">
                {pasted.map((c) => (
                  <CodeChip key={c} code={c} />
                ))}
              </div>
              <LinkButton to={`/fixes?codes=${pasted.join(',')}`} size="sm" variant="primary" icon={<ThumbsUp className="h-3.5 w-3.5" />}>
                Find fixes with these codes
              </LinkButton>
            </Card>
          )}
          {exact && !lookupCode(exact) && (
            <Link to={`/codes/${exact}`} className="block rounded-2xl border border-white/10 bg-panel p-4 hover:bg-panel-2">
              <div className="font-mono text-lg font-bold text-brand-soft">{exact}</div>
              <div className="text-[13px] text-slate-300">{describeCode(exact)?.scopeText}</div>
              <div className="mt-1 text-xs font-semibold text-brand-soft">Open code page →</div>
            </Link>
          )}
          {(shop.data?.length ?? 0) > 0 && (
            <Section title="Shop code book">
              <ul className="-mx-3 divide-y divide-white/5">
                {shop.data!.map((d) => (
                  <li key={d.id}>
                    <Link to={`/codes/${d.code}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5">
                      <span className="w-14 shrink-0 font-mono text-sm font-bold text-brand-soft">{d.code}</span>
                      <span className="min-w-0 flex-1 text-[13px] text-slate-200">
                        {d.title}
                        {d.make && <span className="text-slate-500"> · {d.make}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {results.length > 0 ? (
            <Section title="Code library" aside={`${results.length} match${results.length === 1 ? '' : 'es'}`}>
              <ul className="-mx-3 divide-y divide-white/5">
                {results.map((e) => (
                  <CodeRow key={e.code} e={e} />
                ))}
              </ul>
            </Section>
          ) : (
            !exact &&
            pasted.length === 0 &&
            !(shop.data?.length ?? 0) && (
              <Empty icon={<ScanLine className="h-8 w-8" />} title="No codes match">
                Try a full code (P0301), a code family (P03) or a word from the description (misfire, EVAP, throttle).
              </Empty>
            )
          )}
        </div>
      ) : (
        <Card className="divide-y divide-white/5 p-0">
          {CODE_RANGES.map((r) => {
            const list = DTC_ENTRIES.filter((e) => e.code.startsWith(r.prefix));
            if (!list.length) return null;
            const isOpen = open === r.prefix;
            return (
              <div key={r.prefix}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : r.prefix)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5"
                >
                  <span className="text-[13px] font-semibold text-slate-200">{r.label}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    {list.length}
                    <ChevronDown className={cx('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </span>
                </button>
                {isOpen && (
                  <ul className="divide-y divide-white/5 border-t border-white/5 bg-ink/40">
                    {list.map((e) => (
                      <CodeRow key={e.code} e={e} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </Page>
  );
}

function ShopCodeBook({ code, defaultMake }: { code: string; defaultMake: string }) {
  const staff = useStaff();
  const list = useAsync(() => shopDefinitions(code), [code]);
  const [editing, setEditing] = useState<ShopCode | 'new' | null>(null);
  const [make, setMake] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = (d: ShopCode | 'new') => {
    setEditing(d);
    setError(null);
    setMake(d === 'new' ? defaultMake : (d.make ?? ''));
    setTitle(d === 'new' ? '' : d.title);
    setNotes(d === 'new' ? '' : (d.notes ?? ''));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveShopDefinition({ id: editing && editing !== 'new' ? editing.id : undefined, code, make, title, notes });
      setEditing(null);
      list.reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: ShopCode) => {
    if (!window.confirm(`Delete the code book entry for ${d.code}${d.make ? ` (${d.make})` : ''}?`)) return;
    try {
      await deleteShopDefinition(d.id);
      list.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Section
      title="Shop code book"
      aside={
        !editing && (
          <Button size="sm" onClick={() => start('new')} icon={<Plus className="h-3.5 w-3.5" />}>
            Add meaning
          </Button>
        )
      }
    >
      {list.loading && <Loading />}
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && list.data.length === 0 && !editing && (
        <p className="text-[13px] text-slate-400">No shop entry yet. If this code means something specific on a make, add it so the next tech has it.</p>
      )}
      {list.data?.map((d) => (
        <div key={d.id} className="rounded-xl border border-white/10 bg-ink/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-white">{d.title}</div>
              <div className="text-xs text-slate-500">
                {d.make ? `On ${d.make}` : 'All makes'} · {d.author ?? 'A tech'}
              </div>
            </div>
            {(d.created_by === staff.id || staff.role === 'admin') && (
              <div className="flex gap-1">
                <button type="button" onClick={() => start(d)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => void remove(d)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-red-300" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {d.notes && <p className="prose-pre mt-2 text-[13px] text-slate-300">{d.notes}</p>}
        </div>
      ))}
      {editing && (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-3">
          <Field label="Make" hint="Leave blank if it means the same on every make.">
            <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Ford" />
          </Field>
          <Field label="What it means">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Description from the factory service information" required />
          </Field>
          <Field label="Notes (optional)" hint="Common causes, test tips, part numbers.">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
          {error && <ErrorNote message={error} />}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={busy}>
              Save
            </Button>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      )}
      {error && !editing && <ErrorNote message={error} />}
    </Section>
  );
}

function FixesForCode({ code }: { code: string }) {
  const { vehicle } = useVehicle();
  const fixes = useAsync(() => fixesForCode(code), [code]);
  const ranked = useMemo(
    () => (fixes.data ? rankFixes(fixes.data, vehicle, { codes: [code], includeOtherMakes: true }) : []),
    [fixes.data, vehicle, code]
  );
  return (
    <Section
      title="Confirmed fixes for this code"
      aside={
        <LinkButton to={`/fixes/new?codes=${code}`} size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
          Add fix
        </LinkButton>
      }
    >
      {fixes.loading && <Loading />}
      {fixes.error && <ErrorNote message={fixes.error} onRetry={fixes.reload} />}
      {fixes.data && ranked.length === 0 && (
        <p className="text-[13px] text-slate-400">No confirmed fixes with {code} yet. When you fix one, add it — it ranks for the next tech with the same code.</p>
      )}
      <div className="space-y-3">
        {ranked.slice(0, 10).map((r) => (
          <FixCard key={r.fix.id} fix={r.fix} match={r.match} highlightCodes={[code]} />
        ))}
      </div>
      {ranked.length > 10 && (
        <LinkButton to={`/fixes?codes=${code}`} size="sm">
          All {ranked.length} fixes
        </LinkButton>
      )}
    </Section>
  );
}

export function CodeDetailPage({ code: raw }: { code: string }) {
  const { vehicle } = useVehicle();
  const code = normalizeCode(raw);
  if (!code) {
    return (
      <Page title="Not a trouble code" back="/codes">
        <ErrorNote message={`“${raw}” is not a trouble code. Codes look like P0301, B1318, C0035 or U0100.`} />
      </Page>
    );
  }
  const entry = lookupCode(code);
  const structure = describeCode(code)!;
  const articles = (entry?.articles ?? []).map((s) => ARTICLE_BY_SLUG.get(s)).filter(Boolean);

  return (
    <Page
      title={
        <span>
          <span className="font-mono text-brand">{code}</span>
          {entry && <span className="mt-1 block text-base font-semibold leading-snug text-white sm:text-lg">{entry.title}</span>}
        </span>
      }
      back="/codes"
    >
      <div className="flex flex-wrap gap-2">
        {entry && <Badge tone={SEVERITY_TONE[entry.severity]}>{SEVERITY_LABEL[entry.severity]}</Badge>}
        {entry && <Badge>{systemInfo(entry.system).label}</Badge>}
        <Badge tone={structure.scope === 'generic' ? 'blue' : 'amber'}>{structure.scope === 'generic' ? 'Generic code' : 'Manufacturer code'}</Badge>
      </div>

      {entry?.varies && (
        <Notice tone="amber">This code’s meaning differs between manufacturers. Confirm it in the factory service information for the make, and record it in the shop code book below.</Notice>
      )}

      {entry ? (
        <>
          <Section title="What it means">
            <p className="text-[15px] leading-relaxed text-slate-200">{entry.meaning}</p>
            {entry.symptoms.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Symptoms</div>
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-slate-300">
                  {entry.symptoms.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
          <Section title="Common causes" aside="Most likely first">
            <ol className="space-y-1.5 text-[14px] text-slate-200">
              {entry.causes.map((c, i) => (
                <li key={c} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right font-mono text-xs leading-6 text-slate-500">{i + 1}</span>
                  <span>{c}</span>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Diagnose it" aside="Quick and cheap checks first">
            <ol className="space-y-3">
              {entry.checks.map((c, i) => (
                <li key={c} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand-soft">{i + 1}</span>
                  <span className="text-[14px] leading-relaxed text-slate-200">{c}</span>
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-slate-500">Test values, pin numbers and the factory test tree come from the service information for the vehicle.</p>
          </Section>
        </>
      ) : (
        <Section title="About this code">
          <dl className="space-y-2 text-[14px]">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">System</dt>
              <dd className="text-slate-200">{structure.area}</dd>
            </div>
            {structure.group && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Usual group</dt>
                <dd className="text-slate-200">{structure.group}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Scope</dt>
              <dd className="text-slate-200">{structure.scopeText}</dd>
            </div>
          </dl>
          {structure.scope === 'generic' && (
            <p className="text-[13px] text-slate-400">This generic code is not in AP Data’s library yet. Check the service information, then add what you learn to the shop code book.</p>
          )}
        </Section>
      )}

      {articles.length > 0 && (
        <Section title="How-to articles">
          <ul className="-mx-2 space-y-1">
            {articles.map((a) => (
              <li key={a!.slug}>
                <Link to={`/repair/a/${a!.slug}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                  <BookOpen className="h-4 w-4 shrink-0 text-brand" />
                  <span className="text-[14px] text-slate-200">{a!.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {entry?.related && entry.related.length > 0 && (
        <Section title="Related codes">
          <div className="flex flex-wrap gap-2">
            {entry.related.map((c) => (
              <CodeChip key={c} code={c} />
            ))}
          </div>
        </Section>
      )}

      <FixesForCode code={code} />
      <ShopCodeBook code={code} defaultMake={structure.scope === 'manufacturer' ? (vehicle?.make ?? '') : ''} />
    </Page>
  );
}
