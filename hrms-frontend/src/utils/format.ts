/**
 * Format utility for HRMS
 */

/**
 * Format a number or string as VND currency
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0 ₫';
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return '0 ₫';
  
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(numericValue);
};

/**
 * Parse a formatted currency string back to number
 * Useful for inputs. Ex: "1.000.000" -> 1000000
 */
export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const cleanValue = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleanValue) || 0;
};

/**
 * Format string/number for input display with thousands separators
 * Ex: 1000000 -> "1,000,000"
 */
export const formatNumberInput = (value: number | string): string => {
  if (!value) return '';
  const numericValue = typeof value === 'string' ? parseCurrency(value) : value;
  if (isNaN(numericValue) || numericValue === 0) return '';
  // Use en-US to get commas for thousands (e.g. 2,000,000), which is common for input masks
  return new Intl.NumberFormat('en-US').format(numericValue);
};

/**
 * Format a date string to vi-VN format (DD/MM/YYYY)
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('vi-VN');
  } catch (e) {
    return '-';
  }
};

/**
 * Format a date string to vi-VN time format (HH:mm)
 */
export const formatTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '-';
  }
};

/**
 * Format a date string to vi-VN datetime format (DD/MM/YYYY HH:mm)
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return '-';
  }
};
