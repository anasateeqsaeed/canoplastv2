import { Clock, Lock, Pencil, Shield, Trash2 } from 'lucide-react';
import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Button } from './button';

interface EditPermissionBadgeProps {
  canEdit: boolean;
  canDelete: boolean;
  isWithinEditWindow: boolean;
  reason?: string;
}

export function EditPermissionBadge({ 
  canEdit, 
  isWithinEditWindow, 
  reason 
}: EditPermissionBadgeProps) {
  if (canEdit && isWithinEditWindow) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              Editable
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>You can edit this entry (within 24h window)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (canEdit && !isWithinEditWindow) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              Admin Access
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Admin can always edit entries</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="secondary" className="text-xs gap-1 text-muted-foreground">
            <Lock className="h-3 w-3" />
            Locked
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reason || 'Entry cannot be modified'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface EditDeleteButtonsProps {
  canEdit: boolean;
  canDelete: boolean;
  reason?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export function EditDeleteButtons({
  canEdit,
  canDelete,
  reason,
  onEdit,
  onDelete,
  size = 'icon',
}: EditDeleteButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="ghost"
                size={size}
                onClick={onEdit}
                disabled={!canEdit}
                className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {canEdit ? 'Edit entry' : reason || 'Cannot edit'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="ghost"
                size={size}
                onClick={onDelete}
                disabled={!canDelete}
                className={!canDelete ? 'opacity-50 cursor-not-allowed' : 'text-destructive hover:text-destructive'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {canDelete ? 'Delete entry' : reason || 'Cannot delete'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
