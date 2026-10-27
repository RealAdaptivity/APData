import { ClipboardList, X } from 'lucide-react';
import { Link } from '../lib/router';
import { useJob, setJob } from '../lib/jobStore';
import { jobMatchesVehicle } from '../lib/jobLink';
import { useVehicle } from '../lib/vehicleStore';

/** The Adaptivity job this tab was opened from, under the vehicle bar on every screen. */
export function JobBar() {
  const job = useJob();
  const { vehicle } = useVehicle();
  if (!job) return null;
  const matches = !!vehicle && jobMatchesVehicle(job, vehicle);
  const codes = job.codes.length ? `&codes=${job.codes.join(',')}` : '';
  return (
    <div className="no-print flex items-center gap-3 border-b border-brand/30 bg-brand/10 px-4 py-2">
      <ClipboardList className="h-4 w-4 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-white">
          Job {job.ref}
          {!matches && <span className="font-normal text-amber-200"> · a different vehicle is picked</span>}
        </div>
        {job.issue && <div className="truncate text-[11px] text-slate-300">“{job.issue}”</div>}
      </div>
      {matches && (
        <Link to={`/fixes/new?job=${encodeURIComponent(job.ref)}${codes}`} className="shrink-0 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white">
          Record fix
        </Link>
      )}
      <button type="button" onClick={() => setJob(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10" aria-label="Done with this job">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
