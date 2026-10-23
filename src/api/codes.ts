import { supabase } from '../lib/supabase';
import { check } from '../lib/errors';
import { normalizeCode } from '../lib/dtc';
import { currentUserId, nameOf, textOrNull } from './common';

/**
 * The shop code book (dtc_definitions): what manufacturer-specific codes mean
 * on a given make, recorded by techs as they meet them.
 */

export type ShopCode = {
  id: string;
  code: string;
  make: string | null;
  title: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  author: string | null;
};

const SELECT = `id, code, make, title, notes, created_by, created_at, updated_at,
  author:profiles!dtc_definitions_created_by_fkey ( full_name )`;

type Row = Omit<ShopCode, 'author'> & { author: unknown };

const toShopCode = (r: Row): ShopCode => ({ ...r, author: nameOf(r.author) });

export async function shopDefinitions(code: string): Promise<ShopCode[]> {
  const c = normalizeCode(code);
  if (!c) return [];
  const { data, error } = await supabase.from('dtc_definitions').select(SELECT).eq('code', c).order('make', { nullsFirst: true });
  check(error, 'Could not load the shop code book');
  return ((data ?? []) as unknown as Row[]).map(toShopCode);
}

/** Search the shop code book by code prefix or words in the title. */
export async function searchShopDefinitions(query: string): Promise<ShopCode[]> {
  const q = query.trim();
  if (!q) return [];
  const upper = q.toUpperCase().replace(/\s+/g, '');
  const req = supabase.from('dtc_definitions').select(SELECT).limit(100);
  const { data, error } = /^[PBCU][0-9A-F]{0,4}$/.test(upper)
    ? await req.ilike('code', `${upper}%`).order('code')
    : await req.ilike('title', `%${q.replace(/[\\%_]/g, '\\$&')}%`).order('code');
  check(error, 'Could not search the shop code book');
  return ((data ?? []) as unknown as Row[]).map(toShopCode);
}

export async function saveShopDefinition(input: { id?: string; code: string; make: string; title: string; notes: string }): Promise<void> {
  const code = normalizeCode(input.code);
  if (!code) throw new Error('Enter a code like P1450 or B1318.');
  if (input.title.trim().length < 3) throw new Error('Write what the code means.');
  const cols = { code, make: textOrNull(input.make), title: input.title.trim(), notes: textOrNull(input.notes) };
  if (input.id) {
    const { data, error } = await supabase.from('dtc_definitions').update(cols).eq('id', input.id).select('id');
    check(error, 'Could not save the code');
    if (!data?.length) throw new Error('Only the tech who added this, or an admin, can edit it.');
    return;
  }
  const uid = await currentUserId();
  const { error } = await supabase.from('dtc_definitions').insert({ ...cols, created_by: uid });
  if (error?.code === '23505') throw new Error(`The code book already has ${code}${cols.make ? ` for ${cols.make}` : ''}. Edit that entry instead.`);
  check(error, 'Could not save the code');
}

export async function deleteShopDefinition(id: string): Promise<void> {
  const { data, error } = await supabase.from('dtc_definitions').delete().eq('id', id).select('id');
  check(error, 'Could not delete the code');
  if (!data?.length) throw new Error('Only the tech who added this, or an admin, can delete it.');
}
