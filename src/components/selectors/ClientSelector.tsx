import { useMemo } from "react";
import { useClients } from "@/hooks/useClients";
import { SearchableComboBox, ComboBoxOption } from "@/components/ui/searchable-combobox";
import { Building2, CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientSelectorProps {
  value: string;
  onChange: (value: string, client?: { id: string; name: string; code: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showInactive?: boolean;
  includeNone?: boolean;
  noneLabel?: string;
}

export function ClientSelector({
  value,
  onChange,
  placeholder = "Select client...",
  disabled = false,
  className,
  showInactive = false,
  includeNone = false,
  noneLabel = "None",
}: ClientSelectorProps) {
  const { data: clients = [], isLoading } = useClients();

  const options = useMemo((): ComboBoxOption[] => {
    let filtered = clients;

    if (!showInactive) {
      filtered = filtered.filter((c) => c.is_active !== false);
    }

    const opts: ComboBoxOption[] = filtered.map((client) => ({
      value: client.id,
      label: `${client.code} - ${client.name}`,
      description: client.is_active === false ? "Inactive" : client.contact_person || undefined,
      icon: (
        <Building2
          className={cn(
            "h-4 w-4 shrink-0",
            client.is_active === false ? "text-muted-foreground" : "text-primary"
          )}
        />
      ),
    }));

    if (includeNone) {
      opts.unshift({
        value: "none",
        label: noneLabel,
        icon: <CircleSlash className="h-4 w-4 shrink-0 text-muted-foreground" />,
      });
    }

    return opts;
  }, [clients, showInactive, includeNone, noneLabel]);

  const handleChange = (val: string) => {
    if (val === "none" || val === "") {
      onChange("");
      return;
    }
    const client = clients.find((c) => c.id === val);
    if (client) {
      onChange(val, { id: client.id, name: client.name, code: client.code });
    } else {
      onChange(val);
    }
  };

  return (
    <SearchableComboBox
      value={value || (includeNone ? "none" : "")}
      onChange={handleChange}
      options={options}
      placeholder={isLoading ? "Loading clients..." : placeholder}
      searchPlaceholder="Search by code or name..."
      emptyMessage="No clients found"
      disabled={disabled || isLoading}
      className={className}
      showClear={!includeNone}
    />
  );
}
