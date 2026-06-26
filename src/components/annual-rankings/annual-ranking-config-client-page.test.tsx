import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { AnnualRankingConfigClientPage } from "./annual-ranking-config-client-page";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";

function renderPage(props: React.ComponentProps<typeof AnnualRankingConfigClientPage>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TooltipProvider>
        <AnnualRankingConfigClientPage {...props} />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

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
    deactivateAnnualRankingConfig: vi.fn(),
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

describe("AnnualRankingConfigClientPage", () => {
  afterEach(() => cleanup());

  it("renders budget list and tiers tabs", () => {
    renderPage({
      initialConfigs: [],
      initialTiers: [],
      unions,
      localFields,
      clubTypes,
      ecclesiasticalYears,
    });

    expect(screen.getByRole("tab", { name: /Presupuesto anual/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Rangos de reconocimiento/i })).toBeInTheDocument();
    expect(screen.getByText("Presupuestos configurados")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Nueva configuración/i }).length,
    ).toBeGreaterThan(0);
  });

  it("shows configured records in the budget table", () => {
    renderPage({
      initialConfigs: [
        {
          annual_ranking_config_id: "f0000000-0000-4000-8000-000000000001",
          union_id: null,
          local_field_id: 4,
          ecclesiastical_year_id: 1,
          club_type_id: 2,
          max_points: 10000,
          active: true,
          created_by: null,
          updated_by: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          components: [],
        },
      ],
      initialTiers: [],
      unions,
      localFields,
      clubTypes,
      ecclesiasticalYears,
    });

    expect(screen.getByText("Centro Veracruz")).toBeInTheDocument();
    expect(screen.getByText("Conquistadores")).toBeInTheDocument();
    expect(screen.getByText("10,000 pts")).toBeInTheDocument();
  });
});
