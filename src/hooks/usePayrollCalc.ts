// Pure calculation helpers for payroll — no React, easy to test.
import type { AttendanceStatus } from './useAttendance';
import { STATUS_PAYABLE } from './useAttendance';

export interface AttendanceTally {
  P: number;
  A: number;
  L: number;
  H: number;
  O: number;
  HOL: number;
  LATE: number;
  payable: number;
}

export interface EmployeeForCalc {
  id: string;
  salary_type: string;          // 'monthly' | 'daily'
  basic_salary: number | null;
  allowances: Record<string, number> | null;
  overtime_rate: number | null;
}

export interface PayrollLine {
  employee_id: string;
  days_present: number;
  days_absent: number;
  days_leave: number;
  days_half: number;
  days_off: number;
  days_holiday: number;
  days_late: number;
  payable_days: number;
  daily_wage: number;
  earned_basic: number;
  allowances_amount: number;
  ot_hours: number;
  ot_rate: number;
  ot_amount: number;
  gross_pay: number;
  advance_deduction: number;
  other_deduction: number;
  net_pay: number;
}

export function tallyAttendance(
  records: { status: string }[],
): AttendanceTally {
  const t: AttendanceTally = { P: 0, A: 0, L: 0, H: 0, O: 0, HOL: 0, LATE: 0, payable: 0 };
  records.forEach((r) => {
    const s = (r.status as AttendanceStatus) || 'A';
    if (s in t) (t as any)[s] += 1;
    t.payable += STATUS_PAYABLE[s] ?? 0;
  });
  return t;
}

export function sumAllowances(allowances: Record<string, number> | null): number {
  if (!allowances) return 0;
  return Object.values(allowances).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

export interface CalcInput {
  employee: EmployeeForCalc;
  attendance: { status: string }[];
  workingDays: number;          // e.g. 26
  outstandingAdvance: number;   // PKR — system will cap deduction at this
  otHours?: number;             // override (default 0)
  otherDeduction?: number;      // override (default 0)
  advanceOverride?: number;     // explicit advance deduction override
}

export function calculatePayrollLine(input: CalcInput): PayrollLine {
  const { employee, attendance, workingDays } = input;
  const tally = tallyAttendance(attendance);

  const basic = Number(employee.basic_salary) || 0;
  const dailyWage =
    employee.salary_type === 'daily' ? basic : workingDays > 0 ? basic / workingDays : 0;

  const earnedBasic = round2(dailyWage * tally.payable);
  const allowancesAmount = round2(sumAllowances(employee.allowances));

  const otHours = Number(input.otHours) || 0;
  const otRate = Number(employee.overtime_rate) || 0;
  const otAmount = round2(otHours * otRate);

  const grossPay = round2(earnedBasic + allowancesAmount + otAmount);

  const advanceDeduction = round2(
    input.advanceOverride !== undefined
      ? Math.min(input.advanceOverride, input.outstandingAdvance)
      : Math.min(grossPay, input.outstandingAdvance),
  );
  const otherDeduction = round2(Number(input.otherDeduction) || 0);
  const netPay = round2(grossPay - advanceDeduction - otherDeduction);

  return {
    employee_id: employee.id,
    days_present: tally.P,
    days_absent: tally.A,
    days_leave: tally.L,
    days_half: tally.H,
    days_off: tally.O,
    days_holiday: tally.HOL,
    days_late: tally.LATE,
    payable_days: round2(tally.payable),
    daily_wage: round2(dailyWage),
    earned_basic: earnedBasic,
    allowances_amount: allowancesAmount,
    ot_hours: otHours,
    ot_rate: otRate,
    ot_amount: otAmount,
    gross_pay: grossPay,
    advance_deduction: advanceDeduction,
    other_deduction: otherDeduction,
    net_pay: netPay,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Simple PKR amount-in-words (Indian/Pakistani numbering)
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

export function amountInWords(amount: number): string {
  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Zero Rupees Only';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const rest = num % 100;

  const parts: string[] = [];
  if (crore) parts.push(twoDigit(crore) + ' Crore');
  if (lakh) parts.push(twoDigit(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigit(thousand) + ' Thousand');
  if (hundred) parts.push(ONES[hundred] + ' Hundred');
  if (rest) parts.push(twoDigit(rest));
  return parts.join(' ').trim() + ' Rupees Only';
}
