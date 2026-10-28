import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/es.json";
import type { AdminCountry } from "@/lib/catalogs/countries/types";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mocks = vi.hoisted(() => ({
  createCountryAction: vi.fn(),
  updateCountryAction: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/catalogs/countries/actions", () => ({
  createCountryAction: mocks.createCountryAction,
  updateCountryAction: mocks.updateCountryAction,
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import { CountryFormDialog } from "@/components/catalogs/countries/country-form-dialog";

const country: AdminCountry = {
  country_id: 3,
  name: "México",
  abbreviation: "MX",
  active: true,
  created_at: null,
  modified_at: null,
};

function renderDialog(props: { mode: "create" | "edit"; country?: AdminCountry }) {
  const onOpenChange = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CountryFormDialog open onOpenChange={onOpenChange} {...props} />
    </NextIntlClientProvider>,
  );
  return onOpenChange;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("CountryFormDialog", () => {
  it("keeps the typed values when the server rejects the form", async () => {
    mocks.createCountryAction.mockResolvedValue({ error: "Ya existe un país con ese nombre." });
    const onOpenChange = renderDialog({ mode: "create" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^Nombre/), "Guatemala");
    await user.type(screen.getByLabelText(/^Abreviatura/), "GT");
    await user.click(screen.getByRole("button", { name: /^Crear/ }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("Ya existe un país con ese nombre."),
    );
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Guatemala");
    expect(screen.getByLabelText(/^Abreviatura/)).toHaveValue("GT");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("keeps the edited values when an update is rejected", async () => {
    mocks.updateCountryAction.mockResolvedValue({ error: "No se pudo actualizar el país." });
    renderDialog({ mode: "edit", country });
    const user = userEvent.setup();

    const name = screen.getByLabelText(/^Nombre/);
    await user.clear(name);
    await user.type(name, "Mexico");
    await user.click(screen.getByRole("button", { name: messages.catalogs.crudPage.edit }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Mexico");
  });

  it("confirms a successful save with a toast and closes", async () => {
    mocks.createCountryAction.mockResolvedValue({ ok: true });
    const onOpenChange = renderDialog({ mode: "create" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^Nombre/), "Guatemala");
    await user.type(screen.getByLabelText(/^Abreviatura/), "GT");
    await user.click(screen.getByRole("button", { name: /^Crear/ }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
