import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorText } from './errors';

export type AsyncState<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

/**
 * Run an async load when its inputs change. A slow answer for an old input is
 * dropped, so switching vehicles quickly never shows the previous vehicle's data.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const run = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const id = ++run.current;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (id === run.current) setData(d);
      })
      .catch((e) => {
        if (id === run.current) {
          setData(undefined);
          setError(errorText(e));
        }
      })
      .finally(() => {
        if (id === run.current) setLoading(false);
      });
    // The caller's deps decide when to reload, like useEffect's own list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
