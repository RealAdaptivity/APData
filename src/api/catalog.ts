import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setNhtsaAsk } from '../lib/vehicleCatalog';

/**
 * Connects the vehicle picker's catalog to the vpic-catalog edge function,
 * which asks NHTSA for motorcycle and motorhome models (NHTSA sends no CORS
 * headers, so the browser cannot ask it directly).
 */
setNhtsaAsk(async (body) => {
  const { data, error } = await supabase.functions.invoke('vpic-catalog', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const parsed = (await error.context.json().catch(() => null)) as { error?: string } | null;
      if (parsed?.error) throw new Error(parsed.error);
    }
    throw new Error(/fetch|network/i.test(error.message) ? 'No connection to the NHTSA catalog. Try again.' : error.message);
  }
  return data;
});
