/**
 * Finance categories carry a mandatory `type` on the backend
 * (`CreateFinanceCategoryDto.type`: 0 = income, 1 = expense).
 *
 * Kept outside `actions.ts` because "use server" modules can only export
 * async functions.
 */

export const FINANCE_CATEGORY_TYPE_INCOME = 0;
export const FINANCE_CATEGORY_TYPE_EXPENSE = 1;

export type FinanceCategoryType =
  | typeof FINANCE_CATEGORY_TYPE_INCOME
  | typeof FINANCE_CATEGORY_TYPE_EXPENSE;

export const FINANCE_CATEGORY_TYPE_FIELD = "type";

export function parseFinanceCategoryType(raw: unknown): FinanceCategoryType | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === String(FINANCE_CATEGORY_TYPE_INCOME)) return FINANCE_CATEGORY_TYPE_INCOME;
  if (text === String(FINANCE_CATEGORY_TYPE_EXPENSE)) return FINANCE_CATEGORY_TYPE_EXPENSE;
  return null;
}

/**
 * Extra payload fields for finance categories.
 * - create: `type` is required.
 * - update: `type` is only sent when present (the DTO is a partial).
 */
export function buildFinanceCategoryExtra(
  formData: FormData,
  mode: "create" | "update",
): { type?: FinanceCategoryType } {
  const raw = formData.get(FINANCE_CATEGORY_TYPE_FIELD);
  const type = parseFinanceCategoryType(raw);
  if (type === null) {
    if (mode === "create" || (raw !== null && String(raw).trim() !== "")) {
      throw new Error("El tipo de categoría es obligatorio.");
    }
    return {};
  }
  return { type };
}
