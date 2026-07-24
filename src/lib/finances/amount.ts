/**
 * Runtime `finances.amount` is integer pesos (MXN), same as mobile app + existing DB rows.
 * Example: amount 700 → $700.00 (not centavos).
 */
export function financeAmountToDisplay(amount: number): number {
  return amount;
}

export function financeDisplayToApiAmount(displayAmount: number): number {
  return Math.round(displayAmount);
}

export function formatFinanceAmount(
  amount: number,
  formatCurrency: (value: number) => string,
): string {
  return formatCurrency(financeAmountToDisplay(amount));
}
