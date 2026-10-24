import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from './errors';

export type Keyed<T> = {
  /** The answer for the current key; never an answer for an earlier key. */
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

/**
 * Load something named by a key; a null key loads nothing. Unlike useAsync,
 * the answer is tied to the key it was loaded for, so the render right after
 * the key changes already reads as loading instead of showing the old answer
 * (a picker step would otherwise flash "none listed" for a frame).
 */
export function useKeyed<T>(key: string | null, load: () => Promise<T>): Keyed<T> {
  const [state, setState] = useState<{ key: string; data?: T; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const full = key === null ? null : `${key}#${attempt}`;
  useEffect(() => {
    if (full === null) return;
    let live = true;
    loadRef.current().then(
      (data) => {
        if (live) setState({ key: full, data });
      },
      (e: unknown) => {
        if (live) setState({ key: full, error: errorText(e) });
      }
    );
    return () => {
      live = false;
    };
  }, [full]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const fresh = full !== null && state?.key === full ? state : null;
  return { data: fresh?.data, error: fresh?.error ?? null, loading: full !== null && !fresh, reload };
}
