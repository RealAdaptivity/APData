import type { ReactNode } from 'react';
import { BookOpen, Cable, Clock, FlaskConical, Gauge, Info, MapPin, Network, ShieldAlert, StickyNote, ThumbsUp, Trophy, Wrench } from 'lucide-react';
import { Link } from '../lib/router';
import { useAsync } from '../lib/useAsync';
import { vehicleKey, type Vehicle } from '../lib/vehicle';
import { lookupCode, normalizeCode } from '../lib/dtc';
import { rankFixes } from '../lib/fixRank';
import { topRepairs } from '../lib/topRepairs';
import { pinoutMatches } from '../lib/pinouts';
import { researchFor } from '../lib/research';
import { componentsForCode, searchComponents, type ComponentLocation } from '../data/locations';
import { faultsForCode, searchFaults } from '../data/faults';
import { laborFor, operationFor, searchTests, testsForComponent, type ComponentTest } from '../data/componentTests';
import { ARTICLES, searchArticles } from '../data/articles';
import { laborJob } from '../data/laborJobs';
import { fixesForCode, searchFixes } from '../api/fixes';
import { specsForVehicle } from '../api/specs';
import { pinoutsForVehicle } from '../api/pinouts';
import { listVehicleNotes } from '../api/notes';
import { filesForVehicle } from '../api/files';
import { listProcedures } from '../api/procedures';
import { scopeFit } from '../lib/vehicle';
import { cx } from './ui';

/** What a 1Search query is about: the code, the components it points at, and the tests for them. */
export function oneSearchScope(q: string, make?: string) {
  const code = normalizeCode(q);
  const entry = code ? lookupCode(code, make) : null;
  const components: ComponentLocation[] = code ? componentsForCode(code) : searchComponents(q).slice(0, 6);
  const tests: ComponentTest[] = [];
  const seen = new Set<string>();
  for (const t of [...components.flatMap((c) => testsForComponent(c.id)), ...(code ? [] : searchTests(q).slice(0, 4))]) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      tests.push(t);
    }
  }
  const faults = code ? faultsForCode(code) : searchFaults(q).slice(0, 6);
  const words = [code, ...(entry ? [entry.title] : []), ...components.map((c) => c.name.replace(/\([^)]*\)/g, ''))].filter(Boolean).join(' ');
  const articles = [
    ...ARTICLES.filter((a) => code && (a.codes ?? []).some((p) => p === code || (p.includes('-') && code >= p.split('-')[0] && code <= p.split('-')[1]))),
    ...(code ? [] : searchArticles(q)),
  ];
  const labor = [...new Set(components.flatMap((c) => laborFor(c.id)))];
  return { code, entry, components, tests, faults, articles: [...new Map(articles.map((a) => [a.slug, a])).values()], labor, words };
}

function Tile({ to, icon, title, value, sub, hot }: { to: string; icon: ReactNode; title: string; value?: ReactNode; sub: string; hot?: boolean }) {
  return (
    <Link
      to={to}
      className={cx(
        'flex min-h-[96px] flex-col justify-between rounded-2xl border p-3 transition-colors',
        hot ? 'border-brand/40 bg-brand/10 hover:bg-brand/15' : 'border-white/10 bg-panel hover:bg-panel-2'
      )}
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">
        <span className="text-brand">{icon}</span>
        {title}
      </div>
      <div>
        {value !== undefined && <div className="font-heading text-xl font-bold text-white">{value}</div>}
        <div className="line-clamp-2 text-[11px] text-slate-400">{sub}</div>
      </div>
    </Link>
  );
}

const count = (loading: boolean, n: number | undefined) => (loading ? '…' : n ?? '—');

/**
 * 1Search: one query, every kind of answer, as tiles — the way ProDemand lays
 * out a code. Every tile is AP Data's own content or the shop's own records.
 */
