import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type RealtimeChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface UseRealtimeSyncOptions {
  /** Postgres table to subscribe to. */
  table: string;
  /** React Query key to invalidate when a change arrives. */
  queryKey: QueryKey;
  /**
   * While `true`, incoming changes are buffered instead of applied, so an
   * open form isn't clobbered by a background refetch. The most recent
   * buffered change is flushed automatically when this flips back to `false`.
   */
  isFormActive?: boolean;
  /** Set to `false` to disable the subscription entirely (e.g. logged out). */
  enabled?: boolean;
  /** Postgres schema. Defaults to `public`. */
  schema?: string;
  /**
   * Optional custom handler. When provided it runs instead of the default
   * query invalidation, receiving the raw change payload.
   */
  onChange?: (payload: RealtimeChangePayload) => void;
}

/**
 * Subscribes to Supabase `postgres_changes` for a table and keeps the matching
 * React Query cache fresh — but holds updates back while a form is open so the
 * user's in-progress edits are never overwritten by a live refetch.
 *
 * The channel is created once; the form-active guard is read through a ref so
 * the subscription callback always sees the current value rather than the one
 * captured on first render (the classic stale-closure trap).
 */
export function useRealtimeSync({
  table,
  queryKey,
  isFormActive = false,
  enabled = true,
  schema = 'public',
  onChange,
}: UseRealtimeSyncOptions) {
  const queryClient = useQueryClient();

  const isFormActiveRef = useRef(isFormActive);
  const onChangeRef = useRef(onChange);
  const pendingPayloadRef = useRef<RealtimeChangePayload | null>(null);
  const hasPendingRef = useRef(false);

  // Always call the latest handler without forcing a re-subscribe.
  onChangeRef.current = onChange;

  // Stable identity for the key so the subscription effect only re-runs when
  // the key's contents change, not on every render's new array reference.
  const queryKeyString = JSON.stringify(queryKey);

  const apply = useCallback(
    (payload: RealtimeChangePayload) => {
      const handler = onChangeRef.current;
      if (handler) {
        handler(payload);
      } else {
        queryClient.invalidateQueries({ queryKey: JSON.parse(queryKeyString) as QueryKey });
      }
    },
    [queryClient, queryKeyString],
  );

  // Keep the guard ref in sync, and flush any buffered change on form close.
  useEffect(() => {
    isFormActiveRef.current = isFormActive;
    if (!isFormActive && hasPendingRef.current) {
      hasPendingRef.current = false;
      const pending = pendingPayloadRef.current;
      pendingPayloadRef.current = null;
      if (pending) apply(pending);
    }
  }, [isFormActive, apply]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`realtime-sync:${schema}:${table}:${queryKeyString}`)
      .on(
        'postgres_changes',
        { event: '*', schema, table },
        (payload: RealtimeChangePayload) => {
          if (isFormActiveRef.current) {
            // Buffer the latest change; it's flushed when the form closes.
            pendingPayloadRef.current = payload;
            hasPendingRef.current = true;
          } else {
            apply(payload);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, schema, table, queryKeyString, apply]);
}
