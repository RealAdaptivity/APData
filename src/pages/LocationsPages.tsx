import { useMemo, useState } from 'react';
import { Cable, Camera, ChevronRight, Cog, FlaskConical, MapPin, Search } from 'lucide-react';
import { operationFor, testsForComponent } from '../data/componentTests';
import { Link } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { useAsync } from '../lib/useAsync';
import { vehicleKey, vehicleTitle, type Vehicle } from '../lib/vehicle';
import { SYSTEMS, systemInfo } from '../data/systems';
import { VIEW_LABEL, componentById, searchComponents, type ComponentLocation, type LocationView } from '../data/locations';
import { bank1Words, engineShape, familyFor, firingOrder, guessOrientation, type BankLayout, type Orientation } from '../data/engineLayouts';
import { filesForVehicle, type FileForVehicle } from '../api/files';
import { LocationDiagram } from '../components/LocationDiagram';
import { CylinderDiagram } from '../components/CylinderDiagram';
import { Thumb } from './FilesPage';
import { Badge, Card, CodeChip, Empty, ErrorNote, Input, LinkButton, Loading, Notice, Page, Section, cx } from '../components/ui';

const LAYOUT_COMPONENTS = new Set(['coils', 'fuel-injectors', 'cam-sensor', 'vvt-solenoid', 'o2-upstream', 'o2-downstream', 'knock-sensor', 'catalytic-converter']);

