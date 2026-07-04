import { useState, useMemo, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  downloadEmployeeTemplate,
  parseEmployeeFile,
  validateRows,
  type ValidatedRow,
} from '@/lib/employeeImportExport';
import { useEmployees } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { useBulkUpsertEmployees } from '@/hooks/useBulkUpsertEmployees';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EmployeeImportDialog({ open, onOpenChange }: Props) {
  const { data: employees = [] } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const bulk = useBulkUpsertEmployees();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ValidatedRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');

  const stats = useMemo(() => {
    if (!parsed) return null;
    return {
      total: parsed.length,
      create: parsed.filter(r => r.action === 'create').length,
      update: parsed.filter(r => r.action === 'update').length,
      error: parsed.filter(r => r.action === 'error').length,
    };
  }, [parsed]);

  const reset = () => {
    setParsed(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const rows = await parseEmployeeFile(file);
      if (rows.length === 0) {
        toast.error('File is empty or has no recognizable rows');
        setParsed([]);
        return;
      }
      const validated = validateRows(
        rows,
        employees.map(e => ({ id: e.id, employee_code: e.employee_code })),
        departments.map(d => ({ id: d.id, name: d.name })),
      );
      setParsed(validated);
    } catch (e: any) {
      toast.error('Failed to parse file: ' + e.message);
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    const valid = parsed.filter(r => r.action !== 'error');
    if (valid.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    await bulk.mutateAsync(valid);
    reset();
    onOpenChange(false);
  };

  const close = () => {
    if (bulk.isPending) return;
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Import Employees
          </DialogTitle>
          <DialogDescription>
            Bulk create or update employees from an Excel file. Match by <code>employee_code</code> — leave blank to create new.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 — template */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="text-sm">
              <p className="font-medium">1. Download template</p>
              <p className="text-muted-foreground text-xs">Includes column headers, an example row, and an Instructions sheet.</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadEmployeeTemplate}>
              <Download className="h-4 w-4 mr-1" /> Template
            </Button>
          </div>

          {/* Step 2 — file picker */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">2. Upload filled file</p>
                <p className="text-muted-foreground text-xs">.xlsx, .xls, or .csv</p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={parsing}>
                  {parsing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  Choose file
                </Button>
                {parsed && (
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>
            {fileName && <p className="text-xs text-muted-foreground">Selected: <span className="font-mono">{fileName}</span></p>}
          </div>

          {/* Step 3 — preview */}
          {parsed && stats && (
            <div className="rounded-md border">
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Total {stats.total}</Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Create {stats.create}
                  </Badge>
                  <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/15">
                    Update {stats.update}
                  </Badge>
                  {stats.error > 0 && (
                    <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">
                      <AlertCircle className="h-3 w-3 mr-1" /> Errors {stats.error}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Showing first 50 rows</p>
              </div>
              <div className="overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Row</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 50).map((r) => (
                      <TableRow key={r.rowIndex} className={r.action === 'error' ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-mono text-xs">{r.rowIndex}</TableCell>
                        <TableCell>
                          {r.action === 'create' && <Badge variant="outline" className="text-emerald-700 border-emerald-300">Create</Badge>}
                          {r.action === 'update' && <Badge variant="outline" className="text-blue-700 border-blue-300">Update</Badge>}
                          {r.action === 'error' && <Badge variant="outline" className="text-destructive border-destructive/40">Error</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.raw.employee_code || '—'}</TableCell>
                        <TableCell className="text-sm">{r.raw.full_name || '-'}</TableCell>
                        <TableCell className="text-xs">{r.raw.employee_type || '-'}</TableCell>
                        <TableCell className="text-xs">{r.raw.phone || '-'}</TableCell>
                        <TableCell className="text-xs">{r.raw.department_name || '-'}</TableCell>
                        <TableCell className="text-xs text-destructive">{r.errors.join('; ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={bulk.isPending}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!parsed || bulk.isPending || !stats || stats.create + stats.update === 0}
          >
            {bulk.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Import {stats ? `${stats.create + stats.update} row${stats.create + stats.update === 1 ? '' : 's'}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
