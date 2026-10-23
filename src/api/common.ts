import { supabase } from '../lib/supabase';

/** The signed-in user's id, from the local session (no network round trip). */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Your sign-in expired. Sign in again.');
  return id;
}

/** PostgREST returns an embedded to-one row as an object, or as an array on
 *  some relationships; read the name either way. */
export function nameOf(v: unknown): string | null {
  const one = Array.isArray(v) ? v[0] : v;
  const name = (one as { full_name?: string | null } | null | undefined)?.full_name;
  return name?.trim() || null;
}

/** Trimmed text, or null for blank — what optional columns store. */
export function textOrNull(s: string | null | undefined): string | null {
  const t = (s ?? '').trim();
  return t ? t : null;
}

export function numberOrNull(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined || s === '') return null;
  const n = typeof s === 'number' ? s : Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
