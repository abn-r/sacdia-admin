import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/clubs/7",
  useSearchParams: () => new URLSearchParams(),
}));

import messages from "../../../../messages/es.json";
import { buildClubDetail } from "./detail-test-data";
import { MembersTab } from "./members-tab";

function renderTab() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MembersTab data={buildClubDetail()} classYearLabel="2026" />
    </NextIntlClientProvider>,
  );
}

function bodyRows() {
  const table = screen.getByRole("table");
  return within(table).getAllByRole("row").slice(1);
}

afterEach(cleanup);

describe("MembersTab", () => {
  it("lists every person once in a single table with section, role and class of the year", () => {
    renderTab();

    expect(screen.getByRole("columnheader", { name: "Clase 2026" })).toBeInTheDocument();
    const rows = bodyRows();
    expect(rows).toHaveLength(6);
    const iker = rows.find((row) => row.textContent?.includes("Iker Montes"));
    expect(iker).toHaveTextContent("Conquistadores");
    expect(iker).toHaveTextContent("Amigo");
  });

  it("writes «Miembro» in muted text so the position stands out", () => {
    renderTab();

    const iker = bodyRows().find((row) => row.textContent?.includes("Iker Montes"));
    const plain = within(iker as HTMLElement).getByText("Miembro");
    expect(plain).toHaveClass("text-muted-foreground");
    const mateo = bodyRows().find((row) => row.textContent?.includes("Mateo Herrera"));
    const role = within(mateo as HTMLElement).getByText("Director");
    expect(role).toHaveClass("font-medium");
    expect(role).not.toHaveClass("text-muted-foreground");
  });

  it("filters by name and offers to clear when nothing matches", async () => {
    renderTab();

    await userEvent.type(screen.getByLabelText("Buscar miembro"), "tomás");
    expect(bodyRows()).toHaveLength(1);

    await userEvent.clear(screen.getByLabelText("Buscar miembro"));
    await userEvent.type(screen.getByLabelText("Buscar miembro"), "zzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(bodyRows()).toHaveLength(6);
  });

  it("labels every filter", () => {
    renderTab();

    for (const label of ["Buscar miembro", "Sección", "Cargo", "Clase 2026"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});
