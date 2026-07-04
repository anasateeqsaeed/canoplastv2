import { useMemo } from "react";
import { useDepartments } from "@/hooks/useDepartments";
import { SearchableComboBox, ComboBoxOption } from "@/components/ui/searchable-combobox";
import { Building2 } from "lucide-react";

interface DepartmentSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showInactive?: boolean;
  includeNone?: boolean;
  noneLabel?: string;
}

export function DepartmentSelector({
  value,
  onChange,
  placeholder = "Select department...",
  disabled = false,
  className,
  showInactive = false,
  includeNone = false,
  noneLabel = "None",
}: DepartmentSelectorProps) {
  const { data: departments = [], isLoading } = useDepartments();

  const options = useMemo((): ComboBoxOption[] => {
    let filtered = departments;

    // Filter inactive departments if showInactive is false
    if (!showInactive) {
      filtered = filtered.filter((d) => d.is_active);
    }

    const opts: ComboBoxOption[] = filtered.map((dept) => ({
      value: dept.id,
      label: dept.name,
      description: `${dept.code}${dept.description ? ` • ${dept.description}` : ""}`,
      icon: (
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
      ),
    }));

    // Add "None" option if requested
    if (includeNone) {
      opts.unshift({
        value: "none",
        label: noneLabel,
        description: "No department assigned",
      });
    }

    return opts;
  }, [departments, showInactive, includeNone, noneLabel]);

  const handleChange = (val: string) => {
    onChange(val === "none" ? "" : val);
  };

  return (
    <SearchableComboBox
      value={value || (includeNone ? "none" : "")}
      onChange={handleChange}
      options={options}
      placeholder={isLoading ? "Loading departments..." : placeholder}
      searchPlaceholder="Search departments..."
      emptyMessage="No departments found"
      disabled={disabled || isLoading}
      className={className}
      showClear={!includeNone}
    />
  );
}
