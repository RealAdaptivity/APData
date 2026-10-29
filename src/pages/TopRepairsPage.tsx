import { useMemo, useState, type FormEvent } from 'react';
import { ChevronRight, Plus, Search, Trophy } from 'lucide-react';
import { Link, navigate, type Route } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { useAsync } from '../lib/useAsync';
import { vehicleTitle } from '../lib/vehicle';
import { lookupCode, normalizeCode } from '../lib/dtc';
import { rankFixes } from '../lib/fixRank';
import { bucketLabel, mileageBuckets, topRepairs, type TopRepair } from '../lib/topRepairs';
import { fixesForCode, searchFixes } from '../api/fixes';
import { Badge, Card, Empty, ErrorNote, Input, LinkButton, Loading, Notice, Page, Section, cx } from '../components/ui';

function MileageChart({ miles, label }: { miles: number[]; label: string }) {
  const buckets = mileageBuckets(miles);
  if (!buckets.length) return <p className="text-xs text-slate-500">No mileage recorded on these fixes.</p>;
  const max = Math.max(...buckets.map((b) => b.n));
  return (
    <div role="img" aria-label={label} className="space-y-1">
      {buckets.map((b) => (
        <div key={b.from} className="flex items-center gap-2 text-[11px]">
          <span className="w-16 shrink-0 text-right tabular-nums text-slate-500">{bucketLabel(b)}</span>
          <span className="h-3 flex-1 rounded bg-white/5">
            <span className="block h-3 rounded bg-brand" style={{ width: `${b.n ? Math.max(4, (b.n / max) * 100) : 0}%` }} />
          </span>
          <span className="w-6 shrink-0 tabular-nums text-slate-300">{b.n || ''}</span>
        </div>
      ))}
    </div>
  );
}

function RepairRow({ r, rank }: { r: TopRepair; rank: number }) {
  const lo = r.miles[0];
  const hi = r.miles[r.miles.length - 1];
  return (
    <li className="py-3">
      <Link to={`/fixes/${r.fixIds[0]}`} className="flex items-start gap-3 rounded-xl hover:bg-white/5">
        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', rank === 1 ? 'bg-brand text-white' : 'bg-white/10 text-slate-200')}>{rank}</span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block text-[15px] font-semibold text-white">{r.cause}</span>
          <span className="flex items-center gap-2">
            <span className="h-2 flex-1 rounded bg-white/5">
              <span className="block h-2 rounded bg-emerald-400" style={{ width: `${Math.max(3, r.pct)}%` }} />
            </span>
            <span className="w-24 shrink-0 text-right text-xs font-semibold text-emerald-300">
              {r.times}× · {r.pct}%
            </span>
          </span>
          <span className="block text-xs text-slate-400">
            {[lo ? (lo === hi ? `${lo.toLocaleString('en-US')} mi` : `${lo.toLocaleString('en-US')}–${hi.toLocaleString('en-US')} mi`) : '', r.avgLabor ? `about ${r.avgLabor} h` : '', r.parts[0] ? `Parts: ${r.parts.slice(0, 2).join('; ')}` : '']
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-600" />
      </Link>
    </li>
  );
}

/** #/top-repairs?q=P0017 — what fixed it in this shop, most often first, with the mileage it happened at. */
export function TopRepairsPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  const q = (route.query.get('q') ?? '').trim();
  const [text, setText] = useState(q);
  const [allMakes, setAllMakes] = useState(false);
  const code = normalizeCode(q);
  const entry = code ? lookupCode(code, vehicle?.make) : null;
  const fixes = useAsync(() => (!q ? Promise.resolve([]) : code ? fixesForCode(code) : searchFixes(q)), [q]);

  const ranked = useMemo(() => (fixes.data ? rankFixes(fixes.data, allMakes ? null : vehicle).map((r) => r.fix) : []), [fixes.data, allMakes, vehicle]);
  const top = useMemo(() => topRepairs(ranked), [ranked]);
  const miles = ranked.map((f) => f.mileage ?? 0).filter((m) => m > 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/top-repairs?q=${encodeURIComponent(text.trim())}`, { replace: true });
  };

  return (
    <Page title="Top repairs" subtitle={[code && entry ? `${code} · ${entry.title}` : q, vehicle ? vehicleTitle(vehicle) : ''].filter(Boolean).join(' — ') || 'What fixed it, ranked'} back={code ? `/search?q=${code}` : '/'}>
      <form onSubmit={submit} role="search" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Code or symptom" className="pl-9" aria-label="Code or symptom" />
      </form>
      {vehicle && (
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-panel p-1" role="tablist" aria-label="Which vehicles">
          {[false, true].map((all) => (
            <button key={String(all)} type="button" role="tab" aria-selected={allMakes === all} onClick={() => setAllMakes(all)} className={cx('min-h-[40px] rounded-lg text-xs font-semibold', allMakes === all ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/5')}>
              {all ? 'Every make' : `${vehicle.make} only`}
            </button>
          ))}
        </div>
      )}
      {fixes.loading && q && <Loading label="Ranking shop fixes…" />}
      {fixes.error && <ErrorNote message={fixes.error} onRetry={fixes.reload} />}
      {fixes.data && q && !top.length && (
        <Empty icon={<Trophy className="h-8 w-8" />} title="No shop fixes for this yet" action={<LinkButton to={`/fixes/new${code ? `?codes=${code}` : ''}`} variant="primary" icon={<Plus className="h-4 w-4" />}>Record a fix</LinkButton>}>
          Top repairs fill in as techs record confirmed fixes. {code ? 'Meanwhile, the code page has the usual causes and how to diagnose it.' : ''}
        </Empty>
      )}
      {top.length > 0 && (
        <>
          <Card className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-200">Fixes by mileage</h2>
              <Badge>
                {ranked.length} fix{ranked.length === 1 ? '' : 'es'}
              </Badge>
            </div>
            <MileageChart miles={miles} label={`Shop fixes for ${q} by mileage`} />
          </Card>
          <Section title="Ranked by times it fixed it" aside="Fixes plus confirmations">
            <ul className="divide-y divide-white/5">
              {top.map((r, i) => (
                <RepairRow key={r.cause} r={r} rank={i + 1} />
              ))}
            </ul>
          </Section>
        </>
      )}
      {code && (
        <Link to={`/codes/${code}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel p-4 hover:bg-panel-2">
          <span className="min-w-0 flex-1 text-[13px] text-slate-300">Usual causes and diagnosis for {code}</span>
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </Link>
      )}
      <Notice>Built only from Adaptivity’s own confirmed fixes — closest vehicles first. Each confirmation by another tech counts as another time it fixed it.</Notice>
    </Page>
  );
}
