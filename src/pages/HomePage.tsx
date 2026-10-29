import { useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Cable,
  Camera,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
  Gauge,
  CalendarClock,
  ChevronRight,
  History,
  ListChecks,
  MapPin,
  ScanLine,
  Search,
  ShieldAlert,
  StickyNote,
  ThumbsUp,
  Wrench,
} from 'lucide-react';
import { useVehicle } from '../lib/vehicleStore';
import { useAsync } from '../lib/useAsync';
import { researchFor } from '../lib/research';
import { scopeFit, vehicleKey, vehicleSubtitle, vehicleTitle, type Vehicle } from '../lib/vehicle';
import { rankFixes } from '../lib/fixRank';
import { parseCodes } from '../lib/dtc';
import { SETUP_MESSAGE, errorText } from '../lib/errors';
import { Link, navigate } from '../lib/router';
import { fixesNearVehicle } from '../api/fixes';
import { listProcedures } from '../api/procedures';
import { specsForVehicle } from '../api/specs';
import { filesForVehicle } from '../api/files';
import { listVehicleNotes } from '../api/notes';
import { ARTICLES } from '../data/articles';
import { DTC_ENTRIES } from '../data/dtcLibrary';
import { MAKE_DTC_ENTRIES } from '../data/dtcMakeCodes';
import { LABOR_JOBS } from '../data/laborJobs';
import { VehiclePicker } from '../components/VehiclePicker';
import { COMPONENT_LOCATIONS } from '../data/locations';
import { historyForVin } from '../api/history';
import { summarize } from '../lib/vehicleReport';
import { MAINTENANCE } from '../data/maintenance';
import { FAULTS } from '../data/faults';
import { COMPONENT_TESTS } from '../data/componentTests';
import { pinoutsForVehicle } from '../api/pinouts';
import { Button, Card, cx, Input, Notice, Page, shortDate } from '../components/ui';

type Counts = {
  fixes: number | null;
  procedures: number | null;
  specs: { total: number; verified: number } | null;
  files: number | null;
  notes: number | null;
  pinouts: number | null;
  setupMissing: boolean;
};

async function shopCounts(v: Vehicle): Promise<Counts> {
  const [fixes, procs, specs, files, notes, pinouts] = await Promise.allSettled([
    fixesNearVehicle(v),
    listProcedures(),
    specsForVehicle(v),
    filesForVehicle(v),
    listVehicleNotes(v),
    pinoutsForVehicle(v),
  ]);
  const setupMissing = [fixes, procs, specs, files].some((r) => r.status === 'rejected' && errorText(r.reason) === SETUP_MESSAGE);
  return {
    fixes:
      fixes.status === 'fulfilled'
        ? rankFixes(fixes.value, v).filter((r) => r.match && ['exact', 'near', 'model', 'engine'].includes(r.match.tier)).length
        : null,
    procedures: procs.status === 'fulfilled' ? procs.value.filter((p) => scopeFit(v, p) != null).length : null,
    specs:
      specs.status === 'fulfilled'
        ? { total: specs.value.length, verified: specs.value.filter((s) => s.verified_at).length }
        : null,
    files: files.status === 'fulfilled' ? files.value.length : null,
    notes: notes.status === 'fulfilled' ? notes.value.length : null,
    pinouts: pinouts.status === 'fulfilled' ? pinouts.value.length : null,
    setupMissing,
  };
}

function Tile({
  to,
  icon,
  title,
  value,
  sub,
  tone,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'red' | 'amber';
}) {
  return (
    <Link
      to={to}
      className={cx(
        'flex min-h-[112px] flex-col justify-between rounded-2xl border p-3.5 transition-colors',
        tone === 'red'
          ? 'border-red-500/40 bg-red-500/10 hover:bg-red-500/15'
          : tone === 'amber'
            ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
            : 'border-white/10 bg-panel hover:bg-panel-2'
      )}
    >
      <div className="flex items-center gap-2 text-slate-300">
        <span className={cx(tone === 'red' ? 'text-red-300' : 'text-brand')}>{icon}</span>
        <span className="text-[13px] font-semibold">{title}</span>
      </div>
      <div>
        <div className="font-heading text-2xl font-bold text-white">{value}</div>
        {sub && <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-400">{sub}</div>}
      </div>
    </Link>
  );
}

function QuickDiagnose() {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const codes = parseCodes(text);
    const rest = text.replace(/\b[PBCU][0-3][0-9A-F]{3}\b/gi, '').replace(/[,;]+/g, ' ').trim();
    if (codes.length === 1 && !rest) navigate(`/search?q=${codes[0]}`);
    else if (codes.length) navigate(`/fixes?codes=${codes.join(',')}${rest ? `&q=${encodeURIComponent(rest)}` : ''}`);
    else if (text.trim()) navigate(`/fixes?q=${encodeURIComponent(text.trim())}`);
  };
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-heading text-base font-bold text-white">What’s it doing?</h2>
        <p className="text-[13px] text-slate-400">Type or paste the codes and the symptom. AP Data finds the shop’s confirmed fixes for this vehicle first.</p>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="P0301 P0171 rough idle cold" aria-label="Codes or symptom" />
        <Button type="submit" variant="primary" icon={<Search className="h-4 w-4" />} aria-label="Find fixes">
          <span className="hidden sm:inline">Find fixes</span>
        </Button>
      </form>
    </Card>
  );
}

