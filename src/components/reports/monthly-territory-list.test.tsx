import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminReportItem, AdminReportsPage } from "@/lib/api/monthly-reports";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  usePathname: () => "/dashboard/reports",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { MonthlyTerritoryList } from "./monthly-territory-list";

function item(overrides: Partial<AdminReportItem>): AdminReportItem {
  return {
    monthly_report_id: "r1",
    club_enrollment_id: "e1",
    month: 10,
    year: 2026,
    status: "submitted",
    generated_at: "2026-11-02T15:00:00.000Z",
    submitted_at: "2026-11-02T18:00:00.000Z",
    club_id: 10,
    club_name: "Club Orión",
    club_type: "Conquistadores",
    club_type_id: 1,
    local_field: "Campo Valle Alto",
    local_field_id: 4,
    submitter_name: null,
    member_count: null,
    ...overrides,
  };
}

function page(items: AdminReportItem[]): AdminReportsPage {
  return { items, total: items.length, page: 1, limit: 20 };
}

const ITEMS = [
  item({}),
  item({ monthly_report_id: "r2", club_name: "Club Faro", status: "draft", generated_at: null, submitted_at: null }),
  item({ monthly_report_id: "r3", club_name: "Club Cedros", status: "generated", submitted_at: null }),
];

const SCOPE_OPTIONS = [
  { id: "union:2", name: "Unión Norte", group: "Unión" },
  { id: "local_field:4", name: "Campo Valle Alto", group: "Campo local" },
];

function renderList(props: Partial<React.ComponentProps<typeof MonthlyTerritoryList>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MonthlyTerritoryList
        data={page(ITEMS)}
        clubTypes={[{ club_type_id: 1, name: "Conquistadores" } as never]}
        scopeOptions={SCOPE_OPTIONS}
        searchParams={{}}
        currentYear={2026}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

function desktopRow(name: string) {
  const link = screen.getAllByRole("link", { name }).find((a) => a.closest("table"));
  const row = link?.closest("tr");
  if (!row) throw new Error(`row ${name} not found`);
  return row as HTMLElement;
}

describe("MonthlyTerritoryList", () => {
  beforeEach(() => pushMock.mockClear());
  afterEach(cleanup);

  it("marks only what is missing: Borrador and Por enviar; Enviado stays plain text", () => {
    renderList();

    expect(within(desktopRow("Club Faro")).getByText("Borrador")).toBeInTheDocument();
    expect(within(desktopRow("Club Cedros")).getByText("Por enviar")).toBeInTheDocument();

    const sent = within(desktopRow("Club Orión")).getByText("Enviado");
    expect(sent.closest("[data-slot=badge]")).toBeNull();
    expect(within(desktopRow("Club Faro")).getByText("Borrador").closest("[data-slot=badge]")).not.toBeNull();
  });

  it("links each club to its report and names its type and local field", () => {
    renderList();

    const row = desktopRow("Club Orión");
    expect(within(row).getByRole("link", { name: "Club Orión" })).toHaveAttribute("href", "/dashboard/reports/r1");
    expect(within(row).getByText("Conquistadores · Campo Valle Alto")).toBeInTheDocument();
    expect(within(row).getByText("Octubre de 2026")).toBeInTheDocument();
  });

  it("shows the failure inside the table, never as an empty list", () => {
    renderList({ data: null, error: { kind: "error", detail: { code: 500, at: "2026-11-24T12:00:00.000Z" } } });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.queryByText("Sin informes en 2026")).not.toBeInTheDocument();
    // The table keeps its column headers around the error.
    expect(screen.getByRole("columnheader", { name: "Club" })).toBeInTheDocument();
  });

  it("tells an empty year apart from a filter with no matches", () => {
    const { unmount } = renderList({ data: page([]) });
    expect(screen.getByText("Sin informes en 2026")).toBeInTheDocument();
    unmount();

    renderList({ data: page([]), searchParams: { status: "draft" } });
    expect(screen.getByText("No se encontraron reportes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard/reports");
  });

  it("filters the loaded page by club name and says so", () => {
    renderList();

    fireEvent.change(screen.getByLabelText("Buscar club"), { target: { value: "faro" } });

    expect(screen.getAllByText("Club Faro").length).toBeGreaterThan(0);
    expect(screen.queryByText("Club Orión")).not.toBeInTheDocument();
    expect(screen.getByText("Filtrando solo esta página.")).toBeInTheDocument();
  });

  it("writes the status filter to the URL and resets the page", () => {
    renderList({ searchParams: { page: "3", year: "2026" } });

    fireEvent.click(screen.getByLabelText("Estado"));
    fireEvent.click(screen.getByRole("option", { name: "Por enviar" }));

    expect(pushMock).toHaveBeenCalledWith("/dashboard/reports?year=2026&status=generated");
  });

  it("hides the scope picker when the actor has a single fixed scope", () => {
    const { unmount } = renderList();
    expect(screen.getByRole("button", { name: "Cambiar alcance" })).toBeInTheDocument();
    unmount();

    renderList({ scopeOptions: [SCOPE_OPTIONS[1]!] });
    expect(screen.queryByRole("button", { name: "Cambiar alcance" })).not.toBeInTheDocument();
  });
});
