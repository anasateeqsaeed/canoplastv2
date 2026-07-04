import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  UserX,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  parsePunchReport,
  deriveStatus,
  groupPunchesShiftAware,
  type ShiftAwareDay,
  type ShiftDef,
  type RawPunch,
} from '@/lib/punchReportParser';
import {
  useImportPunchAttendance,
  type ImportRecordInput,
} from '@/hooks/useImportPunchAttendance';
import type { AttendanceStatus, PersonType } from '@/hooks/useAttendance';
import { useHrWorkPatterns } from '@/hooks/useHrWorkPatterns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface EmployeeMatch {
  id: string;
  full_name: string;
  employee_type: PersonType;
  device_punch_id: string | null;
}

type Step = 'upload' | 'preview' | 'done';

interface PreviewRow extends ShiftAwareDay {
  matchedEmployee?: EmployeeMatch;
  status: AttendanceStatus;
  willImport: boolean;
}

export function ImportPunchReportDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rawPunches, setRawPunches] = useState<RawPunch[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<Record<string, string>>({});
  const [lateThreshold, setLateThreshold] = useState(15);
  const [lunchBreak, setLunchBreak] = useState(60);
  const [savedCount, setSavedCount] = useState(0);

  const importMut = useImportPunchAttendance();

  // All active employees with a punch ID assigned, used for matching
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'punch-id-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, employee_type, device_punch_id, shift')
        .eq('is_active', true);
      if (error) throw error;
      return data as Array<EmployeeMatch & { shift: string | null }>;
    },
    enabled: open,
  });

  // Shift patterns from HR (single source of truth, same as Weekly Roster)
  const { data: hrPatterns = [] } = useHrWorkPatterns({ includeInactive: false });

  // Date range covered by the parsed file → used to fetch rosters
  const fileDateRange = useMemo(() => {
    if (rawPunches.length === 0) return null;
    const dates = rawPunches.map((p) => p.date).sort();
    // Pad by one day either side so night-shift roll-back can see neighbours
    const from = addOneDayString(dates[0], -1);
    const to = addOneDayString(dates[dates.length - 1], 1);
    return { from, to };
  }, [rawPunches]);

  const { data: rosters = [] } = useQuery({
    queryKey: ['shift_rosters', 'punch-import', fileDateRange?.from, fileDateRange?.to],
    queryFn: async () => {
      if (!fileDateRange) return [];
      const { data, error } = await supabase
        .from('shift_rosters')
        .select('person_id, roster_date, shift')
        .gte('roster_date', fileDateRange.from)
        .lte('roster_date', fileDateRange.to);
      if (error) throw error;
      return data as Array<{ person_id: string; roster_date: string; shift: string }>;
    },
    enabled: open && !!fileDateRange,
  });

  const punchIdMap = useMemo(() => {
    const m = new Map<string, EmployeeMatch & { shift: string | null }>();
    employees.forEach((e) => {
      if (e.device_punch_id) m.set(e.device_punch_id.trim().toLowerCase(), e);
    });
    return m;
  }, [employees]);

  // Build shift defs from HR Shift Patterns (case-insensitive on code)
  const shiftDefs = useMemo(() => {
    const m = new Map<string, ShiftDef>();
    for (const p of hrPatterns) {
      const code = (p.code || '').toLowerCase();
      if (!code) continue;
      const startMins = (p.start_hour ?? 8) * 60 + (p.start_minute ?? 0);
      const endMins = (p.end_hour ?? 17) * 60 + (p.end_minute ?? 0);
      m.set(code, {
        code,
        startMins,
        endMins,
        graceMins: p.grace_minutes ?? 15,
        crossesMidnight: endMins <= startMins,
      });
    }
    // Sensible defaults if no matching pattern is configured
    if (!m.has('day')) m.set('day', { code: 'day', startMins: 8 * 60, endMins: 17 * 60, graceMins: 15, crossesMidnight: false });
    if (!m.has('night')) m.set('night', { code: 'night', startMins: 20 * 60, endMins: 5 * 60, graceMins: 15, crossesMidnight: true });
    return m;
  }, [hrPatterns]);

  // Roster lookup map: personId__date → shift code
  const rosterMap = useMemo(() => {
    const m = new Map<string, string>();
    rosters.forEach((r) => m.set(`${r.person_id}__${r.roster_date}`, (r.shift || '').toLowerCase()));
    return m;
  }, [rosters]);

  const employeeById = useMemo(() => {
    const m = new Map<string, EmployeeMatch & { shift: string | null }>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const punchIdToPersonId = (pid: string): string | null => {
    return punchIdMap.get(pid.trim().toLowerCase())?.id ?? null;
  };

  const shiftLookup = (personId: string, date: string): ShiftDef | null => {
    const rosterCode = rosterMap.get(`${personId}__${date}`);
    const empCode = employeeById.get(personId)?.shift?.toLowerCase() || null;
    const code = rosterCode || empCode || 'day';
    if (code === 'off') return null; // off-day: no roll-back, treat as no shift
    return shiftDefs.get(code) || shiftDefs.get('day') || null;
  };

  const groupedDays: ShiftAwareDay[] = useMemo(() => {
    if (rawPunches.length === 0) return [];
    return groupPunchesShiftAware(rawPunches, punchIdToPersonId, shiftLookup, {
      lunchBreakMinutes: lunchBreak,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPunches, punchIdMap, rosterMap, shiftDefs, employeeById, lunchBreak]);

  const previewRows: PreviewRow[] = useMemo(() => {
    return groupedDays.map((d) => {
      const matched = employeeById.get(d.personId);
      const def = shiftDefs.get(d.shift);
      const shiftStartHHMM = def
        ? `${String(Math.floor(def.startMins / 60)).padStart(2, '0')}:${String(def.startMins % 60).padStart(2, '0')}`
        : null;
      const status = matched
        ? deriveStatus(d.hoursWorked, d.firstIn, shiftStartHHMM, lateThreshold)
        : 'P';
      return {
        ...d,
        matchedEmployee: matched,
        status,
        willImport: !!matched,
      };
    });
  }, [groupedDays, employeeById, shiftDefs, lateThreshold]);

  const matchedRows = previewRows.filter((r) => r.willImport);
  const unmatched = useMemo(() => {
    // Unmatched = raw punch IDs not found in punchIdMap
    const map = new Map<string, { punchId: string; name: string; days: number }>();
    const seenDates = new Map<string, Set<string>>();
    rawPunches.forEach((p) => {
      if (punchIdMap.has(p.punchId.trim().toLowerCase())) return;
      const k = p.punchId;
      if (!map.has(k)) {
        map.set(k, { punchId: k, name: p.name || '', days: 0 });
        seenDates.set(k, new Set());
      }
      const set = seenDates.get(k)!;
      if (!set.has(p.date)) {
        set.add(p.date);
        map.get(k)!.days++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.days - a.days);
  }, [rawPunches, punchIdMap]);

  const dateRange = useMemo(() => {
    if (matchedRows.length === 0) return null;
    const dates = matchedRows.map((r) => r.date).sort();
    return { from: dates[0], to: dates[dates.length - 1] };
  }, [matchedRows]);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setParsing(false);
    setParseError(null);
    setRawPunches([]);
    setDetectedHeaders({});
    setSavedCount(0);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParsing(true);
    setParseError(null);
    try {
      const result = await parsePunchReport(file, { lunchBreakMinutes: lunchBreak });
      setRawPunches(result.rawPunches);
      setDetectedHeaders(result.detectedHeaders);
      if (result.rawPunches.length === 0) {
        setParseError(
          result.warnings[0] ||
            'No punch entries found. Make sure the file contains employee ID, date, and time columns.'
        );
      } else {
        setStep('preview');
      }
    } catch (e: any) {
      setParseError(e.message || 'Could not read the file.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (matchedRows.length === 0) return;
    const records: ImportRecordInput[] = matchedRows.map((r) => ({
      person_id: r.matchedEmployee!.id,
      person_type: r.matchedEmployee!.employee_type,
      attendance_date: r.date,
      status: r.status,
      shift: r.shift,
      check_in: r.firstIn,
      check_out: r.lastOut,
      hours_worked: r.hoursWorked,
      remarks: `Imported from punch report (${fileName})`,
    }));
    const { saved } = await importMut.mutateAsync(records);
    setSavedCount(saved);
    setStep('done');
  };

  // ----- UI -----

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Punch Report
          </DialogTitle>
          <DialogDescription>
            Upload a biometric/punch device export. We'll match employees by their{' '}
            <strong>Punch ID</strong> and write attendance + work hours.
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Late threshold (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Lunch break deducted (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  value={lunchBreak}
                  onChange={(e) => setLunchBreak(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <label
              htmlFor="punch-file"
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center transition hover:border-primary/50 hover:bg-muted/40 cursor-pointer"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Drop file or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts <strong>.xlsx</strong>, <strong>.xls</strong> (binary), and{' '}
                  <strong>.csv</strong>
                </p>
              </div>
              {parsing && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing {fileName}…
                </div>
              )}
              <input
                id="punch-file"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Could not parse</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>One-time setup</AlertTitle>
              <AlertDescription className="text-xs">
                Each employee needs their <strong>Punch ID</strong> set in the Employee form
                (Employment tab). Rows with an unknown Punch ID will be listed as "Unmatched"
                and skipped.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-3 text-sm">
              <Stat label="Date range" value={dateRange ? `${dateRange.from} → ${dateRange.to}` : '—'} />
              <Stat label="Will import" value={String(matchedRows.length)} valueClass="text-green-600" />
              <Stat label="Unmatched" value={String(unmatched.length)} valueClass={unmatched.length ? 'text-amber-600' : ''} />
              <Stat label="File" value={fileName} small />
            </div>

            {Object.keys(detectedHeaders).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Detected columns:{' '}
                {Object.entries(detectedHeaders)
                  .map(([k, v]) => `${k}="${v}"`)
                  .join(' · ')}
              </p>
            )}

            {/* Matched table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Matched rows ({matchedRows.length})
              </div>
              <div className="max-h-[40vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Punch ID</th>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Shift</th>
                      <th className="px-3 py-2 text-left">First In</th>
                      <th className="px-3 py-2 text-left">Last Out</th>
                      <th className="px-3 py-2 text-right">Hours</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                          No rows match any employee — set Punch IDs in the Employee form first.
                        </td>
                      </tr>
                    ) : (
                      matchedRows.slice(0, 500).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5 font-mono text-xs">{r.punchId}</td>
                          <td className="px-3 py-1.5">{r.matchedEmployee?.full_name}</td>
                          <td className="px-3 py-1.5">{r.date}</td>
                          <td className="px-3 py-1.5">
                            <span className="capitalize text-xs">{r.shift}</span>
                            {r.rolledFromNextDay && (
                              <span className="ml-1 inline-block rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-medium">
                                +next day
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-xs">{r.firstIn}</td>
                          <td className="px-3 py-1.5 font-mono text-xs">{r.lastOut}</td>
                          <td className="px-3 py-1.5 text-right">{r.hoursWorked.toFixed(2)}</td>
                          <td className="px-3 py-1.5">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {matchedRows.length > 500 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
                    Showing first 500 of {matchedRows.length} rows. All will be imported.
                  </p>
                )}
              </div>
            </div>

            {/* Unmatched */}
            {unmatched.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs font-medium uppercase text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Unmatched Punch IDs ({unmatched.length}) — will be skipped
                </div>
                <div className="max-h-[20vh] overflow-y-auto p-3">
                  <div className="flex flex-wrap gap-2">
                    {unmatched.map((u) => (
                      <Badge key={u.punchId} variant="outline" className="font-mono text-xs">
                        {u.punchId}
                        {u.name && <span className="ml-1 font-sans">· {u.name}</span>}
                        <span className="ml-1 text-muted-foreground">({u.days}d)</span>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tip: open <strong>HR → Employees</strong> and add the Punch ID to each
                    matching record, then re-run this import.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: DONE */}
        {step === 'done' && (
          <div className="py-10 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Import complete</h3>
            <p className="text-sm text-muted-foreground">
              {savedCount} attendance record{savedCount === 1 ? '' : 's'} saved.{' '}
              {unmatched.length > 0 && (
                <>
                  <strong>{unmatched.length}</strong> unmatched Punch ID
                  {unmatched.length === 1 ? '' : 's'} skipped.
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Hours worked are now visible in the monthly view and will feed the next payroll
              run.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => handleClose(false)}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </Button>
          <div className="flex gap-2">
            {step === 'preview' && (
              <Button variant="outline" onClick={reset}>
                Upload different file
              </Button>
            )}
            {step === 'preview' && (
              <Button
                onClick={handleImport}
                disabled={matchedRows.length === 0 || importMut.isPending}
              >
                {importMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Import {matchedRows.length} record{matchedRows.length === 1 ? '' : 's'}
              </Button>
            )}
            {step === 'done' && (
              <Button onClick={reset} variant="outline">
                Import another file
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  valueClass = '',
  small = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-semibold ${small ? 'text-xs truncate' : 'text-base'} ${valueClass}`}>
        {value || '—'}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { label: string; cls: string }> = {
    P: { label: 'Present', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    A: { label: 'Absent', cls: 'bg-red-100 text-red-700' },
    L: { label: 'Leave', cls: 'bg-blue-100 text-blue-700' },
    H: { label: 'Half-day', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    O: { label: 'Off', cls: 'bg-slate-100 text-slate-700' },
    HOL: { label: 'Holiday', cls: 'bg-purple-100 text-purple-700' },
    LATE: { label: 'Late', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  };
  const m = map[status];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function addOneDayString(yyyymmdd: string, delta: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
