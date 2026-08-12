export function formatCentavos(centavos: number, currency = "MXN") {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
    }).format(centavos / 100);
  } catch {
    return `${(centavos / 100).toFixed(2)} ${currency}`;
  }
}
