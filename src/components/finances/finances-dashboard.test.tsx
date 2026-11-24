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

const MONTH = new Date().getMonth() + 1;

describe("FinancesDashboard", () => {
  it("opens on the current month and loads the first page server-side", async () => {
    renderDashboard();

    await screen.findAllByText("Mov 1");
    expect(mockList).toHaveBeenCalledWith(7, {
      year: YEAR,
      month: MONTH,
      clubSectionId: undefined,
      page: 1,
      limit: 20,
    });
    expect(mockSummary).toHaveBeenCalledWith(7, YEAR, MONTH, undefined);
    expect(screen.getByText("Neto del periodo")).toBeInTheDocument();
  });

  it("states the period result in the description", async () => {
    renderDashboard();

    expect(await screen.findByText(/el resultado es \+\$600\.00; el saldo es \$2,600\.00/)).toBeInTheDocument();
  });

  it("uses one month selector instead of Año + Mes", async () => {
    renderDashboard();
    await screen.findAllByText("Mov 1");

    expect(screen.getByRole("combobox", { name: "Periodo" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /^(Año|Mes)$/ })).not.toBeInTheDocument();
  });

  it("marks only the exception: a closed month gets a notice on top, not a mark per row", async () => {
    mockSummary.mockResolvedValue({ ...SUMMARY, period_closed: true });
    renderDashboard();

    expect(await screen.findByText(/está cerrado\. Editar o eliminar/)).toBeInTheDocument();
    await screen.findAllByText("Mov 2");
    expect(screen.queryByText("Mes cerrado")).not.toBeInTheDocument();
  });

  it("marks a closed row only when the view mixes open and closed months", async () => {
    renderDashboard();
    await screen.findAllByText("Mov 2");

    // The summary says the month is not closed; row 2 is the exception.
    expect(screen.getAllByText("Mes cerrado").length).toBeGreaterThan(0);
  });

  it("shows two lines per movement: description and category, with the signed amount", async () => {
    renderDashboard();
    await screen.findAllByText("Mov 1");

    // Club with two sections viewed whole: the section rides on the second line.
    expect(screen.getAllByText("Cuotas · Conquistadores").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+$100.00").length).toBeGreaterThan(0);
  });

  it("opens the new movement as a route modal link carrying the club", async () => {
    renderDashboard(11);
    await screen.findAllByText("Mov 1");

    const link = screen.getByRole("link", { name: /nuevo movimiento/i });
    expect(link).toHaveAttribute("href", "/dashboard/finances/new?club=7&section=11");
  });

  it("keeps the summary visible and scoped when a section is selected", async () => {
    renderDashboard(11);

    await screen.findByText("Neto del periodo");
    expect(mockSummary).toHaveBeenCalledWith(7, YEAR, MONTH, 11);
    expect(mockList).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ clubSectionId: 11, page: 1 }),
    );
    expect(mockByCategory).toHaveBeenCalledWith(7, YEAR, MONTH, 11);
    await screen.findAllByText("Mov 1");
  });

  it("requests the next page from the server", async () => {
    renderDashboard();
    await screen.findAllByText("Mov 1");

    mockList.mockResolvedValue(page([3], 45, 2));
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(7, expect.objectContaining({ page: 2, limit: 20 })),
    );
    await screen.findAllByText("Mov 3");
  });

  it("shows a load error with retry instead of an empty table", async () => {
    mockList.mockRejectedValueOnce(new Error("boom"));
    renderDashboard();

    expect(await screen.findByText("No se pudieron cargar los movimientos.")).toBeInTheDocument();
    expect(screen.queryByText("Sin movimientos")).not.toBeInTheDocument();

    const retries = screen.getAllByRole("button", { name: /reintentar/i });
    fireEvent.click(retries[0]!);
    await screen.findAllByText("Mov 1");
  });

  it("keeps the list and says it is stale when a reload fails", async () => {
    renderDashboard();
    await screen.findAllByText("Mov 1");

    mockList.mockRejectedValueOnce(new Error("boom"));
    window.dispatchEvent(new Event("sacdia:finances-changed"));

    await waitFor(() => expect(screen.getByText(/Mostramos los datos de las/)).toBeInTheDocument());
    expect(screen.getAllByText("Mov 1").length).toBeGreaterThan(0);
  });

  it("shows a summary error with retry", async () => {
    mockSummary.mockRejectedValueOnce(new Error("boom"));
    renderDashboard();

    expect(await screen.findByText("No se pudo cargar el resumen financiero.")).toBeInTheDocument();
  });

  it("offers the export menu", async () => {
    renderDashboard();
    await screen.findAllByText("Mov 1");

    expect(screen.getByRole("button", { name: "Exportar" })).toBeEnabled();
  });
});
