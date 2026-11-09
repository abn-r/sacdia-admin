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

function renderList(canEdit: boolean) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ClubsListClient
        items={[{ club_id: 7, name: "Club Águilas", active: true }]}
        meta={{ page: 1, limit: 20, total: 1, totalPages: 1 }}
        localFieldOptions={[]}
        canEdit={canEdit}
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
