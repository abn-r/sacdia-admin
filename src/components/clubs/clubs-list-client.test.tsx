import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/clubs",
  useSearchParams: () => new URLSearchParams(),
}));

import { ClubsListClient } from "@/components/clubs/clubs-list-client";

const orion = {
  club_id: 1,
  name: "Club Orión",
  active: true,
  local_field: { name: "Asociación Valle Alto" },
  district: { name: "Norte" },
  church: { name: "Iglesia Central de Valle Alto" },
  club_sections: [{ active: true }, { active: true }, { active: false }],
};
const eagles = { club_id: 7, name: "Club Águilas", active: false };

function renderList(
  canEdit: boolean,
  extra: Partial<React.ComponentProps<typeof ClubsListClient>> = {},
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ClubsListClient
        items={[orion, eagles]}
        meta={{ page: 1, limit: 20, total: 2, totalPages: 1 }}
        localFieldOptions={[]}
        canEdit={canEdit}
        {...extra}
      />
    </NextIntlClientProvider>,
  );
}

describe("ClubsListClient edit action", () => {
  afterEach(() => cleanup());

  it("offers Editar and Ver (desktop table and mobile list) when canEdit", async () => {
    const user = userEvent.setup();
    renderList(true);

    const triggers = screen.getAllByRole("button", { name: /Acciones de Club Águilas/ });
    expect(triggers).toHaveLength(2);

    for (const trigger of triggers) {
      await user.click(trigger);
      const edit = await screen.findByRole("menuitem", { name: "Editar" });
      expect(edit.getAttribute("href")).toBe("/dashboard/clubs/7/edit");
      expect(screen.getByRole("menuitem", { name: "Ver detalle" })).toBeTruthy();
      await user.keyboard("{Escape}");
    }
  });

  it("shows no row actions when the actor cannot edit", () => {
    renderList(false);

    expect(screen.queryByRole("button", { name: /Acciones de/ })).toBeNull();
    expect(screen.queryByText("Editar")).toBeNull();
  });
});

describe("ClubsListClient list", () => {
  afterEach(() => cleanup());

  it("puts district and church on the name's second line and marks only the inactive club", () => {
    renderList(false);

    expect(screen.getAllByText("Distrito Norte · Iglesia Central de Valle Alto").length).toBeGreaterThan(0);
    // Two renders per club (table + mobile list): one «Inactivo» each, none for the active club.
    expect(screen.getAllByText("Inactivo")).toHaveLength(2);
    expect(screen.queryByText("Activo")).toBeNull();
    expect(screen.getAllByText("2/3").length).toBeGreaterThan(0);
  });

  it("offers «Nuevo club» and «Importar» independently, each by its own permission", () => {
    const { unmount } = renderList(false, { canCreate: true, canBulkImport: false });
    expect(screen.getByRole("link", { name: "Nuevo club" }).getAttribute("href")).toBe(
      "/dashboard/clubs/new",
    );
    expect(screen.queryByRole("link", { name: "Importar" })).toBeNull();
    unmount();

    renderList(false, { canCreate: false, canBulkImport: true });
    expect(screen.getByRole("link", { name: "Importar" }).getAttribute("href")).toBe(
      "/dashboard/clubs/import",
    );
    expect(screen.queryByRole("link", { name: "Nuevo club" })).toBeNull();
  });

  it("keeps the header and filters on a load error and never shows the empty state", () => {
    renderList(true, {
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
      canCreate: true,
      loadError: { kind: "error", detail: { code: 503, at: new Date("2026-11-24T10:42:00Z") } },
    });

    expect(screen.getByRole("heading", { level: 1, name: "Clubes" })).toBeTruthy();
    expect(screen.getByLabelText("Estado")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Nuevo club" })).toBeTruthy();
    expect(screen.getAllByText("No pudimos cargar los clubes").length).toBeGreaterThan(0);
    // Column headers stay inside the table frame.
    expect(screen.getByRole("columnheader", { name: "Nombre" })).toBeTruthy();
    expect(screen.queryByText("No hay clubes registrados")).toBeNull();
  });
});
