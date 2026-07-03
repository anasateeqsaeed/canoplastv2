import { useState } from 'react';
import { useUserActivity, type UserActivityLog as ActivityLog } from '@/hooks/useUserActivity';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogIn, LogOut, AlertCircle, Monitor, Smartphone, Tablet } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserActivityLogProps {
  userId: string;
}

const activityConfig: Record<string, { icon: typeof LogIn; label: string; color: string }> = {
  login: {
    icon: LogIn,
    label: 'Login',
    color: 'bg-success/10 text-success border-success/30',
  },
  logout: {
    icon: LogOut,
    label: 'Logout',
    color: 'bg-muted text-muted-foreground border-border',
  },
  login_failed: {
    icon: AlertCircle,
    label: 'Failed Login',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

// Simple device detection from user agent
function getDeviceInfo(userAgent: string | null): { icon: typeof Monitor; label: string } {
  if (!userAgent) return { icon: Monitor, label: 'Unknown' };
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return { icon: Smartphone, label: 'Mobile' };
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return { icon: Tablet, label: 'Tablet' };
  }
  return { icon: Monitor, label: 'Desktop' };
}

// Extract browser from user agent
function getBrowser(userAgent: string | null): string {
  if (!userAgent) return 'Unknown';
  
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
}

export function UserActivityLog({ userId }: UserActivityLogProps) {
  const { data: activities, isLoading, error } = useUserActivity(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <AlertCircle className="mx-auto mb-2" size={24} />
        <p className="text-sm">Error loading activity log</p>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {activities.map((activity) => {
        const config = activityConfig[activity.activity_type] || activityConfig.login;
        const device = getDeviceInfo(activity.user_agent);
        const browser = getBrowser(activity.user_agent);
        const Icon = config.icon;
        const DeviceIcon = device.icon;

        return (
          <div
            key={activity.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
          >
            <div className={cn('p-2 rounded-full', config.color)}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs', config.color)}>
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DeviceIcon size={12} />
                  {device.label} • {browser}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(activity.created_at), 'dd MMM yyyy, hh:mm a')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
