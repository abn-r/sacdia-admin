import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { pushMock, generateAnnualMock, toastSuccess, toastError } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  generateAnnualMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

// The real pickers fetch catalogs; here a button stands in for "the operator picked X".
vi.mock("@/components/shared/selectors/club-select", () => ({
  ClubSelect: ({ onChange }: { onChange: (id: number | null) => void }) => (
    <button type="button" onClick={() => onChange(4)}>
      pick-club
    </button>
  ),
}));
vi.mock("@/components/shared/selectors/ecclesiastical-year-select", () => ({
  EcclesiasticalYearSelect: ({ onChange }: { onChange: (id: number | null) => void }) => (
    <button type="button" onClick={() => onChange(11)}>
      pick-year
    </button>
  ),
}));

vi.mock("@/lib/api/reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/reports")>();
  return {
    ...actual,
    generateAnnualReport: generateAnnualMock,
  };
});

import { GenerateAnnualReportButton } from "./generate-annual-report-dialog";

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("GenerateAnnualReportButton", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("submits club and ecclesiastical year and opens the created report", async () => {
    generateAnnualMock.mockResolvedValue({ annual_report_id: 31 });
    wrap(<GenerateAnnualReportButton />);

    fireEvent.click(screen.getByRole("button", { name: "Generar informe" }));
    fireEvent.click(await screen.findByText("pick-club"));
    fireEvent.click(screen.getByText("pick-year"));
    fireEvent.click(screen.getByRole("button", { name: "Generar" }));

    await waitFor(() =>
      expect(generateAnnualMock).toHaveBeenCalledWith({ clubId: 4, ecclesiasticalYearId: 11 }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/reports/annual/31"));
  });

  it("requires both the club and the year", async () => {
    wrap(<GenerateAnnualReportButton />);

    fireEvent.click(screen.getByRole("button", { name: "Generar informe" }));
    fireEvent.click(await screen.findByRole("button", { name: "Generar" }));

    expect(await screen.findByText("Selecciona un club.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona un año eclesiástico.")).toBeInTheDocument();
    expect(generateAnnualMock).not.toHaveBeenCalled();
  });
});
