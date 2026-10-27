import { useState, type FormEvent, type ReactNode } from 'react';
import { ClipboardList, FileText, History, Receipt, StickyNote, ThumbsUp, Wrench } from 'lucide-react';
import { Link, navigate, type Route } from '../lib/router';
import { useVehicle } from '../lib/vehicleStore';
import { useAsync } from '../lib/useAsync';
import { isVinShaped, normalizeVin } from '../lib/vin';
import { vehicleTitle } from '../lib/vehicle';
import { visitCount, type HistoryEntry, type HistoryKind } from '../lib/history';
import { historyForVin } from '../api/history';
import { Button, Card, Empty, ErrorNote, Input, Loading, Notice, Page, cx, shortDate } from '../components/ui';

const ICON: Record<HistoryKind, ReactNode> = {
  job: <ClipboardList className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  quote: <FileText className="h-4 w-4" />,
  fix: <Wrench className="h-4 w-4" />,
  confirmation: <ThumbsUp className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
};

const TONE: Record<HistoryKind, string> = {
  job: 'bg-sky-500/15 text-sky-300',
  receipt: 'bg-emerald-500/15 text-emerald-300',
  quote: 'bg-white/5 text-slate-300',
  fix: 'bg-brand/20 text-brand-soft',
  confirmation: 'bg-brand/10 text-brand-soft',
  note: 'bg-amber-500/15 text-amber-200',
};

function Entry({ e }: { e: HistoryEntry }) {
  const body = (
    <div className="flex gap-3">
      <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TONE[e.kind])}>{ICON[e.kind]}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {shortDate(e.date)}
          {e.job && e.kind !== 'job' && <span className="normal-case"> · job {e.job}</span>}
        </div>
        <div className="text-[14px] font-semibold text-white">{e.title}</div>
        {e.detail.map((d) => (
          <div key={d} className="text-[13px] leading-relaxed text-slate-300">
            {d}
          </div>
        ))}
      </div>
    </div>
  );
  return <li>{e.to ? <Link to={e.to} className="-mx-2 block rounded-xl px-2 py-2 hover:bg-white/5">{body}</Link> : <div className="py-2">{body}</div>}</li>;
}

function Timeline({ vin }: { vin: string }) {
  const h = useAsync(() => historyForVin(vin), [vin]);
  if (h.loading) return <Loading label="Loading the service history…" />;
  if (h.error) return <ErrorNote message={h.error} onRetry={h.reload} />;
  const entries = h.data?.entries ?? [];
  const visits = visitCount(entries);
  return (
    <>
      <Card className="flex items-center gap-4">
        <div>
          <div className="font-heading text-2xl font-bold text-white">{visits}</div>
          <div className="text-xs text-slate-400">job{visits === 1 ? '' : 's'} with Adaptivity</div>
        </div>
        <div>
          <div className="font-heading text-2xl font-bold text-white">{entries.filter((e) => e.kind === 'fix').length}</div>
          <div className="text-xs text-slate-400">confirmed fix{entries.filter((e) => e.kind === 'fix').length === 1 ? '' : 'es'}</div>
        </div>
        <div className="min-w-0 flex-1 text-right font-mono text-xs text-slate-500">{vin}</div>
      </Card>
      {entries.length === 0 ? (
        <Empty icon={<History className="h-8 w-8" />} title="Nothing recorded for this VIN yet">
          First visit. Record the fix when the job is done, and it shows here next time.
        </Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-white/5">
            {entries.map((e, i) => (
              <Entry key={`${e.kind}-${e.date}-${i}`} e={e} />
            ))}
          </ul>
        </Card>
      )}
      <p className="text-[11px] leading-relaxed text-slate-500">
        Jobs come from Adaptivity bookings with this VIN. Quotes and receipts show for admins only.{h.data?.partial ? ' Some records could not be loaded.' : ''}
      </p>
    </>
  );
}

/** #/history — everything the shop has on one VIN, newest first. #/history?vin=… looks up another. */
export function HistoryPage({ route }: { route: Route }) {
  const { vehicle } = useVehicle();
  const asked = normalizeVin(route.query.get('vin') ?? '');
  const vin = isVinShaped(asked) ? asked : vehicle?.vin ? normalizeVin(vehicle.vin) : '';
  const [text, setText] = useState(asked);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = normalizeVin(text);
    if (isVinShaped(v)) navigate(`/history?vin=${v}`, { replace: true });
  };
  const forCurrent = vin && vehicle?.vin && normalizeVin(vehicle.vin) === vin;

  return (
    <Page title="Service history" subtitle={forCurrent && vehicle ? vehicleTitle(vehicle) : vin || undefined} back="/">
      <form onSubmit={submit} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value.toUpperCase())} placeholder="Look up another VIN" className="font-mono" maxLength={24} aria-label="VIN" />
        <Button type="submit" disabled={!isVinShaped(normalizeVin(text))}>
          Look up
        </Button>
      </form>
      {vin ? (
        <Timeline key={vin} vin={vin} />
      ) : (
        <Notice>
          History is kept by VIN. {vehicle ? 'This vehicle was picked by year, make and model —' : 'No vehicle is picked —'}{' '}
          <Link to="/vehicle" className="font-semibold underline">
            decode the VIN
          </Link>{' '}
          or type one above.
        </Notice>
      )}
    </Page>
  );
}
