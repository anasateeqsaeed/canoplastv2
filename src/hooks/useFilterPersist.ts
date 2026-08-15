import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Persists a page's filter state across navigation.
 *
 * Priority on mount:
 *   1. Explicit URL query params (e.g. a fresh drill-down from the dashboard) win.
 *   2. Otherwise the last saved filters for this page (sessionStorage) are restored.
 *   3. Otherwise the provided defaults are used.
 *
 * Filters are written back to sessionStorage on every change, keyed by `pageKey`.
 */
export function useFilterPersist<T extends Record<string, unknown>>(
  pageKey: string,
  defaultFilters: T
) {
  const storageKey = `filters:${pageKey}`;
  const [searchParams] = useSearchParams();

  const [filters, setFiltersState] = useState<T>(() => {
    // 1. If URL has explicit params (fresh drill-down from dashboard), those win.
    const urlOverrides: Partial<T> = {};
    let hasUrlParams = false;
    for (const key of Object.keys(defaultFilters) as (keyof T)[]) {
      const val = searchParams.get(key as string);
      if (val !== null) {
        urlOverrides[key] = val as T[keyof T];
        hasUrlParams = true;
      }
    }
    if (hasUrlParams) {
      return { ...defaultFilters, ...urlOverrides };
    }

    // 2. Otherwise fall back to last saved filters for this page.
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    } catch {
      return defaultFilters;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }, [filters, storageKey]);

  const setFilters = useCallback((update: Partial<T> | ((prev: T) => T)) => {
    setFiltersState((prev) =>
      typeof update === "function"
        ? (update as (prev: T) => T)(prev)
        : { ...prev, ...update }
    );
  }, []);

  const clearFilters = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures.
    }
    setFiltersState(defaultFilters);
  }, [storageKey, defaultFilters]);

  return { filters, setFilters, clearFilters };
}
