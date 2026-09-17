import { describe, expect, it } from "vitest";

import { findAnnualFolderSetupGap, findRankingConfigCreateGap } from "@/lib/prerequisites/annual-folder-gaps";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";

const today = new Date("2026-09-16T12:00:00.000Z");
const currentYear = { start_date: "2026-01-01", end_date: "2026-12-31" };

function rankingWithFolder(): AnnualRankingConfig {
  return {
    annual_ranking_config_id: "cfg-1",
    union_id: 1,
    local_field_id: null,
    ecclesiastical_year_id: 1,
    club_type_id: 1,
    max_points: 6000,
    active: true,
    created_by: null,
    updated_by: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    components: [
      {
        annual_ranking_component_config_id: "comp-1",
        annual_ranking_config_id: "cfg-1",
        component_key: "annual_evidence_folder",
        label: "Carpeta",
        max_points: 6000,
        sort_order: 1,
      },
    ],
  };
}

describe("findAnnualFolderSetupGap", () => {
  it("asks for a current ecclesiastical year first", () => {
    expect(
      findAnnualFolderSetupGap({
        ecclesiasticalYears: [{ start_date: "2024-01-01", end_date: "2024-12-31" }],
        clubTypes: [{ id: 1 }],
        templates: [{ active: true }],
        rankingConfigs: [rankingWithFolder()],
        today,
      }),
    ).toEqual({ id: "years", screenId: "catalogs-ecclesiastical-years" });
  });

  it("asks for club types before templates", () => {
    expect(
      findAnnualFolderSetupGap({
        ecclesiasticalYears: [currentYear],
        clubTypes: [],
        templates: [],
        rankingConfigs: [rankingWithFolder()],
        today,
      }),
    ).toEqual({ id: "club-types", screenId: "catalogs-club-types" });
  });

  it("asks for an active template before ranking", () => {
    expect(
      findAnnualFolderSetupGap({
        ecclesiasticalYears: [currentYear],
        clubTypes: [{ id: 1 }],
        templates: [{ active: false }],
        rankingConfigs: [],
        today,
      }),
    ).toEqual({ id: "templates", screenId: "annual-folders-templates" });
  });

  it("skips the template gap on the templates screen", () => {
    expect(
      findAnnualFolderSetupGap({
        ecclesiasticalYears: [currentYear],
        clubTypes: [{ id: 1 }],
        templates: [],
        rankingConfigs: [],
        includeTemplateGap: false,
        today,
      }),
    ).toEqual({ id: "ranking", screenId: "annual-folders-ranking-config" });
  });

  it("returns null when year, types, template and ranking exist", () => {
    expect(
      findAnnualFolderSetupGap({
        ecclesiasticalYears: [currentYear],
        clubTypes: [{ id: 1 }],
        templates: [{ active: true }],
        rankingConfigs: [rankingWithFolder()],
        today,
      }),
    ).toBeNull();
  });
});

describe("findRankingConfigCreateGap", () => {
  it("asks for a current ecclesiastical year first", () => {
    expect(
      findRankingConfigCreateGap({
        ecclesiasticalYears: [{ start_date: "2024-01-01", end_date: "2024-12-31" }],
        clubTypes: [{ id: 1 }],
        unions: [{ id: 1 }],
        localFields: [],
        today,
      }),
    ).toEqual({ id: "years", screenId: "catalogs-ecclesiastical-years" });
  });

  it("asks for club types before geography", () => {
    expect(
      findRankingConfigCreateGap({
        ecclesiasticalYears: [currentYear],
        clubTypes: [],
        unions: [],
        localFields: [],
        today,
      }),
    ).toEqual({ id: "club-types", screenId: "catalogs-club-types" });
  });

  it("asks for a union or local field last", () => {
    expect(
      findRankingConfigCreateGap({
        ecclesiasticalYears: [currentYear],
        clubTypes: [{ id: 1 }],
        unions: [],
        localFields: [],
        today,
      }),
    ).toEqual({ id: "unions", screenId: "catalogs-unions" });
  });

  it("accepts local fields when unions are empty", () => {
    expect(
      findRankingConfigCreateGap({
        ecclesiasticalYears: [currentYear],
        clubTypes: [{ id: 1 }],
        unions: [],
        localFields: [{ id: 2 }],
        today,
      }),
    ).toBeNull();
  });
});
