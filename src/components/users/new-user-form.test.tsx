import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

const { mockCreateUser } = vi.hoisted(() => ({
  mockCreateUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/lib/api/admin-users", () => ({
  createAdminUserFromClient: mockCreateUser,
}));

vi.mock("@/lib/api/geography", () => ({
  listCountries: vi.fn().mockResolvedValue([]),
  listUnions: vi.fn().mockResolvedValue([]),
  listLocalFields: vi.fn().mockResolvedValue([]),
}));

import { NewUserForm } from "@/components/users/new-user-form";

// Radix Select uses pointer-capture and scroll APIs that jsdom lacks.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Scoped actor (local field): geography is locked, so step 2 only needs a role.
const geography = {
  lockCountry: true,
  lockUnion: true,
  lockLocalField: true,
  countries: [{ country_id: 1, name: "México" }],
  unions: [{ union_id: 20, name: "Unión Mexicana Interoceánica", country_id: 1 }],
  localFields: [
    { local_field_id: 4, name: "Asociación Centro de Veracruz", union_id: 20 },
  ],
  defaultCountryId: 1,
  defaultUnionId: 20,
  defaultLocalFieldId: 4,
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <NewUserForm
        allowedRoles={["pastor", "user"]}
        // The loader types are wider than what the form reads.
        geography={geography as never}
      />
    </NextIntlClientProvider>,
  );
}

describe("NewUserForm", () => {
  beforeEach(() => {
    mockCreateUser.mockReset();
    mockCreateUser.mockResolvedValue({
      email: "qa@sacdia.test",
      invite_email_sent: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the step-1 data when the user moves to step 2 and submits", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText("Ej. María"), "Ana");
    await user.type(screen.getByPlaceholderText("Ej. González"), "Ruiz");
    await user.type(
      screen.getByPlaceholderText("usuario@ejemplo.com"),
      "qa@sacdia.test",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await user.click(await screen.findByRole("combobox", { name: /Rol/ }));
    await user.click(await screen.findByRole("option", { name: "Pastor" }));
    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledTimes(1));
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ana",
        paternal_last_name: "Ruiz",
        email: "qa@sacdia.test",
        role: "pastor",
        country_id: 1,
        union_id: 20,
        local_field_id: 4,
      }),
    );
  });

  it("shows the step-1 values again after going back", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText("Ej. María"), "Ana");
    await user.type(screen.getByPlaceholderText("Ej. González"), "Ruiz");
    await user.type(
      screen.getByPlaceholderText("usuario@ejemplo.com"),
      "qa@sacdia.test",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: "Atrás" }));

    expect(await screen.findByPlaceholderText("Ej. María")).toHaveValue("Ana");
    expect(screen.getByPlaceholderText("Ej. González")).toHaveValue("Ruiz");
    expect(screen.getByPlaceholderText("usuario@ejemplo.com")).toHaveValue(
      "qa@sacdia.test",
    );
  });
});
