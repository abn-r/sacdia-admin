import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import ptBR from "../../../messages/pt-BR.json";
import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";
import { OperationsBentoTile } from "@/components/dashboard/operations-bento-tile";
import { OperationsKpiStrip } from "@/components/dashboard/operations-kpi-strip";

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
    expect(messages.dashboardHub.operations.version.switchLabel).toBeTruthy();
  });
});

describe("OperationsBentoTile", () => {
  it("does not render a navigation chevron when the tile is not a link", () => {
    render(
      <OperationsBentoTile title="Informes mensuales">
        <p>0 / 2</p>
      </OperationsBentoTile>,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders a link chevron only when href is provided", () => {
    render(
      <OperationsBentoTile title="Informes mensuales" href="/dashboard/reports" hrefLabel="Abrir informes">
        <p>0 / 2</p>
      </OperationsBentoTile>,
    );

    expect(screen.getByRole("link", { name: "Abrir informes" })).toHaveAttribute(
      "href",
      "/dashboard/reports",
    );
  });
});

describe("OperationsKpiStrip", () => {
  it("renders compact metric cards without empty min-height stretch", () => {
    const { container } = render(
      <OperationsKpiStrip
        heading="Indicadores primarios"
        items={[
          { id: "clubs", label: "Clubes operativos", value: "1", hint: "2 secciones · 50%" },
          { id: "admin", label: "Estado administrativo", value: "2", hint: "2 Activos · 0 Inactivos" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Indicadores primarios" })).toBeInTheDocument();
    expect(screen.getByText("Clubes operativos")).toBeInTheDocument();
    expect(container.querySelector("[class*='min-h-']")).toBeNull();
  });
});