/** The VIN's last visits, so a repeat customer's history is the first thing a tech sees. */
function HistoryStrip({ vin }: { vin: string }) {
  const h = useAsync(() => historyForVin(vin), [vin]);
  const entries = h.data?.entries ?? [];
  const jobs = entries.filter((e) => e.kind === 'job').length;
  const last = entries.find((e) => e.kind === 'fix' || e.kind === 'job' || e.kind === 'receipt');
  const sum = summarize(h.data?.events ?? []);
  const drop = (h.data?.odometer ?? []).some((o) => o.drop);
  const warn = [sum.accidents ? `${sum.accidents} wreck${sum.accidents === 1 ? '' : 's'}` : '', ...sum.titleBrands, sum.flood ? 'flood' : '', sum.theft ? 'theft' : '', drop ? 'odometer went down' : ''].filter(Boolean);
  return (
    <Link to="/history" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel p-3.5 hover:bg-panel-2">
      <History className="h-5 w-5 shrink-0 text-brand" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">
          {h.loading ? 'Vehicle history…' : jobs ? `Been in ${jobs} time${jobs === 1 ? '' : 's'}` : entries.length ? 'Vehicle history on file' : 'First visit — no history for this VIN'}
        </span>
        {warn.length > 0 && <span className="block truncate text-xs font-semibold text-red-300">Recorded: {warn.join(' · ')}</span>}
        {last && (
          <span className="block truncate text-xs text-slate-400">
            Last: {shortDate(last.date)} · {last.title}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
    </Link>
  );
}

function Dashboard({ vehicle }: { vehicle: Vehicle }) {
  const key = vehicleKey(vehicle) + (vehicle.vin ?? '');
  const research = useAsync(() => researchFor(vehicle), [key]);
  const counts = useAsync(() => shopCounts(vehicle), [key]);

  const recalls = research.data?.recalls;
  const complaints = research.data?.complaints;
  const urgent = recalls?.filter((r) => r.parkIt || r.parkOutside).length ?? 0;
  const c = counts.data;
  const dash = (n: number | null | undefined) => (counts.loading ? '…' : n == null ? '—' : n);
  const nhtsaLinks = research.data?.links.filter((l) => /nhtsa/i.test(l.href)) ?? [];

  return (
    <Page title={vehicleTitle(vehicle)} subtitle={[vehicleSubtitle(vehicle), vehicle.vin].filter(Boolean).join(' · ') || undefined}>
      {c?.setupMissing && <Notice tone="amber">{SETUP_MESSAGE}</Notice>}

      <QuickDiagnose />

      {vehicle.vin && <HistoryStrip vin={vehicle.vin} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Tile
          to="/recalls"
          icon={<ShieldAlert className="h-4 w-4" />}
          title="Recalls"
          tone={urgent ? 'red' : recalls?.length ? 'amber' : undefined}
          value={research.loading ? '…' : research.error ? '—' : recalls == null ? '?' : recalls.length}
          sub={
            research.error
              ? 'NHTSA lookup failed — tap to retry'
              : urgent
                ? `${urgent} do-not-drive / park-outside`
                : recalls == null && !research.loading
                  ? 'NHTSA did not answer'
                  : 'NHTSA safety recalls'
          }
        />
        <Tile
          to="/problems"
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Common problems"
          value={research.loading ? '…' : complaints ? complaints.total : '—'}
          sub={complaints?.byComponent[0] ? `Most reported: ${complaints.byComponent[0].component}` : 'Owner complaints to NHTSA'}
        />
        <Tile to="/fixes" icon={<ThumbsUp className="h-4 w-4" />} title="Confirmed fixes" value={dash(c?.fixes)} sub="Shop fixes on this and similar vehicles" />
        <Tile
          to="/repair"
          icon={<BookOpen className="h-4 w-4" />}
          title="Repair info"
          value={counts.loading ? '…' : ARTICLES.length + (c?.procedures ?? 0)}
          sub={`${ARTICLES.length} tests & procedures${c?.procedures ? ` + ${c.procedures} shop procedures` : ''}`}
        />
        <Tile
          to="/specs"
          icon={<Gauge className="h-4 w-4" />}
          title="Specs"
          value={dash(c?.specs?.total)}
          sub={c?.specs ? `${c.specs.verified} verified by a second tech` : 'Torque, fluids, capacities'}
        />
        <Tile to="/labor" icon={<Clock className="h-4 w-4" />} title="Labor guide" value={LABOR_JOBS.length} sub="Jobs with book time and real shop times" />
        <Tile to="/maintenance" icon={<CalendarClock className="h-4 w-4" />} title="Maintenance" value={MAINTENANCE.length} sub="What is due at this mileage" />
        <Tile to="/faults" icon={<Wrench className="h-4 w-4" />} title="Faults" value={FAULTS.length} sub="No code? Start from the complaint" />
        <Tile to="/testing" icon={<FlaskConical className="h-4 w-4" />} title="Component tests" value={COMPONENT_TESTS.length} sub="Guided tests with good readings" />
        <Tile to="/pinouts" icon={<Cable className="h-4 w-4" />} title="Pinouts" value={dash(c?.pinouts)} sub="Shop-recorded connector pinouts" />
        <Tile to="/locations" icon={<MapPin className="h-4 w-4" />} title="Locations" value={COMPONENT_LOCATIONS.length} sub="Where parts are, cylinder and bank layout" />
        <Tile to="/files" icon={<Camera className="h-4 w-4" />} title="Shop files" value={dash(c?.files)} sub="Component photos, diagrams, PDFs" />
        <Tile to="/notes" icon={<StickyNote className="h-4 w-4" />} title="Shop notes" value={dash(c?.notes)} sub="Gotchas and part numbers" />
        <Tile to="/codes" icon={<ScanLine className="h-4 w-4" />} title="Trouble codes" value={DTC_ENTRIES.length + MAKE_DTC_ENTRIES.length} sub="Engine, ABS, body, network + shop code book" />
      </div>

      {vehicle.details && vehicle.details.length > 0 && (
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
            <ListChecks className="h-4 w-4 text-brand" /> Vehicle details
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {vehicle.details.map((d) => (
              <div key={d.label} className="flex justify-between gap-3 border-b border-white/5 pb-1.5 text-sm">
                <dt className="text-slate-500">{d.label}</dt>
                <dd className="text-right text-slate-200">{d.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[11px] text-slate-500">
            {vehicle.vin ? 'Decoded from the VIN by NHTSA vPIC.' : 'From the vehicle catalog: NHTSA vPIC, checked against EPA fueleconomy.gov.'}
          </p>
        </Card>
      )}

      {nhtsaLinks.length > 0 && (
        <Card className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
            <FileText className="h-4 w-4 text-brand" /> Service bulletins and more
          </h2>
          {nhtsaLinks.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-xl p-2 hover:bg-white/5">
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>
                <span className="block text-sm font-semibold text-white">{l.label}</span>
                <span className="block text-xs text-slate-400">{l.note}</span>
              </span>
            </a>
          ))}
        </Card>
      )}
    </Page>
  );
}

export function HomePage() {
  const { vehicle } = useVehicle();
  if (vehicle) return <Dashboard vehicle={vehicle} />;
  return (
    <Page title="Which vehicle?" subtitle="Start with the VIN. AP Data pulls up recalls, owner complaints, the shop’s confirmed fixes, procedures, specs and labor times for it.">
      <div className="mx-auto max-w-lg">
        <VehiclePicker />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <ThumbsUp className="mb-2 h-5 w-5 text-brand" />
          <div className="text-sm font-semibold text-white">Confirmed fixes</div>
          <p className="text-[13px] text-slate-400">What fixed this code on this vehicle last time, ranked by how many techs it worked for.</p>
        </Card>
        <Card>
          <BookOpen className="mb-2 h-5 w-5 text-brand" />
          <div className="text-sm font-semibold text-white">Repair info</div>
          <p className="text-[13px] text-slate-400">{DTC_ENTRIES.length + MAKE_DTC_ENTRIES.length} trouble codes, {FAULTS.length} faults, {ARTICLES.length} tests and procedures, and the shop’s own write-ups.</p>
        </Card>
        <Card>
          <Clock className="mb-2 h-5 w-5 text-brand" />
          <div className="text-sm font-semibold text-white">Labor guide</div>
          <p className="text-[13px] text-slate-400">Book hours the shop charges and how long jobs really take, with a quick estimate.</p>
        </Card>
      </div>
    </Page>
  );
}

export function VehiclePage() {
  return (
    <Page title="Choose vehicle" back="/">
      <div className="mx-auto max-w-lg">
        <VehiclePicker onPicked={() => navigate('/')} />
      </div>
    </Page>
  );
}
