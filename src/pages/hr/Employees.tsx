import { useState, useMemo } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Search, Edit2, Eye, Users, UserCog, Loader2, User,
  HardHat, Briefcase, IdCard, Download, Upload, UserMinus,
} from 'lucide-react';
import { EmployeeImportDialog } from '@/components/hr/EmployeeImportDialog';
import { downloadEmployeeWorkbook } from '@/lib/employeeImportExport';
import { DepartmentSelector } from '@/components/selectors/DepartmentSelector';
import { RefreshButton } from '@/components/layout/RefreshButton';
import { useDepartments } from '@/hooks/useDepartments';
import {
  Employee,
  useEmployees,
  useToggleEmployeeStatus,
} from '@/hooks/useEmployees';
import { EmployeeFormDialog } from '@/components/hr/EmployeeFormDialog';
import { EmployeeViewDialog } from '@/components/hr/EmployeeViewDialog';
import { useEmployeeTypes } from '@/hooks/useEmployeeTypes';
import { format } from 'date-fns';

export default function Employees() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: employeeTypes = [] } = useEmployeeTypes();
  const { data: departments = [] } = useDepartments();
  const toggle = useToggleEmployeeStatus();

  const [search, setSearch] = usePersistedState('employees.search', '');
  const [filterType, setFilterType] = usePersistedState<string>('employees.type', 'all');
  const [filterDept, setFilterDept] = usePersistedState<string>('employees.dept', 'all');
  const [filterStatus, setFilterStatus] = usePersistedState<string>('employees.status', 'active');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      if (filterType !== 'all' && (e as any).employee_type_id !== filterType) return false;
      if (filterDept !== 'all' && e.department_id !== filterDept) return false;
      if (filterStatus === 'active' && !e.is_active) return false;
      if (filterStatus === 'inactive' && e.is_active) return false;
      if (filterStatus !== 'all' && filterStatus !== 'active' && filterStatus !== 'inactive'
          && e.employment_status !== filterStatus) return false;
      if (q) {
        const blob = `${e.full_name} ${e.employee_code} ${e.phone} ${e.cnic || ''} ${e.designation || ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [employees, search, filterType, filterDept, filterStatus]);

  const stats = useMemo(() => {
    const isFactory = (e: any) =>
      (e.employee_types?.category ?? (e.employee_type === 'operator' ? 'factory' : 'office')) === 'factory';
    const activeOnly = employees.filter(e => e.is_active);
    return {
      active: activeOnly.length,
      inactive: employees.length - activeOnly.length,
      factory: activeOnly.filter(isFactory).length,
      office: activeOnly.filter(e => !isFactory(e)).length,
    };
  }, [employees]);

  const deptBreakdown = useMemo(() => {
    const map = new Map<string, { active: number; total: number }>();
    for (const e of employees) {
      const key = e.department_id || '__none__';
      const cur = map.get(key) || { active: 0, total: 0 };
      cur.total += 1;
      if (e.is_active) cur.active += 1;
      map.set(key, cur);
    }
    return map;
  }, [employees]);

  const selectedDept = filterDept !== 'all' ? departments.find(d => d.id === filterDept) : null;
  const selectedDeptCount = filterDept !== 'all'
    ? (deptBreakdown.get(filterDept) || { active: 0, total: 0 })
    : null;

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (e: Employee) => { setEditing(e); setDialogOpen(true); };
  const openView = (e: Employee) => { setViewing(e); setViewOpen(true); };

  return (
    <MainLayout
      title="Employees"
      subtitle="Master record for operators and staff. Used by attendance, payroll, and assignments."
     
    >
      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={UserCog} label="Active" value={stats.active} accent />
          <StatCard icon={UserMinus} label="Inactive" value={stats.inactive} />
          <StatCard icon={HardHat} label="Factory (active)" value={stats.factory} />
          <StatCard icon={Briefcase} label="Office (active)" value={stats.office} />
        </div>

        <Card>
          <CardHeader className="py-3">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="flex flex-1 flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name, code, phone, CNIC…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {employeeTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DepartmentSelector
                  value={filterDept === 'all' ? '' : filterDept}
                  onChange={(v) => setFilterDept(v || 'all')}
                  placeholder="All departments"
                  className="w-44"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active only</SelectItem>
                    <SelectItem value="inactive">Inactive only</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="on_leave">On leave</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => downloadEmployeeWorkbook(filtered)} disabled={filtered.length === 0}>
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Import
                </Button>
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4 mr-1" /> New Employee
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedDept && selectedDeptCount && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedDept.name}</span>
                <span className="text-muted-foreground">·</span>
                <Badge variant="secondary">{selectedDeptCount.active} active</Badge>
                <Badge variant="outline">{selectedDeptCount.total} total</Badge>
                <span className="text-muted-foreground ml-1">Showing {filtered.length}</span>
              </div>
            )}
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <IdCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No employees found</p>
                {(search || filterType !== 'all' || filterDept !== 'all' || filterStatus !== 'all') && (
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={e.photo_url || undefined} />
                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                        <TableCell className="font-medium">{e.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {e.employee_type === 'operator'
                              ? <HardHat className="h-3 w-3 mr-1" />
                              : <Briefcase className="h-3 w-3 mr-1" />}
                            {(e as any).employee_types?.name || e.employee_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.designation || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.departments?.name || '-'}</TableCell>
                        <TableCell className="text-sm">{e.phone}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {e.joining_date ? format(new Date(e.joining_date), 'dd MMM yy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-xs">
                            {e.employment_status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={e.is_active}
                            onCheckedChange={() => toggle.mutate({ id: e.id, is_active: !e.is_active })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openView(e)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Edit2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editing}
        onSaved={(id) => {
          // After enrolling, open view dialog so user can attach documents immediately
          if (!editing) {
            const created = employees.find(e => e.id === id);
            if (created) { setViewing(created); setViewOpen(true); }
          }
        }}
      />

      <EmployeeViewDialog open={viewOpen} onOpenChange={setViewOpen} employee={viewing} />

      <EmployeeImportDialog open={importOpen} onOpenChange={setImportOpen} />

    </MainLayout>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
