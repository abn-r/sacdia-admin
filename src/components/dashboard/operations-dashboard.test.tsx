import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { createTranslator } from "next-intl";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import ptBR from "../../../messages/pt-BR.json";
import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";
import { OperationsKpiRow } from "@/components/dashboard/operations-kpi-row";
import { OperationsWorkQueue } from "@/components/dashboard/operations-work-queue";
import { OperationsGapTable } from "@/components/dashboard/operations-gap-table";
import {
  OperationsHomeLayout,
  type OperationsHomeLayoutProps,
} from "@/components/dashboard/operations-home-layout";
import { OperationsSecondaryStats } from "@/components/dashboard/operations-secondary-stats";
import { groupClassesByClubType } from "@/lib/dashboard/operations-home";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => cleanup());

const QUEUE_LABELS = {
  roles: "Asignaciones pendientes",
  transfers: "Traslados pendientes",
  classes: "Validaciones de clase",
  honors: "Revisiones de especialidades",
  folders: "Carpetas pendientes de Unión",
};

function meterTone(element: Element | null) {
  return element?.querySelector('[data-slot="operations-meter"]')?.getAttribute("data-tone");
}

describe("OperationsKpiRow", () => {
  it("renders value, total, caption and a threshold-colored bar", () => {
    render(
      <OperationsKpiRow
        label="Indicadores"
        items={[
          {
            id: "reports",
            label: "Informes del mes",
            value: "45%",
            pct: 45,
            caption: "9 de 20 secciones",
            href: "/dashboard/reports",
          },
          {
            id: "clubs",
            label: "Clubes operativos",
            value: "8",
            total: "/ 10",
            pct: 80,
            caption: "2 sin actividad este mes",
          },
          { id: "people", label: "Personas activas", value: "120", caption: "90 con cuenta en la app" },
        ]}
      />,
    );

    const reports = screen.getByRole("link", { name: /Informes del mes/ });
    expect(reports).toHaveAttribute("href", "/dashboard/reports");
    expect(reports).toHaveTextContent("45%");
    expect(reports).toHaveTextContent("9 de 20 secciones");
    expect(meterTone(reports)).toBe("destructive");

    const clubs = screen.getByText("Clubes operativos").closest("li");
    expect(clubs).toHaveTextContent("8/ 10");
    expect(meterTone(clubs)).toBe("success");
    expect(within(clubs as HTMLElement).queryByRole("link")).not.toBeInTheDocument();

    const people = screen.getByText("Personas activas").closest("li");
    expect(people?.querySelector('[data-slot="operations-meter"]')).toBeNull();
  });

  it("shows a dash and an empty bar when coverage is unknown", () => {
    render(
      <OperationsKpiRow
        label="Indicadores"
        items={[
          {
            id: "reports",
            label: "Informes del mes",
            value: "—",
            pct: null,
            caption: "Aún no hay un mes cerrado",
          },
        ]}
      />,
    );

    const card = screen.getByText("Informes del mes").closest("li");
    expect(card).toHaveTextContent("—");
    expect(meterTone(card)).toBe("none");
    expect(card?.querySelector('[data-slot="operations-meter"] > div')).toBeNull();
  });

  it("uses warning between 50 and 79 percent", () => {
    render(
      <OperationsKpiRow
        label="Indicadores"
        items={[{ id: "clubs", label: "Clubes", value: "6", pct: 60, caption: "x" }]}
      />,
    );
    expect(meterTone(screen.getByText("Clubes").closest("li"))).toBe("warning");
  });
});

