import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import messages from "../../../../messages/es.json";
import type { AnnualReport, QuarterlyReport } from "@/lib/api/reports";
import { ReportsTab } from "./reports-tab";

const annual: AnnualReport = {
  annual_report_id: 31,
  club_id: 4,
  ecclesiastical_year_id: 11,
  ecclesiastical_year: { year_id: 11, start_date: "2025-08-01", end_date: "2026-07-31" },
  status: "finalized",
  created_at: "2026-07-02T15:00:00.000Z",
};

const quarterly: QuarterlyReport = {
  quarterly_report_id: 11,
  club_id: 4,
  year: 2026,
  quarter: 2,
  status: "draft",
  created_at: "2026-07-02T15:00:00.000Z",
};

function renderTab(props: Partial<React.ComponentProps<typeof ReportsTab>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ReportsTab annualReports={[annual]} quarterlyReports={[quarterly]} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("ReportsTab", () => {
  afterEach(cleanup);

  it("links each row to the report detail and shows the localized status", () => {
    renderTab({ canOpenReports: true });

    expect(screen.getByRole("link", { name: "Anual 2025-2026" })).toHaveAttribute(
      "href",
      "/dashboard/reports/annual/31",
    );
    expect(screen.getByRole("link", { name: "Trimestral · T2 2026" })).toHaveAttribute(
      "href",
      "/dashboard/reports/quarterly/11",
    );
    expect(screen.getByText("Cerrado")).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
  });

  it("lists annual and quarterly reports in a single table", () => {
    renderTab();

    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 reports
  });

  it("does not link rows when the user cannot open reports", () => {
    renderTab({ canOpenReports: false });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Anual 2025-2026")).toBeInTheDocument();
  });

  it("shows an error, not an empty table, when a list failed to load", () => {
    renderTab({ annualReports: [], annualReportsError: true });

    expect(screen.getByText(/No se pudieron cargar los informes anuales/)).toBeInTheDocument();
    expect(screen.queryByText("Sin informes")).not.toBeInTheDocument();
    // The other list still renders.
    expect(screen.getByText("En curso")).toBeInTheDocument();
  });

  it("keeps the table headers and shows the error inside when both lists failed", () => {
    renderTab({
      annualReports: [],
      quarterlyReports: [],
      annualReportsError: true,
      quarterlyReportsError: true,
    });

    expect(screen.getByRole("columnheader", { name: "Informe" })).toBeInTheDocument();
    expect(screen.getByText("No pudimos cargar los informes del club.")).toBeInTheDocument();
    expect(screen.queryByText("Sin informes")).not.toBeInTheDocument();
  });

  it("shows an empty state outside the table when there are genuinely no reports", () => {
    renderTab({ annualReports: [], quarterlyReports: [] });

    expect(screen.getByText("Sin informes")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
