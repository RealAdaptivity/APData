import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Link } from '../lib/router';
import { useStaff } from '../lib/auth';
import { useAsync } from '../lib/useAsync';
import { fixCapture, laborOverBook, perTech, topCounts } from '../lib/ownerStats';
import { loadOwnerData } from '../api/owner';
import { laborJob } from '../data/laborJobs';
import { lookupCode } from '../lib/dtc';
import { Card, CodeChip, Empty, ErrorNote, Loading, Page, Section, cx } from '../components/ui';

const PERIODS = [30, 90, 365] as const;

function Stat({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <Card className="space-y-0.5">
      <div className="font-heading text-2xl font-bold text-white">{value}</div>
      <div className="text-xs font-semibold text-slate-300">{label}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </Card>
  );
}

/** #/owner — admins: who is adding to AP Data, what the shop sees most, and where labor runs over book. */
export function OwnerPage() {
  const staff = useStaff();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const data = useAsync(() => (staff.role === 'admin' ? loadOwnerData() : Promise.resolve(null)), [staff.role]);

  const view = useMemo(() => {
    const d = data.data;
    if (!d) return null;
    const recentFixes = d.fixes.filter((f) => Date.now() - new Date(f.created_at).getTime() <= days * 86_400_000);
    return {
      techs: perTech(d.staff, {
        fixes: d.fixes.map((f) => ({ by: f.created_by, at: f.created_at })),
        confirmations: d.confirmations,
        photos: d.photos,
        notes: d.notes,
        specs: d.specs,
        labor: d.labor.map((l) => ({ by: l.created_by, at: l.created_at })),
      }, days),
      codes: topCounts(recentFixes.flatMap((f) => f.dtc_codes ?? []), 10),
      vehicles: topCounts(recentFixes.map((f) => [f.make, f.model].filter(Boolean).join(' ')), 8),
      over: laborOverBook(d.labor),
      capture: fixCapture(d.bookings, d.fixes.map((f) => f.job_ref), days),
      fixCount: recentFixes.length,
    };
  }, [data.data, days]);

  if (staff.role !== 'admin') {
    return (
      <Page title="Shop dashboard" back="/">
        <Empty icon={<BarChart3 className="h-8 w-8" />} title="For admins">
          The shop dashboard shows every tech’s activity, so only admins see it.
        </Empty>
      </Page>
    );
  }

  return (
    <Page title="Shop dashboard" subtitle="What AP Data is learning from the shop" back="/">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-panel p-1" role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={days === p}
            onClick={() => setDays(p)}
            className={cx('min-h-[40px] rounded-lg text-xs font-semibold', days === p ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/5')}
          >
            {p === 365 ? 'Year' : `${p} days`}
          </button>
        ))}
      </div>

      {data.loading && <Loading />}
      {data.error && <ErrorNote message={data.error} onRetry={data.reload} />}
      {view && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat value={view.fixCount} label="Confirmed fixes added" />
            <Stat
              value={view.capture.pct == null ? '—' : `${view.capture.pct}%`}
              label="Finished jobs with a fix recorded"
              sub={`${view.capture.withFix} of ${view.capture.completed} completed Adaptivity jobs`}
            />
            <Stat value={view.techs.reduce((s, t) => s + t.total, 0)} label="Entries by the team" sub="Fixes, confirmations, photos, notes, specs, labor" />
          </div>

          <Section title="By tech">
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-1 py-1.5 font-semibold">Tech</th>
                    <th className="px-1 py-1.5 text-right font-semibold">Fixes</th>
                    <th className="px-1 py-1.5 text-right font-semibold">Confirms</th>
                    <th className="px-1 py-1.5 text-right font-semibold">Photos</th>
                    <th className="px-1 py-1.5 text-right font-semibold">Notes</th>
                    <th className="px-1 py-1.5 text-right font-semibold">Specs</th>
                    <th className="px-1 py-1.5 text-right font-semibold">Labor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {view.techs.map((t) => (
                    <tr key={t.id} className={t.total ? 'text-slate-200' : 'text-slate-500'}>
                      <td className="px-1 py-2 font-semibold">{t.name}</td>
                      <td className="px-1 py-2 text-right tabular-nums">{t.fixes}</td>
                      <td className="px-1 py-2 text-right tabular-nums">{t.confirmations}</td>
                      <td className="px-1 py-2 text-right tabular-nums">{t.photos}</td>
                      <td className="px-1 py-2 text-right tabular-nums">{t.notes}</td>
                      <td className="px-1 py-2 text-right tabular-nums">{t.specs}</td>
                      <td className="px-1 py-2 text-right tabular-nums">{t.labor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Codes the shop fixes most">
            {view.codes.length ? (
              <ul className="space-y-1.5">
                {view.codes.map((c) => (
                  <li key={c.key} className="flex items-center gap-3">
                    <CodeChip code={c.key} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-slate-300">{lookupCode(c.key)?.title ?? ''}</span>
                    <span className="font-mono text-xs text-slate-500">{c.n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-slate-400">No fixes with codes in this period yet.</p>
            )}
          </Section>

          <Section title="Vehicles the shop fixes most">
            {view.vehicles.length ? (
              <ul className="space-y-1 text-[13px] text-slate-200">
                {view.vehicles.map((v) => (
                  <li key={v.key} className="flex justify-between">
                    <span>{v.key}</span>
                    <span className="font-mono text-xs text-slate-500">{v.n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-slate-400">No fixes in this period yet.</p>
            )}
          </Section>

          <Section title="Jobs that run over book" aside="Actual average vs the shop’s book time">
            {view.over.length ? (
              <ul className="divide-y divide-white/5">
                {view.over.map((o) => (
                  <li key={o.job}>
                    <Link to={`/labor/${o.job}`} className="flex items-center gap-3 py-2 hover:bg-white/5">
                      <span className="min-w-0 flex-1 text-[13px] text-slate-200">{laborJob(o.job)?.name ?? o.job}</span>
                      <span className="text-xs text-slate-400">
                        {o.actual.toFixed(1)} h vs {o.book.toFixed(1)} h · {o.count} job{o.count === 1 ? '' : 's'}
                      </span>
                      <span className="w-12 text-right text-xs font-bold text-amber-300">+{o.overPct}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-slate-400">Nothing over book by more than 15% — or not enough book and actual times recorded yet.</p>
            )}
          </Section>
        </>
      )}
    </Page>
  );
}
