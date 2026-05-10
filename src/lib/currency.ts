/**
 * @deprecated Use `useFormatCurrency` hook (client) or `getFormatCurrency` (server)
 * from `@/lib/format-locale` instead. This shim exists only for callers not yet
 * migrated to the locale-aware utilities (e.g. transactions-table.tsx).
 *
 * NOTE: The old signature `formatCurrency(amount, currency?, locale?)` is preserved
 * here for backward compat. New callers should use the hook variant which reads
 * locale from context automatically.
 */
import { formatCurrency as _formatCurrency } from "./format-locale";

export function formatCurrency(
  amount: number,
  currency: string = "MXN",
  locale: string = "es-MX",
): string {
  return _formatCurrency(amount, locale, currency);
}
