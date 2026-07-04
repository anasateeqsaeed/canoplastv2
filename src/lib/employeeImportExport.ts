import * as XLSX from 'xlsx';
import type { Employee, EmployeeInput } from '@/hooks/useEmployees';

export const EMPLOYEE_COLUMNS = [
  'employee_code', 'employee_type', 'full_name', 'father_name', 'cnic',
  'date_of_birth', 'gender', 'marital_status', 'blood_group',
  'phone', 'alt_phone', 'email',
  'current_address', 'permanent_address',
  'emergency_contact_name', 'emergency_contact_relation', 'emergency_contact_phone',
  'designation', 'department_name', 'joining_date', 'employment_status',
  'shift', 'probation_end_date',
  'salary_type', 'basic_salary', 'overtime_rate',
  'payment_mode', 'bank_name', 'bank_account',
  'is_active', 'notes',
] as const;

export type EmployeeRow = Record<(typeof EMPLOYEE_COLUMNS)[number], any>;

const EMPLOYEE_TYPES = ['operator', 'staff'];
const EMPLOYMENT_STATUSES = ['active', 'probation', 'on_leave', 'resigned', 'terminated'];
const SALARY_TYPES = ['monthly', 'daily', 'piece_rate', 'hourly'];
const PAYMENT_MODES = ['cash', 'bank', 'mobile'];

function fmtDate(v: string | null | undefined) {
  if (!v) return '';
  // already YYYY-MM-DD
  return String(v).slice(0, 10);
}

function employeeToRow(e: Employee): EmployeeRow {
  return {
    employee_code: e.employee_code,
    employee_type: e.employee_type,
    full_name: e.full_name,
    father_name: e.father_name || '',
    cnic: e.cnic || '',
    date_of_birth: fmtDate(e.date_of_birth),
    gender: e.gender || '',
    marital_status: e.marital_status || '',
    blood_group: e.blood_group || '',
    phone: e.phone,
    alt_phone: e.alt_phone || '',
    email: e.email || '',
    current_address: e.current_address || '',
    permanent_address: e.permanent_address || '',
    emergency_contact_name: e.emergency_contact_name || '',
    emergency_contact_relation: e.emergency_contact_relation || '',
    emergency_contact_phone: e.emergency_contact_phone || '',
    designation: e.designation || '',
    department_name: e.departments?.name || '',
    joining_date: fmtDate(e.joining_date),
    employment_status: e.employment_status,
    shift: e.shift || '',
    probation_end_date: fmtDate(e.probation_end_date),
    salary_type: e.salary_type,
    basic_salary: e.basic_salary ?? '',
    overtime_rate: e.overtime_rate ?? '',
    payment_mode: e.payment_mode || '',
    bank_name: e.bank_name || '',
    bank_account: e.bank_account || '',
    is_active: e.is_active ? 'true' : 'false',
    notes: e.notes || '',
  };
}

export function buildEmployeeWorkbook(employees: Employee[]) {
  const rows = employees.map(employeeToRow);
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...EMPLOYEE_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  return wb;
}

export function downloadEmployeeWorkbook(employees: Employee[]) {
  const wb = buildEmployeeWorkbook(employees);
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `employees_${date}.xlsx`);
}

