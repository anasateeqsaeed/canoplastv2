import { useMemo } from 'react';
import { useShiftSettings } from './useShiftSettings';
import { getCurrentBusinessDate } from '@/lib/shiftDate';

/**
 * Returns "today" and "yesterday" anchored to the shift business date.
 * Example: at 02:00 AM on May 22 during a night shift (20:00 → 08:00),
 *   today = "2026-05-21", yesterday = "2026-05-20".
 *
 * Falls back to wall-clock dates while shift settings load or when no
 * active shift matches the current hour.
 */
export function useBusinessToday() {
  const { data: settings } = useShiftSettings();

  return useMemo(() => {
    const now = new Date();
    const today = getCurrentBusinessDate(now, settings || []);
    const [y, m, d] = today.split('-').map(Number);
    const yDate = new Date(y, (m || 1) - 1, d || 1);
    yDate.setDate(yDate.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yesterday = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;

    const todayDate = new Date(y, (m || 1) - 1, d || 1);
    return { today, yesterday, todayDate, now };
  }, [settings]);
}
