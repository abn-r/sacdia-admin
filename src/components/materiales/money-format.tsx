interface MoneyFormatProps {
  /** Amount in centavos (integer). E.g. 123456 → $1,234.56 */
  centavos: number;
  className?: string;
}

/**
 * Formats an integer centavos value to a MXN currency string.
 * Example: 123456 → "$1,234.56"
 */
export function MoneyFormat({ centavos, className }: MoneyFormatProps) {
  const formatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);

  return <span className={className}>{formatted}</span>;
}
