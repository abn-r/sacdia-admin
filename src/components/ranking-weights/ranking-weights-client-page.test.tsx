import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { RankingWeights } from "@/lib/api/ranking-weights";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/api/ranking-weights", () => ({
  createRankingWeights: vi.fn(),
  updateRankingWeights: vi.fn(),
  deleteRankingWeights: vi.fn(),
}));
vi.mock("@/lib/api/catalogs", () => ({
  listClubTypes: vi.fn().mockResolvedValue([]),
}));

import { RankingWeightsClientPage } from "@/components/ranking-weights/ranking-weights-client-page";

function row(id: string, clubTypeId: number | null): RankingWeights {
  return {
    ranking_weight_config_id: id,
    club_type_id: clubTypeId,
    folder_weight: 40,
    finance_weight: 20,
    camporee_weight: 20,
    evidence_weight: 20,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    updated_by: null,
  };
}

function renderPage(clubTypes?: Array<{ club_type_id: number; name: string }>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RankingWeightsClientPage
        initial={[row("a", null), row("b", 1), row("c", 9)]}
        clubTypes={clubTypes}
      />
    </NextIntlClientProvider>,
  );
}

describe("RankingWeightsClientPage overrides table", () => {
  afterEach(() => cleanup());

  it("shows the club type name instead of its id", () => {
    renderPage([{ club_type_id: 1, name: "Conquistadores" }]);

    expect(screen.getByRole("cell", { name: "Conquistadores" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "1" })).not.toBeInTheDocument();
  });

  it("falls back to a readable label when the type is not in the catalog", () => {
    renderPage([{ club_type_id: 1, name: "Conquistadores" }]);

    expect(screen.getByRole("cell", { name: "Tipo 9" })).toBeInTheDocument();
  });

  it("falls back for every row when the catalog is unavailable", () => {
    renderPage();

    expect(screen.getByRole("cell", { name: "Tipo 1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Tipo 9" })).toBeInTheDocument();
  });
});
