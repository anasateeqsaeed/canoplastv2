import type { ShiftSetting } from '@/hooks/useShiftSettings';

/**
 * Given a wall-clock Date and a shift, return the calendar date the shift is
 * anchored to (the date the shift STARTED), in YYYY-MM-DD.
 *
 * Convention: a night shift such as 20:00 → 08:00 is treated as one continuous
 * block belonging to the date it started. So at 02:00 AM on May 22, the
 * "business date" for that night shift is May 21.
 */
export function getShiftBusinessDate(now: Date, shift: ShiftSetting): string {
  const d = new Date(now);
  // Only overnight shifts (start > end) need adjustment.
  if (shift.start_hour > shift.end_hour) {
    const h = now.getHours();
    // We're in the "morning tail" of an overnight shift → anchor to previous day.
    if (h < shift.end_hour) {
      d.setDate(d.getDate() - 1);
    }
  }
  return formatLocal(d);
}

/**
 * Returns the business date for whichever active shift currently contains `now`.
 * Falls back to today's local calendar date when no shift matches.
 */
export function getCurrentBusinessDate(now: Date, settings: ShiftSetting[]): string {
  const active = (settings || []).filter((s) => s.is_active);
  const h = now.getHours();
  const containing = active.find((s) => {
    if (s.start_hour < s.end_hour) {
      return h >= s.start_hour && h < s.end_hour;
    }
    return h >= s.start_hour || h < s.end_hour;
  });
  if (containing) return getShiftBusinessDate(now, containing);
  return formatLocal(now);
}

function formatLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolve the canonical (production_date, shift) bucket for a given hour slot
 * and the date the operator picked.
 *
 * Convention (per operator request): the picked date is ALWAYS treated as the
 * shift's *start* date. So picking "1 Jun" + night shift means:
 *   1 Jun 9 PM → 11 PM  → production_date = 1 Jun, shift = night
 *   2 Jun 12 AM → 8 AM  → production_date = 1 Jun, shift = night  (still anchored to start date)
 *
 *   hour 9   → { shift: 'day',   production_date: pickedDate }
 *   hour 20  → { shift: 'day',   production_date: pickedDate }
 *   hour 21  → { shift: 'night', production_date: pickedDate }
 *   hour 2   → { shift: 'night', production_date: pickedDate }   (morning tail of picked night)
 *   hour 8   → { shift: 'night', production_date: pickedDate }
 */
export function resolveHourBusinessSlot(
  hour: number,
  pickedDate: string,
  settings: ShiftSetting[] = [],
): { production_date: string; shift: 'day' | 'night' } {
  const active = (settings || []).filter((s) => s.is_active);
  const dayShift = active.find((s) => /day/i.test(s.shift_name))
    || active.find((s) => s.start_hour < s.end_hour);
  const nightShift = active.find((s) => /night/i.test(s.shift_name))
    || active.find((s) => s.start_hour > s.end_hour);

  const dayStart = dayShift?.start_hour ?? 9;
  const dayEnd = dayShift?.end_hour ?? 21;
  const nightEnd = nightShift?.end_hour ?? 9;

  if (hour >= dayStart && hour < dayEnd) {
    return { shift: 'day', production_date: pickedDate };
  }
  // Everything else (21..23 AND 0..nightEnd) is the picked night shift.
  return { shift: 'night', production_date: pickedDate };
}


/**
 * Human-readable span for a night shift on a given business date.
 * Returns e.g. "20 May 8 PM → 21 May 8 AM" for an overnight shift,
 * or "21 May 8 AM → 8 PM" for a day shift.
 */
export function describeShiftSpan(businessDate: string, shift: ShiftSetting): string {
  const [y, m, d] = businessDate.split('-').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, shift.start_hour, shift.start_minute ?? 0);
  const end = new Date(start);
  if (shift.start_hour > shift.end_hour) {
    end.setDate(end.getDate() + 1);
  }
  end.setHours(shift.end_hour, shift.end_minute ?? 0, 0, 0);

  const fmtDate = (dt: Date) =>
    dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const fmtTime = (dt: Date) =>
    dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: dt.getMinutes() ? '2-digit' : undefined });

  if (fmtDate(start) === fmtDate(end)) {
    return `${fmtDate(start)} ${fmtTime(start)} → ${fmtTime(end)}`;
  }
  return `${fmtDate(start)} ${fmtTime(start)} → ${fmtDate(end)} ${fmtTime(end)}`;
}
