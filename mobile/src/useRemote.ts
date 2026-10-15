import { useCallback, useEffect, useState } from 'react';

/**
 * Load once on mount, reload on pull-to-refresh. State is only set when the
 * request settles, never synchronously from the effect.
 */
export function useRemote<T>(fetcher: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(
    () =>
      fetcher().then(
        (d) => {
          setData(d);
          setError(null);
          setLoading(false);
        },
        (err: unknown) => {
          setError(String(err));
          setLoading(false);
        }
      ),
    [fetcher]
  );

  useEffect(() => {
    void run();
  }, [run]);

  const refresh = useCallback(() => {
    setLoading(true);
    void run();
  }, [run]);

  return { data, error, loading, refresh };
}
