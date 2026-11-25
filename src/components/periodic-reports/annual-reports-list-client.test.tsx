import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminAnnualReport, PeriodicReportsPage } from "@/lib/api/reports";

window.HTMLElement.prototype.scrollIntoView = vi.fn();

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  usePathname: () => "/dashboard/reports/annual",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/shared/selectors/club-select", () => ({
  ClubSelect: ({ placeholder }: { placeholder?: string }) => <div>{placeholder}</div>,
}));
vi.mock("@/components/shared/selectors/ecclesiastical-year-select", () => ({
  EcclesiasticalYearSelect: ({ placeholder }: { placeholder?: string }) => <div>{placeholder}</div>,
}));

import { AnnualReportsListClient } from "./annual-reports-list-client";

function report(overrides: Partial<AdminAnnualReport> = {}): AdminAnnualReport {
  return {
    annual_report_id: 31,
    club_id: 4,
    ecclesiastical_year_id: 11,
    ecclesiastical_year: { year_id: 11, start_date: "2025-08-01", end_date: "2026-07-31" },
    status: "draft",
    auto_generated_at: "2026-07-02T15:00:00.000Z",
    finalized_at: null,
    club: { club_id: 4, name: "Club Águilas" },
    ...overrides,
  };
}

function page(items: AdminAnnualReport[]): PeriodicReportsPage<AdminAnnualReport> {
  return { total: items.length, page: 1, limit: 20, items };
}

function renderList(
  data: PeriodicReportsPage<AdminAnnualReport>,
  searchParams: React.ComponentProps<typeof AnnualReportsListClient>["searchParams"] = {},
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AnnualReportsListClient data={data} searchParams={searchParams} canDownload />
    </NextIntlClientProvider>,
  );
}

describe("AnnualReportsListClient", () => {
  beforeEach(() => pushMock.mockClear());
  afterEach(cleanup);

  it("renders a row per report with club, ecclesiastical year, status and a detail link", () => {
    renderList(page([report(), report({ annual_report_id: 32, status: "finalized" })]));

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    const first = within(rows[1]);
    expect(first.getByRole("link", { name: "Club Águilas" })).toHaveAttribute(
      "href",
      "/dashboard/reports/annual/31",
    );
    expect(first.getByText("2025-2026")).toBeInTheDocument();
    expect(first.getByText("En curso")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Cerrado")).toBeInTheDocument();
  });

  it("shows the empty state when there are no reports", () => {
    renderList(page([]));

    expect(screen.getByText("Aún no hay informes anuales")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("explains an empty result caused by filters", () => {
    renderList(page([]), { status: "finalized" });

    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("shows a failed load inside the table with its headers, never as an empty list", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AnnualReportsListClient data={null} error={{ kind: "rateLimited" }} searchParams={{}} canDownload />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Club" })).toBeInTheDocument();
    expect(screen.queryByText("Aún no hay informes anuales")).not.toBeInTheDocument();
  });

  it("writes its filters under the annual tab of the single reports entry", () => {
    renderList(page([]));

    fireEvent.click(screen.getByLabelText("Estado"));
    fireEvent.click(screen.getByRole("option", { name: "Cerrado" }));

    expect(pushMock).toHaveBeenCalledWith("/dashboard/reports?tab=annual&status=finalized");
  });

  it("lists the reports as two-line rows on small screens", () => {
    renderList(page([report()]));

    const list = screen.getByRole("list", { name: "Informes" });
    expect(within(list).getByRole("link", { name: "Club Águilas" })).toBeInTheDocument();
    expect(within(list).getByText("En curso")).toBeInTheDocument();
  });
});
