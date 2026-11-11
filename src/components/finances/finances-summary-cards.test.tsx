import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import type { FinanceSummary } from "@/lib/api/finances";
import { FinancesSummaryCards } from "./finances-summary-cards";

afterEach(cleanup);

function renderCards(summary: FinanceSummary) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FinancesSummaryCards summary={summary} />
    </NextIntlClientProvider>,
  );
}

const base: FinanceSummary = {
  club_id: 1,
  period: "2026",
  total_income: 100000,
  total_expense: 20000,
  net: 80000,
  balance: 350000,
  movement_count: 12,
  year_income: 500000,
  year_expenses: 150000,
  period_closed: null,
};

describe("FinancesSummaryCards subtitles", () => {
  it("counts incomes and expenses with the same pattern", () => {
    renderCards({ ...base, income_count: 9, expense_count: 3 });

    expect(screen.getByText("9 ingresos")).toBeInTheDocument();
    expect(screen.getByText("3 egresos")).toBeInTheDocument();
    expect(screen.queryByText("en el período")).not.toBeInTheDocument();
  });

  it("uses the singular form for one entry and handles zero", () => {
    renderCards({ ...base, income_count: 1, expense_count: 0 });

    expect(screen.getByText("1 ingreso")).toBeInTheDocument();
    expect(screen.getByText("0 egresos")).toBeInTheDocument();
  });

  it("falls back to the period when the counts are unknown", () => {
    renderCards(base);

    expect(screen.getAllByText("en el período")).toHaveLength(2);
  });
});

describe("FinancesSummaryCards new meanings", () => {
  it("shows the period income, expenses, net and accumulated balance labels", () => {
    renderCards(base);

    expect(screen.getByText("Ingresos del periodo")).toBeInTheDocument();
    expect(screen.getByText("Egresos del periodo")).toBeInTheDocument();
    expect(screen.getByText("Neto del periodo")).toBeInTheDocument();
    expect(screen.getAllByText("Saldo acumulado").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("prints the year-to-date line from year_income / year_expenses", () => {
    renderCards(base);

    const line = screen.getByText(/^En el año: \+/);
    expect(line.textContent).toContain("500,000");
    expect(line.textContent).toContain("150,000");
  });

  it("marks a negative net and balance as destructive", () => {
    renderCards({ ...base, net: -500, balance: -1000 });

    const neg = screen.getAllByText(/500|1,000/).filter((el) =>
      el.className.includes("text-destructive"),
    );
    expect(neg.length).toBe(2);
  });

  it("shows the closed-month indicator only when period_closed is true", () => {
    const { unmount } = renderCards({ ...base, period_closed: true });
    expect(screen.getByText("Mes cerrado")).toBeInTheDocument();
    unmount();

    renderCards({ ...base, period_closed: false });
    expect(screen.queryByText("Mes cerrado")).not.toBeInTheDocument();
  });
});
