import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboBoxOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SearchableComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboBoxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  showClear?: boolean;
  groupOrder?: string[];
}

export function SearchableComboBox({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  className,
  showClear = true,
  groupOrder,
}: SearchableComboBoxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  // Group options by their group property
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, ComboBoxOption[]> = {};
    const ungrouped: ComboBoxOption[] = [];

    options.forEach((option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    // Sort groups by groupOrder if provided
    const sortedGroupNames = groupOrder
      ? groupOrder.filter((g) => groups[g])
      : Object.keys(groups);

    return { groups, ungrouped, sortedGroupNames };
  }, [options, groupOrder]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            <span className="truncate">
              {selectedOption?.label || placeholder}
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {showClear && value && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 transition-opacity"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[--radix-popover-trigger-width] w-auto max-w-[400px] p-0 z-50 bg-popover border" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            
            {/* Render ungrouped options first */}
            {groupedOptions.ungrouped.length > 0 && (
              <CommandGroup>
                {groupedOptions.ungrouped.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description || ""}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    disabled={option.disabled}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.icon && (
                      <span className="shrink-0">{option.icon}</span>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground whitespace-normal">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Render grouped options */}
            {groupedOptions.sortedGroupNames.map((groupName) => (
              <CommandGroup key={groupName} heading={groupName}>
                {groupedOptions.groups[groupName].map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description || ""} ${groupName}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    disabled={option.disabled}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.icon && (
                      <span className="shrink-0">{option.icon}</span>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground whitespace-normal">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
