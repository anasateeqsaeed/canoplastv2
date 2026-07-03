import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Sparkles } from 'lucide-react';
import {
  useCustomRoles,
  useUserCustomRoles,
  useAssignCustomRole,
  useRemoveCustomRole,
} from '@/hooks/useCustomRoles';

interface Props {
  userId: string;
}

export function UserCustomRolesSection({ userId }: Props) {
  const { data: allRoles, isLoading: rolesLoading } = useCustomRoles();
  const { data: assignments, isLoading: aLoading } = useUserCustomRoles(userId);
  const assign = useAssignCustomRole();
  const remove = useRemoveCustomRole();
  const [picking, setPicking] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string>('');

  const activeRoles = (allRoles ?? []).filter((r) => r.is_active);
  const assignedIds = new Set((assignments ?? []).map((a) => a.custom_role_id));
  const available = activeRoles.filter((r) => !assignedIds.has(r.id));

  const handleAssign = async (customRoleId: string) => {
    await assign.mutateAsync({
      userId,
      customRoleId,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setPicking(null);
    setExpiresAt('');
  };

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Custom Roles</span>
          <span className="text-xs text-muted-foreground">(temporary or special-purpose access)</span>
        </div>
      </div>

      {(rolesLoading || aLoading) ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <>
          {(assignments ?? []).length > 0 && (
            <div className="space-y-2">
              {(assignments ?? []).map((a) => {
                const role = (allRoles ?? []).find((r) => r.id === a.custom_role_id);
                if (!role) return null;
                const expired = a.expires_at && new Date(a.expires_at) < new Date();
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={role.color ?? ''}>{role.name}</Badge>
                      {a.expires_at && (
                        <span className={`text-xs ${expired ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {expired ? 'Expired ' : 'Expires '}{new Date(a.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {available.length === 0 && (assignments ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No custom roles defined yet. Create one in Settings → Role Management → Roles.</p>
          )}

          {available.length > 0 && (
            <div className="space-y-2 p-3 border rounded-md bg-muted/30">
              <Label className="text-xs">Assign a custom role</Label>
              <div className="flex flex-wrap gap-2">
                {available.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPicking(picking === r.id ? null : r.id)}
                    className={`px-2 py-1 rounded border text-xs transition ${r.color ?? ''} ${picking === r.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
              {picking && (
                <div className="flex items-end gap-2 pt-2">
                  <div className="flex-1">
                    <Label htmlFor="cr-exp" className="text-xs">Expires (optional)</Label>
                    <Input
                      id="cr-exp"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={() => handleAssign(picking)} disabled={assign.isPending}>
                    Assign
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setPicking(null); setExpiresAt(''); }}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
