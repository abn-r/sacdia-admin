import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnualRankingConfigClientPage } from "./annual-ranking-config-client-page";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/api/annual-rankings", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/annual-rankings")>();
  return {
    ...original,
    createAnnualRankingConfig: vi.fn(),
    updateAnnualRankingConfig: vi.fn(),
    updateRankingTier: vi.fn(),
  };
});

const localFields: LocalField[] = [
  { local_field_id: 4, name: "Centro Veracruz", union_id: 1, active: true },
];

const unions: Union[] = [];

const clubTypes: ClubType[] = [{ club_type_id: 2, name: "Conquistadores" }];

const ecclesiasticalYears: EcclesiasticalYear[] = [
  {
    ecclesiastical_year_id: 1,
    name: "2026",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    active: true,
  },
];

const secondYear: EcclesiasticalYear = {
  ecclesiastical_year_id: 2,
  name: "2027",
  start_date: "2027-01-01",
  end_date: "2027-12-31",
  active: false,
};

describe("AnnualRankingConfigClientPage", () => {
  afterEach(() => cleanup());

  it("renders default administrative and operational axes", () => {
    render(
      <AnnualRankingConfigClientPage
        initialConfigs={[]}
        initialTiers={[]}
        unions={unions}
        localFields={localFields}
        clubTypes={clubTypes}
        ecclesiasticalYears={ecclesiasticalYears}
      />,
    );

    expect(screen.getByText("Eje Administrativo")).toBeInTheDocument();
    expect(screen.getByText("Eje Operativo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Carpeta Anual de Evidencias")).toBeInTheDocument();
  });

  it("keeps year and club type selectors enabled when only one local field is available", () => {
    render(
      <AnnualRankingConfigClientPage
        initialConfigs={[]}
        initialTiers={[]}
        unions={unions}
        localFields={localFields}
        clubTypes={[
          ...clubTypes,
          { club_type_id: 3, name: "Aventureros" },
        ]}
        ecclesiasticalYears={[...ecclesiasticalYears, secondYear]}
      />,
    );

    const selectors = screen.getAllByRole("combobox");
    expect(selectors[1]).toBeDisabled();
    expect(selectors[2]).not.toBeDisabled();
    expect(selectors[3]).not.toBeDisabled();
  });
});
