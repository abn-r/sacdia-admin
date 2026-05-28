import { z } from "zod";

export const annualRankingComponentSchema = z.object({
  component_key: z.string().trim().min(1, "La clave del componente es requerida"),
  label: z.string().trim().min(1, "La etiqueta del componente es requerida"),
  max_points: z
    .number({ message: "Los puntos del componente son requeridos" })
    .int("Los puntos del componente deben ser enteros")
    .positive("Los puntos del componente deben ser mayores a cero"),
  sort_order: z.number().int().min(0).optional(),
});

export const annualRankingConfigSchema = z
  .object({
    annual_ranking_config_id: z.string().uuid().optional(),
    local_field_id: z.number().int().positive("Seleccioná un campo local"),
    ecclesiastical_year_id: z.number().int().positive("Seleccioná un año"),
    club_type_id: z.number().int().positive("Seleccioná un tipo de club"),
    max_points: z
      .number({ message: "El total anual de puntos es requerido" })
      .int("El total anual debe ser un número entero")
      .positive("El total anual debe ser mayor a cero"),
    components: z.array(annualRankingComponentSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const componentTotal = value.components.reduce(
      (sum, component) => sum + component.max_points,
      0,
    );

    if (componentTotal !== value.max_points) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: `La suma de componentes (${componentTotal}) debe ser igual al total anual (${value.max_points}).`,
      });
    }
  });

export const rankingTierSchema = z.object({
  ranking_tier_id: z.string().uuid(),
  name: z.string().trim().min(1, "El nombre del rango es requerido"),
  band_percentage: z
    .number({ message: "El porcentaje del rango es requerido" })
    .positive("El porcentaje del rango debe ser positivo"),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
});

export type AnnualRankingConfigFormValues = z.infer<
  typeof annualRankingConfigSchema
>;
export type RankingTierFormValues = z.infer<typeof rankingTierSchema>;
