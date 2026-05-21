import { z } from "zod";

export type ClassConfigPayload = {
  available_from_year_id: number | null;
  available_until_year_id: number | null;
  min_duration_years: number;
  max_duration_years: number;
};

export type ClassConfigParseResult =
  | { success: true; data: ClassConfigPayload }
  | { success: false; error: string };

function optionalYearId(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function durationYears(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

const classConfigSchema = z
  .object({
    available_from_year_id: z.number().int().positive().nullable(),
    available_until_year_id: z.number().int().positive().nullable(),
    min_duration_years: z.number().int().min(1, "La duración mínima debe ser al menos 1 año."),
    max_duration_years: z.number().int().min(1, "La duración máxima debe ser al menos 1 año."),
  })
  .superRefine((value, ctx) => {
    if (value.max_duration_years < value.min_duration_years) {
      ctx.addIssue({
        code: "custom",
        path: ["max_duration_years"],
        message: "La duración máxima debe ser mayor o igual a la mínima.",
      });
    }
  });

export function parseClassConfigFormData(formData: FormData): ClassConfigParseResult {
  const result = classConfigSchema.safeParse({
    available_from_year_id: optionalYearId(formData.get("available_from_year_id")),
    available_until_year_id: optionalYearId(formData.get("available_until_year_id")),
    min_duration_years: durationYears(formData.get("min_duration_years")),
    max_duration_years: durationYears(formData.get("max_duration_years")),
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "La configuración de la clase no es válida.",
    };
  }

  return { success: true, data: result.data };
}
