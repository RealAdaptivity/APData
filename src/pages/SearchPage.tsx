import { useMemo, useState, type FormEvent } from 'react';
import { BookOpen, ChevronRight, ScanLine, Search, ThumbsUp, Wrench } from 'lucide-react';
import { searchCodes, parseCodes, normalizeCode } from '../lib/dtc';
import { searchArticles } from '../data/articles';
import { searchFaults } from '../data/faults';
import { useAsync } from '../lib/useAsync';
import { useVehicle } from '../lib/vehicleStore';
import { rankFixes } from '../lib/fixRank';
import { scopeLabel } from '../lib/vehicle';
import { Link, navigate, type Route } from '../lib/router';
import { searchFixes } from '../api/fixes';
import { listProcedures } from '../api/procedures';
import { FixCard } from '../components/FixCard';
import { OneSearchTiles } from '../components/OneSearch';
import { Empty, ErrorNote, Input, LinkButton, Loading, Page, Section } from '../components/ui';

/** One box for everything: codes, built-in articles, shop procedures and confirmed fixes. */
export function SearchPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  const q = (route.query.get('q') ?? '').trim();
  const [text, setText] = useState(q);
  const codes = useMemo(() => (q ? searchCodes(q, 12, vehicle?.make) : []), [q, vehicle?.make]);
  const faults = useMemo(() => (q && !normalizeCode(q) ? searchFaults(q).slice(0, 6) : []), [q]);
  const pasted = useMemo(() => parseCodes(q), [q]);
  const articles = useMemo(() => (q ? searchArticles(q).slice(0, 8) : []), [q]);
  const fixes = useAsync(() => (q && !normalizeCode(q) ? searchFixes(q) : Promise.resolve([])), [q]);
  const procs = useAsync(() => (q ? listProcedures() : Promise.resolve([])), [q]);

  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const shopProcs = (procs.data ?? []).filter((p) => words.length && words.every((w) => `${p.title} ${p.summary ?? ''} ${p.notes ?? ''} ${p.make ?? ''} ${p.model ?? ''}`.toLowerCase().includes(w))).slice(0, 8);
  const rankedFixes = fixes.data ? rankFixes(fixes.data, vehicle, { includeOtherMakes: true }).slice(0, 10) : [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(text.trim())}`, { replace: true });
  };

  const nothing = q && !codes.length && !faults.length && !articles.length && !shopProcs.length && !rankedFixes.length && !fixes.loading && !procs.loading;

  return (
    <Page title="1Search">
      <form onSubmit={submit} role="search">
        <label className="relative block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Code, symptom, part or procedure" className="pl-9" autoFocus />
        </label>
      </form>
      {!q && <p className="text-[13px] text-slate-400">1Search: one code or symptom, every answer — top repairs, causes, specs, guided tests, pinouts, locations, tips, wiring, procedures, labor and recalls.</p>}
      {q && pasted.length <= 1 && <OneSearchTiles key={`${q}|${vehicle?.make ?? ''}`} q={q} vehicle={vehicle} />}
      {pasted.length > 1 && (
        <LinkButton to={`/fixes?codes=${pasted.join(',')}`} variant="primary" icon={<ThumbsUp className="h-4 w-4" />}>
          Find fixes with {pasted.join(', ')}
        </LinkButton>
      )}
      {codes.length > 0 && (
        <Section title="Trouble codes">
          <ul className="-mx-2">
            {codes.map((c) => (
              <li key={`${c.code}${'makeLabel' in c ? c.makeLabel : ''}`}>
                <Link to={`/codes/${c.code}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                  <ScanLine className="h-4 w-4 shrink-0 text-brand" />
                  <span className="w-14 shrink-0 font-mono text-sm font-bold text-brand-soft">{c.code}</span>
                  <span className="min-w-0 flex-1 text-[13px] text-slate-200">{c.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {faults.length > 0 && (
        <Section title="Faults">
          <ul className="-mx-2">
            {faults.map((f) => (
              <li key={f.id}>
                <Link to={`/faults/${f.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                  <Wrench className="h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1 text-[14px] text-slate-100">{f.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {(articles.length > 0 || shopProcs.length > 0) && (
        <Section title="Repair information">
          <ul className="-mx-2">
            {shopProcs.map((p) => (
              <li key={p.id}>
                <Link to={`/repair/p/${p.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                  <Wrench className="h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-slate-100">{p.title}</span>
                    <span className="block text-xs text-slate-500">Shop procedure · {scopeLabel(p)}</span>
                  </span>
                </Link>
              </li>
            ))}
            {articles.map((a) => (
              <li key={a.slug}>
                <Link to={`/repair/a/${a.slug}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                  <BookOpen className="h-4 w-4 shrink-0 text-brand" />
                  <span className="text-[14px] text-slate-100">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {(fixes.loading || procs.loading) && <Loading label="Searching shop records…" />}
      {fixes.error && <ErrorNote message={fixes.error} onRetry={fixes.reload} />}
      {rankedFixes.length > 0 && (
        <Section title="Confirmed fixes">
          <div className="space-y-3">
            {rankedFixes.map((r) => (
              <FixCard key={r.fix.id} fix={r.fix} match={r.match} />
            ))}
          </div>
        </Section>
      )}
      {nothing && <Empty icon={<Search className="h-8 w-8" />} title={`Nothing found for “${q}”`}>Try fewer words, a code, or a part name.</Empty>}
    </Page>
  );
}
