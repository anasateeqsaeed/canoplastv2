import { useMemo } from "react";
import { useSuppliers, SupplierType } from "@/hooks/useSuppliers";
import { SearchableComboBox, ComboBoxOption } from "@/components/ui/searchable-combobox";
import { Factory, Users, Banknote, Package, CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupplierSelectorProps {
  value: string;
  onChange: (value: string, supplier?: { id: string; name: string; code: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filterByType?: SupplierType;
  showInactive?: boolean;
  includeNone?: boolean;
  noneLabel?: string;
  groupByType?: boolean;
}

const SUPPLIER_TYPE_ICONS: Record<string, React.ReactNode> = {
  vendor: <Factory className="h-4 w-4 shrink-0 text-primary" />,
  job_work: <Users className="h-4 w-4 shrink-0 text-amber-500" />,
  cash_purchase: <Banknote className="h-4 w-4 shrink-0 text-success" />,
  customer_provided: <Package className="h-4 w-4 shrink-0 text-muted-foreground" />,
};

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  vendor: "Vendor",
  job_work: "Job Work Party",
  cash_purchase: "Cash Purchase",
  customer_provided: "Customer Provided",
};

export function SupplierSelector({
  value,
  onChange,
  placeholder = "Select supplier...",
  disabled = false,
  className,
  filterByType,
  showInactive = false,
  includeNone = false,
  noneLabel = "None",
  groupByType = false,
}: SupplierSelectorProps) {
  const { data: suppliers = [], isLoading } = useSuppliers(filterByType);

  const options = useMemo((): ComboBoxOption[] => {
    let filtered = suppliers;

    if (!showInactive) {
      filtered = filtered.filter((s) => s.is_active !== false);
    }

    const opts: ComboBoxOption[] = filtered.map((supplier) => {
      const supplierType = supplier.supplier_type || "vendor";
      
      return {
        value: supplier.id,
        label: `${supplier.code} - ${supplier.name}`,
        description: supplier.is_active === false 
          ? "Inactive" 
          : supplier.contact_person || undefined,
        icon: (
          <span className={cn(supplier.is_active === false && "opacity-50")}>
            {SUPPLIER_TYPE_ICONS[supplierType] || SUPPLIER_TYPE_ICONS.vendor}
          </span>
        ),
        group: groupByType ? SUPPLIER_TYPE_LABELS[supplierType] : undefined,
      };
    });

    if (includeNone) {
      opts.unshift({
        value: "none",
        label: noneLabel,
        icon: <CircleSlash className="h-4 w-4 shrink-0 text-muted-foreground" />,
      });
    }

    return opts;
  }, [suppliers, showInactive, includeNone, noneLabel, groupByType]);

  const handleChange = (val: string) => {
    if (val === "none" || val === "") {
      onChange("");
      return;
    }
    const supplier = suppliers.find((s) => s.id === val);
    if (supplier) {
      onChange(val, { id: supplier.id, name: supplier.name, code: supplier.code });
    } else {
      onChange(val);
    }
  };

  const groupOrder = groupByType 
    ? ["Vendor", "Job Work Party", "Cash Purchase", "Customer Provided"] 
    : undefined;

  return (
    <SearchableComboBox
      value={value || (includeNone ? "none" : "")}
      onChange={handleChange}
      options={options}
      placeholder={isLoading ? "Loading suppliers..." : placeholder}
      searchPlaceholder="Search by code or name..."
      emptyMessage="No suppliers found"
      disabled={disabled || isLoading}
      className={className}
      showClear={!includeNone}
      groupOrder={groupOrder}
    />
  );
}
