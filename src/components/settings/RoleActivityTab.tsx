import { useState } from 'react';
import { useRoleActivityLog, ACTION_LABELS } from '@/hooks/useRoleActivityLog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Shield, UserPlus, UserMinus, Settings, Users } from 'lucide-react';

const actionIcons: Record<string, React.ReactNode> = {
  role_assigned: <UserPlus className="h-4 w-4 text-green-500" />,
  role_removed: <UserMinus className="h-4 w-4 text-red-500" />,
  permission_updated: <Settings className="h-4 w-4 text-amber-500" />,
  permissions_bulk_updated: <Settings className="h-4 w-4 text-amber-500" />,
  user_created: <Users className="h-4 w-4 text-blue-500" />,
  user_updated: <Users className="h-4 w-4 text-blue-500" />,
  user_deactivated: <UserMinus className="h-4 w-4 text-gray-500" />,
};

export function RoleActivityTab() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  
  const { data: logs, isLoading } = useRoleActivityLog({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    limit: 100,
  });

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return '-';
    
    if (details.module) {
      const updates = details.updates as Record<string, boolean> | undefined;
      if (updates) {
        const changes = Object.entries(updates)
          .map(([key, value]) => `${key.replace('can_', '')}: ${value ? '✓' : '✗'}`)
          .join(', ');
        return `${details.module}: ${changes}`;
      }
      return String(details.module);
    }
    
    if (details.roles) {
      return `Roles: ${(details.roles as string[]).join(', ')}`;
    }
    
    return JSON.stringify(details).slice(0, 50);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by action:</span>
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Time</TableHead>
              <TableHead className="w-[160px]">Action</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Target User</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs && logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {actionIcons[log.action] || <Shield className="h-4 w-4" />}
                      <span className="text-sm">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.actor_email?.split('@')[0] || 'System'}
                  </TableCell>
                  <TableCell>
                    {log.role && (
                      <Badge variant="outline" className="text-xs">
                        {log.role.replace('_', ' ')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.target_user_email?.split('@')[0] || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {formatDetails(log.details)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No activity logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {logs && logs.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {logs.length} most recent activities
        </p>
      )}
    </div>
  );
}
