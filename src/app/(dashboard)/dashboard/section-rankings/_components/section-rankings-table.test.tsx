import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../../../messages/es.json";
import type { SectionRankingItem } from "@/lib/api/section-rankings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/section-rankings",
  useSearchParams: () => new URLSearchParams(),
}));

import { SectionRankingsTable } from "./section-rankings-table";

afterEach(cleanup);

const row = (over: Partial<SectionRankingItem>): SectionRankingItem => ({
  club_section_id: 5,
  section_name: "Guías Mayores",
  composite_score_pct: 80,
  rank_position: 1,
  active_enrollment_count: 3,
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
        fallbackClubName={fallbackClubName}
      />
    </NextIntlClientProvider>,
  );
}

describe("SectionRankingsTable", () => {
  it("shows the club name under the section and carries it to the drill-down", () => {
    renderTable([row({ club_name: "Club Orión" })]);

    expect(screen.getByText("Club Orión")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guías Mayores" })).toHaveAttribute(
      "href",
      "/dashboard/section-rankings/5/members?year_id=3&section_name=Gu%C3%ADas+Mayores&club_name=Club+Ori%C3%B3n",
    );
    expect(
      screen.getByRole("button", { name: "Acciones de Club Orión · Guías Mayores" }),
    ).toBeInTheDocument();
  });

  it("uses the filtered club when the row does not carry one", () => {
    renderTable([row({})], "Club Halcones");

    expect(screen.getByText("Club Halcones")).toBeInTheDocument();
  });
});
