import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Cable, ChevronRight, FlaskConical, MapPin, Plus, Search, Wrench } from 'lucide-react';
import { Link, type Route } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { useAsync } from '../lib/useAsync';
import { vehicleTitle } from '../lib/vehicle';
import { pinoutMatches } from '../lib/pinouts';
import { TEST_KIND_LABEL, operationFor, searchTests, testById, testsForComponent, type ComponentTest, type TestKind } from '../data/componentTests';
import { componentById } from '../data/locations';
import { ARTICLE_BY_SLUG } from '../data/articles';
import { pinoutsForVehicle } from '../api/pinouts';
import { Badge, Card, Empty, ErrorNote, Input, LinkButton, Loading, Notice, Page, Section } from '../components/ui';

function TestRow({ t, component }: { t: ComponentTest; component?: string }) {
  return (
    <li>
      <Link to={`/testing/${t.id}${component ? `?component=${component}` : ''}`} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-white">{t.name}</span>
          <span className="line-clamp-2 block text-xs text-slate-400">{t.operation}</span>
        </span>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
      </Link>
    </li>
  );
}

/** #/testing — guided component tests by circuit type; ?component= narrows to one part. */
export function TestingPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  const componentId = route.query.get('component') ?? '';
  const component = componentId ? componentById(componentId) : null;
  const [q, setQ] = useState(route.query.get('q') ?? '');
  const found = useMemo(() => (component ? testsForComponent(component.id) : searchTests(q)), [component, q]);
  const kinds = Object.keys(TEST_KIND_LABEL) as TestKind[];

  return (
    <Page title={component ? `Test the ${component.name}` : 'Guided component testing'} subtitle={vehicle ? vehicleTitle(vehicle) : 'Step-by-step tests with typical readings'} back={component ? `/locations/${component.id}` : '/'}>
      {!component && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Part or circuit: crank sensor, injector, CAN…" className="pl-9" aria-label="Search tests" />
        </div>
      )}
      {component && operationFor(component.id) && (
        <Section title="How it works">
          <p className="text-[14px] leading-relaxed text-slate-200">{operationFor(component.id)}</p>
        </Section>
      )}
      {found.length === 0 && <Empty title="No guided test for that yet">Try another name for the part, or check the how-to articles.</Empty>}
      {kinds.map((k) => {
        const list = found.filter((t) => t.kind === k);
        if (!list.length) return null;
        return (
          <Section key={k} title={TEST_KIND_LABEL[k]}>
            <ul className="-mx-2 divide-y divide-white/5">
              {list.map((t) => (
                <TestRow key={t.id} t={t} component={component?.id} />
              ))}
            </ul>
          </Section>
        );
      })}
      <Notice icon={<AlertTriangle className="h-4 w-4" />}>
        Typical values by circuit type, written for AP Data from shop practice. Pin numbers and wire colors for this vehicle come from the shop’s pinouts or the service information — when they differ, the service information wins.
      </Notice>
    </Page>
  );
}

