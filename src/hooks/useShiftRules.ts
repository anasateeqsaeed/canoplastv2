import { useMemo } from 'react';
import { useHrWorkPatterns, type HrWorkPattern } from './useHrWorkPatterns';

/**
 * ShiftSetting shape kept for backward compatibility with existing callers.
 * Source of truth is now `hr_work_patterns` (matched case-insensitively against
 * `attendance_records.shift`). `shift_settings` is no longer consulted here.
 */
export interface ShiftSetting {
  id: string;
  shift_name: string;
  display_name: string | null;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  grace_minutes: number;
  lunch_minutes: number;
  standard_hours: number;
  ot_threshold_hours: number;
  is_active: boolean;
}

export interface ShiftEvaluation {
  shiftStart: string | null;   // HH:mm
  shiftEnd: string | null;
  graceMinutes: number;
  standardHours: number;
  otThresholdHours: number;
  lunchMinutes: number;
  workedHours: number | null;
  lateMinutes: number;
  isLate: boolean;
  otHours: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toHHMM = (h: number, m: number = 0) => `${pad(h)}:${pad(m)}`;

function parseHHMM(t?: string | null): number | null {
  if (!t) return null;
  const [hh, mm] = t.split(':').map(Number);
  if (Number.isNaN(hh)) return null;
  return (hh || 0) * 60 + (mm || 0);
}

function norm(s?: string | null): string {
  return (s || '').trim().toLowerCase();
}

function patternToSetting(p: HrWorkPattern): ShiftSetting {
  return {
    id: p.id,
    shift_name: p.code,
    display_name: p.name,
    start_hour: p.start_hour,
    start_minute: p.start_minute,
    end_hour: p.end_hour,
    end_minute: p.end_minute,
    grace_minutes: p.grace_minutes,
    lunch_minutes: p.lunch_minutes,
    standard_hours: Number(p.standard_hours),
    ot_threshold_hours: Number(p.ot_threshold_hours),
    is_active: p.is_active,
  };
}

export function getShiftSetting(
  settings: ShiftSetting[] | undefined,
  shiftName?: string | null,
): ShiftSetting | null {
  if (!settings || !shiftName) return null;
  const key = norm(shiftName);
  return (
    settings.find((s) => norm(s.shift_name) === key) ||
    settings.find((s) => norm(s.display_name) === key) ||
    null
  );
}

export function evaluateAttendance(
  settings: ShiftSetting[] | undefined,
  shiftName: string | null | undefined,
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  storedHoursWorked?: number | null,
): ShiftEvaluation {
  const s = getShiftSetting(settings, shiftName);
  const grace = s?.grace_minutes ?? 15;
  const standard = Number(s?.standard_hours ?? 12);
  const otThreshold = Number(s?.ot_threshold_hours ?? 12);
  const lunch = s?.lunch_minutes ?? 0;
  const startStr = s ? toHHMM(s.start_hour, s.start_minute ?? 0) : null;
  const endStr = s ? toHHMM(s.end_hour, s.end_minute ?? 0) : null;

  const ci = parseHHMM(checkIn);
  const co = parseHHMM(checkOut);
  const startMin = s ? s.start_hour * 60 + (s.start_minute ?? 0) : null;

  let lateMinutes = 0;
  if (ci != null && startMin != null) {
    lateMinutes = Math.max(0, ci - (startMin + grace));
  }

  let workedHours: number | null = null;
  if (ci != null && co != null) {
    let span = co - ci;
    if (span < 0) span += 24 * 60; // night-shift wrap
    workedHours = Math.max(0, Math.round(((span - lunch) / 60) * 100) / 100);
  } else if (storedHoursWorked != null) {
    workedHours = Math.max(0, Math.round(Number(storedHoursWorked) * 100) / 100);
  }

  const otHours =
    workedHours != null ? Math.max(0, Math.round((workedHours - otThreshold) * 100) / 100) : 0;

  return {
    shiftStart: startStr,
    shiftEnd: endStr,
    graceMinutes: grace,
    standardHours: standard,
    otThresholdHours: otThreshold,
    lunchMinutes: lunch,
    workedHours,
    lateMinutes,
    isLate: lateMinutes > 0,
    otHours,
  };
}

export function useShiftRules() {
  const { data: patterns = [] } = useHrWorkPatterns({ includeInactive: true });
  const settings = useMemo(() => patterns.map(patternToSetting), [patterns]);
  return useMemo(
    () => ({
      settings,
      evaluate: (
        shiftName?: string | null,
        ci?: string | null,
        co?: string | null,
        storedHoursWorked?: number | null,
      ) => evaluateAttendance(settings, shiftName, ci, co, storedHoursWorked),
      getSetting: (name?: string | null) => getShiftSetting(settings, name),
    }),
    [settings],
  );
}
