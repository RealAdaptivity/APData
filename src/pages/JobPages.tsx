import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { navigate, type Route } from '../lib/router';
import { parseJobLink } from '../lib/jobLink';
import { setJob } from '../lib/jobStore';
import { useVehicle } from '../lib/vehicleStore';
import { rememberResearch, researchVin, vehicleFromDecode } from '../lib/research';
import { errorText } from '../lib/errors';
import type { Vehicle } from '../lib/vehicle';
import { Empty, ErrorNote, LinkButton, Page } from '../components/ui';

/**
 * #/go?job=… — opened from a job in the Adaptivity tech app or the admin
 * dispatch console. Decodes the VIN (or takes the year, make and model the
 * booking has), sets the vehicle, remembers the job, and opens the dashboard.
 */
export function GoPage({ route }: { route: Route }) {
  const { setVehicle } = useVehicle();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const job = parseJobLink(route.query);

  useEffect(() => {
    if (!job || started.current) return;
    started.current = true;
    const fromBooking: Vehicle | null =
      job.year && job.make && job.model ? { year: job.year, make: job.make, model: job.model, engine: job.engine, vin: job.vin } : null;
    const open = (v: Vehicle) => {
      setVehicle(v);
      setJob(job);
      navigate(job.codes.length === 1 ? `/codes/${job.codes[0]}` : '/', { replace: true });
    };
    (async () => {
      if (job.vin) {
        try {
          const r = await researchVin(job.vin);
          const v = vehicleFromDecode(r);
          rememberResearch(v, r);
          open(v);
          return;
        } catch (e) {
          if (!fromBooking) {
            setError(`${errorText(e, 'Could not decode the VIN.')} Pick the vehicle by year, make and model instead.`);
            setJob(job);
            return;
          }
        }
      }
      if (fromBooking) open(fromBooking);
      else {
        setJob(job);
        setError('The job has no VIN or year, make and model. Pick the vehicle, and the fix you record will still be tied to the job.');
      }
    })();
  }, [job, setVehicle]);

  if (!job) {
    return (
      <Page title="Open a job">
        <Empty title="That link does not name an Adaptivity job." action={<LinkButton to="/">Go to the vehicle</LinkButton>} />
      </Page>
    );
  }
  if (error) {
    return (
      <Page title={`Job ${job.ref}`}>
        <ErrorNote message={error} />
        <LinkButton to="/vehicle" variant="primary">
          Choose vehicle
        </LinkButton>
      </Page>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400" role="status">
      <LoaderCircle className="h-4 w-4 animate-spin text-brand" /> Opening job {job.ref}…
    </div>
  );
}
