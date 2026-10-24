import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, MapPin, Search, Wrench } from 'lucide-react';
import { Link } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { vehicleTitle } from '../lib/vehicle';
import { SYSTEMS, systemInfo } from '../data/systems';
import { FAULTS, faultById, searchFaults } from '../data/faults';
import { componentById } from '../data/locations';
import { ARTICLE_BY_SLUG } from '../data/articles';
import { SEVERITY_LABEL, type Severity } from '../data/dtcLibrary';
import { Badge, CodeChip, Empty, Input, LinkButton, Notice, Page, Section } from '../components/ui';

const SEVERITY_TONE: Record<Severity, 'slate' | 'amber' | 'orange' | 'red'> = { low: 'slate', medium: 'amber', high: 'orange', critical: 'red' };

/** #/faults — problems with or without a code, by system. */
export function FaultsPage() {
  const { vehicle } = useVehicle();
  const [q, setQ] = useState('');
  const found = useMemo(() => searchFaults(q), [q]);
  const groups = q.trim() ? [{ label: `${found.length} match${found.length === 1 ? '' : 'es'}`, list: found }] : SYSTEMS.map((s) => ({ label: s.label, list: FAULTS.filter((f) => f.system === s.id) })).filter((g) => g.list.length);

  return (
    <Page title="Faults" subtitle={vehicle ? `Problems to diagnose on the ${vehicleTitle(vehicle)}` : 'Start from what the customer says'} back="/codes">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ABS light, pulls right, clunk, dead battery…" className="pl-9" aria-label="Search faults" autoFocus />
      </div>
      {found.length === 0 && <Empty title="Nothing matches">Try other words for the complaint, or search the trouble codes.</Empty>}
      {groups.map((g) => (
        <Section key={g.label} title={g.label}>
          <ul className="-mx-2 divide-y divide-white/5">
            {g.list.map((f) => (
              <li key={f.id}>
                <Link to={`/faults/${f.id}`} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-white">{f.title}</span>
                    <span className="line-clamp-1 block text-xs text-slate-400">“{f.complaints[0]}”</span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ))}
      <p className="text-[11px] leading-relaxed text-slate-500">Written for AP Data from general shop practice; they apply to every vehicle. Test values come from the service information for the vehicle.</p>
    </Page>
  );
}

/** #/faults/:id */
export function FaultDetailPage({ id }: { id: string }) {
  const { vehicle } = useVehicle();
  const f = faultById(id);
  if (!f) {
    return (
      <Page title="Not found" back="/faults">
        <Empty title="That fault is not in the list." action={<LinkButton to="/faults">All faults</LinkButton>} />
      </Page>
    );
  }
  const locations = (f.locations ?? []).map(componentById).filter((c) => c !== null);
  const articles = (f.articles ?? []).map((s) => ARTICLE_BY_SLUG.get(s)).filter((a) => !!a);

  return (
    <Page title={f.title} subtitle={vehicle ? vehicleTitle(vehicle) : undefined} back="/faults">
      <div className="flex flex-wrap gap-2">
        <Badge tone={SEVERITY_TONE[f.severity]}>{SEVERITY_LABEL[f.severity]}</Badge>
        <Badge>{systemInfo(f.system).label}</Badge>
      </div>
      {f.severity === 'critical' && <Notice tone="amber">Safety item: do not release the vehicle until this is found and fixed.</Notice>}

      <Section title="What the customer says">
        <ul className="space-y-1 text-[14px] text-slate-300">
          {f.complaints.map((c) => (
            <li key={c}>“{c}”</li>
          ))}
        </ul>
      </Section>

      <Section title="Common causes" aside="Most likely first">
        <ol className="space-y-1.5 text-[14px] text-slate-200">
          {f.causes.map((c, i) => (
            <li key={c} className="flex gap-2">
              <span className="w-5 shrink-0 text-right font-mono text-xs leading-6 text-slate-500">{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Diagnose it" aside="Quick and cheap checks first">
        <ol className="space-y-3">
          {f.checks.map((c, i) => (
            <li key={c} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand-soft">{i + 1}</span>
              <span className="text-[14px] leading-relaxed text-slate-200">{c}</span>
            </li>
          ))}
        </ol>
      </Section>

      {locations.length > 0 && (
        <Section title="Where to look" aside="Component locations">
          <ul className="-mx-2 space-y-1">
            {locations.map((l) => (
              <li key={l.id}>
                <Link to={`/locations/${l.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                  <MapPin className="h-4 w-4 shrink-0 text-brand" />
                  <span className="text-[14px] text-slate-200">{l.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {f.codes && f.codes.length > 0 && (
        <Section title="Codes that often come with it">
          <div className="flex flex-wrap gap-2">
            {f.codes.map((c) => (
              <CodeChip key={c} code={c} />
            ))}
          </div>
        </Section>
      )}

      {articles.length > 0 && (
        <Section title="How-to articles">
          <ul className="-mx-2 space-y-1">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link to={`/repair/a/${a.slug}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                  <BookOpen className="h-4 w-4 shrink-0 text-brand" />
                  <span className="text-[14px] text-slate-200">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <LinkButton to="/fixes" icon={<Wrench className="h-4 w-4" />}>
        See the shop’s confirmed fixes for this vehicle
      </LinkButton>
    </Page>
  );
}
