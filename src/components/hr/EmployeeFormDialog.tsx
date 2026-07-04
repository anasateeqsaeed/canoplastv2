import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DepartmentSelector } from '@/components/selectors/DepartmentSelector';
import { EmployeeTypeSelector } from '@/components/selectors/EmployeeTypeSelector';
import { useHrWorkPatterns, formatPatternTime } from '@/hooks/useHrWorkPatterns';
import { Loader2, Upload, User } from 'lucide-react';
import {
  Employee,
  EmployeeInput,
  useCreateEmployee,
  useUpdateEmployee,
  useUploadEmployeePhoto,
} from '@/hooks/useEmployees';
import { isValidCnic, normalizeCnic } from '@/lib/cnicValidator';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee?: Employee | null;
  onSaved?: (id: string) => void;
}

const empty: EmployeeInput = {
  employee_type: 'operator',
  full_name: '',
  phone: '',
  joining_date: new Date().toISOString().slice(0, 10),
  employment_status: 'active',
  salary_type: 'monthly',
  basic_salary: 0,
  payment_mode: 'cash',
  is_active: true,
  allowances: { housing: 0, transport: 0, food: 0 } as any,
};

export function EmployeeFormDialog({ open, onOpenChange, employee, onSaved }: Props) {
  const isEdit = !!employee;
  const [tab, setTab] = useState('personal');
  const [form, setForm] = useState<EmployeeInput>(empty);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();
  const uploadPhoto = useUploadEmployeePhoto();
  const saving = createMut.isPending || updateMut.isPending || uploadPhoto.isPending;

  useEffect(() => {
    if (open) {
      setTab('personal');
      setPhotoFile(null);
      setPhotoPreview(null);
      if (employee) {
        setForm({
          ...employee,
          allowances: (employee.allowances as any) || {},
        } as EmployeeInput);
      } else {
        setForm(empty);
      }
    }
  }, [open, employee]);

  const set = (k: keyof EmployeeInput, v: any) => setForm((s) => ({ ...s, [k]: v }));
  const setAllowance = (k: string, v: number) =>
    setForm((s) => ({ ...s, allowances: { ...(s.allowances as any || {}), [k]: v } as any }));

  const onPickPhoto = (f: File | null) => {
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      toast.error('Photo must be under 3MB');
      return;
    }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!form.full_name?.trim()) return toast.error('Full name is required'), setTab('personal');
    if (!form.phone?.trim()) return toast.error('Phone is required'), setTab('contact');
    if (form.cnic && !isValidCnic(form.cnic)) return toast.error('CNIC must be 13 digits (XXXXX-XXXXXXX-X)'), setTab('personal');
    if (!form.joining_date) return toast.error('Joining date is required'), setTab('employment');

    try {
      let result: any;
      if (isEdit && employee) {
        result = await updateMut.mutateAsync({ id: employee.id, ...form });
      } else {
        result = await createMut.mutateAsync(form);
      }
      const empId = (result?.id || employee?.id) as string;

      if (photoFile && empId) {
        const url = await uploadPhoto.mutateAsync({ employeeId: empId, file: photoFile });
        await updateMut.mutateAsync({ id: empId, photo_url: url });
      }
      onSaved?.(empId);
      onOpenChange(false);
    } catch {
      // toasts already shown
    }
  };

  const tabs = ['personal', 'contact', 'employment', 'salary'];
  const goNext = () => {
    const i = tabs.indexOf(tab);
    if (i < tabs.length - 1) setTab(tabs[i + 1]);
    else handleSave();
  };
  const goBack = () => {
    const i = tabs.indexOf(tab);
    if (i > 0) setTab(tabs[i - 1]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${employee?.employee_code}` : 'Enroll New Employee'}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="personal">1. Personal</TabsTrigger>
            <TabsTrigger value="contact">2. Contact</TabsTrigger>
            <TabsTrigger value="employment">3. Employment</TabsTrigger>
            <TabsTrigger value="salary">4. Salary</TabsTrigger>
          </TabsList>

          {/* PERSONAL */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={photoPreview || form.photo_url || undefined} />
                <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground">JPG/PNG, under 3MB</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name *">
                <Input value={form.full_name || ''} onChange={(e) => set('full_name', e.target.value)} placeholder="Ahmed Khan" />
              </Field>
              <Field label="Father / Husband name">
                <Input value={form.father_name || ''} onChange={(e) => set('father_name', e.target.value)} />
              </Field>
              <Field label="CNIC">
                <Input
                  value={form.cnic || ''}
                  onChange={(e) => set('cnic', normalizeCnic(e.target.value))}
                  placeholder="12345-1234567-1"
                  maxLength={15}
                />
              </Field>
              <Field label="Date of birth">
                <Input type="date" value={form.date_of_birth || ''} onChange={(e) => set('date_of_birth', e.target.value || null)} />
              </Field>
              <Field label="Gender">
                <Select value={form.gender || ''} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Marital status">
                <Select value={form.marital_status || ''} onValueChange={(v) => set('marital_status', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Blood group">
                <Select value={form.blood_group || ''} onValueChange={(v) => set('blood_group', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </TabsContent>

          {/* CONTACT */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone *">
                <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
              </Field>
              <Field label="Alt phone">
                <Input value={form.alt_phone || ''} onChange={(e) => set('alt_phone', e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <div />
              <Field label="Current address" className="col-span-2">
                <Textarea rows={2} value={form.current_address || ''} onChange={(e) => set('current_address', e.target.value)} />
              </Field>
              <Field label="Permanent address" className="col-span-2">
                <Textarea rows={2} value={form.permanent_address || ''} onChange={(e) => set('permanent_address', e.target.value)} />
              </Field>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Emergency contact</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Name">
                  <Input value={form.emergency_contact_name || ''} onChange={(e) => set('emergency_contact_name', e.target.value)} />
                </Field>
                <Field label="Relation">
                  <Input value={form.emergency_contact_relation || ''} onChange={(e) => set('emergency_contact_relation', e.target.value)} placeholder="Father, Spouse..." />
                </Field>
                <Field label="Phone">
                  <Input value={form.emergency_contact_phone || ''} onChange={(e) => set('emergency_contact_phone', e.target.value)} />
                </Field>
              </div>
            </div>
          </TabsContent>

          {/* EMPLOYMENT */}
          <TabsContent value="employment" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee code">
                <Input
                  value={form.employee_code || ''}
                  onChange={(e) => set('employee_code', e.target.value)}
                  placeholder="Auto (EMP-0001)"
                  disabled={isEdit}
                />
              </Field>
              <Field label="Employee type *">
                <EmployeeTypeSelector
                  value={(form as any).employee_type_id || ''}
                  onChange={(id, t) => {
                    set('employee_type_id' as any, id || null);
                    // Keep legacy field in sync for older code paths (operator vs staff)
                    if (t) set('employee_type', t.category === 'office' ? 'staff' : 'operator');
                  }}
                />
              </Field>
              <Field label="Designation">
                <Input value={form.designation || ''} onChange={(e) => set('designation', e.target.value)} placeholder="Senior Operator, Accountant…" />
              </Field>
              <Field label="Department">
                <DepartmentSelector
                  value={form.department_id || ''}
                  onChange={(v) => set('department_id', v || null)}
                  placeholder="Select department"
                  includeNone
                  noneLabel="None"
                />
              </Field>
              <Field label="Joining date *">
                <Input type="date" value={form.joining_date || ''} onChange={(e) => set('joining_date', e.target.value)} />
              </Field>
              <Field label="Employment status">
                <Select value={form.employment_status || 'active'} onValueChange={(v) => set('employment_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="on_leave">On leave</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Shift">
                <Select value={form.shift || ''} onValueChange={(v) => set('shift', v || null)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A (Morning)</SelectItem>
                    <SelectItem value="B">B (Evening)</SelectItem>
                    <SelectItem value="C">C (Night)</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="HR Work Pattern (override)">
                <WorkPatternSelect
                  value={(form as any).work_pattern_id || null}
                  onChange={(v) => set('work_pattern_id' as any, v)}
                />
              </Field>
              <Field label="Probation end date">
                <Input type="date" value={form.probation_end_date || ''} onChange={(e) => set('probation_end_date', e.target.value || null)} />
              </Field>
              <Field label="Punch / Device ID">
                <Input
                  value={(form as any).device_punch_id || ''}
                  onChange={(e) => set('device_punch_id' as any, e.target.value || null)}
                  placeholder="ID printed on biometric device"
                />
              </Field>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => set('is_active', v)} />
              <Label>Active</Label>
            </div>
          </TabsContent>

          {/* SALARY */}
          <TabsContent value="salary" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Salary type">
                <Select value={form.salary_type || 'monthly'} onValueChange={(v) => set('salary_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="daily">Daily wage</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="piece_rate">Piece rate</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Basic salary (PKR)">
                <Input type="number" min={0} value={form.basic_salary ?? 0} onChange={(e) => set('basic_salary', Number(e.target.value))} />
              </Field>
              <Field label="OT rate (per hour)">
                <Input type="number" min={0} value={form.overtime_rate ?? 0} onChange={(e) => set('overtime_rate', Number(e.target.value))} />
              </Field>
              <Field label="Payment mode">
                <Select value={form.payment_mode || 'cash'} onValueChange={(v) => set('payment_mode', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Allowances (PKR / month)</h4>
              <div className="grid grid-cols-3 gap-4">
                {(['housing','transport','food','other'] as const).map(k => (
                  <Field key={k} label={k.charAt(0).toUpperCase()+k.slice(1)}>
                    <Input
                      type="number"
                      min={0}
                      value={(form.allowances as any)?.[k] ?? 0}
                      onChange={(e) => setAllowance(k, Number(e.target.value))}
                    />
                  </Field>
                ))}
              </div>
            </div>
            {form.payment_mode === 'bank' && (
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <Field label="Bank name">
                  <Input value={form.bank_name || ''} onChange={(e) => set('bank_name', e.target.value)} />
                </Field>
                <Field label="Account number / IBAN">
                  <Input value={form.bank_account || ''} onChange={(e) => set('bank_account', e.target.value)} />
                </Field>
              </div>
            )}
            <Field label="Notes">
              <Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} disabled={tab === tabs[0] || saving}>Back</Button>
            {tab === tabs[tabs.length - 1] ? (
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {isEdit ? 'Save changes' : 'Enroll employee'}
              </Button>
            ) : (
              <Button onClick={goNext} disabled={saving}>Next</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function WorkPatternSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { data: patterns = [] } = useHrWorkPatterns();
  return (
    <Select value={value || '__inherit__'} onValueChange={(v) => onChange(v === '__inherit__' ? null : v)}>
      <SelectTrigger><SelectValue placeholder="Inherit from type" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__inherit__">Inherit from employee type</SelectItem>
        {patterns.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} — {formatPatternTime(p)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
