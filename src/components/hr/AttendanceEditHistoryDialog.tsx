import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { PersonType } from '@/hooks/useAttendance';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personId: string;
  personType: PersonType;
  personName: string;
  date: string;
}

interface EditRow {
  id: string;
  actor_email: string | null;
  action: string;
  before_data: any;
  after_data: any;
  edit_reason: string | null;
  edit_reason_code: string | null;
  changed_at: string;
}

const fmt = (v: any) => (v == null || v === '' ? '—' : String(v));

function diffFields(before: any, after: any) {
  const fields = ['status', 'check_in', 'check_out', 'hours_worked', 'remarks'];
  return fields
    .filter((f) => (before?.[f] ?? null) !== (after?.[f] ?? null))
    .map((f) => ({ field: f, from: before?.[f], to: after?.[f] }));
}

export function AttendanceEditHistoryDialog({ open, onOpenChange, personId, personType, personName, date }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['attendance-edits', personId, personType, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_record_edits')
        .select('*')
        .eq('person_id', personId)
        .eq('person_type', personType)
        .eq('attendance_date', date)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return data as EditRow[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit history</DialogTitle>
          <DialogDescription>
            {personName} · {date} — admin-only audit log
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No edits recorded.</div>
        ) : (
          <div className="space-y-3">
            {data.map((row) => {
              const diffs = diffFields(row.before_data, row.after_data);
              return (
                <div key={row.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium uppercase">{row.action}</span>
                    <span>
                      {format(new Date(row.changed_at), 'yyyy-MM-dd HH:mm:ss')} ·{' '}
                      {row.actor_email || 'system'}
                    </span>
                  </div>
                  {(row.edit_reason_code || row.edit_reason) && (
                    <div className="mt-2 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-xs">
                      <span className="font-medium text-amber-900">Reason: </span>
                      <span className="text-amber-900">
                        {row.edit_reason_code ? `[${row.edit_reason_code}]` : ''}
                        {row.edit_reason_code && row.edit_reason ? ' — ' : ''}
                        {row.edit_reason || ''}
                      </span>
                    </div>
                  )}
                  {row.action === 'insert' ? (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {['status', 'check_in', 'check_out', 'hours_worked', 'remarks'].map((f) => (
                        <div key={f}>
                          <span className="text-muted-foreground">{f}: </span>
                          <span className="font-medium">{fmt(row.after_data?.[f])}</span>
                        </div>
                      ))}
                    </div>
                  ) : diffs.length === 0 ? (
                    <div className="mt-2 text-xs text-muted-foreground">No tracked field changed.</div>
                  ) : (
                    <table className="mt-2 w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="text-left font-normal">Field</th>
                          <th className="text-left font-normal">Old</th>
                          <th className="text-left font-normal">New</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffs.map((d) => (
                          <tr key={d.field} className="border-t">
                            <td className="py-1 pr-2 font-medium">{d.field}</td>
                            <td className="py-1 pr-2 text-red-600 line-through">{fmt(d.from)}</td>
                            <td className="py-1 pr-2 text-green-700">{fmt(d.to)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
