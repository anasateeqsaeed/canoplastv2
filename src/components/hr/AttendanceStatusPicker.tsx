import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AttendanceStatus, STATUS_LABELS, STATUS_COLORS } from '@/hooks/useAttendance';

const ALL_STATUSES: AttendanceStatus[] = ['P', 'A', 'L', 'H', 'O', 'HOL', 'LATE'];

interface Props {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function AttendanceStatusPicker({ value, onChange, disabled, compact }: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {ALL_STATUSES.map((s) => {
        const active = value === s;
        return (
          <Button
            key={s}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(s)}
            title={STATUS_LABELS[s]}
            className={cn(
              'h-7 min-w-[2.25rem] px-2 text-xs font-semibold transition-all',
              active && STATUS_COLORS[s],
              active && 'border-transparent shadow',
              !active && 'opacity-60 hover:opacity-100',
              compact && 'h-6 min-w-[2rem] px-1.5'
            )}
          >
            {s}
          </Button>
        );
      })}
    </div>
  );
}

export function AttendanceLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {ALL_STATUSES.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded px-1.5 text-[10px] font-bold',
              STATUS_COLORS[s]
            )}
          >
            {s}
          </span>
          {STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}
