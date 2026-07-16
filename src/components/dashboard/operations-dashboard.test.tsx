import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import ptBR from "../../../messages/pt-BR.json";
import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => cleanup());

function renderChart(locale: string, messages: typeof es) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ClassEnrollmentsChart
        items={[
          {
            class_id: 1,
            class_name: "Amigo",
            club_type_id: 2,
            club_type_name: "Conquistadores",
            display_order: 1,
            enrollment_count: 12,
          },
          {
            class_id: 2,
            class_name: "Compañero",
            club_type_id: 2,
            club_type_name: "Conquistadores",
            display_order: 2,
            enrollment_count: 0,
          },
        ]}
      />
    </NextIntlClientProvider>,
  );
}

describe("ClassEnrollmentsChart", () => {
  it("exposes accessible chart label and tabular alternative", () => {
    renderChart("es", es);

    expect(screen.getByRole("img", { name: es.dashboardHub.operations.formation.chartAriaLabel })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Amigo")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders empty state for empty collection", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ClassEnrollmentsChart items={[]} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(es.dashboardHub.operations.formation.emptyTitle)).toBeInTheDocument();
  });
});

describe("dashboardHub.operations translations", () => {
  const locales = [
    ["en", en],
    ["es", es],
    ["fr", fr],
    ["pt-BR", ptBR],
  ] as const;

  it.each(locales)("includes operations keys in %s", (_locale, messages) => {
    expect(messages.dashboardHub.operations.title).toBeTruthy();
    expect(messages.dashboardHub.operations.bento.groups.operation).toBeTruthy();
    expect(messages.dashboardHub.operations.bento.stats.operationalClubs).toBeTruthy();
    expect(messages.dashboardHub.operations.errors.forbiddenDescription).toBeTruthy();
  });
});
