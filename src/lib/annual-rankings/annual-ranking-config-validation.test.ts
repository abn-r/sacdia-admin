import { describe, expect, it } from "vitest";
import {
  annualRankingConfigSchema,
  rankingTierSchema,
} from "./annual-ranking-config-validation";

const validComponents = [
  {
    component_key: "annual_folder",
    label: "Carpeta anual",
    max_points: 6000,
    sort_order: 1,
  },
  {
    component_key: "finance",
    label: "Finanzas",
    max_points: 2000,
    sort_order: 2,
  },
  {
    component_key: "camporee",
    label: "Camporee",
    max_points: 2000,
    sort_order: 3,
  },
];

describe("annualRankingConfigSchema", () => {
  it("requires annual max points", () => {
    const result = annualRankingConfigSchema.safeParse({
      local_field_id: 4,
      ecclesiastical_year_id: 1,
      club_type_id: 2,
      components: validComponents,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes("max_points"))).toBe(true);
  });

  it("requires component points to match annual max points", () => {
    const result = annualRankingConfigSchema.safeParse({
      local_field_id: 4,
      ecclesiastical_year_id: 1,
      club_type_id: 2,
      max_points: 12000,
      components: validComponents,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("igual al total anual");
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
