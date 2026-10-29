import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
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

    expect(screen.getByRole("link", { name: "2025-2026" })).toHaveAttribute(
      "href",
      "/dashboard/reports/annual/31",
    );
    expect(screen.getByRole("link", { name: "2026" })).toHaveAttribute(
      "href",
      "/dashboard/reports/quarterly/11",
    );
    expect(screen.getByText("Finalizado")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("does not link rows when the user cannot open reports", () => {
    renderTab({ canOpenReports: false });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("2025-2026")).toBeInTheDocument();
  });

  it("shows an error instead of the empty message when a list failed to load", () => {
    renderTab({ annualReports: [], annualReportsError: true });

    expect(screen.getByText(/No se pudieron cargar los informes anuales/)).toBeInTheDocument();
    expect(screen.queryByText("Sin informes anuales.")).not.toBeInTheDocument();
    // The other list still renders.
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("shows the empty message when a list is genuinely empty", () => {
    renderTab({ quarterlyReports: [] });

    expect(screen.getByText("Sin informes trimestrales.")).toBeInTheDocument();
  });
});
