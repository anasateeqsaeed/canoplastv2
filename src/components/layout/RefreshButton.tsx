import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function RefreshButton({ className, variant = 'outline', size = 'sm', showLabel = true }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleRefresh} disabled={isRefreshing} className={cn('gap-2', className)}>
      <RefreshCw size={16} className={cn(isRefreshing && 'animate-spin')} />
      {showLabel && <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>}
    </Button>
  );
}