describe("OperationsWorkQueue", () => {
  const base = {
    headingId: "attention",
    title: "Requiere atención",
    labels: QUEUE_LABELS,
    formatCount: String,
    emptyLabel: "Todo al día",
  };

  it("lists each queue as a link with its count and a total pill", () => {
    render(
      <OperationsWorkQueue
        {...base}
        total="13"
        totalLabel="13 pendientes"
        items={[
          { id: "classes", count: 12, href: "/dashboard/clubs/validations?tab=sections" },
          { id: "transfers", count: 1, href: "/dashboard/requests/transfers" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Requiere atención" })).toBeInTheDocument();
    expect(screen.getByText("13 pendientes")).toHaveClass("sr-only");
    const link = screen.getByRole("link", { name: /Validaciones de clase/ });
    expect(link).toHaveAttribute("href", "/dashboard/clubs/validations?tab=sections");
    expect(link).toHaveTextContent("12");
  });

  it("shows a short positive line when nothing is pending", () => {
    render(<OperationsWorkQueue {...base} total="0" totalLabel="0 pendientes" items={[]} />);

    expect(screen.getByText("Todo al día")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("0 pendientes")).not.toBeInTheDocument();
  });
});

describe("OperationsGapTable", () => {
  const props = {
    headingId: "gap",
    title: "Campos locales",
    description: "Primero los que tienen brecha.",
    columns: { name: "Nombre", reports: "Informes", operational: "Operativos" },
    emptyLabel: "Sin campos locales en este alcance",
  };

  it("links each child and shows reports and operational bars", () => {
    render(
      <OperationsGapTable
        {...props}
        rows={[
          {
            key: "local_field-1",
            name: "Campo A",
            href: "/dashboard?local_field_id=1",
            reports: { pct: 40, label: "40%" },
            operational: { pct: 75, label: "3/4" },
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Campo A" })).toHaveAttribute(
      "href",
      "/dashboard?local_field_id=1",
    );
    const row = screen.getByRole("link", { name: "Campo A" }).closest("tr") as HTMLElement;
    expect(row).toHaveTextContent("40%");
    expect(row).toHaveTextContent("3/4");
    const tones = Array.from(row.querySelectorAll('[data-slot="operations-meter"]')).map((el) =>
      el.getAttribute("data-tone"),
    );
    expect(tones).toEqual(["destructive", "warning"]);
  });

  it("shows a compact empty line without rows", () => {
    render(<OperationsGapTable {...props} rows={[]} />);

    expect(screen.getByText("Sin campos locales en este alcance")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("ClassEnrollmentsChart", () => {
  const chartProps = {
    headingId: "formation",
    title: "Formación por clase",
    chartLabel: "Inscripciones por clase y tipo de club",
    summary: "18 inscripciones en 3 clases.",
    legendLabel: "Tipos de club",
    emptyLabel: "Sin inscripciones",
    formatCount: String,
  };

  it("colors bars by club type and shows a legend with totals", () => {
    const groups = groupClassesByClubType([
      { class_id: 1, class_name: "Amigo", club_type_id: 2, club_type_name: "Conquistadores", display_order: 1, enrollment_count: 12 },
      { class_id: 2, class_name: "Compañero", club_type_id: 2, club_type_name: "Conquistadores", display_order: 2, enrollment_count: 0 },
      { class_id: 5, class_name: "Abejitas", club_type_id: 1, club_type_name: "Aventureros", display_order: 3, enrollment_count: 6 },
    ]);
    render(<ClassEnrollmentsChart {...chartProps} groups={groups} />);

    expect(
      screen.getByRole("figure", { name: "Inscripciones por clase y tipo de club" }),
    ).toHaveTextContent("18 inscripciones en 3 clases.");
    const legend = screen.getByRole("list", { name: "Tipos de club" });
    expect(legend).toHaveTextContent("Conquistadores12");
    expect(legend).toHaveTextContent("Aventureros6");

    const bar = (name: string) =>
      (screen.getByText(name).closest("li") as HTMLElement).querySelector(
        '[data-slot="formation-bar"]',
      ) as HTMLElement;
    expect(bar("Amigo").style.backgroundColor).toBe("var(--section-conquistadores)");
    expect(bar("Abejitas").style.backgroundColor).toBe("var(--section-aventureros)");
    expect(screen.queryByText("Compañero")).not.toBeInTheDocument();
  });

  it("shows a short empty line without enrollments", () => {
    render(<ClassEnrollmentsChart {...chartProps} groups={[]} />);

    expect(screen.getByText("Sin inscripciones")).toBeInTheDocument();
    expect(screen.queryByRole("figure")).not.toBeInTheDocument();
  });
});

describe("OperationsSecondaryStats", () => {
  it("renders nothing without items", () => {
    const { container } = render(<OperationsSecondaryStats label="Otros" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links stats that have a destination", () => {
    render(
      <OperationsSecondaryStats
        label="Otros"
        items={[
          { id: "activities", label: "Actividades registradas", value: "8", href: "/dashboard/clubs/activities" },
          { id: "honorsApproved", label: "Especialidades aprobadas", value: "3" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /Actividades registradas/ })).toHaveTextContent("8");
    expect(screen.getByText("Especialidades aprobadas").closest("a")).toBeNull();
  });
});

describe("OperationsHomeLayout", () => {
  const props = (mode: OperationsHomeLayoutProps["mode"]): OperationsHomeLayoutProps => ({
    mode,
    kpis: { label: "Indicadores", items: [] },
    breakdown: {
      headingId: "gap",
      title: "Clubes",
      description: "x",
      columns: { name: "Nombre", reports: "Informes", operational: "Operativos" },
      emptyLabel: "Sin clubes",
      rows: [],
    },
    attention: {
      headingId: "attention",
      title: "Requiere atención",
      labels: QUEUE_LABELS,
      items: [],
      total: "0",
      totalLabel: "0 pendientes",
      formatCount: String,
      emptyLabel: "Todo al día",
    },
    formation: {
      headingId: "formation",
      title: "Formación por clase",
      chartLabel: "x",
      summary: "x",
      legendLabel: "x",
      emptyLabel: "Sin inscripciones",
      groups: [],
      formatCount: String,
    },
    stats: { label: "Otros", items: [] },
    dataQuality: {
      title: "Calidad de datos",
      description: "Notas.",
      entries: [],
      statusLabels: {
        exact: "Exacto",
        current_affiliation: "Afiliación actual",
        unavailable: "No disponible",
        not_applicable: "No aplica",
      },
    },
  });

  const headingNames = () =>
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

  it("puts the attention queue first in dispatch mode", () => {
    render(<OperationsHomeLayout {...props("dispatch")} />);
    expect(headingNames()).toEqual(["Requiere atención", "Clubes", "Formación por clase"]);
  });

  it("puts the breakdown first in supervision mode", () => {
    render(<OperationsHomeLayout {...props("supervise")} />);
    expect(headingNames()).toEqual(["Clubes", "Requiere atención", "Formación por clase"]);
  });
});

describe("dashboard home messages", () => {
  const locales = [
    ["es", es],
    ["en", en],
    ["fr", fr],
    ["pt-BR", ptBR],
  ] as const;

  // Locale files drift outside this namespace, so widen to the base shape.
  const translate = (locale: string, messages: unknown) =>
    createTranslator({
      locale,
      messages: messages as typeof es,
      namespace: "dashboardHub.operations",
    });

  it.each(locales)("formats every new home string in %s", (locale, messages) => {
    const t = translate(locale, messages);
    expect(t("home.kpis.reports.caption", { submitted: 3, expected: 4 })).toMatch(/3.*4/);
    expect(t("home.kpis.clubs.caption", { count: 2 })).toContain("2");
    expect(t("home.kpis.clubs.total", { total: 10 })).toBe("/ 10");
    expect(t("home.kpis.people.caption", { count: 5 })).toContain("5");
    expect(t("home.kpis.enrollments.caption", { count: 1 })).toContain("1");
    expect(t("home.gapTable.columns.operational")).toBeTruthy();
    expect(t("attention.total", { count: 7 })).toContain("7");
    expect(t("attention.empty")).toBeTruthy();
    expect(t("formation.summary", { enrollments: 3, people: 2, classes: 1 })).toContain("3");
    expect(t("home.stats.activities")).toBeTruthy();
  });

  it("words the operational caption for zero and many clubs", () => {
    const t = translate("es", es);
    expect(t("home.kpis.clubs.caption", { count: 0 })).toBe("Todos con actividad este mes");
    expect(t("home.kpis.clubs.caption", { count: 6 })).toBe("6 sin actividad este mes");
  });

  it("formats large numbers with the locale", () => {
    const big = new Intl.NumberFormat("es").format(12345);
    expect(
      translate("es", es)("home.kpis.reports.caption", { submitted: 12345, expected: 20000 }),
    ).toBe(`${big} de ${new Intl.NumberFormat("es").format(20000)} secciones`);
  });

  it("names the child level in the breakdown", () => {
    const t = translate("es", es);
    expect(t("home.gapTable.title", { level: "local_field" })).toBe("Campos locales");
    expect(t("home.gapTable.emptyTitle", { level: "club" })).toBe("Sin clubes en este alcance");
  });
});
