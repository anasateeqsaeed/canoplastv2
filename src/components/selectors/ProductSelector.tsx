import { useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import { SearchableComboBox, ComboBoxOption } from "@/components/ui/searchable-combobox";
import { Package } from "lucide-react";

interface ProductSelectorProps {
  value: string;
  onChange: (value: string, product?: { code: string; name: string; id: string; cycle_time?: number | null }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filterByClient?: string;
  /**
   * If set, products belonging to this client are grouped on top as "{Client}'s products"
   * and the remaining products are shown under "Other products" — both are searchable.
   * Use this instead of filterByClient when you want a soft preference, not a hard filter.
   */
  preferClient?: string;
  showInactive?: boolean;
  showOwnProducts?: boolean; // Show products without client_id (own products)
}

export function ProductSelector({
  value,
  onChange,
  placeholder = "Select product...",
  disabled = false,
  className,
  filterByClient,
  preferClient,
  showInactive = false,
  showOwnProducts = false,
}: ProductSelectorProps) {
  const { data: products = [], isLoading } = useProducts();

  const { options, groupOrder } = useMemo((): { options: ComboBoxOption[]; groupOrder?: string[] } => {
    let filtered = products;

    // Filter for own products (no client) if specified
    if (showOwnProducts) {
      filtered = filtered.filter((p) => !p.client_id);
    } else if (filterByClient) {
      // Filter by client if specified
      filtered = filtered.filter((p) => p.client_id === filterByClient);
    }

    // Department filtering via molds reconnects in Phase 5

    // Filter inactive products
    if (!showInactive) {
      filtered = filtered.filter((p) => p.is_active !== false);
    }

    // Determine group label for preferred client
    let preferredGroup: string | undefined;
    let otherGroup: string | undefined;
    if (preferClient && !filterByClient && !showOwnProducts) {
      const clientName =
        filtered.find((p) => p.client_id === preferClient)?.client?.name ||
        products.find((p) => p.client_id === preferClient)?.client?.name ||
        "Customer";
      preferredGroup = `${clientName}'s products`;
      otherGroup = "Other products";
    }

    const opts: ComboBoxOption[] = filtered.map((product) => {
      let group: string | undefined;
      if (preferredGroup) {
        group = product.client_id === preferClient ? preferredGroup : otherGroup;
      }
      return {
        value: product.id,
        label: product.code,
        description: `${product.name}${product.client?.name ? ' • ' + product.client.name : ''}`,
        icon: <Package size={14} className="text-primary" />,
        group,
      };
    });

    return {
      options: opts,
      groupOrder: preferredGroup && otherGroup ? [preferredGroup, otherGroup] : undefined,
    };
  }, [products, filterByClient, preferClient, showInactive, showOwnProducts]);

  const handleChange = (selectedValue: string) => {
    const product = products.find((p) => p.id === selectedValue);
    if (product) {
      onChange(selectedValue, {
        code: product.code,
        name: product.name,
        id: product.id,
        cycle_time: product.cycle_time,
      });
    } else {
      onChange(selectedValue);
    }
  };

  return (
    <SearchableComboBox
      value={value}
      onChange={handleChange}
      options={options}
      groupOrder={groupOrder}
      placeholder={isLoading ? "Loading products..." : placeholder}
      searchPlaceholder="Search by code or name..."
      emptyMessage="No products found"
      disabled={disabled || isLoading}
      className={className}
    />
  );
}
