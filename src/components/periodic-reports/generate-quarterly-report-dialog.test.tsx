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

const { pushMock, generateQuarterlyMock, toastSuccess, toastError } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  generateQuarterlyMock: vi.fn(),
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

vi.mock("@/lib/api/reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/reports")>();
  return {
    ...actual,
    generateQuarterlyReport: generateQuarterlyMock,
  };
});

import {
  GenerateQuarterlyReportButton,
  reportYearOptions,
} from "./generate-quarterly-report-dialog";

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("GenerateQuarterlyReportButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 2026-10-29 -> year 2026, quarter 4 are the dialog defaults.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 29, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("submits club, year and quarter and opens the created report", async () => {
    generateQuarterlyMock.mockResolvedValue({ quarterly_report_id: 77 });
    wrap(<GenerateQuarterlyReportButton />);

    fireEvent.click(screen.getByRole("button", { name: "Generar informe" }));
    fireEvent.click(await screen.findByText("pick-club"));
    fireEvent.click(screen.getByRole("button", { name: "Generar" }));

    await waitFor(() =>
      expect(generateQuarterlyMock).toHaveBeenCalledWith({ clubId: 4, year: 2026, quarter: 4 }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/reports/quarterly/77"));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("asks for a club before calling the API", async () => {
    wrap(<GenerateQuarterlyReportButton />);

    fireEvent.click(screen.getByRole("button", { name: "Generar informe" }));
    fireEvent.click(await screen.findByRole("button", { name: "Generar" }));

    expect(await screen.findByText("Selecciona un club.")).toBeInTheDocument();
    expect(generateQuarterlyMock).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and shows the backend message when generating fails", async () => {
    generateQuarterlyMock.mockRejectedValue(new Error("El periodo aún no ha comenzado."));
    wrap(<GenerateQuarterlyReportButton />);

    fireEvent.click(screen.getByRole("button", { name: "Generar informe" }));
    fireEvent.click(await screen.findByText("pick-club"));
    fireEvent.click(screen.getByRole("button", { name: "Generar" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("El periodo aún no ha comenzado."));
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Generar" })).toBeInTheDocument();
  });

  it("offers years from the current one down to 2020", () => {
    expect(reportYearOptions(2026)).toEqual([2026, 2025, 2024, 2023, 2022, 2021, 2020]);
  });
});
