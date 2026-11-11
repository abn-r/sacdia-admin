import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import type { FinanceSummary, PaginatedFinances } from "@/lib/api/finances";
import { FinancesDashboard } from "./finances-dashboard";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/finances",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canCapability: () => true }),
}));

const mockList = vi.fn();
const mockSummary = vi.fn();
const mockByCategory = vi.fn();
vi.mock("@/lib/api/finances", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/finances")>();
  return {
    ...actual,
    listFinances: (...args: unknown[]) => mockList(...args),
    getFinanceSummary: (...args: unknown[]) => mockSummary(...args),
    getFinanceByCategory: (...args: unknown[]) => mockByCategory(...args),
  };
});

const YEAR = new Date().getFullYear();

const SUMMARY: FinanceSummary = {
  club_id: 7,
  period: String(YEAR),
  total_income: 1000,
  total_expense: 400,
  net: 600,
  balance: 2600,
  movement_count: 5,
  year_income: 3000,
  year_expenses: 400,
  period_closed: null,
};

function page(rows: number[], total: number, pageNumber = 1): PaginatedFinances {
  return {
    total,
    page: pageNumber,
    limit: 20,
    data: rows.map((id) => ({
      finance_id: id,
      year: YEAR,
      month: 3,
      amount: 100,
      description: `Mov ${id}`,
      club_type_id: 1,
      finance_category_id: 1,
      finance_date: `${YEAR}-03-10T00:00:00.000Z`,
      club_section_id: id % 2 === 0 ? 11 : 10,
      active: true,
      period_closed: id === 2,
      finances_categories: { name: "Cuotas", type: 0 as const },
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSummary.mockResolvedValue(SUMMARY);
  mockByCategory.mockResolvedValue({
    club_id: 7,
    club_section_id: null,
    period: String(YEAR),
    income: [],
    expenses: [],
    totals: { income: 0, expenses: 0 },
  });
  mockList.mockResolvedValue(page([1, 2], 45));
});
afterEach(cleanup);

const SECTIONS = [
  { club_section_id: 10, club_type_id: 1, name: "Conquistadores" },
  { club_section_id: 11, club_type_id: 2, name: "Aventureros" },
];

function renderDashboard(sectionId: number | "all" = "all") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FinancesDashboard clubId={7} clubName="Club" sections={SECTIONS} sectionId={sectionId} />
    </NextIntlClientProvider>,
  );
}

describe("FinancesDashboard", () => {
  it("loads the first page server-side and keeps the summary", async () => {
    renderDashboard();

    await screen.findByText("Mov 1");
    expect(mockList).toHaveBeenCalledWith(7, {
      year: YEAR,
      month: undefined,
      clubSectionId: undefined,
      page: 1,
      limit: 20,
    });
    expect(mockSummary).toHaveBeenCalledWith(7, YEAR, undefined, undefined);
    expect(screen.getByText("Neto del periodo")).toBeInTheDocument();
    expect(screen.getByText("Mes cerrado")).toBeInTheDocument(); // row 2 is closed
  });

  it("keeps the summary visible and scoped when a section is selected", async () => {
    renderDashboard(11);

    await screen.findByText("Neto del periodo");
    expect(mockSummary).toHaveBeenCalledWith(7, YEAR, undefined, 11);
    expect(mockList).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ clubSectionId: 11, page: 1 }),
    );
    expect(mockByCategory).toHaveBeenCalledWith(7, YEAR, undefined, 11);
    await screen.findByText("Mov 1");
  });

  it("requests the next page from the server", async () => {
    renderDashboard();
    await screen.findByText("Mov 1");

    mockList.mockResolvedValue(page([3], 45, 2));
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(7, expect.objectContaining({ page: 2, limit: 20 })),
    );
    await screen.findByText("Mov 3");
  });

  it("shows a load error with retry instead of an empty table", async () => {
    mockList.mockRejectedValueOnce(new Error("boom"));
    renderDashboard();

    expect(await screen.findByText("No se pudieron cargar los movimientos.")).toBeInTheDocument();
    expect(screen.queryByText("Sin movimientos")).not.toBeInTheDocument();

    const retries = screen.getAllByRole("button", { name: /reintentar/i });
    fireEvent.click(retries[0]);
    await screen.findByText("Mov 1");
  });

  it("shows a summary error with retry", async () => {
    mockSummary.mockRejectedValueOnce(new Error("boom"));
    renderDashboard();

    expect(await screen.findByText("No se pudo cargar el resumen financiero.")).toBeInTheDocument();
  });

  it("offers the export menu", async () => {
    renderDashboard();
    await screen.findByText("Mov 1");

    expect(screen.getByRole("button", { name: "Exportar" })).toBeEnabled();
  });
});
