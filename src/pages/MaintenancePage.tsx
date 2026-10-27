import { useMemo, useState } from 'react';
import { Clock, MapPin, Wrench } from 'lucide-react';
import { Link } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { vehicleTitle } from '../lib/vehicle';
import { APPLIES_LABEL, MAINTENANCE, appliesTo, dueAt, intervalText, traitsFromEngine, type MaintenanceItem } from '../data/maintenance';
import { Badge, Card, Input, Notice, Page, Section, cx } from '../components/ui';

type Row = { item: MaintenanceItem; every: number | null; months: number | null; state: ReturnType<typeof dueAt>; maybe: boolean };

function ItemRow({ r }: { r: Row }) {
  const { item } = r;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-semibold text-white">{item.name}</span>
        {r.maybe && APPLIES_LABEL[item.applies] && <Badge tone="blue">{APPLIES_LABEL[item.applies]} only</Badge>}
      </div>
      <div className="text-xs text-slate-400">
        {intervalText(r.every, r.months)}
        {r.state.atMiles != null && r.state.state !== 'due' && ` · next at ${r.state.atMiles.toLocaleString('en-US')} mi`}
        {r.state.state === 'due' && r.state.atMiles != null && ` · the ${r.state.atMiles.toLocaleString('en-US')} mi service`}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{item.note}</p>
      <div className="mt-1.5 flex flex-wrap gap-3 text-xs font-semibold">
        {item.laborJob && (
          <Link to={`/labor/${item.laborJob}`} className="inline-flex items-center gap-1 text-brand-soft hover:underline">
            <Clock className="h-3.5 w-3.5" /> Labor time
          </Link>
        )}
        {item.location && (
          <Link to={`/locations/${item.location}`} className="inline-flex items-center gap-1 text-brand-soft hover:underline">
            <MapPin className="h-3.5 w-3.5" /> Where it is
          </Link>
        )}
      </div>
    </li>
  );
}

/** #/maintenance — what is due at this mileage, on the usual intervals. */
export function MaintenancePage() {
  const { vehicle } = useVehicle();
  const [milesText, setMilesText] = useState('');
  const [severe, setSevere] = useState(true);
  const traits = traitsFromEngine(vehicle?.engine);
  const miles = Number(milesText.replace(/[^0-9]/g, '')) || 0;

  const rows = useMemo<Row[]>(
    () =>
      MAINTENANCE.map((item) => {
        const ok = appliesTo(item, traits);
        const every = severe ? (item.severeMiles ?? item.miles) : item.miles;
        const months = severe ? (item.severeMonths ?? item.months) : item.months;
        return { item, every, months, state: dueAt(miles, every), maybe: ok === null, hide: ok === false };
      })
        .filter((r) => !r.hide)
        .map(({ hide: _hide, ...r }) => r),
    [miles, severe, traits.diesel, traits.turbo, traits.hybrid] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const groups: { title: string; aside?: string; list: Row[] }[] = miles
    ? [
        { title: 'Due now', aside: `at ${miles.toLocaleString('en-US')} mi`, list: rows.filter((r) => r.state.state === 'due') },
        { title: 'Coming up', aside: 'within 1,500 mi', list: rows.filter((r) => r.state.state === 'soon') },
        { title: 'By age', aside: 'check the date last done', list: rows.filter((r) => r.state.state === 'time') },
        { title: 'Later', list: rows.filter((r) => r.state.state === 'later') },
      ]
    : [{ title: 'Every item', list: rows }];

  return (
    <Page title="Maintenance schedule" subtitle={vehicle ? `${vehicleTitle(vehicle)}${vehicle.engine ? ` · ${vehicle.engine}` : ''}` : 'Typical intervals'} back="/">
      <Card className="space-y-3">
        <label className="block space-y-1.5">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Odometer</span>
          <Input value={milesText} onChange={(e) => setMilesText(e.target.value)} inputMode="numeric" placeholder="Current mileage, e.g. 61,200" />
        </label>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-ink p-1" role="tablist" aria-label="Service type">
          {([true, false] as const).map((s) => (
            <button
              key={String(s)}
              type="button"
              role="tab"
              aria-selected={severe === s}
              onClick={() => setSevere(s)}
              className={cx('min-h-[40px] rounded-lg text-xs font-semibold', severe === s ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/5')}
            >
              {s ? 'Severe service' : 'Normal service'}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Severe service is short trips, stop-and-go, towing, dust, extreme heat or cold, or rideshare — most daily drivers. {traits.diesel === null && 'Pick the engine to drop items that do not apply.'}
        </p>
      </Card>

      {groups
        .filter((g) => g.list.length)
        .map((g) => (
          <Section key={g.title} title={g.title} aside={g.aside}>
            <ul className="divide-y divide-white/5">
              {g.list.map((r) => (
                <ItemRow key={r.item.id} r={r} />
              ))}
            </ul>
          </Section>
        ))}

      <Notice icon={<Wrench className="h-4 w-4" />}>
        Typical intervals, not this vehicle’s factory schedule. The owner’s manual or the maintenance minder decides — and without the last-service record, “due now” means it falls due around this mileage.
      </Notice>
    </Page>
  );
}
