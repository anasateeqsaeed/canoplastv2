import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShiftSetting {
  id: string;
  shift_name: string;
  display_name: string | null;
  color: string | null;
  start_hour: number;
  end_hour: number;
  start_minute: number;
  end_minute: number;
  is_active: boolean;
  grace_minutes: number;
  lunch_minutes: number;
  standard_hours: number;
  ot_threshold_hours: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateShiftSettingData {
  id: string;
  shift_name?: string;
  display_name?: string | null;
  color?: string | null;
  start_hour?: number;
  end_hour?: number;
  start_minute?: number;
  end_minute?: number;
  is_active?: boolean;
  grace_minutes?: number;
  lunch_minutes?: number;
  standard_hours?: number;
  ot_threshold_hours?: number;
}

export interface CreateShiftSettingData {
  shift_name: string;
  display_name?: string;
  color?: string;
  start_hour: number;
  end_hour: number;
  start_minute?: number;
  end_minute?: number;
  is_active?: boolean;
  grace_minutes?: number;
  lunch_minutes?: number;
  standard_hours?: number;
  ot_threshold_hours?: number;
}

export const SHIFT_COLOR_PALETTE = [
  { value: 'amber', label: 'Amber', cls: 'bg-amber-500', text: 'text-amber-700' },
  { value: 'blue', label: 'Blue', cls: 'bg-blue-500', text: 'text-blue-700' },
  { value: 'indigo', label: 'Indigo', cls: 'bg-indigo-500', text: 'text-indigo-700' },
  { value: 'purple', label: 'Purple', cls: 'bg-purple-500', text: 'text-purple-700' },
  { value: 'orange', label: 'Orange', cls: 'bg-orange-500', text: 'text-orange-700' },
  { value: 'emerald', label: 'Emerald', cls: 'bg-emerald-500', text: 'text-emerald-700' },
  { value: 'rose', label: 'Rose', cls: 'bg-rose-500', text: 'text-rose-700' },
  { value: 'slate', label: 'Slate', cls: 'bg-slate-500', text: 'text-slate-700' },
];

export function getShiftColor(color: string | null | undefined) {
  return SHIFT_COLOR_PALETTE.find((c) => c.value === color) || SHIFT_COLOR_PALETTE[7];
}

export function getShiftLabel(s: Pick<ShiftSetting, 'shift_name' | 'display_name'>) {
  return s.display_name || s.shift_name.charAt(0).toUpperCase() + s.shift_name.slice(1);
}

export function useShiftSettings() {
  return useQuery({
    queryKey: ['shift-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_settings')
        .select('*')
        .order('start_hour');
      
      if (error) throw error;
      return data as ShiftSetting[];
    },
  });
}

export function useUpdateShiftSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateShiftSettingData) => {
      const { data, error } = await supabase
        .from('shift_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-settings'] });
      toast.success('Shift settings updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update shift settings: ${error.message}`);
    },
  });
}

export function useCreateShiftSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateShiftSettingData) => {
      const slug = input.shift_name.trim().toLowerCase().replace(/\s+/g, '_');
      if (!slug) throw new Error('Shift code is required');
      const payload = {
        shift_name: slug,
        display_name: input.display_name?.trim() || slug,
        color: input.color || 'slate',
        start_hour: input.start_hour,
        end_hour: input.end_hour,
        start_minute: input.start_minute ?? 0,
        end_minute: input.end_minute ?? 0,
        is_active: input.is_active ?? true,
        grace_minutes: input.grace_minutes ?? 15,
        lunch_minutes: input.lunch_minutes ?? 60,
        standard_hours: input.standard_hours ?? 8,
        ot_threshold_hours: input.ot_threshold_hours ?? 8,
      };
      const { data, error } = await supabase.from('shift_settings').insert(payload).select().single();
      if (error) throw error;
      return data as ShiftSetting;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-settings'] });
      toast.success('Shift added');
    },
    onError: (e: Error) => toast.error('Failed to add shift: ' + e.message),
  });
}

