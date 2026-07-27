import { useMemo } from 'react';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { SearchableComboBox, ComboBoxOption } from '@/components/ui/searchable-combobox';
import { BookOpen } from 'lucide-react';

interface AccountSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** restrict to these account types, e.g. ['expense','asset'] */
  types?: string[];
}

export function AccountSelector({
  value,
  onChange,
  placeholder = 'Select account...',
  disabled = false,
  className,
  types,
}: AccountSelectorProps) {
  const { data: accounts = [] } = useChartOfAccounts();

  const options = useMemo((): ComboBoxOption[] => {
    return accounts
      .filter((a) => !a.is_group && a.is_active)
      .filter((a) => !types || types.includes(a.account_type))
      .map((a) => ({
        value: a.id,
        label: `${a.code} — ${a.name}`,
        description: a.account_type,
        icon: <BookOpen className="h-4 w-4 shrink-0 text-primary" />,
      }));
  }, [accounts, types]);

  return (
    <SearchableComboBox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
