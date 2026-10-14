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
import { OperationsWorkQueue } from "@/components/dashboard/operations-work-queue";

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

    expect(screen.getByRole("group", { name: es.dashboardHub.operations.formation.chartAriaLabel })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByText("Amigo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("renders empty state for empty collection", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ClassEnrollmentsChart items={[]} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(es.dashboardHub.operations.formation.emptyTitle)).toBeInTheDocument();
  });

  it("hides zero-enrollment classes in compact mode", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ClassEnrollmentsChart
          compact
          showTable={false}
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

    expect(screen.getByText("Amigo")).toBeInTheDocument();
    expect(screen.queryByText("Compañero")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
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
    expect(messages.dashboardHub.operations.home.title).toBeTruthy();
    expect(messages.dashboardHub.operations.bento.groups.operation).toBeTruthy();
    expect(messages.dashboardHub.operations.bento.stats.operationalClubs).toBeTruthy();
    expect(messages.dashboardHub.operations.errors.forbiddenDescription).toBeTruthy();
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

  it("turns metric cards into module links when href is provided", () => {
    render(
      <OperationsKpiStrip
        heading="Indicadores primarios"
        items={[
          {
            id: "clubs",
            label: "Clubes operativos",
            value: "1",
            hint: "2 secciones",
            href: "/dashboard/clubs",
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Clubes operativos" })).toHaveAttribute(
      "href",
      "/dashboard/clubs",
    );
  });
});

const QUEUE_LABELS = {
  roles: "Asignaciones pendientes",
  transfers: "Traslados pendientes",
  classes: "Validaciones de clase",
  honors: "Revisiones de especialidades",
  folders: "Carpetas pendientes de Unión",
};

describe("OperationsWorkQueue", () => {
  it("lists each queue with its count and a review link", () => {
    render(
      <OperationsWorkQueue
        headingId="queue"
        title="Por atender"
        reviewLabel="Revisar"
        labels={QUEUE_LABELS}
        items={[
          { id: "classes", count: 12, href: "/dashboard/clubs/validations?tab=sections" },
          { id: "transfers", count: 1, href: "/dashboard/requests/transfers" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Por atender" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Validaciones de clase/ });
    expect(link).toHaveAttribute("href", "/dashboard/clubs/validations?tab=sections");
    expect(link).toHaveTextContent("12");
    expect(link).toHaveTextContent("Revisar");
  });

  it("shows the empty state when given one and nothing is pending", () => {
    render(
      <OperationsWorkQueue
        headingId="queue"
        title="Por atender"
        reviewLabel="Revisar"
        labels={QUEUE_LABELS}
        items={[]}
        empty={{ title: "Nada pendiente en tu alcance", description: "Aparece aquí." }}
      />,
    );

    expect(screen.getByText("Nada pendiente en tu alcance")).toBeInTheDocument();
  });

  it("renders nothing when empty and no empty state is given", () => {
    const { container } = render(
      <OperationsWorkQueue
        headingId="queue"
        title="Pendientes"
        reviewLabel="Revisar"
        labels={QUEUE_LABELS}
        items={[]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