/** #/locations — every component, searchable by name, other name or trouble code. */
export function LocationsPage() {
  const { vehicle } = useVehicle();
  const [q, setQ] = useState('');
  const found = useMemo(() => searchComponents(q), [q]);
  const groups = SYSTEMS.map((s) => ({ s, list: found.filter((c) => c.system === s.id) })).filter((g) => g.list.length);

  return (
    <Page title="Component locations" subtitle={vehicle ? vehicleTitle(vehicle) : 'Where things usually are'} back="/">
      <Link to="/locations/engine" className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4 hover:bg-brand/15">
        <Cog className="h-6 w-6 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Engine layout</div>
          <div className="text-xs text-slate-400">Cylinder numbers, bank 1 vs bank 2, oxygen sensor positions and firing order{vehicle?.engine ? ` for the ${vehicle.engine}` : ''}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500" />
      </Link>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Part name or trouble code: crank sensor, P0455…" className="pl-9" aria-label="Search components" />
      </div>

      {groups.length === 0 && <Empty title="Nothing matches">Try another name for the part, or a trouble code like P0335.</Empty>}
      {groups.map(({ s, list }) => (
        <Section key={s.id} title={s.label}>
          <ul className="-mx-2 divide-y divide-white/5">
            {list.map((c) => (
              <li key={c.id}>
                <Link to={`/locations/${c.id}`} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-white">{c.name}</span>
                    <span className="line-clamp-2 block text-xs text-slate-400">{c.where}</span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      <p className="text-[11px] leading-relaxed text-slate-500">
        Typical locations written for AP Data from general shop practice, not factory diagrams. Positions vary by vehicle: add a photo of where it is on the vehicle you are working on, and the next tech sees it here.
      </p>
    </Page>
  );
}

/** The shop's photos for this vehicle whose title or notes name the component. */
function matchesComponent(f: FileForVehicle, c: ComponentLocation): boolean {
  const hay = `${f.title} ${f.description ?? ''}`.toLowerCase();
  const names = [c.name.replace(/\(.*?\)/g, ''), ...c.aka].map((n) => n.toLowerCase().trim()).filter((n) => n.length >= 3);
  return names.some((n) => hay.includes(n) || n.split(/[\s/]+/).filter((w) => w.length >= 4).every((w) => hay.includes(w)));
}

function ShopPhotos({ vehicle, component }: { vehicle: Vehicle; component: ComponentLocation }) {
  const files = useAsync(() => filesForVehicle(vehicle), [vehicleKey(vehicle)]);
  const mine = (files.data ?? []).filter((f) => matchesComponent(f, component));
  const add = `/files?add=1&title=${encodeURIComponent(`${component.name.replace(/\s*\(.*?\)/g, '')} location`)}&system=${component.system}`;
  return (
    <Section title={`On the ${vehicle.make} ${vehicle.model}`} aside="Shop photos">
      {files.loading && <Loading label="Looking for shop photos…" />}
      {files.error && <ErrorNote message={files.error} onRetry={files.reload} />}
      {!files.loading && !files.error && mine.length === 0 && (
        <p className="text-[13px] text-slate-400">No shop photo of this part on a {vehicle.make} yet. Snap one where it sits — it shows here for the next tech.</p>
      )}
      {mine.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {mine.slice(0, 9).map((f) => (
            <Link key={f.id} to="/files" className="overflow-hidden rounded-xl border border-white/10 bg-ink">
              <div className="aspect-[4/3]">
                <Thumb f={f} />
              </div>
              <div className="p-2">
                <div className="line-clamp-2 text-[12px] font-semibold text-white">{f.title}</div>
                <div className="text-[11px] text-slate-500">{f.matchLabel}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <LinkButton to={add} icon={<Camera className="h-4 w-4" />}>
        Add a photo of where it is
      </LinkButton>
    </Section>
  );
}

/** #/locations/:id — the diagram, where it usually is, how to find it, codes and shop photos. */
export function LocationDetailPage({ id }: { id: string }) {
  const { vehicle } = useVehicle();
  const c = componentById(id);
  const views = useMemo(() => (c ? [...new Set(c.spots.map((s) => s.view))] : []), [c]);
  const [view, setView] = useState<LocationView | null>(null);
  if (!c) {
    return (
      <Page title="Not found" back="/locations">
        <Empty title="That component is not in the list." action={<LinkButton to="/locations">All components</LinkButton>} />
      </Page>
    );
  }
  const shown = view && views.includes(view) ? view : views[0];
  const marks = c.spots.filter((s) => s.view === shown);
  const singles = c.codes.filter((p) => !p.includes('-')).slice(0, 12);
  const ranges = c.codes.filter((p) => p.includes('-'));

  return (
    <Page title={c.name} subtitle={vehicle ? vehicleTitle(vehicle) : undefined} back="/locations">
      <div className="flex flex-wrap gap-2">
        <Badge>{systemInfo(c.system).label}</Badge>
        {c.aka.slice(0, 5).map((a) => (
          <Badge key={a} tone="blue">
            {a}
          </Badge>
        ))}
      </div>

      <Card className="space-y-3">
        {views.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Diagram view">
            {views.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={v === shown}
                onClick={() => setView(v)}
                className={cx('min-h-[36px] rounded-lg px-3 text-xs font-semibold', v === shown ? 'bg-brand text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}
              >
                {VIEW_LABEL[v]}
              </button>
            ))}
          </div>
        )}
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{VIEW_LABEL[shown]}</div>
        <div className="rounded-xl bg-ink p-2">
          <LocationDiagram view={shown} spots={c.spots} title={`${c.name}, ${VIEW_LABEL[shown]}`} />
        </div>
        {marks.some((m) => m.label) && (
          <ol className="space-y-1 text-xs text-slate-400">
            {marks.map((m, i) => (
              <li key={`${m.x}-${m.y}`}>
                <span className="font-bold text-brand-soft">{i + 1}</span> {m.label ?? 'Usual spot'}
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11px] text-slate-500">Schematic, not to scale. Typical position — see what varies below.</p>
      </Card>

      {operationFor(c.id) && (
        <Section title="How it works">
          <p className="text-[14px] leading-relaxed text-slate-200">{operationFor(c.id)}</p>
        </Section>
      )}

      <Section title="Test it" aside="Guided component tests">
        <ul className="-mx-2">
          {testsForComponent(c.id).map((t) => (
            <li key={t.id}>
              <Link to={`/testing/${t.id}?component=${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                <FlaskConical className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 text-[14px] text-slate-200">{t.name}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
              </Link>
            </li>
          ))}
          <li>
            <Link to={`/pinouts?component=${encodeURIComponent(c.aka[0] ?? c.name)}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
              <Cable className="h-4 w-4 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 text-[14px] text-slate-200">Connector pinouts the shop recorded</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
            </Link>
          </li>
        </ul>
      </Section>

      <Section title="Where it usually is">
        <p className="text-[15px] leading-relaxed text-slate-200">{c.where}</p>
        <Notice tone="amber">Varies: {c.varies}</Notice>
      </Section>

      {c.tips.length > 0 && (
        <Section title="Finding it">
          <ul className="space-y-2">
            {c.tips.map((t) => (
              <li key={t} className="flex gap-2 text-[14px] leading-relaxed text-slate-200">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {t}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {LAYOUT_COMPONENTS.has(c.id) && (
        <Link to="/locations/engine" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel p-4 hover:bg-white/5">
          <Cog className="h-5 w-5 shrink-0 text-brand" />
          <span className="flex-1 text-sm text-slate-200">Which side is bank 1, and where is cylinder 1? See the engine layout.</span>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </Link>
      )}

      {c.codes.length > 0 && (
        <Section title="Codes that point here">
          {singles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {singles.map((code) => (
                <CodeChip key={code} code={code} />
              ))}
            </div>
          )}
          {ranges.length > 0 && <p className="font-mono text-xs text-slate-400">{ranges.join(' · ')}</p>}
        </Section>
      )}

      {vehicle ? (
        <ShopPhotos vehicle={vehicle} component={c} />
      ) : (
        <Notice>Choose a vehicle to see the shop’s photos of this part on it.</Notice>
      )}
    </Page>
  );
}

const QUICK: { label: string; engine: string }[] = [
  { label: 'I4', engine: '4-cyl I4' },
  { label: 'I6', engine: '6-cyl I6' },
  { label: 'V6', engine: 'V6' },
  { label: 'V8', engine: 'V8' },
];

/** #/locations/engine — cylinder numbering, banks, O2 sensor names and firing order for the vehicle's engine. */
export function EngineLayoutPage() {
  const { vehicle } = useVehicle();
  const [override, setOverride] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation | null>(null);

  const engine = override ?? vehicle?.engine ?? '';
  const make = vehicle?.make ?? '';
  const shape = engineShape(engine, make);
  const family = familyFor(make, engine);
  const orient = orientation ?? guessOrientation(make, vehicle?.model, vehicle?.year);
  const firing = firingOrder(family, engine, make);
  const layout: BankLayout | null = shape.layout;
  const banks = layout === 'inline' ? 1 : layout ? 2 : null;

  return (
    <Page title="Engine layout" subtitle={vehicle ? `${vehicleTitle(vehicle)}${vehicle.engine ? ` · ${vehicle.engine}` : ''}` : undefined} back="/locations">
      {!shape.cylinders && (
        <Notice tone="amber">
          {vehicle ? 'The vehicle has no engine picked, or the engine does not say how many cylinders.' : 'No vehicle chosen.'} Pick the engine in{' '}
          <Link to="/vehicle" className="font-semibold underline">
            Choose vehicle
          </Link>
          , or show a common layout:
        </Notice>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Show</span>
        {QUICK.map((qk) => (
          <button
            key={qk.label}
            type="button"
            onClick={() => setOverride(qk.engine)}
            className={cx('min-h-[36px] rounded-lg px-3 text-xs font-semibold', override === qk.engine ? 'bg-brand text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}
          >
            {qk.label}
          </button>
        ))}
        {override && vehicle?.engine && (
          <button type="button" onClick={() => setOverride(null)} className="text-xs font-semibold text-brand-soft underline">
            Back to this vehicle’s engine
          </button>
        )}
      </div>

      {layout && (
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-panel p-1" role="tablist" aria-label="How the engine sits">
          {(['transverse', 'longitudinal'] as const).map((o) => (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={orient === o}
              onClick={() => setOrientation(o)}
              className={cx('min-h-[40px] rounded-lg text-xs font-semibold', orient === o ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/5')}
            >
              {o === 'transverse' ? 'Crosswise (front-drive)' : 'Lengthwise (trucks, rear-drive)'}
            </button>
          ))}
        </div>
      )}

      {shape.cylinders && layout && family ? (
        <Card className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {family.label} · from above
          </div>
          <div className="rounded-xl bg-ink p-2">
            <CylinderDiagram cylinders={shape.cylinders} layout={layout} family={family} orientation={orient} />
          </div>
          <p className="text-[15px] font-semibold text-white">{bank1Words(family, orient)}</p>
          {family.note && <p className="text-[13px] leading-relaxed text-slate-300">{family.note}</p>}
          {firing && (
            <p className="text-[14px] text-slate-200">
              Firing order <span className="font-mono font-bold text-brand-soft">{firing}</span>
            </p>
          )}
        </Card>
      ) : (
        shape.cylinders && (
          <Card className="space-y-2">
            <p className="text-[15px] font-semibold text-white">Bank 1 is the bank with cylinder 1.</p>
            <p className="text-[13px] leading-relaxed text-slate-300">
              AP Data does not have this engine family’s numbering. Cylinder 1 is almost always at the timing-drive end. Confirm the numbering and firing order in the service information before replacing a coil, injector or sensor — then add a photo with the numbers in Shop files.
            </p>
          </Card>
        )
      )}

      <Section title="Oxygen sensor names">
        <ul className="space-y-2 text-[14px] leading-relaxed text-slate-200">
          <li>
            <span className="font-mono font-bold text-brand-soft">B1S1</span> — bank 1, sensor 1: before the catalytic converter on the cylinder 1 side.
          </li>
          <li>
            <span className="font-mono font-bold text-brand-soft">B1S2</span> — bank 1, sensor 2: after that converter.
          </li>
          {banks !== 1 && (
            <li>
              <span className="font-mono font-bold text-brand-soft">B2S1 / B2S2</span> — the same, on the other bank. A V engine with one shared converter has only B1S2 after it.
            </li>
          )}
          <li className="text-[13px] text-slate-400">Sensor 1 is the air-fuel (upstream) sensor; sensor 2 watches the catalyst. Some vehicles add a sensor 3 after a second converter.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <LinkButton to="/locations/o2-upstream" size="sm">
            Upstream sensors
          </LinkButton>
          <LinkButton to="/locations/o2-downstream" size="sm">
            Downstream sensors
          </LinkButton>
        </div>
      </Section>

      <p className="text-[11px] leading-relaxed text-slate-500">
        From general shop knowledge of each engine family, not factory documents. Confirm numbering and firing order in the service information for the exact engine before you replace parts.
      </p>
    </Page>
  );
}
