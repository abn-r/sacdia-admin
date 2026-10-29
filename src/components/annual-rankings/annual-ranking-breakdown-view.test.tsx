import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AnnualRankingBreakdownView } from "@/components/annual-rankings/annual-ranking-breakdown-view";
import type { AnnualRankingSectionProgress } from "@/lib/api/annual-rankings";
import messages from "../../../messages/es.json";

afterEach(() => {
  cleanup();
});

const progress: AnnualRankingSectionProgress = {
  section_id: 7,
  club_id: 1,
  club_name: "ACV",
  club_type: { club_type_id: 2, name: "Conquistadores" },
  year: { ecclesiastical_year_id: 1 },
  current_points: 7522,
  max_points: 10000,
  progress_percentage: 75.22,
  current_tier: { name: "Plata", slug: "plata", from_points: 7000, to_points: 8499, points_to_reach: null },
  next_tier: { name: "Oro", slug: "oro", from_points: 8500, to_points: 9499, points_to_reach: 978 },
  axes: [
    {
      key: "administrative",
      label: "Cumplimiento administrativo",
      earned_points: 5422,
      max_points: 7000,
      progress_percentage: 77.46,
      components: [
        { key: "annual_evidence_folder", label: "Carpeta anual", earned_points: 3700, max_points: 4000, progress_percentage: 92.5 },
        { key: "finance_compliance", label: "Finanzas", earned_points: 1500, max_points: 2000, progress_percentage: 75 },
      ],
    },
  ],
  components: [],
  pending_items: [
    { type: "annual_folder_section", title: "Sección 4", status: "pending_validation", due_date: null, action_label: "Ver evidencia" },
  ],
};

function renderView(data: AnnualRankingSectionProgress = progress) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AnnualRankingBreakdownView data={data} />
    </NextIntlClientProvider>,
  );
}

describe("AnnualRankingBreakdownView", () => {
  it("shows the total, the tier and the points to the next tier", () => {
    renderView();

    expect(screen.getByText("Plata")).toBeInTheDocument();
    expect(screen.getByText("Faltan 978 pts para Oro")).toBeInTheDocument();
    expect(screen.getByText("75.22% del total")).toBeInTheDocument();
  });

  it("lists each axis with its components and points", () => {
    renderView();

    expect(screen.getByText("Cumplimiento administrativo")).toBeInTheDocument();
    expect(screen.getByText("Carpeta anual")).toBeInTheDocument();
    expect(screen.getByText("5,422 / 7,000 pts")).toBeInTheDocument();
  });

  it("translates the pending folder sections", () => {
    renderView();

    expect(screen.getByText("Sección 4")).toBeInTheDocument();
    expect(screen.getByText("Por validar")).toBeInTheDocument();
  });

  it("groups flat components when the config has no axes", () => {
    renderView({
      ...progress,
      axes: [],
      components: progress.axes[0]!.components,
      pending_items: [],
    });

    expect(screen.getByText("Componentes")).toBeInTheDocument();
    expect(screen.getByText("Finanzas")).toBeInTheDocument();
    expect(screen.getByText("No hay secciones pendientes.")).toBeInTheDocument();
  });
});
