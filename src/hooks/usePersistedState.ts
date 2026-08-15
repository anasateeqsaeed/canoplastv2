import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * Filter persistence
 * ------------------
 * Report / list screens keep their filters (search text, status, date range,
 * selected client, …) in component state, which is thrown away the moment you
 * navigate to another screen. Coming back then resets everything and the user
 * has to re-apply the same filters to find the view they were on.
 *
 * `usePersistedState` is a drop-in replacement for `useState` that mirrors the
 * value into `sessionStorage`, keyed per screen. The filter therefore survives
 * navigating away and back (and a page reload) and is only wiped when the
 * browser tab / window is closed — i.e. it stays "until we close it ourselves".
 *
 * Give every call a stable, screen-unique `key` (e.g. `"sales-orders.status"`).
 */

const PREFIX = 'canoplast:filters:';

function readStored<T>(storageKey: string, fallback: () => T): T {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    /* corrupt value or storage unavailable — fall back to the default */
  }
  return fallback();
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = PREFIX + key;

  const [state, setState] = useState<T>(() =>
    readStored(storageKey, () =>
      typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue,
    ),
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* storage full / unavailable — the filter simply won't persist */
    }
  }, [storageKey, state]);

  return [state, setState];
}

/**
 * Same idea for `Date`-typed filters. `Date` objects don't survive
 * `JSON.stringify`/`parse`, so the value is stored as an ISO string and revived
 * back into a `Date` (or `undefined`). Setter accepts a `Date | undefined`,
 * matching how date-range pickers call it.
 */
export function usePersistedDateState(
  key: string,
  defaultValue?: Date,
): [Date | undefined, (value: Date | undefined) => void] {
  const [iso, setIso] = usePersistedState<string | null>(
    key,
    defaultValue ? defaultValue.toISOString() : null,
  );

  const value = useMemo(() => (iso ? new Date(iso) : undefined), [iso]);

  const set = useCallback(
    (next: Date | undefined) => setIso(next ? next.toISOString() : null),
    [setIso],
  );

  return [value, set];
}
