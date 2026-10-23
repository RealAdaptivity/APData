/**
 * Supabase / PostgREST errors in words a tech can act on.
 *
 * The one worth singling out is "the table does not exist": AP Data's tables
 * come from a migration in the AdaptivityPerformance repo, and until it is
 * applied every shop-data screen would otherwise say something cryptic like
 * "Could not find the table 'public.repair_fixes' in the schema cache".
 */

export type DbErrorLike = { code?: string; message?: string; details?: string | null; hint?: string | null };

export const SETUP_MESSAGE =
  'AP Data’s shop database is not set up yet. Apply the AP Data migration ' +
  '(20261023204924_ap_data_repair_information.sql in the AdaptivityPerformance repo) to the Supabase project.';

export function isMissingSchema(e: DbErrorLike | null | undefined): boolean {
  if (!e) return false;
  if (e.code === 'PGRST205' || e.code === 'PGRST202' || e.code === '42P01' || e.code === '42883') return true;
  return /could not find the (table|function)|relation .* does not exist|schema cache/i.test(e.message ?? '');
}

export function dbErrorMessage(e: DbErrorLike | null | undefined, fallback = 'Something went wrong. Try again.'): string {
  if (!e) return fallback;
  if (isMissingSchema(e)) return SETUP_MESSAGE;
  const msg = (e.message ?? '').trim();
  if (e.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Your account is not allowed to do that. Only the author or an admin can change shop entries.';
  }
  if (e.code === '23505') return 'That is already saved.';
  if (e.code === '23514') return 'One of the fields is too long, empty, or in the wrong format.';
  if (/failed to fetch|network/i.test(msg)) return 'No connection. Check your signal and try again.';
  if (/jwt|not authenticated|auth session missing/i.test(msg)) return 'Your sign-in expired. Sign in again.';
  return msg || fallback;
}

/** Throws a readable Error for a Supabase { error } result. */
export function check<T extends DbErrorLike | null>(error: T, fallback?: string): void {
  if (error) throw new Error(dbErrorMessage(error, fallback));
}

export function errorText(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (e instanceof Error && e.message.trim()) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return dbErrorMessage(e as DbErrorLike, fallback);
  if (typeof e === 'string' && e.trim()) return e;
  return fallback;
}
