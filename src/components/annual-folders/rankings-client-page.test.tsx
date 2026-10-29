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
import enMessages from "../../../messages/en.json";
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
  (...args: unknown[]) => Promise<unknown>
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
    warning: vi.fn(),
  },
}));

import { toast } from "sonner";
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
    axes: [
      {
        key: "administrative",
        label: "Cumplimiento Administrativo",
        earned_points: 5700,
        max_points: 6000,
        progress_percentage: 95,
        components: [
          {
            key: "annual_evidence_folder",
            label: "Carpeta Anual de Evidencias",
            earned_points: 5700,
            max_points: 6000,
            progress_percentage: 95,
          },
        ],
      },
    ],
    components: [
      {
        key: "annual_evidence_folder",
        label: "Carpeta Anual de Evidencias",
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

  it("renders the table column headers from the Spanish messages", () => {
    renderPage();

    for (const name of ["Posición", "Club", "Tipo", "Puntos", "Progreso", "Rango", "Componentes"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("renders the table column headers in the active locale", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
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

    for (const name of ["Position", "Club", "Type", "Points", "Progress", "Tier", "Components"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("columnheader", { name: /Posición/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Recalculate rankings/ })).toBeInTheDocument();
    expect(screen.getAllByTitle("1st place").length).toBeGreaterThan(0);
    expect(screen.getAllByText("View details").length).toBeGreaterThan(0);
  });

  describe("recalculation", () => {
    async function confirmRecalculation() {
      fireEvent.click(
        screen.getByRole("button", { name: "Recalcular clasificaciones" }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Confirmar recálculo" }),
      );
    }

    it("uses the Spanish term for classifications in the page copy", () => {
      renderPage();

      expect(
        screen.getByRole("button", { name: "Recalcular clasificaciones" }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/rankings/i)).toBeNull();
    });

    it("reports the number of updated clubs from the wrapped response", async () => {
      mockRecalculateRankings.mockResolvedValue({
        status: "accepted",
        data: { message: "Rankings recalculated", queued: false, rankings_updated: 12 },
      });
      renderPage();

      await confirmRecalculation();

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "Clasificaciones recalculadas: 12 clubes actualizados",
        ),
      );
    });

    it("says the recalculation is in progress when it was queued", async () => {
      mockRecalculateRankings.mockResolvedValue({
        status: "accepted",
        data: { message: "Rankings recalculation queued", queued: true },
      });
      renderPage();

      await confirmRecalculation();

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          messages.annual_folders.toasts.rankings_recalc_queued,
        ),
      );
    });
  });
});
