import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, Clock, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAttendanceForDate } from '@/hooks/useAttendanceForDate';
import { useAttendanceOvertimeForDate, type OvertimePerson } from '@/hooks/useAttendanceOvertime';
import type { AttendancePerson } from '@/hooks/useAttendanceForDate';

interface Props {
  date: string;        // YYYY-MM-DD
  label: string;       // "Yesterday" / "Day Before"
}

export function AttendanceDaySnapshot({ date, label }: Props) {
  const data = useAttendanceForDate(date);
  const { overtimeList } = useAttendanceOvertimeForDate(date);
  const verifyBase = `/hr/attendance?tab=verify&date=${date}`;
  const dateLabel = format(parseISO(date), 'EEE dd MMM');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <Link to={verifyBase} className="hover:underline">
            {label} — {dateLabel}
          </Link>
        </CardTitle>
        <Link to={verifyBase} className="text-xs text-primary hover:underline flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Verify
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link to={`${verifyBase}&filter=P`}>
            <Badge className="bg-green-500 hover:bg-green-600">Present {data.counts.P}</Badge>
          </Link>
          <Link to={`${verifyBase}&filter=LATE`}>
            <Badge className="bg-orange-500 hover:bg-orange-600">Late {data.counts.LATE}</Badge>
          </Link>
          <Link to={`${verifyBase}&filter=L`}>
            <Badge className="bg-blue-500 hover:bg-blue-600">Leave {data.counts.L}</Badge>
          </Link>
          <Link to={`${verifyBase}&filter=A`}>
            <Badge className="bg-red-500 hover:bg-red-600">Absent {data.counts.A}</Badge>
          </Link>
          {data.counts.MISSING_PUNCH > 0 && (
            <Link to={`${verifyBase}&filter=MISSING_PUNCH`}>
              <Badge className="bg-amber-500 hover:bg-amber-600">Missing Punch {data.counts.MISSING_PUNCH}</Badge>
            </Link>
          )}
          {overtimeList.length > 0 && (
            <Badge className="bg-purple-500 hover:bg-purple-600">OT {overtimeList.length}</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NameColumn
            title="Late Arrivals"
            icon={<Clock className="h-3 w-3 text-orange-500" />}
            empty="None"
            link={`${verifyBase}&filter=LATE`}
            items={data.lateList.map((p) => ({ key: `${p.person_type}:${p.person_id}`, label: p.name }))}
          />
          <NameColumn
            title="Absent"
            icon={<AlertTriangle className="h-3 w-3 text-destructive" />}
            empty="None"
            link={`${verifyBase}&filter=A`}
            items={data.absentList.map((p) => ({ key: `${p.person_type}:${p.person_id}`, label: p.name }))}
          />
          <NameColumn
            title="Overtime"
            icon={<TrendingUp className="h-3 w-3 text-purple-500" />}
            empty="None"
            link={verifyBase}
            items={overtimeList.map((p) => ({
              key: `${p.person_type}:${p.person_id}`,
              label: `${p.name} · ${p.otHours.toFixed(1)}h`,
            }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface NameColumnProps {
  title: string;
  icon: React.ReactNode;
  empty: string;
  link: string;
  items: { key: string; label: string }[];
}

function NameColumn({ title, icon, empty, link, items }: NameColumnProps) {
  const top = items.slice(0, 4);
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <span className="text-xs text-muted-foreground">{empty}</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {top.map((it) => (
            <Badge key={it.key} variant="outline" className="text-xs font-normal">
              {it.label}
            </Badge>
          ))}
          {items.length > top.length && (
            <Link to={link} className="text-xs text-primary hover:underline self-center">
              +{items.length - top.length} more
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
