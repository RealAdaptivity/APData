import { useState, type FormEvent } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { useAsync } from '../lib/useAsync';
import { errorText } from '../lib/errors';
import { vehicleKey, vehicleTitle, type Vehicle } from '../lib/vehicle';
import { addVehicleNote, deleteVehicleNote, listVehicleNotes } from '../api/notes';
import { NeedVehicle } from '../components/NeedVehicle';
import { Button, Card, Empty, ErrorNote, Loading, Notice, Page, Textarea, shortDate } from '../components/ui';
import { currentJob } from '../lib/jobStore';
import { jobMatchesVehicle } from '../lib/jobLink';

export function NotesPage() {
  const { vehicle } = useVehicle();
  if (!vehicle) return <NeedVehicle title="Shop notes" why="Notes are kept per year, make and model." />;
  return <Notes key={vehicleKey(vehicle)} vehicle={vehicle} />;
}

function Notes({ vehicle }: { vehicle: Vehicle }) {
  const staff = useStaff();
  const notes = useAsync(() => listVehicleNotes(vehicle), [vehicleKey(vehicle)]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const job = currentJob();
      await addVehicleNote(vehicle, draft, job && jobMatchesVehicle(job, vehicle) ? job.ref : null);
      setDraft('');
      notes.reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteVehicleNote(id);
      notes.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Page title="Shop notes" subtitle={vehicleTitle(vehicle)} back="/">
      <Notice>Quick notes for the next tech on a {vehicleTitle(vehicle)}: part numbers that fit, gotchas, where something hides. These also show in the admin portal’s Research tab. For a full fix with codes and causes, add a Confirmed Fix instead.</Notice>
      <Card>
        <form onSubmit={save} className="space-y-3">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Use the 3/8 swivel on the rear caliper bracket bolt — no room for a ratchet" maxLength={4000} />
          {error && <ErrorNote message={error} />}
          <Button type="submit" variant="primary" loading={busy} disabled={!draft.trim()}>
            Add note
          </Button>
        </form>
      </Card>
      {notes.loading && <Loading />}
      {notes.error && <ErrorNote message={notes.error} onRetry={notes.reload} />}
      {notes.data && notes.data.length === 0 && <Empty icon={<StickyNote className="h-8 w-8" />} title="No notes for this vehicle yet" />}
      <ul className="space-y-2">
        {notes.data?.map((n) => (
          <li key={n.id}>
            <Card className="space-y-1.5">
              <p className="prose-pre text-[14px] leading-relaxed text-slate-100">{n.note}</p>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>
                  {n.authorName ?? 'A tech'} · {shortDate(n.createdAt)}
                  {n.vin ? ` · VIN ${n.vin}` : ''}
                </span>
                {staff.role === 'admin' && (
                  <button type="button" onClick={() => void remove(n.id)} className="rounded p-1 hover:text-red-300" aria-label="Delete note">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
}
