import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mockRecalculateRankings = vi.fn();
const mockListAnnualRankingsFromClient = vi.fn<
  (...args: any[]) => Promise<unknown>
>();

vi.mock("@/lib/api/annual-folders", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/annual-folders")>();
  return {
    ...original,
    recalculateRankings: (...args: unknown[]) =>
      mockRecalculateRankings(...args),
  };
});

vi.mock("@/lib/api/annual-rankings", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/annual-rankings")>();
  return {
    ...original,
    listAnnualRankingsFromClient: (...args: unknown[]) =>
      mockListAnnualRankingsFromClient(...args),
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { RankingsClientPage } from "@/components/annual-folders/rankings-client-page";

const CLUB_TYPES: ClubType[] = [{ club_type_id: 2, name: "Conquistadores" }];

const YEARS: EcclesiasticalYear[] = [
  {
    ecclesiastical_year_id: 1,
    name: "2026",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    active: true,
  },
];

const LOCAL_FIELDS: LocalField[] = [
  { local_field_id: 10, name: "Centro Veracruz", union_id: 1, active: true },
];

const RANKINGS = [
  {
    rank_position: 1,
    club_name: "Club Alfa",
    club_enrollment_id: "enroll-1",
    club_id: 99,
    club_type_id: 2,
    ecclesiastical_year_id: 1,
    local_field_id: 10,
    current_points: 9500,
    max_points: 10000,
    progress_percentage: 80,
    current_tier: {
      name: "Diamante",
      slug: "diamante",
      from_points: 9500,
      to_points: 10000,
      points_to_reach: null,
    },
    next_tier: null,
    components: [
      {
        key: "annual_folder",
        label: "Carpeta anual",
        earned_points: 5700,
        max_points: 6000,
        progress_percentage: 95,
      },
    ],
  },
];

function renderPage() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RankingsClientPage
        initialRankings={RANKINGS}
        clubTypes={CLUB_TYPES}
        ecclesiasticalYears={YEARS}
        localFields={LOCAL_FIELDS}
        initialClubTypeId={2}
        initialYearId={1}
        initialLocalFieldId={10}
      />
    </NextIntlClientProvider>,
  );
}

describe("RankingsClientPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAnnualRankingsFromClient.mockResolvedValue(RANKINGS);
  });

  afterEach(() => {
    cleanup();
  });

  it("filters institutional rankings by local field", async () => {
    renderPage();

    expect(screen.getByText("Campo local")).toBeInTheDocument();
    expect(screen.getAllByText("Centro Veracruz").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => {
      expect(mockListAnnualRankingsFromClient).toHaveBeenCalledWith({
        clubTypeId: 2,
        ecclesiasticalYearId: 1,
        localFieldId: 10,
      });
    });

    expect(screen.getAllByText("Diamante").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9,500/).length).toBeGreaterThan(0);
  });
});
