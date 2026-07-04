// Currency formatting for Pakistani Rupees

export function formatCurrency(value: number, options?: { 
  compact?: boolean;  // Use K/L abbreviations
  decimals?: number;  // Decimal places (default: 0)
}): string {
  const { compact = true, decimals = 0 } = options || {};
  
  if (compact) {
    if (value >= 10000000) { // 1 Crore
      return `Rs ${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) { // 1 Lakh
      return `Rs ${(value / 100000).toFixed(2)} L`;
    } else if (value >= 1000) {
      return `Rs ${(value / 1000).toFixed(1)}K`;
    }
  }
  
  return `Rs ${value.toLocaleString('en-PK', { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  })}`;
}

export function formatCurrencyShort(value: number): string {
  return formatCurrency(value, { compact: true });
}

export function formatCurrencyFull(value: number): string {
  return formatCurrency(value, { compact: false });
}
