import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Mail, MapPin, Building2, Calendar, Wallet, AlertCircle } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';
import { formatCnicForDisplay } from '@/lib/cnicValidator';
import { format } from 'date-fns';
import { EmployeeDocumentsPanel } from './EmployeeDocumentsPanel';

export function EmployeeViewDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: Employee | null;
}) {
  if (!employee) return null;

  const allowances = (employee.allowances || {}) as Record<string, number>;
  const totalAllowance = Object.values(allowances).reduce((a, b) => a + (Number(b) || 0), 0);
  const grossSalary = (employee.basic_salary || 0) + totalAllowance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Profile</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <Avatar className="h-20 w-20 border">
            <AvatarImage src={employee.photo_url || undefined} />
            <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold">{employee.full_name}</h3>
              <Badge variant="outline" className="font-mono">{employee.employee_code}</Badge>
              <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                {employee.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline" className="capitalize">{employee.employment_status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {employee.designation || '—'} · {employee.departments?.name || 'No department'} ·{' '}
              <span className="capitalize">{(employee as any).employee_types?.name || employee.employee_type}</span>
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <Section title="Personal" icon={User}>
            <Row label="Father / Husband" value={employee.father_name} />
            <Row label="CNIC" value={formatCnicForDisplay(employee.cnic)} mono />
            <Row label="Date of birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'dd MMM yyyy') : null} />
            <Row label="Gender" value={employee.gender} className="capitalize" />
            <Row label="Marital" value={employee.marital_status} className="capitalize" />
            <Row label="Blood group" value={employee.blood_group} />
          </Section>

          <Section title="Contact" icon={Phone}>
            <Row label="Phone" value={employee.phone} />
            <Row label="Alt phone" value={employee.alt_phone} />
            <Row label="Email" value={employee.email} icon={Mail} />
            <Row label="Current address" value={employee.current_address} icon={MapPin} />
            <Row label="Permanent address" value={employee.permanent_address} icon={MapPin} />
          </Section>

          <Section title="Emergency contact" icon={AlertCircle}>
            <Row label="Name" value={employee.emergency_contact_name} />
            <Row label="Relation" value={employee.emergency_contact_relation} />
            <Row label="Phone" value={employee.emergency_contact_phone} />
          </Section>

          <Section title="Employment" icon={Building2}>
            <Row label="Joining date" value={format(new Date(employee.joining_date), 'dd MMM yyyy')} icon={Calendar} />
            <Row label="Shift" value={employee.shift} />
            <Row label="Reports to" value={employee.reporting_to ? '—' : null} />
            <Row
              label="Probation end"
              value={employee.probation_end_date ? format(new Date(employee.probation_end_date), 'dd MMM yyyy') : null}
            />
          </Section>

          <Section title="Compensation" icon={Wallet} className="md:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Row label="Type" value={employee.salary_type} className="capitalize" />
              <Row label="Basic" value={`PKR ${(employee.basic_salary || 0).toLocaleString()}`} />
              <Row label="Allowances" value={`PKR ${totalAllowance.toLocaleString()}`} />
              <Row label="Gross" value={`PKR ${grossSalary.toLocaleString()}`} highlight />
              <Row label="OT rate" value={employee.overtime_rate ? `PKR ${employee.overtime_rate}/hr` : null} />
              <Row label="Payment" value={employee.payment_mode} className="capitalize" />
              {employee.payment_mode === 'bank' && (
                <>
                  <Row label="Bank" value={employee.bank_name} />
                  <Row label="Account" value={employee.bank_account} mono />
                </>
              )}
            </div>
          </Section>
        </div>

        {employee.notes && (
          <>
            <Separator />
            <div className="py-3">
              <p className="text-xs uppercase text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{employee.notes}</p>
            </div>
          </>
        )}

        <Separator />
        <EmployeeDocumentsPanel employeeId={employee.id} />
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
  mono,
  highlight,
  className,
}: {
  label: string;
  value?: string | number | null;
  icon?: any;
  mono?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className={`text-sm text-right break-words ${mono ? 'font-mono' : ''} ${highlight ? 'font-bold text-primary' : ''} ${className || ''}`}>
        {value || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}
