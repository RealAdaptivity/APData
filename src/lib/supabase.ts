import { createClient } from '@supabase/supabase-js';

/**
 * The AdaptivityPerformance Supabase project — shared with the website, the
 * customer app and the tech app, so a tech signs in to AP Data with the account
 * they already have. The anon key is public by design; row-level security on
 * every AP Data table limits it to admins and techs.
 */
const DEFAULT_URL = 'https://qqyairzymqpkbfxobztx.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeWFpcnp5bXFwa2JmeG9ienR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTExNTUsImV4cCI6MjEwMDU4NzE1NX0.a6pkHT6fVnW6synzig51QOmR0x48fi88zi6RT7MpeLs';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'apdata-auth' },
});
