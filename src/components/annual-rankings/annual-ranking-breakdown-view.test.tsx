import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AnnualRankingBreakdownView } from "@/components/annual-rankings/annual-ranking-breakdown-view";
import type { AnnualRankingSectionProgress } from "@/lib/api/annual-rankings";
import messages from "../../../messages/es.json";

afterEach(cleanup);

const component = (key: string, label: string, earned: number, max: number) => ({
  key,
  label,
  earned_points: earned,
  max_points: max,
  progress_percentage: (earned / max) * 100,
});

const progress: AnnualRankingSectionProgress = {
  section_id: 7,
  club_id: 1,
  club_name: "Club Orión",
  club_type: { club_type_id: 2, name: "Conquistadores" },
  year: { ecclesiastical_year_id: 1 },
  current_points: 2640,
  max_points: 3000,
  progress_percentage: 88,
  current_tier: null,
  next_tier: null,
  axes: [
    {
      ...component("administrative", "Administrativo", 1840, 2000),
      components: [component("folder", "Carpeta de evidencias", 1840, 2000), component("classes", "Clases e investidura", 520, 600)],
    },
  ],
  components: [],
  pending_items: [
    { type: "folder", title: "Evangelismo", status: "pending_union_validation", due_date: null, action_label: "" },
    { type: "folder", title: "Investidura", status: "pending_delivery", due_date: null, action_label: "" },
  ],
};

function renderView(data = progress) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AnnualRankingBreakdownView data={data} />
    </NextIntlClientProvider>,
  );
}

describe("AnnualRankingBreakdownView", () => {
  it("lists one row per component with its points and no axis cards", () => {
    renderView();

    expect(screen.getByText("Carpeta de evidencias")).toBeInTheDocument();
    expect(screen.getByText("1,840 de 2,000")).toBeInTheDocument();
    expect(screen.getByText("520 de 600")).toBeInTheDocument();
    expect(screen.queryByText("Administrativo")).toBeNull();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("says what is pending in the folder, marking only what waits on someone", () => {
    renderView();

    expect(screen.getByText("Por confirmar en unión")).toBeInTheDocument();
    expect(screen.getByText("Sin enviar")).toBeInTheDocument();
  });

  it("says nothing is pending when the folder is complete", () => {
    renderView({ ...progress, pending_items: [] });

    expect(screen.getByText("No hay nada pendiente en la carpeta.")).toBeInTheDocument();
  });
});
