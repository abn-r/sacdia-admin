import { describe, expect, it } from "vitest";
import {
  annualRankingConfigSchema,
  rankingTierSchema,
} from "./annual-ranking-config-validation";

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
      local_field_id: 4,
      ecclesiastical_year_id: 1,
      club_type_id: 2,
      max_points: 12000,
      axes: validAxes,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("ejes");
  });

  it("requires component points to match their axis max points", () => {
    const result = annualRankingConfigSchema.safeParse({
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
    expect(result.error?.issues[0]?.message).toContain("eje");
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
