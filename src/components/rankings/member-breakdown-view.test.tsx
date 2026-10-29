import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { MemberBreakdownView } from "@/components/rankings/member-breakdown-view";
import type { MemberBreakdown } from "@/lib/api/member-rankings";
import messages from "../../../messages/es.json";

afterEach(() => {
  cleanup();
});

const breakdown: MemberBreakdown = {
  member_ranking_id: 2,
  enrollment_id: 2,
  ecclesiastical_year_id: 1,
  rank_position: 1,
  composite_score_pct: 100,
  class_score_pct: null,
  investiture_score_pct: 100,
  camporee_score_pct: null,
  awarded_category: null,
  user: { name: "Carlos Pérez" },
  section: { section_id: 1, name: "Guías Mayores" },
  club_section: { section_id: 1, name: "Guías Mayores" },
  composite_calculated_at: "2026-04-30T18:45:47.040Z",
  class_breakdown: { completed_sections: 0, required_sections: 71, folder_status: null },
  investiture_breakdown: { status: "INVESTIDO" },
  camporee_breakdown: { participated: false, total_camporees: 3 },
  weights: { class_pct: 50, investiture_pct: 30, camporee_pct: 20, source: "default" },
};

function renderView(data: MemberBreakdown = breakdown) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Mexico_City">
      <MemberBreakdownView data={data} />
    </NextIntlClientProvider>,
  );
}

describe("MemberBreakdownView", () => {
  it("shows each component with its detail and weight", () => {
    renderView();

    expect(screen.getByText("0 / 71")).toBeInTheDocument();
    expect(screen.getByText("Investido")).toBeInTheDocument();
    expect(screen.getByText("Peso: 30%")).toBeInTheDocument();
    expect(screen.getByText("Valores generales")).toBeInTheDocument();
  });

  it("explains that components without data don't count in the overall score", () => {
    renderView();

    expect(screen.getAllByText("Sin datos: no cuenta en el puntaje global")).toHaveLength(2);
  });
});
