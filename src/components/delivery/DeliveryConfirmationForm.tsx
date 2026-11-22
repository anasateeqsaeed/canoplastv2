import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, Save, X, PackageCheck, ClipboardCheck, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { todayISO } from '@/lib/dates';
import {
  EMPTY_CONFIRMATION,
  ISSUE_OPTIONS,
  QC_OPTIONS,
  RECEIVING_OPTIONS,
  uploadDeliveryProof,
  useDeliveryConfirmation,
  useUpsertDeliveryConfirmation,
  type DeliveryConfirmation,
} from '@/hooks/useDeliveryConfirmations';

/** Downscale phone photos so uploads stay quick on mobile data. */
async function shrinkImage(file: File, maxSide = 1600): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 400_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function Bi({ en, ur, className }: { en: string; ur: string; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span>{en}</span>
      <span dir="rtl" lang="ur" className="font-urdu text-muted-foreground font-normal">{ur}</span>
    </span>
  );
}

function ChoiceChips<T extends string>({
  value,
  options,
  onChange,
  tone,
}: {
  value: T;
  options: Array<{ value: T; en: string; ur: string }>;
  onChange: (v: T) => void;
  tone?: (v: string) => string;
}) {
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-11 rounded-md border px-3 py-2 text-sm text-left transition-colors',
              active ? (tone?.(o.value) ?? 'bg-primary text-primary-foreground border-primary') : 'bg-background hover:bg-muted',
            )}
            aria-pressed={active}
          >
            <div className="font-medium leading-tight">{o.en}</div>
            <div dir="rtl" lang="ur" className={cn('text-xs leading-tight', active ? 'opacity-90' : 'text-muted-foreground')}>{o.ur}</div>
          </button>
        );
      })}
    </div>
  );
}

const statusTone = (v: string) =>
  v === 'received' || v === 'passed' || v === 'not_required' || v === 'none' || v === 'resolved'
    ? 'bg-green-600 text-white border-green-600'
    : v === 'refused' || v === 'failed' || v === 'open'
      ? 'bg-red-600 text-white border-red-600'
      : v === 'partial'
        ? 'bg-amber-500 text-white border-amber-500'
        : 'bg-primary text-primary-foreground border-primary';

function PhotoField({
  url,
  uploading,
  onPick,
  onClear,
  label,
}: {
  url: string | null;
  uploading: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
  label: { en: string; ur: string };
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label><Bi {...label} /></Label>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
      {url ? (
        <div className="flex items-start gap-3">
          <a href={url} target="_blank" rel="noreferrer" className="block">
            {/\.pdf($|\?)/i.test(url) ? (
              <div className="h-24 w-24 rounded border flex items-center justify-center text-xs">PDF</div>
            ) : (
              <img src={url} alt={label.en} className="h-24 w-24 rounded border object-cover" />
            )}
          </a>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={uploading}>
              <Camera size={14} className="mr-1" /> Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={uploading}>
              <X size={14} className="mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full min-h-11" onClick={() => ref.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Camera size={16} className="mr-2" />}
          {uploading ? 'Uploading…' : 'Take / upload photo'}
          <span dir="rtl" lang="ur" className="ml-2 text-muted-foreground">تصویر</span>
        </Button>
      )}
    </div>
  );
}

