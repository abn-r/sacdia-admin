import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const getHistory = vi.fn();
vi.mock("@/lib/api/club-detail", () => ({
  getClubHistoryFromClient: (...args: unknown[]) => getHistory(...args),
}));

import messages from "../../../../messages/es.json";
import { buildClubDetail, installRadixPolyfills } from "./detail-test-data";
import { HistoryTab } from "./history-tab";

const sections = buildClubDetail().sectionMemberGroups;

const page = (id: string, summary: string, actor: string | null, nextCursor: string | null = null) => ({
  items: [
    {
      audit_log_id: id,
      entity_type: "club_section",
      entity_id: "11",
      action: "UPDATED",
      summary,
      actor: actor ? { user_id: "u", name: actor, paternal_last_name: null } : null,
      created_at: "2026-11-21T18:40:00.000Z",
    },
  ],
  next_cursor: nextCursor,
});

function renderTab() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <HistoryTab clubId={7} sections={sections} />
    </NextIntlClientProvider>,
  );
}

installRadixPolyfills();

beforeEach(() => getHistory.mockReset());
afterEach(cleanup);

describe("HistoryTab", () => {
  it("writes one line per change with who did it and no badges", async () => {
    getHistory.mockResolvedValueOnce(page("2", "Habilitó la sección Aventureros", "Mateo Herrera"));
    renderTab();

    const line = await screen.findByText("Habilitó la sección Aventureros");
    const row = line.closest("li") as HTMLElement;
    expect(row).toHaveTextContent("Mateo Herrera");
    expect(row.querySelector("time")).not.toBeNull();
    expect(screen.queryByText("Actualizado")).not.toBeInTheDocument();
  });

  it("shows an error, never an empty history, when the first page fails", async () => {
    getHistory.mockRejectedValueOnce(new Error("boom"));
    renderTab();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Sin cambios registrados")).not.toBeInTheDocument();

    getHistory.mockResolvedValueOnce(page("2", "Creó el club", null));
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Creó el club")).toBeInTheDocument();
    expect(screen.getByText("Sistema")).toBeInTheDocument();
  });

  it("keeps the loaded events and warns when loading more fails", async () => {
    getHistory.mockResolvedValueOnce(page("2", "Cambió la cuota", "Lucía Gómez", "1"));
    renderTab();
    await screen.findByText("Cambió la cuota");

    getHistory.mockRejectedValueOnce(new Error("boom"));
    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() => expect(screen.getByText(/No pudimos actualizar/)).toBeInTheDocument());
    expect(screen.getByText("Cambió la cuota")).toBeInTheDocument();
  });

  it("says the section filter only covers the events already loaded", async () => {
    getHistory.mockResolvedValueOnce(page("2", "Cambió la cuota", "Lucía Gómez", "1"));
    renderTab();
    await screen.findByText("Cambió la cuota");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Filtrar por sección" }));
    await userEvent.click(await screen.findByRole("option", { name: "Aventureros" }));

    expect(screen.getByRole("note")).toHaveTextContent("solo los eventos ya cargados");
  });
});
