import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  CalendarCheck,
  AlertTriangle,
  Wallet,
  ClipboardList,
  UserPlus,
  Upload,
  Calculator,
  History,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Plane,
} from 'lucide-react';
import { useHRDashboardStats } from '@/hooks/useHRDashboardStats';
import { useHRAuditLog } from '@/hooks/useHRAuditLog';
import { useAttendanceForDate } from '@/hooks/useAttendanceForDate';
import { AttendanceDaySnapshot } from '@/components/dashboard/AttendanceDaySnapshot';
import { format, formatDistanceToNow, subDays } from 'date-fns';

const ENTITY_LABEL: Record<string, string> = {
  employee: 'Employee',
  attendance_record: 'Attendance',
  payroll_run: 'Payroll Run',
  payroll_item: 'Payroll Item',
  advance_recovery: 'Advance',
  department: 'Department',
};

export default function HRDashboard() {
  const { data: stats, isLoading } = useHRDashboardStats();
  const { data: recentAudit } = useHRAuditLog({ limit: 8 });
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const dayBeforeStr = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const today = useAttendanceForDate(todayStr);

  return (
    <MainLayout
      title="HR Dashboard"
      subtitle="Today's attendance, headcount, payroll status and recent changes"
    >
      <div className="space-y-6 p-4 md:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/hr/employees" className="block">
            <KpiCard
              title="Active Employees"
              value={stats?.totalActive}
              isLoading={isLoading}
              icon={<Users className="h-5 w-5 text-primary" />}
              footer={
                <span className="text-xs text-muted-foreground">
                  {stats?.operatorsActive ?? 0} operators · {stats?.staffActive ?? 0} staff
                </span>
              }
            />
          </Link>
          <Link to="/hr/attendance?tab=verify" className="block">
            <KpiCard
              title="Today's Attendance"
              value={stats ? `${stats.attendancePct}%` : undefined}
              isLoading={isLoading}
              icon={<CalendarCheck className="h-5 w-5 text-success" />}
              footer={
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-success border-success/40">P {stats?.todayPresent ?? 0}</Badge>
                  <Badge variant="outline" className="text-destructive border-destructive/40">A {stats?.todayAbsent ?? 0}</Badge>
                  <Badge variant="outline" className="text-warning border-warning/40">LATE {stats?.todayLate ?? 0}</Badge>
                </div>
              }
            />
          </Link>
          <KpiCard
            title="Pending Payroll"
            value={stats?.pendingPayrollRuns}
            isLoading={isLoading}
            icon={<Calculator className="h-5 w-5 text-info" />}
            footer={<span className="text-xs text-muted-foreground">runs this month not closed</span>}
          />
          <KpiCard
            title="Outstanding Advances"
            value={stats ? `Rs. ${stats.outstandingAdvancesAmount.toLocaleString()}` : undefined}
            isLoading={isLoading}
            icon={<Wallet className="h-5 w-5 text-warning" />}
            footer={
              <span className="text-xs text-muted-foreground">
                across {stats?.outstandingAdvancesCount ?? 0} employees
              </span>
            }
          />
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="default" size="sm">
              <Link to="/hr/attendance"><CalendarCheck className="h-4 w-4 mr-1" /> Mark Attendance</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link to="/hr/attendance?tab=verify"><ShieldCheck className="h-4 w-4 mr-1" /> Verify Attendance</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/hr/employees"><UserPlus className="h-4 w-4 mr-1" /> Add Employee</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/hr/payroll"><Calculator className="h-4 w-4 mr-1" /> Payroll Runs</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/finance/advances"><Wallet className="h-4 w-4 mr-1" /> Advance Ledger</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/hr/attendance"><Upload className="h-4 w-4 mr-1" /> Import Punch Report</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/hr/audit-log"><History className="h-4 w-4 mr-1" /> View Audit Trail</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Today snapshot: Late / Leave / Absent */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PeoplePanel
            title="Late Today"
            icon={<Clock className="h-4 w-4 text-orange-500" />}
            people={today.lateList}
            emptyText="No late arrivals."
            link={`/hr/attendance?tab=verify&date=${todayStr}&filter=LATE`}
            isLoading={today.isLoading}
          />
          <PeoplePanel
            title="On Leave Today"
            icon={<Plane className="h-4 w-4 text-blue-500" />}
            people={today.leaveList}
            emptyText="Nobody on leave."
            link={`/hr/attendance?tab=verify&date=${todayStr}&filter=L`}
            isLoading={today.isLoading}
          />
          <PeoplePanel
            title="Absent Today"
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            people={today.absentList}
            emptyText="No absentees."
            link={`/hr/attendance?tab=verify&date=${todayStr}&filter=A`}
            isLoading={today.isLoading}
          />
        </div>

        {/* Recent days: Yesterday + Day Before */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AttendanceDaySnapshot date={yesterdayStr} label="Yesterday" />
          <AttendanceDaySnapshot date={dayBeforeStr} label="Day Before" />
        </div>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Recent HR Activity
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/hr/audit-log">
                Full log <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!recentAudit ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentAudit.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-6 w-6 mb-2 opacity-50" />
                <p className="text-sm">No HR changes recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentAudit.map((entry) => (
                  <div key={entry.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {ENTITY_LABEL[entry.entity_type] ?? entry.entity_type}
                        </Badge>
                        <Badge variant={entry.action === 'insert' ? 'default' : 'outline'} className="text-xs capitalize">
                          {entry.action === 'insert' ? 'created' : 'updated'}
                        </Badge>
                        <span className="text-muted-foreground truncate">
                          by {entry.actor_email?.split('@')[0] ?? 'system'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

interface PeoplePanelProps {
  title: string;
  icon: React.ReactNode;
  people: { person_id: string; person_type: string; name: string; code: string; department: string }[];
  emptyText: string;
  link: string;
  isLoading: boolean;
}

function PeoplePanel({ title, icon, people, emptyText, link, isLoading }: PeoplePanelProps) {
  const shown = people.slice(0, 6);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title} <Badge variant="secondary" className="ml-1">{people.length}</Badge>
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to={link}>View all <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : people.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyText}</p>
        ) : (
          <div className="divide-y divide-border">
            {shown.map((p) => (
              <div key={`${p.person_type}:${p.person_id}`} className="py-1.5 flex items-center justify-between text-sm">
                <span className="font-medium truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground ml-2 truncate">{p.department}</span>
              </div>
            ))}
            {people.length > shown.length && (
              <Link to={link} className="block py-1.5 text-xs text-primary hover:underline">
                +{people.length - shown.length} more
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


interface KpiCardProps {
  title: string;
  value?: string | number;
  isLoading: boolean;
  icon: React.ReactNode;
  footer?: React.ReactNode;
}

function KpiCard({ title, value, isLoading, icon, footer }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-20 mb-2" />
        ) : (
          <div className="text-2xl font-bold">{value ?? '—'}</div>
        )}
        <div className="mt-1">{footer}</div>
      </CardContent>
    </Card>
  );
}
