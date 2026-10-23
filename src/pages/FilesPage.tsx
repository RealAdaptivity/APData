import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, FileText, ImageOff, Trash2, Upload } from 'lucide-react';
import { useVehicle } from '../lib/vehicleStore';
import { useStaff } from '../lib/auth';
import { useAsync } from '../lib/useAsync';
import { errorText } from '../lib/errors';
import { vehicleKey, vehicleTitle, type Vehicle } from '../lib/vehicle';
import { SYSTEMS, systemInfo } from '../data/systems';
import { ACCEPTED_TYPES, deleteRepairFile, fileUrl, filesForVehicle, prettySize, uploadRepairFile, type FileForVehicle, type FileInput } from '../api/files';
import { NeedVehicle } from '../components/NeedVehicle';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, Loading, Notice, Page, Select, Textarea, cx, shortDate } from '../components/ui';

function Thumb({ f }: { f: FileForVehicle }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = f.mime_type.startsWith('image/') && !/heic|heif/.test(f.mime_type);
  useEffect(() => {
    if (!isImage) return;
    let alive = true;
    fileUrl(f.storage_path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [f.storage_path, isImage]);
  if (!isImage) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink">
        <FileText className="h-10 w-10 text-slate-500" />
      </div>
    );
  }
  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink">
        <ImageOff className="h-8 w-8 text-slate-600" />
      </div>
    );
  }
  return url ? <img src={url} alt={f.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full animate-pulse bg-white/5" />;
}

function UploadForm({ vehicle, onDone }: { vehicle: Vehicle; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState('engine');
  const [scope, setScope] = useState<FileInput['scope']>('model');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const choose = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Take a photo or choose a file first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadRepairFile(vehicle, { file, title, description, system, scope });
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      <input ref={picker} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => camera.current?.click()} icon={<Camera className="h-4 w-4" />}>
          Take photo
        </Button>
        <Button onClick={() => picker.current?.click()} icon={<Upload className="h-4 w-4" />}>
          Choose file
        </Button>
      </div>
      {file && (
        <div className="text-[13px] text-slate-300">
          {file.name} · {prettySize(file.size)}
        </div>
      )}
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fuel pump relay location" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="System">
          <Select value={system} onChange={(e) => setSystem(e.target.value)}>
            {SYSTEMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Applies to">
          <Select value={scope} onChange={(e) => setScope(e.target.value as FileInput['scope'])}>
            <option value="vehicle">Only {vehicleTitle(vehicle)}</option>
            <option value="model">
              {vehicle.make} {vehicle.model}, any year
            </option>
            <option value="make">Every {vehicle.make}</option>
          </Select>
        </Field>
      </div>
      <Field label="Notes (optional)">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Behind the passenger kick panel, top relay" />
      </Field>
      {error && <ErrorNote message={error} />}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={busy} icon={<Upload className="h-4 w-4" />}>
          Upload
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function FilesPage() {
  const { vehicle } = useVehicle();
  if (!vehicle) return <NeedVehicle title="Shop files" why="Files are kept per make and model: component photos, diagrams and PDFs." />;
  return <Files key={vehicleKey(vehicle)} vehicle={vehicle} />;
}

function Files({ vehicle }: { vehicle: Vehicle }) {
  const staff = useStaff();
  const files = useAsync(() => filesForVehicle(vehicle), [vehicleKey(vehicle)]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async (f: FileForVehicle) => {
    // Open the tab first so the pop-up blocker allows it, then point it at the signed link.
    const tab = window.open('', '_blank');
    try {
      const url = await fileUrl(f.storage_path);
      if (tab) tab.location.replace(url);
      else window.location.assign(url);
    } catch (e) {
      tab?.close();
      setError(errorText(e));
    }
  };

  const remove = async (f: FileForVehicle) => {
    if (!window.confirm(`Delete “${f.title}” for everyone?`)) return;
    try {
      await deleteRepairFile(f);
      files.reload();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Page
      title="Shop files"
      subtitle={vehicleTitle(vehicle)}
      back="/"
      actions={
        !uploading && (
          <Button variant="primary" onClick={() => setUploading(true)} icon={<Upload className="h-4 w-4" />}>
            <span className="hidden sm:inline">Add file</span>
          </Button>
        )
      }
    >
      <Notice>Photos of where things are, wiring sketches, and diagrams or PDFs the shop is allowed to keep. Only Adaptivity staff can see them.</Notice>
      {uploading && (
        <UploadForm
          vehicle={vehicle}
          onDone={() => {
            setUploading(false);
            files.reload();
          }}
        />
      )}
      {error && <ErrorNote message={error} />}
      {files.loading && <Loading />}
      {files.error && <ErrorNote message={files.error} onRetry={files.reload} />}
      {files.data && files.data.length === 0 && !uploading && (
        <Empty icon={<Camera className="h-8 w-8" />} title="No files for this vehicle yet" action={<Button variant="primary" onClick={() => setUploading(true)}>Add the first one</Button>}>
          Snap the hidden ground strap, the relay nobody can find, the routing of a belt before you take it off.
        </Empty>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.data?.map((f) => (
          <Card key={f.id} as="article" className="flex flex-col overflow-hidden p-0">
            <button type="button" onClick={() => void open(f)} className="aspect-[4/3] w-full overflow-hidden" aria-label={`Open ${f.title}`}>
              <Thumb f={f} />
            </button>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <div className="line-clamp-2 text-[13px] font-semibold text-white">{f.title}</div>
              <div className="flex flex-wrap gap-1">
                <Badge>{systemInfo(f.system).short}</Badge>
                <Badge tone={f.rank >= 40 ? 'green' : 'slate'}>{f.matchLabel}</Badge>
              </div>
              {f.description && <p className="line-clamp-3 text-[12px] text-slate-400">{f.description}</p>}
              <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                <span className="truncate">
                  {f.author ?? 'A tech'} · {shortDate(f.created_at)}
                </span>
                {(f.created_by === staff.id || staff.role === 'admin') && (
                  <button type="button" onClick={() => void remove(f)} className={cx('rounded p-1 hover:text-red-300')} aria-label={`Delete ${f.title}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
