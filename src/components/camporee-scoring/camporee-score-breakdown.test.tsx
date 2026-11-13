import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { CamporeeScoreBreakdown } from "@/components/camporee-scoring/camporee-score-breakdown";
import type { CamporeeScoreBreakdown as BreakdownData } from "@/lib/api/camporee-scoring";
import messages from "../../../messages/es.json";

const breakdown: BreakdownData = {
  scope: { type: "local", camporeeId: 74 },
  visibility: "full",
  events: [
    { camporee_event_id: 27, title: "Marcha y orden cerrado", max_points: 500, day_number: 3, starts_at: "08:00" },
    { camporee_event_id: 28, title: "Acampada", max_points: 300, day_number: 2, starts_at: null },
    { camporee_event_id: 29, title: "Nudos", max_points: 100, day_number: 2, starts_at: null },
  ],
  sections: [
    {
      rank: 1,
      camporee_club_id: 6,
      club_section_id: 12,
      club_name: "ACV",
      section_name: "Conquistadores",
      total_awarded_points: 430,
      total_max_points: 500,
      scored_events_count: 1,
      percentage: 86,
      results: [
        {
          camporee_event_id: 27,
          camporee_event_section_result_id: "r1",
          score_status: "scored",
          is_no_show: false,
          total_awarded_points: 430,
          total_max_points: 500,
          raw_awarded_points: 430,
          minimum_adjustment_points: 0,
          notes: "Buena formación",
          submitted_at: "2026-11-01T10:00:00.000Z",
          evaluator_name: "Ana Ruiz",
          items: [
            { camporee_event_rubric_id: 1, title: "Uniforme", awarded_points: 250, max_points: 300, notes: "Faltaron pañoletas" },
            { camporee_event_rubric_id: 2, title: "Cadencia", awarded_points: 180, max_points: 200, notes: null },
          ],
        },
        {
          camporee_event_id: 28,
          camporee_event_section_result_id: "r2",
          score_status: "no_show",
          is_no_show: true,
          total_awarded_points: 0,
          total_max_points: 300,
          raw_awarded_points: 0,
          minimum_adjustment_points: 0,
          notes: null,
          submitted_at: null,
          evaluator_name: null,
          items: [],
        },
      ],
    },
  ],
};

afterEach(() => cleanup());

function renderIt(data: BreakdownData | null) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeScoreBreakdown breakdown={data} />
    </NextIntlClientProvider>,
  );
}

describe("CamporeeScoreBreakdown", () => {
  it("renders the matrix values, dash for missing and no-show badge", () => {
    renderIt(breakdown);
    expect(screen.getByText("Desglose por evento")).toBeInTheDocument();
    expect(screen.getByText("Marcha y orden cerrado")).toBeInTheDocument();
    expect(screen.getByText("máx. 500 pts")).toBeInTheDocument();
    expect(screen.getAllByText("430 / 500").length).toBeGreaterThan(0);
    expect(screen.getByText("No se presentó")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("opens a dialog with rubric comment, judge comment and evaluator", () => {
    renderIt(breakdown);
    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalle de ACV en Marcha y orden cerrado" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Uniforme")).toBeInTheDocument();
    expect(within(dialog).getByText("250 / 300")).toBeInTheDocument();
    expect(within(dialog).getByText("Faltaron pañoletas")).toBeInTheDocument();
    expect(within(dialog).getByText("Comentario del juez")).toBeInTheDocument();
    expect(within(dialog).getByText("Buena formación")).toBeInTheDocument();
    expect(within(dialog).getByText(/Evaluó Ana Ruiz/)).toBeInTheDocument();
  });

  it("shows the empty state without events or sections", () => {
    renderIt({ ...breakdown, sections: [] });
    expect(screen.getByText("Sin desglose disponible")).toBeInTheDocument();
    cleanup();
    renderIt(null);
    expect(screen.getByText("Sin desglose disponible")).toBeInTheDocument();
  });
});
