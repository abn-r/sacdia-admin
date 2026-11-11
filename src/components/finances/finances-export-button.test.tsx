import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import { FinancesExportButton } from "./finances-export-button";
import { buildFinanceExportUrl } from "@/lib/api/finances";

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function pick(item: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Exportar" }));
  await user.click(await screen.findByRole("menuitem", { name: item }));
}

function renderButton(props: Partial<React.ComponentProps<typeof FinancesExportButton>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FinancesExportButton clubId={7} year={2026} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("buildFinanceExportUrl", () => {
  it("builds the same-origin proxy URL with the current filters", () => {
    expect(
      buildFinanceExportUrl({ clubId: 7, year: 2026, month: 3, clubSectionId: 12 }),
    ).toBe("/api/finances/export?clubId=7&year=2026&month=3&club_section_id=12");
    expect(buildFinanceExportUrl({ clubId: 7, year: 2026 })).toBe(
      "/api/finances/export?clubId=7&year=2026",
    );
    expect(buildFinanceExportUrl({ clubId: 7, year: 2026, format: "pdf" })).toBe(
      "/api/finances/export?clubId=7&year=2026&format=pdf",
    );
  });
});

describe("FinancesExportButton", () => {
  it("requests the export for the filters and keeps the server filename", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Blob(["xlsx"]), {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="finanzas-club-2026-03.xlsx"',
        },
      }),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderButton({ month: 3, clubSectionId: 12 });
    await pick("Excel (.xlsx)");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/finances/export?clubId=7&year=2026&month=3&club_section_id=12",
    );
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Archivo descargado: finanzas-club-2026-03.xlsx",
      ),
    );
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });

  it("requests the pdf format and keeps the server filename", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Blob(["pdf"]), {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="finanzas-club-2026-03.pdf"',
        },
      }),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderButton({ month: 3 });
    await pick("PDF");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/finances/export?clubId=7&year=2026&month=3&format=pdf",
    );
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Archivo descargado: finanzas-club-2026-03.pdf",
      ),
    );
    click.mockRestore();
  });

  it("is disabled without a year", () => {
    renderButton({ year: undefined });

    expect(screen.getByRole("button", { name: "Exportar" })).toBeDisabled();
  });

  it("shows an error toast when the export fails", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));

    renderButton();
    await pick("Excel (.xlsx)");

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("No se pudo exportar el archivo."),
    );
  });

  it("shows the permission message on 403", async () => {
    fetchMock.mockResolvedValue(new Response("no", { status: 403 }));

    renderButton();
    await pick("Excel (.xlsx)");

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "No tienes permiso para exportar estos datos.",
      ),
    );
  });
});
