export function formatCurrency(
  amount: number,
  currency: string = "MXN",
  locale: string = "es-MX",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
