import { useMemo, useState } from "react";
import { useClientConsignees, useCreateClientConsignee } from "@/hooks/useClientConsignees";
import { SearchableComboBox, ComboBoxOption } from "@/components/ui/searchable-combobox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface ConsigneeSelectorProps {
  clientId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ConsigneeSelector({
  clientId,
  value,
  onChange,
  placeholder = "Select consignee...",
  disabled = false,
  className,
}: ConsigneeSelectorProps) {
  const { data: consignees = [], isLoading } = useClientConsignees(clientId);
  const createConsignee = useCreateClientConsignee();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const options = useMemo((): ComboBoxOption[] => {
    return consignees.map((c) => ({
      value: c.name,
      label: c.name,
      icon: <UserCheck className="h-4 w-4 shrink-0 text-primary" />,
    }));
  }, [consignees]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createConsignee.mutateAsync({ client_id: clientId, name: newName.trim() });
      onChange(newName.trim());
      setNewName("");
      setAddOpen(false);
      toast.success("Consignee added");
    } catch (e: any) {
      if (e.message?.includes("duplicate")) {
        toast.error("This consignee already exists for this client");
      } else {
        toast.error("Failed to add consignee");
      }
    }
  };

  return (
    <div className="flex gap-1.5 items-start">
      <div className="flex-1">
        <SearchableComboBox
          value={value}
          onChange={onChange}
          options={options}
          placeholder={isLoading ? "Loading..." : !clientId ? "Select client first" : placeholder}
          searchPlaceholder="Search consignees..."
          emptyMessage="No consignees found"
          disabled={disabled || !clientId || isLoading}
          className={className}
          showClear
        />
      </div>
      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" disabled={!clientId}>
            <Plus size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <Label className="text-xs font-medium">New Consignee</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Consignee name"
            className="mt-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" className="mt-2 w-full" onClick={handleAdd} disabled={!newName.trim() || createConsignee.isPending}>
            Add
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
