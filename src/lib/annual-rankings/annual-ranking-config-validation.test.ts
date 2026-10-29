import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import messages from "../../../messages/es.json";
import {
  buildAnnualRankingConfigSchema,
  buildRankingTierSchema,
  type RankingConfigValidationTranslator,
} from "./annual-ranking-config-validation";

const t = createTranslator({
  locale: "es",
  messages,
  namespace: "annual_folders.rankingConfigValidation",
}) as unknown as RankingConfigValidationTranslator;
const annualRankingConfigSchema = buildAnnualRankingConfigSchema(t);
const rankingTierSchema = buildRankingTierSchema(t);

const validAxes = [
  {
    axis_key: "administrative",
    label: "Cumplimiento Administrativo",
    max_points: 5000,
    sort_order: 1,
    components: [
      {
        component_key: "annual_evidence_folder",
        label: "Carpeta Anual de Evidencias",
        max_points: 3000,
        sort_order: 1,
      },
      {
        component_key: "finance_compliance",
        label: "Finanzas",
        max_points: 2000,
        sort_order: 2,
      },
    ],
  },
  {
    axis_key: "operational",
    label: "Vida Operativa del Club",
    max_points: 5000,
    sort_order: 3,
    components: [
      {
        component_key: "camporee_events",
        label: "Camporee",
        max_points: 5000,
        sort_order: 1,
      },
    ],
  },
];

describe("annualRankingConfigSchema", () => {
  it("accepts administrative and operational axes when sums match", () => {
    const result = annualRankingConfigSchema.safeParse({
      scope_type: "local_field",
      union_id: null,
      local_field_id: 4,
      ecclesiastical_year_id: 1,
      club_type_id: 2,
      max_points: 10000,
      axes: validAxes,
    });

    expect(result.success).toBe(true);
  });

  it("requires annual max points", () => {
    const result = annualRankingConfigSchema.safeParse({
      scope_type: "local_field",
      union_id: null,
      local_field_id: 4,
      ecclesiastical_year_id: 1,
      club_type_id: 2,
      axes: validAxes,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes("max_points"))).toBe(true);
  });

  it("requires axis points to match annual max points", () => {
    const result = annualRankingConfigSchema.safeParse({
      scope_type: "local_field",
      union_id: null,
      local_field_id: 4,
      ecclesiastical_year_id: 1,
      club_type_id: 2,
      max_points: 12000,
      axes: validAxes,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes("secciones"))).toBe(true);
  });

  it("requires component points to match their axis max points", () => {
    const result = annualRankingConfigSchema.safeParse({
      scope_type: "local_field",
      union_id: null,
      local_field_id: 4,
      ecclesiastical_year_id: 1,
      club_type_id: 2,
      max_points: 10000,
      axes: validAxes.map((axis) =>
        axis.axis_key === "administrative"
          ? {
              ...axis,
              components: axis.components.map((component) =>
                component.component_key === "finance_compliance"
                  ? { ...component, max_points: 1000 }
                  : component,
              ),
            }
          : axis,
      ),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes("sección"))).toBe(true);
  });
});

describe("rankingTierSchema", () => {
  it("requires tier band percentage to be positive", () => {
    const result = rankingTierSchema.safeParse({
      ranking_tier_id: "90000000-0000-4000-8000-000000000001",
      name: "Diamante",
      band_percentage: 0,
      active: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes("band_percentage"))).toBe(true);
  });
});

describe("translated messages", () => {
  it("uses the given locale", async () => {
    const en = (await import("../../../messages/en.json")).default;
    const tEn = createTranslator({
      locale: "en",
      messages: en,
      namespace: "annual_folders.rankingConfigValidation",
    }) as unknown as RankingConfigValidationTranslator;
    const result = buildRankingTierSchema(tEn).safeParse({
      ranking_tier_id: "6d5ba6a4-2c3c-46b5-a7f0-591ad00f5ac9",
      name: "",
      band_percentage: 5,
    });

    expect(result.error?.issues[0]?.message).toBe("The tier name is required");
  });
});