export function downloadEmployeeTemplate() {
  const wb = XLSX.utils.book_new();
  // Empty data sheet with headers + 1 example row
  const example: EmployeeRow = {
    employee_code: '', // leave blank to auto-generate
    employee_type: 'operator',
    full_name: 'Example Name',
    father_name: 'Father Name',
    cnic: '',
    date_of_birth: '1990-01-15',
    gender: 'male',
    marital_status: 'single',
    blood_group: '',
    phone: '03001234567',
    alt_phone: '',
    email: '',
    current_address: '',
    permanent_address: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    designation: 'Operator',
    department_name: 'Production',
    joining_date: '2024-01-01',
    employment_status: 'active',
    shift: 'A',
    probation_end_date: '',
    salary_type: 'monthly',
    basic_salary: 30000,
    overtime_rate: '',
    payment_mode: 'cash',
    bank_name: '',
    bank_account: '',
    is_active: 'true',
    notes: '',
  };
  const ws = XLSX.utils.json_to_sheet([example], { header: [...EMPLOYEE_COLUMNS] });
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');

  const instructions = [
    ['Field', 'Required', 'Allowed values / format'],
    ['employee_code', 'No', 'Leave blank for new employee (auto-generated). Provide existing code to UPDATE that employee.'],
    ['employee_type', 'For new', `${EMPLOYEE_TYPES.join(' | ')} (defaults to staff)`],
    ['full_name', 'For new', 'Free text'],
    ['phone', 'For new', 'Free text'],
    ['joining_date', 'For new', 'YYYY-MM-DD'],
    ['date_of_birth', 'No', 'YYYY-MM-DD'],
    ['probation_end_date', 'No', 'YYYY-MM-DD'],
    ['gender', 'No', 'male | female | other'],
    ['marital_status', 'No', 'single | married | divorced | widowed'],
    ['employment_status', 'No', EMPLOYMENT_STATUSES.join(' | ') + ' (default active)'],
    ['salary_type', 'No', SALARY_TYPES.join(' | ') + ' (default monthly)'],
    ['payment_mode', 'No', PAYMENT_MODES.join(' | ')],
    ['department_name', 'No', 'Must match an existing department name (case-insensitive). Unknown names will fail.'],
    ['is_active', 'No', 'true | false | yes | no | 1 | 0  (default true)'],
    ['basic_salary / overtime_rate', 'No', 'Numeric'],
    ['', '', ''],
    ['Matching rule', '', 'employee_code present + matches existing → UPDATE. Empty code → CREATE.'],
  ];
  const wsi = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsi, 'Instructions');

  XLSX.writeFile(wb, `employees_template.xlsx`);
}

export async function parseEmployeeFile(file: File): Promise<EmployeeRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'employees') || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '', raw: false });
  return rows as EmployeeRow[];
}

function parseBool(v: any, def = true): boolean {
  if (v === '' || v == null) return def;
  const s = String(v).trim().toLowerCase();
  if (['true', 'yes', '1', 'y', 't'].includes(s)) return true;
  if (['false', 'no', '0', 'n', 'f'].includes(s)) return false;
  return def;
}

function parseNum(v: any): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Accept YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Try Date parse fallback
  const t = new Date(s);
  if (!isNaN(t.getTime())) return t.toISOString().slice(0, 10);
  return null;
}

export interface ValidatedRow {
  rowIndex: number; // 1-based row number in the sheet (excluding header)
  raw: EmployeeRow;
  action: 'create' | 'update' | 'error';
  existingId?: string;
  errors: string[];
  payload?: EmployeeInput;
}

