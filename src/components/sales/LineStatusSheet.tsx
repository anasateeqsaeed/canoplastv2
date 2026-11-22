import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LineStatusBoxes } from '@/components/sales/LineStatusBoxes';

/** Drawer with the Status Boxes for one order line. */
export function LineStatusSheet({
  soiId,
  title,
  subtitle,
  onOpenChange,
}: {
  soiId: string | null;
  title?: string;
  subtitle?: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!soiId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl xl:max-w-6xl overflow-y-auto p-4 sm:p-6">
        <SheetHeader className="mb-3 text-left">
          <SheetTitle>
            {title ?? 'Order line'} <span dir="rtl" lang="ur" className="font-normal text-muted-foreground">لائن کی صورتحال</span>
          </SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>
        {soiId && <LineStatusBoxes soiId={soiId} />}
      </SheetContent>
    </Sheet>
  );
}
