import { PackageCheck, ClipboardCheck, FileText, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DeliveryConfirmation } from '@/hooks/useDeliveryConfirmations';

type Tone = 'ok' | 'warn' | 'bad' | 'off';
const toneCls: Record<Tone, string> = {
  ok: 'text-green-600',
  warn: 'text-amber-500',
  bad: 'text-red-600',
  off: 'text-muted-foreground/40',
};

function Icon({ tone, label, children }: { tone: Tone; label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex', toneCls[tone])} aria-label={label}>{children}</span>
      </TooltipTrigger>
      <TooltipContent><p className="text-xs whitespace-pre-line">{label}</p></TooltipContent>
    </Tooltip>
  );
}

/** Four small icons — Received / QC / Bilty / Issue — for the DC list. */
export function DeliveryStatusIcons({ c, size = 14 }: { c: DeliveryConfirmation | null | undefined; size?: number }) {
  const rec = c?.receiving_status ?? 'pending';
  const qc = c?.qc_status ?? 'pending';
  const recTone: Tone = rec === 'received' ? 'ok' : rec === 'partial' ? 'warn' : rec === 'refused' ? 'bad' : 'off';
  const qcTone: Tone = qc === 'passed' || qc === 'not_required' ? 'ok' : qc === 'partial' ? 'warn' : qc === 'failed' ? 'bad' : 'off';
  const biltyTone: Tone = !c?.bilty_required ? 'off' : c.bilty_received ? 'ok' : 'warn';
  const issueTone: Tone = c?.issue_status === 'open' ? 'bad' : c?.issue_status === 'resolved' ? 'ok' : 'off';
  return (
    <TooltipProvider delayDuration={150}>
      <span className="inline-flex items-center gap-1.5">
        <Icon tone={recTone} label={`Received: ${rec}\nوصولی`}><PackageCheck size={size} /></Icon>
        <Icon tone={qcTone} label={`QC: ${qc.replace('_', ' ')}\nکیو سی`}><ClipboardCheck size={size} /></Icon>
        <Icon
          tone={biltyTone}
          label={`Bilty: ${!c?.bilty_required ? 'not required' : c.bilty_received ? 'received' : 'pending'}\nبلٹی`}
        >
          <FileText size={size} />
        </Icon>
        <Icon
          tone={issueTone}
          label={`Issue: ${c?.issue_status ?? 'none'}${c?.issue_status === 'open' && c.issue_notes ? ` — ${c.issue_notes}` : ''}\nمسئلہ`}
        >
          <AlertTriangle size={size} />
        </Icon>
      </span>
    </TooltipProvider>
  );
}