export function validateRows(
  rows: EmployeeRow[],
  existingEmployees: Pick<Employee, 'id' | 'employee_code'>[],
  departments: { id: string; name: string }[],
): ValidatedRow[] {
  const codeMap = new Map(existingEmployees.map(e => [e.employee_code.toUpperCase(), e.id]));
  const deptMap = new Map(departments.map(d => [d.name.trim().toLowerCase(), d.id]));

  return rows.map((raw, i) => {
    const errors: string[] = [];
    const code = String(raw.employee_code || '').trim();
    const existingId = code ? codeMap.get(code.toUpperCase()) : undefined;
    const isUpdate = !!existingId;

    const full_name = String(raw.full_name || '').trim();
    const phone = String(raw.phone || '').trim();
    const joining_date = parseDate(raw.joining_date);

    if (!isUpdate) {
      if (!full_name) errors.push('full_name required');
      if (!phone) errors.push('phone required');
      if (!joining_date) errors.push('joining_date required (YYYY-MM-DD)');
    }
    if (raw.joining_date && !joining_date) errors.push('joining_date invalid');

    const dob = parseDate(raw.date_of_birth);
    if (raw.date_of_birth && !dob) errors.push('date_of_birth invalid');
    const probation = parseDate(raw.probation_end_date);
    if (raw.probation_end_date && !probation) errors.push('probation_end_date invalid');

    let department_id: string | null = null;
    const deptName = String(raw.department_name || '').trim();
    if (deptName) {
      const found = deptMap.get(deptName.toLowerCase());
      if (!found) errors.push(`unknown department "${deptName}"`);
      else department_id = found;
    }

    const employee_type = (String(raw.employee_type || '').trim().toLowerCase() || 'staff') as 'operator' | 'staff';
    if (!EMPLOYEE_TYPES.includes(employee_type)) errors.push(`employee_type must be ${EMPLOYEE_TYPES.join('|')}`);

    const employment_status = String(raw.employment_status || 'active').trim().toLowerCase();
    if (!EMPLOYMENT_STATUSES.includes(employment_status)) errors.push(`employment_status must be one of ${EMPLOYMENT_STATUSES.join('|')}`);

    const salary_type = String(raw.salary_type || 'monthly').trim().toLowerCase();
    if (!SALARY_TYPES.includes(salary_type)) errors.push(`salary_type must be one of ${SALARY_TYPES.join('|')}`);

    const payment_mode_raw = String(raw.payment_mode || '').trim().toLowerCase();
    if (payment_mode_raw && !PAYMENT_MODES.includes(payment_mode_raw))
      errors.push(`payment_mode must be one of ${PAYMENT_MODES.join('|')}`);

    const action: ValidatedRow['action'] = errors.length ? 'error' : (isUpdate ? 'update' : 'create');

    let payload: EmployeeInput | undefined;
    if (action !== 'error') {
      payload = {
        employee_code: code || undefined,
        employee_type,
        full_name: full_name || undefined,
        father_name: String(raw.father_name || '').trim() || null,
        cnic: String(raw.cnic || '').trim() || null,
        date_of_birth: dob,
        gender: String(raw.gender || '').trim() || null,
        marital_status: String(raw.marital_status || '').trim() || null,
        blood_group: String(raw.blood_group || '').trim() || null,
        phone: phone || undefined,
        alt_phone: String(raw.alt_phone || '').trim() || null,
        email: String(raw.email || '').trim() || null,
        current_address: String(raw.current_address || '').trim() || null,
        permanent_address: String(raw.permanent_address || '').trim() || null,
        emergency_contact_name: String(raw.emergency_contact_name || '').trim() || null,
        emergency_contact_relation: String(raw.emergency_contact_relation || '').trim() || null,
        emergency_contact_phone: String(raw.emergency_contact_phone || '').trim() || null,
        designation: String(raw.designation || '').trim() || null,
        department_id,
        joining_date: joining_date || undefined,
        employment_status,
        shift: String(raw.shift || '').trim() || null,
        probation_end_date: probation,
        salary_type,
        basic_salary: parseNum(raw.basic_salary),
        overtime_rate: parseNum(raw.overtime_rate),
        payment_mode: payment_mode_raw || null,
        bank_name: String(raw.bank_name || '').trim() || null,
        bank_account: String(raw.bank_account || '').trim() || null,
        is_active: parseBool(raw.is_active, true),
        notes: String(raw.notes || '').trim() || null,
      } as EmployeeInput;

      // Strip undefined keys from update payload to avoid clobbering with undefined
      if (isUpdate) {
        Object.keys(payload).forEach((k) => {
          if ((payload as any)[k] === undefined) delete (payload as any)[k];
        });
      }
    }

    return {
      rowIndex: i + 2, // header is row 1
      raw,
      action,
      existingId,
      errors,
      payload,
    };
  });
}
