import { useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Flame, ShieldAlert, ShieldCheck, ThumbsUp, Zap } from 'lucide-react';
import { useVehicle } from '../lib/vehicleStore';
import { useAsync } from '../lib/useAsync';
import { researchFor, type ComplaintItem, type RecallItem } from '../lib/research';
import { vehicleKey, vehicleTitle, type Vehicle } from '../lib/vehicle';
import { NeedVehicle } from '../components/NeedVehicle';
import { Badge, Card, Empty, ErrorNote, Loading, Notice, Page, Section, Stat, shortDate, cx } from '../components/ui';
import { Link } from '../lib/router';

/** NHTSA recalls and owner complaints, through the vehicle-research edge function. */

function useResearch(v: Vehicle) {
  return useAsync(() => researchFor(v), [vehicleKey(v) + (v.vin ?? '')]);
}

function RecallCard({ r }: { r: RecallItem }) {
  const [open, setOpen] = useState(false);
  return (
    <Card as="article" className={cx('space-y-2', r.parkIt && 'border-red-500/50')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-slate-300">{r.campaign}</span>
        {r.parkIt && (
          <Badge tone="red">
            <ShieldAlert className="h-3 w-3" /> Do not drive
          </Badge>
        )}
        {r.parkOutside && (
          <Badge tone="red">
            <Flame className="h-3 w-3" /> Park outside
          </Badge>
        )}
        {r.overTheAir && (
          <Badge tone="blue">
            <Zap className="h-3 w-3" /> Over-the-air remedy
          </Badge>
        )}
        {r.reportedOn && <span className="text-xs text-slate-500">{shortDate(r.reportedOn)}</span>}
      </div>
      <h3 className="text-sm font-bold text-white">{r.component}</h3>
      <p className={cx('prose-pre text-[13px] leading-relaxed text-slate-300', !open && 'line-clamp-3')}>{r.summary}</p>
      {open && (
        <div className="space-y-2 text-[13px] leading-relaxed">
          {r.consequence && (
            <p className="text-slate-300">
              <span className="font-semibold text-amber-200">Risk: </span>
              {r.consequence}
            </p>
          )}
          {r.remedy && (
            <p className="text-slate-300">
              <span className="font-semibold text-emerald-300">Remedy: </span>
              {r.remedy}
            </p>
          )}
        </div>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-brand-soft">
        {open ? 'Show less' : 'Risk and remedy'}
      </button>
    </Card>
  );
}

export function RecallsPage() {
  const { vehicle } = useVehicle();
  if (!vehicle) return <NeedVehicle title="Recalls" why="Recalls are looked up by year, make and model (or VIN)." />;
  return <Recalls vehicle={vehicle} />;
}

function Recalls({ vehicle }: { vehicle: Vehicle }) {
  const { data, error, loading, reload } = useResearch(vehicle);
  const vinLink = data?.links.find((l) => /recalls\?vin=/.test(l.href));
  return (
    <Page title="Safety recalls" subtitle={vehicleTitle(vehicle)} back="/">
      {loading && <Loading label="Asking NHTSA…" />}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {data && (
        <>
          <Notice tone="blue">
            These are every recall NHTSA lists for the {vehicle.year} {vehicle.make} {vehicle.model}. Whether a recall is still open on this exact vehicle depends on its VIN
            {vinLink ? (
              <>
                {' — '}
                <a href={vinLink.href} target="_blank" rel="noreferrer" className="font-semibold underline">
                  check this VIN on NHTSA <ExternalLink className="inline h-3 w-3" />
                </a>
                .
              </>
            ) : (
              '. Decode the VIN to get a direct link to the open-recall check.'
            )}{' '}
            Recall repairs are done free by the brand’s dealers.
          </Notice>
          {data.recalls == null ? (
            <ErrorNote message="NHTSA did not answer the recall lookup. That is not the same as no recalls — try again." onRetry={reload} />
          ) : data.recalls.length === 0 ? (
            <Empty icon={<ShieldCheck className="h-8 w-8" />} title="No recalls on record">
              NHTSA lists no safety recalls for this year, make and model. If the model name was typed by hand, check it matches NHTSA’s spelling.
            </Empty>
          ) : (
            <div className="space-y-3">
              {data.recalls.map((r) => (
                <RecallCard key={r.campaign} r={r} />
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function ComplaintRow({ c }: { c: ComplaintItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {c.filedOn && <span className="text-slate-500">{shortDate(c.filedOn)}</span>}
        {c.components.map((comp) => (
          <Badge key={comp}>{comp}</Badge>
        ))}
        {c.crash && <Badge tone="red">Crash</Badge>}
        {c.fire && <Badge tone="red">Fire</Badge>}
        {c.injuries > 0 && <Badge tone="amber">{c.injuries} injured</Badge>}
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={cx('block w-full text-left text-[13px] leading-relaxed text-slate-300', !open && 'line-clamp-3')}>
        {c.summary}
      </button>
    </li>
  );
}

export function ProblemsPage() {
  const { vehicle } = useVehicle();
  if (!vehicle) return <NeedVehicle title="Common problems" why="Common problems come from owner complaints filed with NHTSA for a year, make and model." />;
  return <Problems vehicle={vehicle} />;
}

function Problems({ vehicle }: { vehicle: Vehicle }) {
  const { data, error, loading, reload } = useResearch(vehicle);
  const [component, setComponent] = useState<string | null>(null);
  const complaints = data?.complaints;
  const top = complaints?.byComponent.slice(0, 12) ?? [];
  const max = top[0]?.count ?? 1;
  const shown = useMemo(
    () => (complaints?.recent ?? []).filter((c) => !component || c.components.includes(component)),
    [complaints, component]
  );

  return (
    <Page title="Common problems" subtitle={vehicleTitle(vehicle)} back="/">
      {loading && <Loading label="Asking NHTSA…" />}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {data && !complaints && <ErrorNote message="NHTSA did not answer the complaints lookup. Try again." onRetry={reload} />}
      {complaints && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Owner complaints" value={complaints.total} />
            <Stat label="Crashes" value={complaints.crashes} tone={complaints.crashes ? 'amber' : undefined} />
            <Stat label="Fires" value={complaints.fires} tone={complaints.fires ? 'red' : undefined} />
            <Stat label="Injuries" value={complaints.injuries} tone={complaints.injuries ? 'amber' : undefined} />
          </div>

          {complaints.total === 0 ? (
            <Empty icon={<AlertTriangle className="h-8 w-8" />} title="No owner complaints on record">
              Nothing filed with NHTSA for this year, make and model — or the model name does not match NHTSA’s spelling.
            </Empty>
          ) : (
            <Section title="What owners report most" aside="Tap a system to filter">
              <ul className="space-y-1.5">
                {top.map((b) => (
                  <li key={b.component}>
                    <button
                      type="button"
                      onClick={() => setComponent((c) => (c === b.component ? null : b.component))}
                      className={cx('w-full rounded-lg px-2 py-1.5 text-left hover:bg-white/5', component === b.component && 'bg-brand/10 ring-1 ring-brand/40')}
                    >
                      <div className="flex justify-between text-[13px]">
                        <span className="font-semibold text-slate-200">{b.component}</span>
                        <span className="text-slate-400">{b.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/5">
                        <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.max(4, (b.count / max) * 100)}%` }} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-500">
                A complaint can name several systems. Pattern failures show up here first — then check{' '}
                <Link to="/fixes" className="font-semibold text-brand-soft">
                  <ThumbsUp className="inline h-3 w-3" /> Confirmed fixes
                </Link>{' '}
                for what the shop found.
              </p>
            </Section>
          )}

          {complaints.recent.length > 0 && (
            <Section title={component ? `Recent complaints · ${component}` : 'Most recent complaints'} aside={`${shown.length} of ${complaints.recent.length} newest`}>
              {shown.length ? (
                <ul className="divide-y divide-white/5">
                  {shown.map((c) => (
                    <ComplaintRow key={c.id || c.summary.slice(0, 40)} c={c} />
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-slate-400">None of the newest complaints name this system.</p>
              )}
            </Section>
          )}
        </>
      )}
    </Page>
  );
}