/** #/testing/:id — one guided test, with the shop's pinouts for the component on this vehicle. */
export function TestDetailPage({ id, route }: { id: string; route: Route }) {
  const { vehicle } = useVehicle();
  const t = testById(id);
  const componentId = route.query.get('component') ?? t?.components[0] ?? '';
  const component = componentById(componentId);
  const pinouts = useAsync(() => (vehicle && t ? pinoutsForVehicle(vehicle) : Promise.resolve([])), [vehicle?.year, vehicle?.make, vehicle?.model, vehicle?.engine, id]);

  if (!t) {
    return (
      <Page title="Not found" back="/testing">
        <Empty title="That test is not in the list." action={<LinkButton to="/testing">All tests</LinkButton>} />
      </Page>
    );
  }
  const covered = t.components.map((c) => componentById(c)).filter((c): c is NonNullable<typeof c> => !!c);
  const names = component ? [component.name, ...component.aka] : covered.flatMap((c) => [c.name, ...c.aka]);
  const shopPinouts = (pinouts.data ?? []).filter((p) => pinoutMatches(p.component, names));

  return (
    <Page title={t.name} subtitle={vehicle ? vehicleTitle(vehicle) : TEST_KIND_LABEL[t.kind]} back="/testing">
      <div className="flex flex-wrap gap-1.5">
        {covered.map((c) => (
          <Link key={c.id} to={`/locations/${c.id}`}>
            <Badge tone={c.id === component?.id ? 'orange' : 'slate'}>
              <MapPin className="h-3 w-3" /> {c.name}
            </Badge>
          </Link>
        ))}
      </div>

      <Section title="How it works">
        <p className="text-[14px] leading-relaxed text-slate-200">{t.operation}</p>
      </Section>

      <Section title="At the connector" aside="Typical circuits">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-1 py-1.5 font-semibold">Circuit</th>
                <th className="px-1 py-1.5 font-semibold">Good reading</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {t.pins.map((p) => (
                <tr key={p.role}>
                  <td className="px-1 py-2 font-semibold text-slate-200">{p.role}</td>
                  <td className="px-1 py-2 text-slate-300">{p.typical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Shop pinouts" aside={vehicle ? 'This vehicle' : undefined}>
        {!vehicle && <p className="text-[13px] text-slate-400">Choose a vehicle to see the pin numbers and wire colors the shop has recorded.</p>}
        {pinouts.loading && vehicle && <Loading label="Loading pinouts…" />}
        {pinouts.error && <ErrorNote message={pinouts.error} onRetry={pinouts.reload} />}
        {vehicle && pinouts.data && (
          <div className="space-y-2">
            {shopPinouts.map((p) => (
              <Link key={p.id} to={`/pinouts/${p.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink px-3 py-2.5 hover:bg-white/5">
                <Cable className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-white">
                    {p.component}
                    {p.connector ? ` · ${p.connector}` : ''}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {p.pins.length} pins · {p.match.label}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Link>
            ))}
            {!shopPinouts.length && <p className="text-[13px] text-slate-400">No pinout recorded for this part on this vehicle yet.</p>}
            <LinkButton to={`/pinouts/new?component=${encodeURIComponent(component?.name ?? covered[0]?.name ?? '')}`} icon={<Plus className="h-4 w-4" />}>
              Record the pinout
            </LinkButton>
          </div>
        )}
      </Section>

      {t.cautions && t.cautions.length > 0 && (
        <Notice tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>
          {t.cautions.join(' ')}
        </Notice>
      )}

      <Section title="Tools">
        <p className="text-[13px] text-slate-300">{t.tools.join(' · ')}</p>
      </Section>

      <Section title="Test steps" aside="In order">
        <ol className="space-y-4">
          {t.steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand-soft">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="text-[15px] font-semibold text-white">{s.title}</div>
                <p className="text-[14px] leading-relaxed text-slate-300">{s.how}</p>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[13px] text-emerald-200">
                  <span className="font-semibold">Good: </span>
                  {s.good}
                </div>
                {s.bad && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[13px] text-red-200">
                    <span className="font-semibold">If not: </span>
                    {s.bad}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {t.scope && (
        <Section title="Known-good scope pattern">
          <p className="text-[14px] leading-relaxed text-slate-300">{t.scope}</p>
        </Section>
      )}

      {t.articles && t.articles.length > 0 && (
        <Section title="Related how-to">
          <ul className="-mx-2">
            {t.articles
              .map((s) => ARTICLE_BY_SLUG.get(s))
              .filter((a): a is NonNullable<typeof a> => !!a)
              .map((a) => (
                <li key={a.slug}>
                  <Link to={`/repair/a/${a.slug}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                    <BookOpen className="h-4 w-4 text-brand" />
                    <span className="text-[14px] text-slate-100">{a.title}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </Section>
      )}

      <Card className="flex items-center gap-3">
        <Wrench className="h-5 w-5 shrink-0 text-brand" />
        <p className="min-w-0 flex-1 text-[13px] text-slate-300">Found the fault? Record the fix so the next tech finds it in Top Repairs.</p>
        <LinkButton to="/fixes/new" size="sm">
          Record fix
        </LinkButton>
      </Card>
    </Page>
  );
}
