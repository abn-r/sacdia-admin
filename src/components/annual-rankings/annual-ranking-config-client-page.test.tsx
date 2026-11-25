import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { AnnualRankingConfigClientPage } from "./annual-ranking-config-client-page";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/annual-folders/ranking-config",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const localFields: LocalField[] = [{ local_field_id: 4, name: "Centro Veracruz", union_id: 1, active: true }];
const clubTypes: ClubType[] = [{ club_type_id: 2, name: "Conquistadores" }];
const years: EcclesiasticalYear[] = [
  { ecclesiastical_year_id: 1, name: "2026", start_date: "2026-01-01", end_date: "2026-12-31", active: true },
];

const config = (active: boolean) => ({
  annual_ranking_config_id: "f0000000-0000-4000-8000-000000000001",
  union_id: null,
  local_field_id: 4,
  ecclesiastical_year_id: 1,
  club_type_id: 2,
  max_points: 10000,
  active,
  created_by: null,
  updated_by: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  components: [],
});

function renderPage(configs = [config(true)], tiers: React.ComponentProps<typeof AnnualRankingConfigClientPage>["initialTiers"] = []) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TooltipProvider>
        <AnnualRankingConfigClientPage
          initialConfigs={configs}
          initialTiers={tiers}
          unions={[]}
          localFields={localFields}
          clubTypes={clubTypes}
          ecclesiasticalYears={years}
        />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
}

describe("AnnualRankingConfigClientPage", () => {
  afterEach(() => {
    cleanup();
    search = "";
  });

  it("has budgets and recognitions as tabs in the URL", () => {
    renderPage();

    expect(screen.getByRole("tab", { name: /Presupuestos/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Reconocimientos" })).toBeInTheDocument();
  });

  it("lists budgets and marks only the inactive one", () => {
    renderPage([config(true)]);
    expect(screen.getByText("Centro Veracruz")).toBeInTheDocument();
    expect(screen.getByText("10,000 pts")).toBeInTheDocument();
    expect(screen.queryByText("Activo")).toBeNull();
    cleanup();

    renderPage([config(false)]);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("shows the recognitions as settings rows when that tab is open", () => {
    search = "tab=recognitions";
    renderPage([], [
      { ranking_tier_id: "a0000000-0000-4000-8000-000000000001", name: "Excelencia", slug: "x", band_percentage: 85, color: null, icon: null, sort_order: 1, active: true },
    ]);

    expect(screen.getByRole("spinbutton", { name: "Porcentaje de Excelencia" })).toHaveValue(85);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });
});
