import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useShiftSettings, type ShiftSetting } from '@/hooks/useShiftSettings';
import { useQueryClient } from '@tanstack/react-query';

export function AttendanceRulesEditor() {
  const { data: settings = [] } = useShiftSettings();
  const qc = useQueryClient();
  const [rows, setRows] = useState<ShiftSetting[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(settings);
  }, [settings]);

  const setField = (id: string, patch: Partial<ShiftSetting>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        const { error } = await supabase
          .from('shift_settings')
          .update({
            start_hour: r.start_hour,
            end_hour: r.end_hour,
            is_active: r.is_active,
            grace_minutes: r.grace_minutes,
            lunch_minutes: r.lunch_minutes,
            standard_hours: r.standard_hours,
            ot_threshold_hours: r.ot_threshold_hours,
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.id);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ['shift-settings'] });
      toast.success('Rules updated');
    } catch (e: any) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Attendance & Shift Rules</CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure start/end times, grace period, lunch break, standard hours and overtime threshold per shift.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? 'Saving…' : 'Save rules'}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Shift</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2 text-left">Start hour</th>
              <th className="px-3 py-2 text-left">End hour</th>
              <th className="px-3 py-2 text-left">Grace (min)</th>
              <th className="px-3 py-2 text-left">Lunch (min)</th>
              <th className="px-3 py-2 text-left">Standard hrs</th>
              <th className="px-3 py-2 text-left">OT after (hrs)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-medium capitalize">{r.shift_name}</td>
                <td className="px-3 py-2">
                  <Switch checked={r.is_active} onCheckedChange={(v) => setField(r.id, { is_active: v })} />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min={0} max={23} value={r.start_hour}
                    onChange={(e) => setField(r.id, { start_hour: Number(e.target.value) })} className="h-8 w-20" />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min={0} max={23} value={r.end_hour}
                    onChange={(e) => setField(r.id, { end_hour: Number(e.target.value) })} className="h-8 w-20" />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min={0} value={r.grace_minutes ?? 15}
                    onChange={(e) => setField(r.id, { grace_minutes: Number(e.target.value) })} className="h-8 w-24" />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min={0} value={r.lunch_minutes ?? 60}
                    onChange={(e) => setField(r.id, { lunch_minutes: Number(e.target.value) })} className="h-8 w-24" />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min={0} step="0.5" value={r.standard_hours ?? 8}
                    onChange={(e) => setField(r.id, { standard_hours: Number(e.target.value) })} className="h-8 w-24" />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min={0} step="0.5" value={r.ot_threshold_hours ?? 8}
                    onChange={(e) => setField(r.id, { ot_threshold_hours: Number(e.target.value) })} className="h-8 w-24" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
