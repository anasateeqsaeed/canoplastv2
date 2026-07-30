import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRealtimeSync, type RealtimeChangePayload } from './useRealtimeSync';

// --- Supabase client mock -------------------------------------------------
// Capture the postgres_changes handler so tests can fire synthetic events,
// and record channel lifecycle calls.
let capturedHandler: ((payload: RealtimeChangePayload) => void) | null = null;
const subscribedChannels: unknown[] = [];

const subscribe = vi.fn(() => {
  const sentinel = { id: subscribedChannels.length };
  subscribedChannels.push(sentinel);
  return sentinel;
});
const on = vi.fn((_event: string, _filter: unknown, handler: (p: RealtimeChangePayload) => void) => {
  capturedHandler = handler;
  return { subscribe };
});
const channel = vi.fn(() => ({ on }));
const removeChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (...args: unknown[]) => channel(...(args as [])),
    removeChannel: (...args: unknown[]) => removeChannel(...(args as [])),
  },
}));

function fireEvent(overrides: Partial<RealtimeChangePayload> = {}) {
  const payload = { eventType: 'UPDATE', new: {}, old: {}, ...overrides } as RealtimeChangePayload;
  act(() => {
    capturedHandler?.(payload);
  });
}

function makeWrapper() {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, invalidateSpy };
}

describe('useRealtimeSync', () => {
  beforeEach(() => {
    // Clear here (not afterEach) so counts are fresh after Testing Library's
    // own auto-unmount cleanup has run for the previous test.
    vi.clearAllMocks();
    capturedHandler = null;
    subscribedChannels.length = 0;
  });

  it('invalidates the query immediately when no form is active', () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    renderHook(() => useRealtimeSync({ table: 'clients', queryKey: ['clients'] }), { wrapper });

    fireEvent();

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['clients'] });
  });

  it('buffers changes while the form is active and flushes on close', () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useRealtimeSync({ table: 'clients', queryKey: ['clients'], isFormActive: active }),
      { wrapper, initialProps: { active: true } },
    );

    fireEvent();
    // Held back — nothing invalidated while the form is open.
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Close the form: the buffered change is flushed exactly once.
    rerender({ active: false });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['clients'] });
  });

  it('reads the current form-active flag through a ref (no stale closure)', () => {
    // The channel subscribes once while inactive. After the form opens, an
    // event must still be buffered — a stale closure would apply it instead.
    const { wrapper, invalidateSpy } = makeWrapper();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useRealtimeSync({ table: 'clients', queryKey: ['clients'], isFormActive: active }),
      { wrapper, initialProps: { active: false } },
    );

    rerender({ active: true });
    fireEvent();

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(channel).toHaveBeenCalledTimes(1); // did not re-subscribe
  });

  it('does not flush when the form closes with no pending change', () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useRealtimeSync({ table: 'clients', queryKey: ['clients'], isFormActive: active }),
      { wrapper, initialProps: { active: true } },
    );

    rerender({ active: false });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('calls a custom onChange handler instead of invalidating', () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    const onChange = vi.fn();
    renderHook(
      () => useRealtimeSync({ table: 'clients', queryKey: ['clients'], onChange }),
      { wrapper },
    );

    fireEvent({ eventType: 'INSERT' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('does not subscribe when disabled and removes the channel on unmount', () => {
    const { wrapper } = makeWrapper();
    const { rerender, unmount } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useRealtimeSync({ table: 'clients', queryKey: ['clients'], enabled }),
      { wrapper, initialProps: { enabled: false } },
    );

    expect(channel).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(channel).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});
