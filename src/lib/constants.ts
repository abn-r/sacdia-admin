// ─── Shared date constants ─────────────────────────────────────────────────────

/**
 * Maps 1-based month numbers to Spanish month names.
 * Used across member-of-month components to display month labels.
 */
export const MONTH_NAMES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

/**
 * Month list with value/label pairs, suitable for Select inputs.
 * Derived from MONTH_NAMES so both stay in sync.
 */
export const MONTHS_SELECT = Object.entries(MONTH_NAMES).map(
  ([value, label]) => ({ value: Number(value), label }),
);
