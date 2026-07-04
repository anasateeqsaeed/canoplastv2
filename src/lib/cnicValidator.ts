/**
 * Pakistani CNIC helpers — accepts dashes or plain digits.
 * Stored format: "XXXXX-XXXXXXX-X" (with dashes) for readability.
 */

const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

export function normalizeCnic(input: string): string {
  const digits = (input || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

export function isValidCnic(value: string): boolean {
  if (!value) return true; // optional
  return CNIC_REGEX.test(value);
}

export function formatCnicForDisplay(value?: string | null): string {
  if (!value) return '-';
  return normalizeCnic(value);
}
