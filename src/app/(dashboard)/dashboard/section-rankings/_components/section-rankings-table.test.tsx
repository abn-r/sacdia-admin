import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { SectionRankingItem } from "@/lib/api/section-rankings";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/section-rankings",
  useSearchParams: () => new URLSearchParams(),
}));

const mockMembers = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("@/lib/api/section-rankings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/section-rankings")>()),
  getSectionMembersFromClient: (...args: unknown[]) => mockMembers(...args),
}));

import { SectionRankingsTable } from "./section-rankings-table";

const row = (over: Partial<SectionRankingItem>): SectionRankingItem => ({
  club_section_id: 5,
  section_name: "Conquistadores",
  composite_score_pct: 82.4,
  rank_position: 1,
  active_enrollment_count: 32,
  awarded_category: null,
  composite_calculated_at: null,
  ...over,
});

function renderTable(data: SectionRankingItem[], fallbackClubName?: string | null) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SectionRankingsTable
        data={data}
        total={data.length}
        page={1}
        limit={20}
        totalPages={1}
        yearId={3}
        yearLabel="2026"
        fallbackClubName={fallbackClubName}
      />
    </NextIntlClientProvider>,
  );
}

describe("SectionRankingsTable", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("says club and section on each row, with the score as a plain number", () => {
    renderTable([row({ club_name: "Club Orión" })]);

    expect(screen.getAllByText("Club Orión").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Conquistadores").length).toBeGreaterThan(0);
    expect(screen.getAllByText("82.4%").length).toBeGreaterThan(0);
  });

  it("has no position column, no category column and no score badge", () => {
    renderTable([row({ club_name: "Club Orión" })]);

    expect(screen.queryByRole("columnheader", { name: "#" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /Categoría/ })).toBeNull();
    expect(screen.queryByText("#1")).toBeNull();
  });

  it("uses the filtered club when the row does not carry one", () => {
    renderTable([row({})], "Club Halcones");

    expect(screen.getAllByText("Club Halcones").length).toBeGreaterThan(0);
  });

  it("opens the members in a sheet without leaving the list", async () => {
    mockMembers.mockResolvedValue([
      {
        member_ranking_id: 1,
        enrollment_id: 1,
        ecclesiastical_year_id: 3,
        rank_position: 1,
        composite_score_pct: 78.5,
        class_score_pct: 77.8,
        investiture_score_pct: 50,
        camporee_score_pct: 100,
        user: { name: "Camila", paternal_last_name: "Ibarra" },
      },
    ]);
    renderTable([row({ club_name: "Club Orión" })]);

    fireEvent.click(screen.getAllByRole("button", { name: /Club Orión/ })[0]!);

    expect(await screen.findByText("Camila Ibarra")).toBeInTheDocument();
    expect(mockMembers).toHaveBeenCalledWith(5, 3);
    expect(screen.getByText("78.5%")).toBeInTheDocument();
  });

  it("shows a 403 as no access, never as not found", async () => {
    mockMembers.mockRejectedValue(new ApiError("Forbidden", 403, null));
    renderTable([row({ club_name: "Club Orión" })]);

    fireEvent.click(screen.getAllByRole("button", { name: /Club Orión/ })[0]!);

    await waitFor(() => expect(screen.getByText("Acceso restringido")).toBeInTheDocument());
    expect(screen.queryByText("No encontramos lo que buscas")).toBeNull();
  });
});
