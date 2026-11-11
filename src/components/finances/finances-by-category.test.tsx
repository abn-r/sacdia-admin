import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import type { FinanceByCategory } from "@/lib/api/finances";
import { FinancesByCategory } from "./finances-by-category";

const mockGetByCategory = vi.fn();
vi.mock("@/lib/api/finances", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/finances")>();
  return {
    ...actual,
    getFinanceByCategory: (...args: unknown[]) => mockGetByCategory(...args),
  };
});

const DATA: FinanceByCategory = {
  club_id: 7,
  club_section_id: null,
  period: "2026-03",
  income: [
    { category_id: 1, name: "Cuotas", total: 800, count: 4 },
    { category_id: 2, name: "Donativos", total: 200, count: 1 },
  ],
  expenses: [{ category_id: 3, name: "Material", total: 300, count: 2 }],
  totals: { income: 1000, expenses: 300 },
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function renderBlock(props: Partial<React.ComponentProps<typeof FinancesByCategory>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FinancesByCategory clubId={7} year={2026} month={3} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("FinancesByCategory", () => {
  it("renders income and expense lists with name, total, count and totals", async () => {
    mockGetByCategory.mockResolvedValue(DATA);
    renderBlock({ clubSectionId: 12 });

    const income = await screen.findByTestId("by-category-income");
    const expense = screen.getByTestId("by-category-expense");

    expect(mockGetByCategory).toHaveBeenCalledWith(7, 2026, 3, 12);
    expect(within(income).getByText("Cuotas")).toBeInTheDocument();
    expect(within(income).getByText("Donativos")).toBeInTheDocument();
    expect(within(income).getByText("4 movimientos")).toBeInTheDocument();
    expect(within(income).getByText("1 movimiento")).toBeInTheDocument();
    expect(within(income).getByText(/1,000/)).toBeInTheDocument();
    expect(within(expense).getByText("Material")).toBeInTheDocument();
    expect(within(expense).getByText(/300/, { selector: "span.font-semibold" })).toBeInTheDocument();
  });

  it("sizes the bars proportionally to the largest category", async () => {
    mockGetByCategory.mockResolvedValue(DATA);
    const { container } = renderBlock();

    await screen.findByTestId("by-category-income");
    const widths = Array.from(
      container.querySelectorAll<HTMLElement>('[data-testid="by-category-income"] [style]'),
    ).map((el) => el.style.width);
    expect(widths).toEqual(["100%", "25%"]);
  });

  it("shows the empty state of each list", async () => {
    mockGetByCategory.mockResolvedValue({
      ...DATA,
      income: [],
      expenses: [],
      totals: { income: 0, expenses: 0 },
    });
    renderBlock();

    await screen.findByTestId("by-category-income");
    expect(screen.getAllByText("Sin movimientos en este periodo.")).toHaveLength(2);
  });

  it("shows an error with retry", async () => {
    mockGetByCategory.mockRejectedValueOnce(new Error("boom"));
    renderBlock();

    expect(await screen.findByText("No se pudo cargar el desglose por categoría.")).toBeInTheDocument();

    mockGetByCategory.mockResolvedValueOnce(DATA);
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    await waitFor(() => expect(screen.getByTestId("by-category-income")).toBeInTheDocument());
    expect(mockGetByCategory).toHaveBeenCalledTimes(2);
  });

  it("does not request anything without a year", () => {
    renderBlock({ year: undefined });

    expect(mockGetByCategory).not.toHaveBeenCalled();
    expect(
      screen.getByText("Elige un año para ver el desglose por categoría."),
    ).toBeInTheDocument();
  });
});
