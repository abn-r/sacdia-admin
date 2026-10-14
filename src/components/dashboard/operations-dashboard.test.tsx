import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import ptBR from "../../../messages/pt-BR.json";
import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";
import { OperationsWorkQueue } from "@/components/dashboard/operations-work-queue";
import { OperationsGapTable } from "@/components/dashboard/operations-gap-table";
import { SupervisionHome } from "@/components/dashboard/operations-home-supervision";
import { DispatchHome } from "@/components/dashboard/operations-home-dispatch";

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
    expect(messages.dashboardHub.operations.home.summary.childrenReported).toBeTruthy();
    expect(messages.dashboardHub.operations.home.dispatchTitle).toBeTruthy();
    expect(messages.dashboardHub.operations.home.gapTable.columns.reports).toBeTruthy();
    expect(messages.dashboardHub.operations.errors.forbiddenDescription).toBeTruthy();
  });
});

describe("dashboard home messages", () => {
  const translate = (locale: string, messages: typeof es) =>
    createTranslator({ locale, messages, namespace: "dashboardHub.operations.home" });

  it("pluralizes missing sections and formats numbers", () => {
    const big = new Intl.NumberFormat("es").format(12345);
    expect(translate("es", es)("gapTable.missingCount", { count: 1 })).toBe("falta 1");
    expect(translate("es", es)("gapTable.missingCount", { count: 12345 })).toBe(`faltan ${big}`);
    expect(translate("en", en)("gapTable.missingCount", { count: 1 })).toBe("1 missing");
    expect(translate("fr", fr)("gapTable.missingCount", { count: 1 })).toBe("1 manquant");
    expect(translate("pt-BR", ptBR)("gapTable.missingCount", { count: 2 })).toBe("faltam 2");
  });

  it("formats numbers in summary sentences", () => {
    const big = new Intl.NumberFormat("es").format(12345);
    const sections = translate("es", es)("summary.sectionsReported", { submitted: 12345, expected: 20000 });
    expect(sections).toContain(big);
    expect(sections).toContain(new Intl.NumberFormat("es").format(20000));
    const children = translate("es", es)("summary.childrenReported", {
      reported: 12345,
      total: 20000,
      level: "club",
    });
    expect(children).toBe(
      `${big} de ${new Intl.NumberFormat("es").format(20000)} clubes entregaron el informe del mes.`,
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

describe("OperationsGapTable", () => {
  const columns = {
    name: "Nombre",
    reports: "Informes",
    nonOperational: "No operativos",
    pending: "Pendientes",
  };

  it("mutes rows without a gap and flags missing reports", () => {
    render(
      <OperationsGapTable
        headingId="gap"
        title="Campos locales"
        description="Primero los que tienen brecha."
        columns={columns}
        empty={{ title: "Sin territorios", description: "Nada aquí." }}
        rows={[
          {
            key: "local_field-1",
            name: "Campo A",
            href: "/dashboard?local_field_id=1",
            reports: "40%",
            missingLabel: "faltan 6",
            nonOperational: "2",
            pending: "5",
            hasGap: true,
          },
          {
            key: "local_field-2",
            name: "Campo C",
            href: "/dashboard?local_field_id=2",
            reports: "100%",
            nonOperational: "0",
            pending: "0",
            hasGap: false,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Campos locales" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Campo A" })).toHaveAttribute(
      "href",
      "/dashboard?local_field_id=1",
    );
    expect(screen.getByText("faltan 6")).toHaveClass("text-destructive");
    expect(screen.getByRole("link", { name: "Campo C" }).closest("tr")).toHaveClass(
      "text-muted-foreground",
    );
    expect(screen.getByRole("link", { name: "Campo A" }).closest("tr")).not.toHaveClass(
      "text-muted-foreground",
    );
  });

  it("shows the empty state without rows", () => {
    render(
      <OperationsGapTable
        headingId="gap"
        title="Clubes"
        description="x"
        columns={columns}
        empty={{ title: "Sin territorios", description: "Nada aquí." }}
        rows={[]}
      />,
    );

    expect(screen.getByText("Sin territorios")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

const gapTableProps = {
  headingId: "gap",
  title: "Campos locales",
  description: "Primero los que tienen brecha.",
  columns: { name: "Nombre", reports: "Informes", nonOperational: "No operativos", pending: "Pendientes" },
  empty: { title: "Sin territorios", description: "Nada aquí." },
  rows: [
    {
      key: "local_field-1",
      name: "Campo A",
      href: "/dashboard?local_field_id=1",
      reports: "40%",
      missingLabel: "faltan 6",
      nonOperational: "2",
      pending: "5",
      hasGap: true,
    },
  ],
};

const contextProps = {
  headingId: "context",
  title: "Contexto del periodo",
  groups: [{ title: "Actividades", rows: [{ label: "Registradas", value: "8" }] }],
};

const dataQualityProps = {
  title: "Calidad de datos",
  description: "Notas.",
  entries: [],
  statusLabels: {
    exact: "Exacto",
    current_affiliation: "Afiliación actual",
    unavailable: "No disponible",
    not_applicable: "No aplica",
  },
};

describe("SupervisionHome", () => {
  it("leads with the gap table and hides empty pending queues", () => {
    render(
      <SupervisionHome
        summary="9 de 12 campos locales entregaron el informe del mes."
        gapTable={gapTableProps}
        pending={{ headingId: "pending", title: "Pendientes", reviewLabel: "Revisar", labels: QUEUE_LABELS, items: [] }}
        context={contextProps}
        dataQuality={dataQualityProps}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent("Campos locales");
    expect(screen.queryByRole("heading", { level: 2, name: "Pendientes" })).not.toBeInTheDocument();
    expect(screen.getByText(/9 de 12 campos locales/)).toBeInTheDocument();
  });

  it("shows pending queues below the table when there are any", () => {
    render(
      <SupervisionHome
        summary=""
        gapTable={gapTableProps}
        pending={{
          headingId: "pending",
          title: "Pendientes",
          reviewLabel: "Revisar",
          labels: QUEUE_LABELS,
          items: [{ id: "folders", count: 7, href: "/dashboard/annual-folders/evaluate" }],
        }}
        context={contextProps}
        dataQuality={dataQualityProps}
      />,
    );

    const names = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(names.slice(0, 2)).toEqual(["Campos locales", "Pendientes"]);
  });
});

describe("DispatchHome", () => {
  it("leads with the work queue and shows its empty state", () => {
    render(
      <DispatchHome
        queue={{
          headingId: "queue",
          title: "Por atender",
          reviewLabel: "Revisar",
          labels: QUEUE_LABELS,
          items: [],
          empty: { title: "Nada pendiente en tu alcance", description: "Aparece aquí." },
        }}
        lagging={{ headingId: "lagging", title: "Clubes que van atrás", rows: [] }}
        summary="18 de 20 secciones entregaron el informe del mes."
        context={contextProps}
        dataQuality={dataQualityProps}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent("Por atender");
    expect(screen.getByText("Nada pendiente en tu alcance")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Clubes que van atrás" }),
    ).not.toBeInTheDocument();
  });

  it("lists lagging clubs with their reasons", () => {
    render(
      <DispatchHome
        queue={{
          headingId: "queue",
          title: "Por atender",
          reviewLabel: "Revisar",
          labels: QUEUE_LABELS,
          items: [{ id: "classes", count: 12, href: "/dashboard/clubs/validations?tab=sections" }],
          empty: { title: "Nada pendiente", description: "x" },
        }}
        lagging={{
          headingId: "lagging",
          title: "Clubes que van atrás",
          rows: [
            {
              key: "club-9",
              name: "Club Águilas",
              href: "/dashboard/clubs/9",
              reasons: [{ label: "Sin informe del mes", tone: "danger" }],
            },
          ],
        }}
        summary=""
        context={contextProps}
        dataQuality={dataQualityProps}
      />,
    );

    expect(screen.getByRole("link", { name: "Club Águilas" })).toHaveAttribute("href", "/dashboard/clubs/9");
    expect(screen.getByText("Sin informe del mes")).toHaveClass("text-destructive");
  });
});