export function useDeleteShiftSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shift_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-settings'] });
      toast.success('Shift deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export type ShiftMode = '1' | '2' | '3';

export interface ShiftModePreset {
  shiftName: string;
  startHour: number;
  endHour: number;
  isActive: boolean;
}

const SHIFT_MODE_PRESETS: Record<ShiftMode, ShiftModePreset[]> = {
  '1': [
    { shiftName: 'day', startHour: 8, endHour: 20, isActive: true },
    { shiftName: 'morning', startHour: 6, endHour: 14, isActive: false },
    { shiftName: 'afternoon', startHour: 14, endHour: 22, isActive: false },
    { shiftName: 'night', startHour: 22, endHour: 6, isActive: false },
  ],
  '2': [
    { shiftName: 'day', startHour: 8, endHour: 20, isActive: true },
    { shiftName: 'night', startHour: 20, endHour: 8, isActive: true },
    { shiftName: 'morning', startHour: 6, endHour: 14, isActive: false },
    { shiftName: 'afternoon', startHour: 14, endHour: 22, isActive: false },
  ],
  '3': [
    { shiftName: 'morning', startHour: 6, endHour: 14, isActive: true },
    { shiftName: 'afternoon', startHour: 14, endHour: 22, isActive: true },
    { shiftName: 'night', startHour: 22, endHour: 6, isActive: true },
    { shiftName: 'day', startHour: 8, endHour: 20, isActive: false },
  ],
};

export function useApplyShiftMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mode, shifts }: { mode: ShiftMode; shifts: ShiftSetting[] }) => {
      const presets = SHIFT_MODE_PRESETS[mode];
      const updates = [];

      for (const preset of presets) {
        const existingShift = shifts.find(s => s.shift_name === preset.shiftName);
        if (existingShift) {
          updates.push(
            supabase
              .from('shift_settings')
              .update({
                start_hour: preset.startHour,
                end_hour: preset.endHour,
                is_active: preset.isActive,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingShift.id)
          );
        }
      }

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to apply shift mode: ${errors[0].error?.message}`);
      }

      return mode;
    },
    onSuccess: (mode) => {
      queryClient.invalidateQueries({ queryKey: ['shift-settings'] });
      const modeLabels = { '1': '1-Shift', '2': '2-Shift', '3': '3-Shift' };
      toast.success(`Applied ${modeLabels[mode]} configuration`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function getShiftModePresets() {
  return SHIFT_MODE_PRESETS;
}

// Helper function to get shift based on hour using custom settings
export function getShiftFromHourWithSettings(hour: number, settings: ShiftSetting[]): string {
  for (const setting of settings) {
    if (!setting.is_active) continue;
    if (setting.start_hour < setting.end_hour) {
      // Normal range (e.g., 6-14)
      if (hour >= setting.start_hour && hour < setting.end_hour) {
        return setting.shift_name;
      }
    } else {
      // Overnight range (e.g., 22-6)
      if (hour >= setting.start_hour || hour < setting.end_hour) {
        return setting.shift_name;
      }
    }
  }
  return 'unknown';
}

// Helper function to check if an hour falls within a shift range
export function isHourInShiftRange(hour: number, shift: ShiftSetting): boolean {
  if (shift.start_hour < shift.end_hour) {
    // Normal range (e.g., 6-14)
    return hour >= shift.start_hour && hour < shift.end_hour;
  } else {
    // Overnight range (e.g., 22-6)
    return hour >= shift.start_hour || hour < shift.end_hour;
  }
}

// Find the current shift based on current hour
export function getCurrentShift(settings: ShiftSetting[]): ShiftSetting | null {
  const currentHour = new Date().getHours();
  return settings.find(s => s.is_active && isHourInShiftRange(currentHour, s)) || null;
}

// Find the previous shift (the one that ended before the current shift started)
export function getPreviousShift(settings: ShiftSetting[], currentShift: ShiftSetting | null): ShiftSetting | null {
  if (!currentShift) return null;
  
  const activeShifts = settings.filter(s => s.is_active);
  if (activeShifts.length <= 1) return null;
  
  // Sort shifts by start hour to determine order
  const sortedShifts = [...activeShifts].sort((a, b) => {
    // Normalize hours for sorting (handle overnight shifts)
    const normalizeHour = (h: number) => h < 6 ? h + 24 : h;
    return normalizeHour(a.start_hour) - normalizeHour(b.start_hour);
  });
  
  const currentIndex = sortedShifts.findIndex(s => s.id === currentShift.id);
  if (currentIndex === -1) return null;
  
  // Previous shift is the one before in the sorted order (wrap around)
  const prevIndex = currentIndex === 0 ? sortedShifts.length - 1 : currentIndex - 1;
  return sortedShifts[prevIndex];
}

// Check if we're within the grace period (2 hours) of a shift ending
export function isWithinGracePeriod(shift: ShiftSetting, now: Date = new Date()): boolean {
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Calculate hours since shift ended
  let hoursSinceEnd = currentHour - shift.end_hour;
  if (hoursSinceEnd < 0) hoursSinceEnd += 24; // Handle overnight wrap
  
  // Check if exactly 2 hours have passed (including minutes)
  if (hoursSinceEnd === 2) {
    // At exactly 2 hours mark, only allow if we haven't passed the minute mark
    return currentMinutes === 0;
  }
  
  // Within 2 hours = grace period active
  return hoursSinceEnd < 2;
}

// Get remaining grace period time in minutes
export function getGracePeriodRemaining(shift: ShiftSetting, now: Date = new Date()): number {
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Calculate hours since shift ended
  let hoursSinceEnd = currentHour - shift.end_hour;
  if (hoursSinceEnd < 0) hoursSinceEnd += 24;
  
  const minutesSinceEnd = hoursSinceEnd * 60 + currentMinutes;
  const gracePeriodMinutes = 2 * 60; // 2 hours
  
  return Math.max(0, gracePeriodMinutes - minutesSinceEnd);
}

// Get visible shifts for a user based on current time (with grace period)
export function getVisibleShifts(
  settings: ShiftSetting[], 
  isManager: boolean,
  now: Date = new Date()
): { shifts: ShiftSetting[]; currentShift: ShiftSetting | null; previousShift: ShiftSetting | null; graceRemaining: number } {
  const activeShifts = settings.filter(s => s.is_active);
  
  // Managers see all active shifts
  if (isManager) {
    return { 
      shifts: activeShifts, 
      currentShift: getCurrentShift(settings), 
      previousShift: null,
      graceRemaining: 0 
    };
  }
  
  const currentShift = getCurrentShift(settings);
  const previousShift = getPreviousShift(settings, currentShift);
  
  const visibleShifts: ShiftSetting[] = [];
  let graceRemaining = 0;
  
  // Always add current shift
  if (currentShift) {
    visibleShifts.push(currentShift);
  }
  
  // Add previous shift if within grace period
  if (previousShift && isWithinGracePeriod(previousShift, now)) {
    visibleShifts.push(previousShift);
    graceRemaining = getGracePeriodRemaining(previousShift, now);
  }
  
  return { shifts: visibleShifts, currentShift, previousShift: previousShift && isWithinGracePeriod(previousShift, now) ? previousShift : null, graceRemaining };
}
