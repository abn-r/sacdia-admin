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

export const annualRankingAxisSchema = z.object({
  axis_key: z.string().trim().min(1, "La clave del eje es requerida"),
  label: z.string().trim().min(1, "La etiqueta del eje es requerida"),
  max_points: z
    .number({ message: "Los puntos del eje son requeridos" })
    .int("Los puntos del eje deben ser enteros")
    .positive("Los puntos del eje deben ser mayores a cero"),
  sort_order: z.number().int().min(0).optional(),
  components: z.array(annualRankingComponentSchema).min(1),
});

export const annualRankingConfigSchema = z
  .object({
    annual_ranking_config_id: z.string().uuid().optional(),
    scope_type: z.enum(["union", "local_field"], {
      message: "Seleccioná si la configuración aplica a Unión o Campo Local",
    }),
    union_id: z
      .number()
      .int()
      .positive("Seleccioná una unión")
      .nullable()
      .optional(),
    local_field_id: z
      .number()
      .int()
      .positive("Seleccioná un campo local")
      .nullable()
      .optional(),
    ecclesiastical_year_id: z.number().int().positive("Seleccioná un año"),
    club_type_id: z.number().int().positive("Seleccioná un tipo de club"),
    max_points: z
      .number({ message: "El total anual de puntos es requerido" })
      .int("El total anual debe ser un número entero")
      .positive("El total anual debe ser mayor a cero"),
    axes: z.array(annualRankingAxisSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.scope_type === "union" && !value.union_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["union_id"],
        message: "Seleccioná una unión",
      });
    }

    if (value.scope_type === "local_field" && !value.local_field_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["local_field_id"],
        message: "Seleccioná un campo local",
      });
    }

    const axisTotal = value.axes.reduce(
      (sum, axis) => sum + axis.max_points,
      0,
    );

    if (axisTotal !== value.max_points) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["axes"],
        message: `La suma de ejes (${axisTotal}) debe ser igual al total anual (${value.max_points}).`,
      });
    }

    value.axes.forEach((axis, index) => {
      const componentTotal = axis.components.reduce(
        (sum, component) => sum + component.max_points,
        0,
      );

      if (componentTotal !== axis.max_points) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["axes", index, "components"],
          message: `La suma de componentes (${componentTotal}) debe ser igual al máximo del eje ${axis.label} (${axis.max_points}).`,
        });
      }
    });
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
