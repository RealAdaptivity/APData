import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { ilikeLiteral, matchVehicle, scopeFit, type Vehicle, type VehicleMatch } from '../lib/vehicle';
import { currentUserId, nameOf, textOrNull } from './common';
import { storagePath } from '../lib/fileNames';

/**
 * Shop files (repair_files + the private repair-files bucket): photos of
 * component locations, wiring sketches, diagrams and PDFs, per vehicle.
 */

export const FILE_BUCKET = 'repair-files';
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'];

export type RepairFile = {
  id: string;
  model_year: number | null;
  make: string | null;
  model: string | null;
  engine: string | null;
  system: string;
  title: string;
  description: string | null;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_by: string | null;
  created_at: string;
  author: string | null;
};

export type FileForVehicle = RepairFile & { matchLabel: string; rank: number };

const SELECT = `id, model_year, make, model, engine, system, title, description, storage_path, mime_type, size_bytes, created_by, created_at,
  author:profiles!repair_files_created_by_fkey ( full_name )`;

type Row = Omit<RepairFile, 'author'> & { author: unknown };

/** Files for this vehicle's make: same model within five years first, then make-wide files. */
export async function filesForVehicle(v: Vehicle): Promise<FileForVehicle[]> {
  const { data, error } = await supabase
    .from('repair_files')
    .select(SELECT)
    .ilike('make', ilikeLiteral(v.make))
    .order('created_at', { ascending: false })
    .limit(500);
  check(error, 'Could not load shop files');
  const out: FileForVehicle[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    const file = { ...r, author: nameOf(r.author) };
    if (r.model) {
      const m: VehicleMatch | null = r.model_year ? matchVehicle(v, r) : null;
      if (m && (m.tier === 'exact' || m.tier === 'near' || m.tier === 'model')) {
        out.push({ ...file, matchLabel: m.label, rank: m.rank });
      } else if (!r.model_year && scopeFit(v, r) != null) {
        out.push({ ...file, matchLabel: 'Same model, any year', rank: 25 });
      }
    } else {
      out.push({ ...file, matchLabel: `All ${r.make}`, rank: 5 });
    }
  }
  return out.sort((a, b) => b.rank - a.rank || b.created_at.localeCompare(a.created_at));
}

export type FileInput = {
  file: File;
  title: string;
  description: string;
  system: string;
  /** 'vehicle' = this year/model; 'model' = this model, any year; 'make' = every vehicle of this make. */
  scope: 'vehicle' | 'model' | 'make';
};

export async function uploadRepairFile(v: Vehicle, input: FileInput): Promise<void> {
  const { file } = input;
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Photos (JPG, PNG, HEIC, WebP) and PDFs only.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Files must be under 25 MB.');
  const title = input.title.trim() || file.name.replace(/\.[^.]+$/, '');
  const uid = await currentUserId();
  const path = storagePath(uid, file.name, crypto.randomUUID().slice(0, 8));

  const up = await supabase.storage.from(FILE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) {
    throw new Error(/bucket not found/i.test(up.error.message) ? 'The shop file storage is not set up yet (repair-files bucket).' : up.error.message);
  }
  const { error } = await supabase.from('repair_files').insert({
    make: v.make.trim(),
    model: input.scope === 'make' ? null : v.model.trim(),
    model_year: input.scope === 'vehicle' ? Number(v.year) : null,
    engine: input.scope === 'vehicle' ? v.engine?.trim() || null : null,
    system: input.system,
    title: title.slice(0, 160),
    description: textOrNull(input.description),
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
    created_by: uid,
  });
  if (error) {
    await supabase.storage.from(FILE_BUCKET).remove([path]);
    check(error, 'Could not save the file');
  }
}

/** A link that works for an hour; the bucket is private. */
export async function fileUrl(path: string, download = false): Promise<string> {
  const { data, error } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(path, 3600, download ? { download: true } : undefined);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not open the file');
  return data.signedUrl;
}

export async function deleteRepairFile(f: RepairFile): Promise<void> {
  const { data, error } = await supabase.from('repair_files').delete().eq('id', f.id).select('id');
  check(error, 'Could not delete the file');
  if (!data?.length) throw new Error('Only the tech who uploaded this file, or an admin, can delete it.');
  await supabase.storage.from(FILE_BUCKET).remove([f.storage_path]);
}

export function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
