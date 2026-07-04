import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, Receipt, History, Printer, Plus, ArrowLeft } from 'lucide-react';
import { PayrollGenerateDialog } from '@/components/hr/PayrollGenerateDialog';
import { PayrollRunTable } from '@/components/hr/PayrollRunTable';
import { PayrollHistoryList } from '@/components/hr/PayrollHistoryList';
import { PayslipPrint } from '@/components/hr/PayslipPrint';
import {
  usePayrollRuns,
  usePayrollRun,
  usePayrollItems,
  type PayrollRun,
} from '@/hooks/usePayroll';

type TabKey = 'run' | 'payslips' | 'history';

export default function Payroll() {
  const [tab, setTab] = useState<TabKey>('run');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);

  const { data: runs = [] } = usePayrollRuns();

  // Default selected run = latest
  const defaultRunId = runs[0]?.id;
  const currentRunId = activeRunId || defaultRunId || null;

  return (
    <MainLayout
      title="Payroll"
      subtitle="Monthly salary processing for staff and operators (labour)."
    >
      <div className="space-y-4 p-4 md:p-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="run">
                <Calculator className="mr-1 h-4 w-4" />
                Monthly Run
              </TabsTrigger>
              <TabsTrigger value="payslips">
                <Receipt className="mr-1 h-4 w-4" />
                Payslips
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-1 h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => setGenOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Generate Payroll
            </Button>
          </div>

          {/* Monthly Run */}
          <TabsContent value="run" className="mt-4">
            <RunTabContent
              runs={runs}
              currentRunId={currentRunId}
              onSelectRun={setActiveRunId}
              onGenerate={() => setGenOpen(true)}
            />
          </TabsContent>

          {/* Payslips */}
          <TabsContent value="payslips" className="mt-4">
            <PayslipsTab
              runs={runs}
              currentRunId={currentRunId}
              onSelectRun={setActiveRunId}
            />
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="mt-4">
            <PayrollHistoryList
              onOpen={(r) => {
                setActiveRunId(r.id);
                setTab('run');
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PayrollGenerateDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        onCreated={(id) => {
          setActiveRunId(id);
          setTab('run');
        }}
      />
    </MainLayout>
  );
}

// ============================================================
// Monthly Run tab
// ============================================================
function RunTabContent({
  runs,
  currentRunId,
  onSelectRun,
  onGenerate,
}: {
  runs: PayrollRun[];
  currentRunId: string | null;
  onSelectRun: (id: string) => void;
  onGenerate: () => void;
}) {
  const { data: run } = usePayrollRun(currentRunId || undefined);

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-3">
          <p className="text-muted-foreground">No payroll runs yet.</p>
          <Button onClick={onGenerate}>
            <Plus className="h-4 w-4 mr-1" />
            Generate first run
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <Label className="text-xs">Run</Label>
          <Select value={currentRunId || ''} onValueChange={onSelectRun}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select payroll run" />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.run_code} — {format(parseISO(r.period_month), 'MMM yyyy')} ({r.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {run && (
            <Badge variant="outline" className="capitalize">
              {format(parseISO(run.period_month), 'MMMM yyyy')} · {run.working_days} working days
            </Badge>
          )}
        </CardContent>
      </Card>
      {currentRunId && <PayrollRunTable runId={currentRunId} />}
    </div>
  );
}

// ============================================================
// Payslips tab — pick employee, render printable A5 payslip
// ============================================================
function PayslipsTab({
  runs,
  currentRunId,
  onSelectRun,
}: {
  runs: PayrollRun[];
  currentRunId: string | null;
  onSelectRun: (id: string) => void;
}) {
  const { data: run } = usePayrollRun(currentRunId || undefined);
  const { data: items = [] } = usePayrollItems(currentRunId || undefined);
  const [empId, setEmpId] = useState<string>('');

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        (a.employee?.full_name || '').localeCompare(b.employee?.full_name || ''),
      ),
    [items],
  );

  const item = sortedItems.find((i) => i.employee_id === empId) || sortedItems[0];

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          No payroll runs yet — generate one first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <Label className="text-xs">Run</Label>
          <Select value={currentRunId || ''} onValueChange={onSelectRun}>
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.run_code} — {format(parseISO(r.period_month), 'MMM yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-xs">Employee</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {sortedItems.map((it) => (
                <SelectItem key={it.id} value={it.employee_id}>
                  {it.employee?.employee_code} — {it.employee?.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => window.print()} disabled={!item}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </CardContent>
      </Card>

      {/* Screen preview (scaled to A5-ish container) */}
      {run && item && (
        <Card>
          <CardContent className="p-4 bg-muted/30">
            <div className="mx-auto bg-white shadow" style={{ width: '148mm', minHeight: '210mm' }}>
              <PayslipPrint run={run} item={item} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print portal — only shown via @media print */}
      {run && item &&
        createPortal(
          <div className="payslip-print-root hidden print:block">
            <PayslipPrint run={run} item={item} />
          </div>,
          document.body,
        )}

      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 6mm; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            background: white !important;
          }
          body > *:not(.payslip-print-root) { display: none !important; }
          .payslip-print-root {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
