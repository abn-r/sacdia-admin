import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminQuarterlyReport, PeriodicReportsPage } from "@/lib/api/reports";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  usePathname: () => "/dashboard/reports/quarterly",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/shared/selectors/club-select", () => ({
  ClubSelect: ({ placeholder }: { placeholder?: string }) => <div>{placeholder}</div>,
}));

import { QuarterlyReportsListClient } from "./quarterly-reports-list-client";

function report(overrides: Partial<AdminQuarterlyReport> = {}): AdminQuarterlyReport {
  return {
    quarterly_report_id: 11,
    club_id: 4,
    year: 2026,
    quarter: 2,
    status: "draft",
    auto_generated_at: "2026-07-02T15:00:00.000Z",
    finalized_at: null,
    club: { club_id: 4, name: "Club Águilas" },
    ...overrides,
  };
}

function page(items: AdminQuarterlyReport[]): PeriodicReportsPage<AdminQuarterlyReport> {
  return { total: items.length, page: 1, limit: 20, items };
}

function renderList(
  data: PeriodicReportsPage<AdminQuarterlyReport>,
  searchParams: React.ComponentProps<typeof QuarterlyReportsListClient>["searchParams"] = {},
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QuarterlyReportsListClient data={data} searchParams={searchParams} canDownload />
    </NextIntlClientProvider>,
  );
}

describe("QuarterlyReportsListClient", () => {
  beforeEach(() => pushMock.mockClear());
  afterEach(cleanup);

  it("renders a row per report with club, period, status and a link to the detail", () => {
    renderList(
      page([
        report(),
        report({
          quarterly_report_id: 12,
          quarter: 1,
          status: "finalized",
          finalized_at: "2026-04-10T12:00:00.000Z",
          finalized_by_user: { user_id: "u1", name: "Ana", paternal_last_name: "García" },
          club: { club_id: 5, name: "Club Pioneros" },
        }),
      ]),
    );

    const rows = screen.getAllByRole("row");
    // header + 2 body rows
    expect(rows).toHaveLength(3);

    const first = within(rows[1]);
    expect(first.getByRole("link", { name: "Club Águilas" })).toHaveAttribute(
      "href",
      "/dashboard/reports/quarterly/11",
    );
    expect(first.getByText("Trimestre 2 de 2026")).toBeInTheDocument();
    expect(first.getByText("Borrador")).toBeInTheDocument();

    const second = within(rows[2]);
    expect(second.getByText("Finalizado")).toBeInTheDocument();
    expect(second.getByText("Ana García")).toBeInTheDocument();
  });

  it("shows the empty state when there are no reports", () => {
    renderList(page([]));

    expect(screen.getByText("Aún no hay informes trimestrales")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("explains an empty result caused by filters", () => {
    renderList(page([]), { status: "finalized" });

    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryByText("Aún no hay informes trimestrales")).not.toBeInTheDocument();
  });
});
