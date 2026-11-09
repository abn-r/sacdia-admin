import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

const { mockBack, mockPush, mockRefresh, mockToastSuccess } = vi.hoisted(() => ({
  mockBack: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush, refresh: mockRefresh, replace: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { success: mockToastSuccess } }));

vi.mock("@/components/shared/location-picker", () => ({
  LocationPicker: ({
    initialLat,
    initialLng,
  }: {
    initialLat?: number | null;
    initialLng?: number | null;
  }) => (
    <div>
      <input type="hidden" name="coordinates_lat" value={initialLat ?? ""} readOnly />
      <input type="hidden" name="coordinates_lng" value={initialLng ?? ""} readOnly />
    </div>
  ),
}));

import { EditClubForm } from "@/components/clubs/edit-club-form";
import type { ClubActionState } from "@/lib/clubs/actions";

const baseProps = {
  clubId: 7,
  name: "Club Águilas",
  description: "Club de conquistadores",
  address: "Calle 1 #23",
  active: true,
  lat: 19.43,
  lng: -99.13,
  localField: "Campo Centro",
  district: "Distrito Norte",
  church: "Iglesia Central",
  googleMapsApiKey: "key",
};

function renderForm(
  formAction: (prev: ClubActionState, formData: FormData) => Promise<ClubActionState>,
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EditClubForm {...baseProps} formAction={formAction} />
    </NextIntlClientProvider>,
  );
}

describe("EditClubForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Radix Switch measures its box; jsdom has no ResizeObserver.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders prefilled values, read-only location context and no territory inputs", () => {
    const { container } = renderForm(vi.fn(async () => ({})));

    expect((screen.getByLabelText(/Nombre/) as HTMLInputElement).value).toBe("Club Águilas");
    expect((screen.getByLabelText("Descripción") as HTMLTextAreaElement).value).toBe(
      "Club de conquistadores",
    );
    expect((screen.getByLabelText("Dirección") as HTMLInputElement).value).toBe("Calle 1 #23");
    expect(screen.getByRole("switch", { name: "Club activo" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByText("Campo Centro")).toBeTruthy();
    expect(screen.getByText("Iglesia Central")).toBeTruthy();
    expect(container.querySelector('[name="local_field_id"]')).toBeNull();
    expect(container.querySelector('[name="church_id"]')).toBeNull();
    expect(container.querySelector('[name="district_id"]')).toBeNull();
  });

  it("submits the edited values, with active=false after toggling the switch", async () => {
    const user = userEvent.setup();
    const formAction = vi.fn(async () => ({}) as ClubActionState);
    renderForm(formAction);

    const name = screen.getByLabelText(/Nombre/);
    await user.clear(name);
    await user.type(name, "Club Halcones");
    await user.clear(screen.getByLabelText("Descripción"));
    await user.click(screen.getByRole("switch", { name: "Club activo" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(formAction).toHaveBeenCalledTimes(1));
    const formData = (formAction.mock.calls[0] as unknown as [ClubActionState, FormData])[1];
    expect(formData.get("name")).toBe("Club Halcones");
    expect(formData.get("description")).toBe("");
    expect(formData.get("address")).toBe("Calle 1 #23");
    expect(formData.get("active")).toBe("false");
    expect(formData.get("coordinates_lat")).toBe("19.43");
  });

  it("shows inline field errors and the general error", async () => {
    const user = userEvent.setup();
    renderForm(
      vi.fn(async () => ({
        error: "No se pudo actualizar el club",
        fieldErrors: { name: "El nombre del club es obligatorio" },
      })),
    );

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("No se pudo actualizar el club")).toBeTruthy();
    expect(screen.getByText("El nombre del club es obligatorio")).toBeTruthy();
    expect(screen.getByLabelText(/Nombre/).getAttribute("aria-invalid")).toBe("true");
  });

  it("confirms and leaves the form after a successful save", async () => {
    const user = userEvent.setup();
    renderForm(vi.fn(async () => ({ success: "Club actualizado" })));

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Club actualizado"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/clubs");
    expect(mockRefresh).toHaveBeenCalled();
  });
});
