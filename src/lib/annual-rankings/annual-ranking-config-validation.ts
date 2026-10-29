import { z } from "zod";

export type RankingConfigValidationKey =
  | "componentKeyRequired"
  | "componentLabelRequired"
  | "componentPointsRequired"
  | "componentPointsInteger"
  | "componentPointsPositive"
  | "axisKeyRequired"
  | "axisLabelRequired"
  | "axisPointsRequired"
  | "axisPointsInteger"
  | "axisPointsPositive"
  | "scopeRequired"
  | "unionRequired"
  | "localFieldRequired"
  | "yearRequired"
  | "clubTypeRequired"
  | "totalRequired"
  | "totalInteger"
  | "totalPositive"
  | "axesSumMismatch"
  | "componentsSumMismatch"
  | "tierNameRequired"
  | "tierPercentRequired"
  | "tierPercentPositive";

/** Translator for `annual_folders.rankingConfigValidation`. */
export type RankingConfigValidationTranslator = (
  key: RankingConfigValidationKey,
  values?: Record<string, string | number>,
) => string;

/** Returns the key itself: for type inference and payload shape checks. */
const keyOnly: RankingConfigValidationTranslator = (key) => key;

export function buildAnnualRankingComponentSchema(t: RankingConfigValidationTranslator) {
  return z.object({
    component_key: z.string().trim().min(1, t("componentKeyRequired")),
    label: z.string().trim().min(1, t("componentLabelRequired")),
    max_points: z
      .number({ message: t("componentPointsRequired") })
      .int(t("componentPointsInteger"))
      .positive(t("componentPointsPositive")),
    sort_order: z.number().int().min(0).optional(),
  });
}

export function buildAnnualRankingAxisSchema(t: RankingConfigValidationTranslator) {
  return z.object({
    axis_key: z.string().trim().min(1, t("axisKeyRequired")),
    label: z.string().trim().min(1, t("axisLabelRequired")),
    max_points: z
      .number({ message: t("axisPointsRequired") })
      .int(t("axisPointsInteger"))
      .positive(t("axisPointsPositive")),
    sort_order: z.number().int().min(0).optional(),
    components: z.array(buildAnnualRankingComponentSchema(t)).min(1),
  });
}

export function buildAnnualRankingConfigSchema(t: RankingConfigValidationTranslator) {
  return z
    .object({
      annual_ranking_config_id: z.string().uuid().optional(),
      scope_type: z.enum(["union", "local_field"], {
        message: t("scopeRequired"),
      }),
      union_id: z
        .number()
        .int()
        .positive(t("unionRequired"))
        .nullable()
        .optional(),
      local_field_id: z
        .number()
        .int()
        .positive(t("localFieldRequired"))
        .nullable()
        .optional(),
      ecclesiastical_year_id: z.number({ error: t("yearRequired") }).int().positive(t("yearRequired")),
      club_type_id: z.number({ error: t("clubTypeRequired") }).int().positive(t("clubTypeRequired")),
      max_points: z
        .number({ message: t("totalRequired") })
        .int(t("totalInteger"))
        .positive(t("totalPositive")),
      axes: z.array(buildAnnualRankingAxisSchema(t)).min(1),
    })
    .superRefine((value, ctx) => {
      if (value.scope_type === "union" && !value.union_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["union_id"],
          message: t("unionRequired"),
        });
      }

      if (value.scope_type === "local_field" && !value.local_field_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["local_field_id"],
          message: t("localFieldRequired"),
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
          message: t("axesSumMismatch", { axisTotal, maxPoints: value.max_points }),
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
            message: t("componentsSumMismatch", {
              componentTotal,
              axis: axis.label,
              axisMax: axis.max_points,
            }),
          });
        }
      });
    });
}

export function buildRankingTierSchema(t: RankingConfigValidationTranslator) {
  return z.object({
    ranking_tier_id: z.string().uuid(),
    name: z.string().trim().min(1, t("tierNameRequired")),
    band_percentage: z
      .number({ message: t("tierPercentRequired") })
      .positive(t("tierPercentPositive")),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    sort_order: z.number().int().min(0).optional(),
    active: z.boolean().default(true),
  });
}

export const annualRankingComponentSchema = buildAnnualRankingComponentSchema(keyOnly);
export const annualRankingAxisSchema = buildAnnualRankingAxisSchema(keyOnly);
export const annualRankingConfigSchema = buildAnnualRankingConfigSchema(keyOnly);
export const rankingTierSchema = buildRankingTierSchema(keyOnly);

export type AnnualRankingConfigFormValues = z.infer<
  typeof annualRankingConfigSchema
>;
export type RankingTierFormValues = z.infer<typeof rankingTierSchema>;