export function OneSearchTiles({ q, vehicle }: { q: string; vehicle: Vehicle | null }) {
  const s = oneSearchScope(q, vehicle?.make);
  const vk = vehicle ? vehicleKey(vehicle) : '';
  const enc = encodeURIComponent(q);

  const fixes = useAsync(() => (s.code ? fixesForCode(s.code) : searchFixes(q)), [q]);
  const shop = useAsync(async () => {
    if (!vehicle) return null;
    const settle = <T,>(p: Promise<T>) => p.then((v) => v, () => null);
    const [specs, pinouts, notes, files, procs] = await Promise.all([
      settle(specsForVehicle(vehicle)),
      settle(pinoutsForVehicle(vehicle)),
      settle(listVehicleNotes(vehicle)),
      settle(filesForVehicle(vehicle)),
      settle(listProcedures()),
    ]);
    return { specs, pinouts, notes, files, procs };
  }, [vk]);
  const research = useAsync(() => (vehicle ? researchFor(vehicle) : Promise.resolve(null)), [vk + (vehicle?.vin ?? '')]);

  const ranked = fixes.data ? rankFixes(fixes.data, vehicle).map((r) => r.fix) : [];
  const top = topRepairs(ranked);
  const names = s.components.flatMap((c) => [c.name, ...c.aka]);
  const pinouts = (shop.data?.pinouts ?? []).filter((p) => !names.length || pinoutMatches(p.component, names));
  const needle = [s.code, ...q.toLowerCase().split(/\s+/).filter((w) => w.length > 2), ...s.components.flatMap((c) => c.aka.slice(0, 2))].filter(Boolean).map((w) => String(w).toLowerCase());
  const tips = (shop.data?.notes ?? []).filter((n) => needle.some((w) => n.note.toLowerCase().includes(w)));
  const wiring = (shop.data?.files ?? []).filter((f) => /wiring|diagram|schematic|pinout|connector/i.test(`${f.title} ${f.description ?? ''}`));
  const procs = vehicle ? (shop.data?.procs ?? []).filter((p) => scopeFit(vehicle, p) != null && needle.some((w) => `${p.title} ${p.summary ?? ''}`.toLowerCase().includes(w))) : [];
  const rr = s.articles.filter((a) => a.kind === 'procedure').length + procs.length;
  const recalls = research.data?.recalls;

  const first = s.components[0];
  const tileTo = (one: string | undefined, many: string) => one ?? many;
  const shopLoading = shop.loading && !!vehicle;

  return (
    <section className="space-y-2" aria-label="1Search">
      <div>
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-slate-200">1Search{s.code ? ` · ${s.code}` : ''}</h2>
        {s.entry && <p className="text-xs text-slate-400">{s.entry.title}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Tile to={`/top-repairs?q=${enc}`} hot icon={<Trophy className="h-4 w-4" />} title="Top repairs" value={count(fixes.loading, top.length)} sub={top[0] ? `#1: ${top[0].cause}` : 'What fixed it, ranked, by mileage'} />
        <Tile
          to={s.code ? `/codes/${s.code}` : s.faults[0] ? `/faults/${s.faults[0].id}` : `/faults`}
          icon={<Wrench className="h-4 w-4" />}
          title="Causes & fixes"
          value={s.code ? (s.entry?.causes.length ?? '—') : s.faults.length}
          sub={s.code ? 'Meaning, causes, diagnose it' : 'Faults that match'}
        />
        <Tile to="/specs" icon={<Gauge className="h-4 w-4" />} title="Specifications" value={vehicle ? count(shopLoading, shop.data?.specs?.length) : undefined} sub={vehicle ? 'Shop specs for this vehicle' : 'Choose a vehicle'} />
        <Tile
          to={s.tests.length === 1 ? `/testing/${s.tests[0].id}${first ? `?component=${first.id}` : ''}` : first ? `/testing?component=${first.id}` : `/testing?q=${enc}`}
          icon={<FlaskConical className="h-4 w-4" />}
          title="Guided component tests"
          value={s.tests.length}
          sub={s.tests[0]?.name ?? 'Step-by-step with good readings'}
        />
        <Tile to={first ? `/pinouts?component=${encodeURIComponent(first.aka[0] ?? first.name)}` : '/pinouts'} icon={<Cable className="h-4 w-4" />} title="Component connector" value={vehicle ? count(shopLoading, pinouts.length) : undefined} sub="Shop-recorded pinouts" />
        <Tile to={tileTo(first && `/locations/${first.id}`, '/locations')} icon={<MapPin className="h-4 w-4" />} title="Component location" value={s.components.length} sub={first?.name ?? 'Where parts are'} />
        <Tile to={tileTo(first && `/testing?component=${first.id}`, '/locations')} icon={<Info className="h-4 w-4" />} title="Component operation" value={s.components.filter((c) => operationFor(c.id)).length} sub="How it works" />
        <Tile to="/notes" icon={<StickyNote className="h-4 w-4" />} title="Tips" value={vehicle ? count(shopLoading, tips.length) : undefined} sub="Shop notes that mention it" />
        <Tile to="/files" icon={<Network className="h-4 w-4" />} title="Wiring diagrams" value={vehicle ? count(shopLoading, wiring.length) : undefined} sub="Shop diagrams and photos" />
        <Tile to={s.articles.find((a) => a.kind === 'procedure') ? `/repair/a/${s.articles.find((a) => a.kind === 'procedure')!.slug}` : '/repair'} icon={<BookOpen className="h-4 w-4" />} title="Remove & replace" value={vehicle ? count(shopLoading, rr) : rr} sub="Procedures and how-to" />
        <Tile to={s.labor[0] ? `/labor/${s.labor[0]}` : '/labor'} icon={<Clock className="h-4 w-4" />} title="Parts & labor" value={s.labor.length} sub={s.labor[0] ? laborJob(s.labor[0]).name : 'Book time and shop times'} />
        <Tile to="/recalls" icon={<ShieldAlert className="h-4 w-4" />} title="Recalls / campaigns" value={vehicle ? (research.loading ? '…' : recalls?.length ?? '—') : undefined} sub="NHTSA recalls" />
      </div>
      {fixes.data && !fixes.data.length && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <ThumbsUp className="h-3.5 w-3.5" /> No shop fixes for this yet — when you fix it, record it and it shows up in Top repairs.
        </p>
      )}
    </section>
  );
}
