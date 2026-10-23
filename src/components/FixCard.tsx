import { CheckCircle2, Clock, ThumbsUp } from 'lucide-react';
import type { Fix } from '../api/fixes';
import type { VehicleMatch } from '../lib/vehicle';
import { timesFixed } from '../lib/fixRank';
import { systemInfo } from '../data/systems';
import { Link } from '../lib/router';
import { Badge, shortDate } from './ui';

const TIER_TONE: Record<string, 'green' | 'orange' | 'blue' | 'slate'> = {
  exact: 'green',
  near: 'orange',
  model: 'orange',
  engine: 'blue',
  make: 'slate',
};

export function FixCard({ fix, match, highlightCodes = [] }: { fix: Fix; match?: VehicleMatch | null; highlightCodes?: string[] }) {
  const n = timesFixed(fix);
  return (
    <Link to={`/fixes/${fix.id}`} className="block rounded-2xl border border-white/10 bg-panel p-4 transition-colors hover:bg-panel-2">
      <div className="flex flex-wrap items-center gap-2">
        {match && <Badge tone={TIER_TONE[match.tier]}>{match.label}</Badge>}
        <Badge tone={n > 1 ? 'green' : 'slate'}>
          <ThumbsUp className="h-3 w-3" /> Fixed {n} {n === 1 ? 'vehicle' : 'vehicles'}
        </Badge>
        <span className="text-xs text-slate-500">{systemInfo(fix.system).label}</span>
      </div>
      <div className="mt-2 text-[13px] text-slate-400">
        {fix.model_year} {fix.make} {fix.model}
        {fix.engine ? ` · ${fix.engine}` : ''}
        {fix.mileage ? ` · ${fix.mileage.toLocaleString()} mi` : ''}
      </div>
      <h3 className="mt-1 text-sm font-semibold text-white">{fix.symptom}</h3>
      {fix.dtc_codes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fix.dtc_codes.map((c) => (
            <span
              key={c}
              className={
                highlightCodes.includes(c)
                  ? 'rounded-md border border-brand/50 bg-brand/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand-soft'
                  : 'rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-300'
              }
            >
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-[13px] text-emerald-100">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div className="min-w-0">
          <span className="font-semibold">Fix: </span>
          <span className="line-clamp-2">{fix.fix}</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>Cause: {fix.root_cause.length > 90 ? `${fix.root_cause.slice(0, 90)}…` : fix.root_cause}</span>
        {fix.labor_hours != null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {fix.labor_hours} h
          </span>
        )}
        <span>
          {fix.author ?? 'A tech'} · {shortDate(fix.created_at)}
        </span>
      </div>
    </Link>
  );
}
