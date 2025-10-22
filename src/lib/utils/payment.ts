import { formatCurrency } from './number';

export type PaymentPreferenceRecord = {
  type: string;
  downPayment?: number;
  monthlyBudget?: number;
};

export function formatPaymentSummary(
  paymentPreferences: unknown,
  fallbackType: string | null
): string[] {
  const preferences = Array.isArray(paymentPreferences)
    ? (paymentPreferences as PaymentPreferenceRecord[])
    : [];

  if (preferences.length === 0) {
    return fallbackType ? [fallbackType.charAt(0).toUpperCase() + fallbackType.slice(1)] : [];
  }

  return preferences.map((pref) => {
    const label = pref.type.charAt(0).toUpperCase() + pref.type.slice(1);
    const parts: string[] = [label];
    if (typeof pref.downPayment === 'number' && !Number.isNaN(pref.downPayment)) {
      parts.push(`${formatCurrency(pref.downPayment)} down`);
    }
    if (typeof pref.monthlyBudget === 'number' && !Number.isNaN(pref.monthlyBudget)) {
      parts.push(`${formatCurrency(pref.monthlyBudget)} / mo`);
    }
    return parts.join(' • ');
  });
}