export function DeliveryConfirmationForm({
  dispatchId,
  dispatchedQty,
  onSaved,
}: {
  dispatchId: string;
  dispatchedQty?: number | null;
  onSaved?: () => void;
}) {
  const { data: existing, isLoading } = useDeliveryConfirmation(dispatchId);
  const save = useUpsertDeliveryConfirmation();
  const [form, setForm] = useState<DeliveryConfirmation>(EMPTY_CONFIRMATION(dispatchId));
  const [uploading, setUploading] = useState<'pod' | 'bilty' | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || loadedFor === dispatchId) return;
    setForm(existing ? { ...EMPTY_CONFIRMATION(dispatchId), ...existing } : EMPTY_CONFIRMATION(dispatchId));
    setLoadedFor(dispatchId);
  }, [existing, isLoading, dispatchId, loadedFor]);

  const set = <K extends keyof DeliveryConfirmation>(k: K, v: DeliveryConfirmation[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pick = async (kind: 'pod' | 'bilty', file: File) => {
    setUploading(kind);
    try {
      const url = await uploadDeliveryProof(dispatchId, kind, await shrinkImage(file));
      set(kind === 'pod' ? 'pod_url' : 'bilty_url', url);
      toast.success('Photo uploaded — press Save');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const setReceiving = (v: DeliveryConfirmation['receiving_status']) =>
    setForm((f) => ({
      ...f,
      receiving_status: v,
      received_date: v !== 'pending' && !f.received_date ? todayISO() : f.received_date,
      received_qty: v === 'received' && f.received_qty == null && dispatchedQty ? dispatchedQty : f.received_qty,
    }));

  const setQc = (v: DeliveryConfirmation['qc_status']) =>
    setForm((f) => ({ ...f, qc_status: v, qc_date: v !== 'pending' && !f.qc_date ? todayISO() : f.qc_date }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.issue_status === 'open' && !form.issue_notes?.trim()) {
      toast.error('Write what the issue is / مسئلہ لکھیں');
      return;
    }
    const clean: DeliveryConfirmation = {
      ...form,
      receiver_name: form.receiver_name?.trim() || null,
      customer_grn_number: form.customer_grn_number?.trim() || null,
      qc_remarks: form.qc_remarks?.trim() || null,
      bilty_number: form.bilty_required ? form.bilty_number?.trim() || null : form.bilty_number,
      issue_notes: form.issue_notes?.trim() || null,
      received_qty: form.received_qty === null || Number.isNaN(Number(form.received_qty)) ? null : Number(form.received_qty),
    };
    save.mutate(clean, { onSuccess: () => onSaved?.() });
  };

  if (isLoading || loadedFor !== dispatchId) {
    return <div className="p-6 text-center text-muted-foreground"><Loader2 className="inline mr-2 animate-spin" size={16} />Loading…</div>;
  }

  const shortQty =
    dispatchedQty != null && form.received_qty != null && Number(form.received_qty) < Number(dispatchedQty);

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-24 sm:pb-4">
      {/* Receiving */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PackageCheck size={18} className="text-primary" />
            <Bi en="Customer receiving" ur="کسٹمر وصولی" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChoiceChips value={form.receiving_status} options={RECEIVING_OPTIONS} onChange={setReceiving} tone={statusTone} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="received_date"><Bi en="Received date" ur="وصولی کی تاریخ" /></Label>
              <Input id="received_date" type="date" className="h-11" value={form.received_date ?? ''} onChange={(e) => set('received_date', e.target.value || null)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="received_qty">
                <Bi en={`Received qty${dispatchedQty != null ? ` (sent ${Number(dispatchedQty).toLocaleString()})` : ''}`} ur="وصول تعداد" />
              </Label>
              <Input
                id="received_qty"
                type="number"
                inputMode="numeric"
                min={0}
                className={cn('h-11', shortQty && 'border-amber-500')}
                value={form.received_qty ?? ''}
                onChange={(e) => set('received_qty', e.target.value === '' ? null : Number(e.target.value))}
              />
              {shortQty && <p className="text-xs text-amber-600">Short by {(Number(dispatchedQty) - Number(form.received_qty)).toLocaleString()}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="receiver_name"><Bi en="Receiver name" ur="وصول کنندہ" /></Label>
              <Input id="receiver_name" className="h-11" value={form.receiver_name ?? ''} onChange={(e) => set('receiver_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="grn"><Bi en="Customer GRN no." ur="کسٹمر جی آر این" /></Label>
              <Input id="grn" className="h-11" value={form.customer_grn_number ?? ''} onChange={(e) => set('customer_grn_number', e.target.value)} />
            </div>
          </div>
          <PhotoField
            label={{ en: 'Signed DC photo', ur: 'دستخط شدہ چالان کی تصویر' }}
            url={form.pod_url}
            uploading={uploading === 'pod'}
            onPick={(f) => pick('pod', f)}
            onClear={() => set('pod_url', null)}
          />
        </CardContent>
      </Card>

      {/* QC */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck size={18} className="text-primary" />
            <Bi en="Customer QC" ur="کسٹمر کیو سی" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChoiceChips value={form.qc_status} options={QC_OPTIONS} onChange={setQc} tone={statusTone} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="qc_date"><Bi en="QC date" ur="کیو سی تاریخ" /></Label>
              <Input id="qc_date" type="date" className="h-11" value={form.qc_date ?? ''} onChange={(e) => set('qc_date', e.target.value || null)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="qc_remarks"><Bi en="QC remarks" ur="کیو سی ریمارکس" /></Label>
            <Textarea id="qc_remarks" rows={2} value={form.qc_remarks ?? ''} onChange={(e) => set('qc_remarks', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Bilty */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <Bi en="Bilty" ur="بلٹی" />
            </span>
            <label className="flex items-center gap-2 text-sm font-normal">
              <Bi en="Required" ur="ضروری" />
              <Switch checked={form.bilty_required} onCheckedChange={(v) => set('bilty_required', v)} />
            </label>
          </CardTitle>
        </CardHeader>
        {form.bilty_required && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bilty_number"><Bi en="Bilty no." ur="بلٹی نمبر" /></Label>
                <Input id="bilty_number" className="h-11" value={form.bilty_number ?? ''} onChange={(e) => set('bilty_number', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bilty_date"><Bi en="Bilty date" ur="بلٹی تاریخ" /></Label>
                <Input id="bilty_date" type="date" className="h-11" value={form.bilty_date ?? ''} onChange={(e) => set('bilty_date', e.target.value || null)} />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-md border p-3 min-h-11">
              <Bi en="Bilty received back" ur="بلٹی واپس آ گئی" />
              <Switch checked={form.bilty_received} onCheckedChange={(v) => set('bilty_received', v)} />
            </label>
            <PhotoField
              label={{ en: 'Bilty photo', ur: 'بلٹی کی تصویر' }}
              url={form.bilty_url}
              uploading={uploading === 'bilty'}
              onPick={(f) => pick('bilty', f)}
              onClear={() => set('bilty_url', null)}
            />
          </CardContent>
        )}
      </Card>

      {/* Issue */}
      <Card className={cn(form.issue_status === 'open' && 'border-red-500')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle size={18} className={form.issue_status === 'open' ? 'text-red-600' : 'text-primary'} />
            <Bi en="Issue" ur="مسئلہ" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChoiceChips value={form.issue_status} options={ISSUE_OPTIONS} onChange={(v) => set('issue_status', v)} tone={statusTone} />
          {form.issue_status !== 'none' && (
            <div className="space-y-1">
              <Label htmlFor="issue_notes"><Bi en="Issue notes (short qty, leakage, wrong colour…)" ur="تفصیل" /></Label>
              <Textarea id="issue_notes" rows={3} value={form.issue_notes ?? ''} onChange={(e) => set('issue_notes', e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky save bar on phones */}
      <div className="fixed sm:static bottom-0 inset-x-0 z-20 border-t sm:border-0 bg-background/95 backdrop-blur p-3 sm:p-0">
        <Button type="submit" className="w-full sm:w-auto min-h-12 text-base" disabled={save.isPending || !!uploading}>
          {save.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
          Save <span dir="rtl" lang="ur" className="ml-2">محفوظ کریں</span>
        </Button>
      </div>
    </form>
  );
}
