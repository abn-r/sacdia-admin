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
  balance: 80000,
  movement_count: 12,
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
