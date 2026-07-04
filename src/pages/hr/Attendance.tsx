import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyAttendanceGrid } from '@/components/hr/DailyAttendanceGrid';
import { MonthlyAttendanceView } from '@/components/hr/MonthlyAttendanceView';
import { AttendanceVerifyView } from '@/components/hr/AttendanceVerifyView';
import { WeeklyRosterView } from '@/components/hr/WeeklyRosterView';
import { ShiftOTReport } from '@/components/hr/ShiftOTReport';
import { AttendanceRulesEditor } from '@/components/hr/AttendanceRulesEditor';
import { AttendanceEditsTab } from '@/components/hr/AttendanceEditsTab';
import { AttendanceMissingTab } from '@/components/hr/AttendanceMissingTab';
import { AttendanceReasonStatsTab } from '@/components/hr/AttendanceReasonStatsTab';
import { CalendarCheck, CalendarDays, ShieldCheck, CalendarRange, Clock, Settings2, History, AlertTriangle, BarChart3 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Attendance() {
  const [params] = useSearchParams();
  const initialTab = params.get('tab');
  const initial =
    initialTab === 'verify' || params.get('date')
      ? 'verify'
      : initialTab === 'edits' || initialTab === 'missing' || initialTab === 'reasons' || initialTab === 'monthly' || initialTab === 'roster' || initialTab === 'shift_ot' || initialTab === 'rules' || initialTab === 'daily'
      ? initialTab
      : 'daily';
  const { isAdmin, isHRManager } = useAuth();
  const admin = isAdmin();
  const canAudit = admin || isHRManager();

  return (
    <MainLayout
      title="Attendance"
      subtitle="Mark daily attendance, audit edits, find missing entries, and review shift, late and overtime totals."
    >
      <div className="space-y-4 p-4 md:p-6">
        <Tabs defaultValue={initial}>
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="daily">
              <CalendarCheck className="mr-1 h-4 w-4" />
              Daily Mark
            </TabsTrigger>
            <TabsTrigger value="verify">
              <ShieldCheck className="mr-1 h-4 w-4" />
              Verify by Date
            </TabsTrigger>
            <TabsTrigger value="monthly">
              <CalendarDays className="mr-1 h-4 w-4" />
              Monthly View
            </TabsTrigger>
            {canAudit && (
              <TabsTrigger value="edits">
                <History className="mr-1 h-4 w-4" />
                Edits Audit
              </TabsTrigger>
            )}
            {canAudit && (
              <TabsTrigger value="missing">
                <AlertTriangle className="mr-1 h-4 w-4" />
                Missing Entries
              </TabsTrigger>
            )}
            {canAudit && (
              <TabsTrigger value="reasons">
                <BarChart3 className="mr-1 h-4 w-4" />
                Edit Reasons
              </TabsTrigger>
            )}
            <TabsTrigger value="roster">
              <CalendarRange className="mr-1 h-4 w-4" />
              Weekly Roster
            </TabsTrigger>
            <TabsTrigger value="shift_ot">
              <Clock className="mr-1 h-4 w-4" />
              Shift &amp; OT
            </TabsTrigger>
            {admin && (
              <TabsTrigger value="rules">
                <Settings2 className="mr-1 h-4 w-4" />
                Rules
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            <DailyAttendanceGrid />
          </TabsContent>
          <TabsContent value="verify" className="mt-4">
            <AttendanceVerifyView />
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            <MonthlyAttendanceView />
          </TabsContent>
          {canAudit && (
            <TabsContent value="edits" className="mt-4">
              <AttendanceEditsTab />
            </TabsContent>
          )}
          {canAudit && (
            <TabsContent value="missing" className="mt-4">
              <AttendanceMissingTab />
            </TabsContent>
          )}
          {canAudit && (
            <TabsContent value="reasons" className="mt-4">
              <AttendanceReasonStatsTab />
            </TabsContent>
          )}
          <TabsContent value="roster" className="mt-4">
            <WeeklyRosterView />
          </TabsContent>
          <TabsContent value="shift_ot" className="mt-4">
            <ShiftOTReport />
          </TabsContent>
          {admin && (
            <TabsContent value="rules" className="mt-4">
              <AttendanceRulesEditor />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
