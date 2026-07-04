import { format, parseISO } from 'date-fns';
import { formatCurrencyFull as formatCurrency } from '@/lib/currency';
import { amountInWords } from '@/hooks/usePayrollCalc';
import type { PayrollItem, PayrollRun } from '@/hooks/usePayroll';

interface Props {
  run: PayrollRun;
  item: PayrollItem;
}

export function PayslipPrint({ run, item }: Props) {
  const monthLabel = format(parseISO(run.period_month), 'MMMM yyyy');
  const emp = item.employee;

  return (
    <div className="payslip-page" style={{ padding: '8mm', fontFamily: 'Inter, sans-serif', fontSize: '10pt', color: '#000' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '8px' }}>
        <div style={{ fontSize: '14pt', fontWeight: 700 }}>CANO PLAST SYSTEM</div>
        <div style={{ fontSize: '11pt', fontWeight: 600 }}>SALARY SLIP — {monthLabel.toUpperCase()}</div>
        <div style={{ fontSize: '8pt', color: '#444' }}>Run: {run.run_code}</div>
      </div>

      {/* Employee block */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9pt' }}>
        <tbody>
          <tr>
            <td style={cell('label')}>Code</td>
            <td style={cell()}>{emp?.employee_code || '—'}</td>
            <td style={cell('label')}>Type</td>
            <td style={cell()}>{emp?.employee_type || '—'}</td>
          </tr>
          <tr>
            <td style={cell('label')}>Name</td>
            <td style={cell()} colSpan={3}>{emp?.full_name || '—'}</td>
          </tr>
          <tr>
            <td style={cell('label')}>Dept</td>
            <td style={cell()}>{emp?.departments?.name || '—'}</td>
            <td style={cell('label')}>Working days</td>
            <td style={cell()}>{run.working_days}</td>
          </tr>
          <tr>
            <td style={cell('label')}>Bank</td>
            <td style={cell()}>{emp?.bank_name || '—'}</td>
            <td style={cell('label')}>Account</td>
            <td style={cell()}>{emp?.bank_account || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* Attendance summary */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9pt' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={cell('h')}>Present</th>
            <th style={cell('h')}>Absent</th>
            <th style={cell('h')}>Leave</th>
            <th style={cell('h')}>Half</th>
            <th style={cell('h')}>Off</th>
            <th style={cell('h')}>Holiday</th>
            <th style={cell('h')}>Late</th>
            <th style={cell('h')}>Payable</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell('c')}>{item.days_present}</td>
            <td style={cell('c')}>{item.days_absent}</td>
            <td style={cell('c')}>{item.days_leave}</td>
            <td style={cell('c')}>{item.days_half}</td>
            <td style={cell('c')}>{item.days_off}</td>
            <td style={cell('c')}>{item.days_holiday}</td>
            <td style={cell('c')}>{item.days_late}</td>
            <td style={cell('c', true)}>{Number(item.payable_days).toFixed(1)}</td>
          </tr>
        </tbody>
      </table>

      {/* Earnings & Deductions */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9pt' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={cell('h')} colSpan={2}>Earnings</th>
            <th style={cell('h')} colSpan={2}>Deductions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell()}>Earned Basic ({Number(item.payable_days).toFixed(1)} × {formatCurrency(item.daily_wage)})</td>
            <td style={cell('r')}>{formatCurrency(item.earned_basic)}</td>
            <td style={cell()}>Advance Recovery</td>
            <td style={cell('r')}>{formatCurrency(item.advance_deduction)}</td>
          </tr>
          <tr>
            <td style={cell()}>Allowances</td>
            <td style={cell('r')}>{formatCurrency(item.allowances_amount)}</td>
            <td style={cell()}>Other Deductions</td>
            <td style={cell('r')}>{formatCurrency(item.other_deduction)}</td>
          </tr>
          <tr>
            <td style={cell()}>Overtime ({item.ot_hours} × {formatCurrency(item.ot_rate)})</td>
            <td style={cell('r')}>{formatCurrency(item.ot_amount)}</td>
            <td style={cell()}></td>
            <td style={cell('r')}></td>
          </tr>
          <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
            <td style={cell()}>Gross Pay</td>
            <td style={cell('r')}>{formatCurrency(item.gross_pay)}</td>
            <td style={cell()}>Total Deductions</td>
            <td style={cell('r')}>{formatCurrency(Number(item.advance_deduction) + Number(item.other_deduction))}</td>
          </tr>
        </tbody>
      </table>

      {/* Net pay */}
      <div style={{ border: '2px solid #000', padding: '6px 8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '8pt', textTransform: 'uppercase', color: '#444' }}>Net Payable</div>
          <div style={{ fontSize: '8pt', fontStyle: 'italic' }}>{amountInWords(Number(item.net_pay))}</div>
        </div>
        <div style={{ fontSize: '14pt', fontWeight: 700 }}>{formatCurrency(item.net_pay)}</div>
      </div>

      {/* Payment mode + remarks */}
      <div style={{ fontSize: '8pt', marginBottom: '14mm' }}>
        Payment Mode: <strong style={{ textTransform: 'uppercase' }}>{item.payment_mode}</strong>
        {item.paid_on && <span> · Paid on {format(parseISO(item.paid_on), 'dd MMM yyyy')}</span>}
        {item.remarks && <span> · {item.remarks}</span>}
      </div>

      {/* Signatures */}
      <table style={{ width: '100%', fontSize: '9pt', marginTop: '10mm' }}>
        <tbody>
          <tr>
            <td style={{ borderTop: '1px solid #000', textAlign: 'center', paddingTop: '2px', width: '33%' }}>
              Prepared By
            </td>
            <td style={{ width: '10%' }}></td>
            <td style={{ borderTop: '1px solid #000', textAlign: 'center', paddingTop: '2px', width: '33%' }}>
              Approved By
            </td>
            <td style={{ width: '10%' }}></td>
            <td style={{ borderTop: '1px solid #000', textAlign: 'center', paddingTop: '2px', width: '33%' }}>
              Employee Signature
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function cell(kind?: 'label' | 'h' | 'c' | 'r', strong = false): React.CSSProperties {
  const base: React.CSSProperties = {
    border: '1px solid #999',
    padding: '3px 6px',
    fontSize: '9pt',
  };
  if (kind === 'label') return { ...base, background: '#f5f5f5', fontWeight: 600, width: '20%' };
  if (kind === 'h') return { ...base, fontWeight: 700, textAlign: 'center', background: '#eee' };
  if (kind === 'c') return { ...base, textAlign: 'center', fontWeight: strong ? 700 : 400 };
  if (kind === 'r') return { ...base, textAlign: 'right' };
  return base;
}
