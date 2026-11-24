import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import { ActivityForm } from "./activity-form";
import { TEST_MESSAGES } from "./test-messages";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard/clubs/activities/new",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/components/shared/location-picker", () => ({
  LocationPicker: ({
    onLocationChange,
  }: {
    onLocationChange?: (value: { lat: number; lng: number; address: string } | null) => void;
  }) => (
    <button
      type="button"
      data-testid="map"
      onClick={() => onLocationChange?.({ lat: 19.17, lng: -96.13, address: "Parque del Lago, Valle Alto" })}
    >
      mapa
    </button>
  ),
}));

const createActivityMock = vi.fn();
const createSeriesMock = vi.fn();
vi.mock("@/lib/api/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/activities")>()),
  createActivity: (...args: unknown[]) => createActivityMock(...args),
  createActivitySeries: (...args: unknown[]) => createSeriesMock(...args),
  updateActivity: vi.fn(),
  getCurrentEcclesiasticalYearFromClient: async () => ({ year_id: 1, end_date: "2026-12-20" }),
}));
vi.mock("@/lib/api/classes", () => ({ listClasses: async () => ({ data: [] }) }));

beforeEach(() => {
  createActivityMock.mockResolvedValue({});
  createSeriesMock.mockResolvedValue({ created_count: 4 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const SECTIONS = [
  { club_section_id: 3, club_type_id: 2, name: "Conquistadores", club_type: { name: "Conquistadores" } },
];

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={TEST_MESSAGES}>
      <ActivityForm
        clubId={1}
        sections={SECTIONS}
        defaultSectionId={3}
        listHref="/dashboard/clubs/activities?club=1"
        today="2026-11-24"
        googleMapsApiKey="test-key"
      />
    </NextIntlClientProvider>,
  );
}

async function fillStepOne(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre"), "Clase de nudos");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("ActivityForm", () => {
  it("is a 2-step form and states the step in text", () => {
    renderForm();

    expect(screen.getByText("Paso 1 de 2 · Qué y para quién")).toBeInTheDocument();
    expect(screen.getByText(/Siguiente: Fecha y lugar/)).toBeInTheDocument();
  });

  it("does not leave step 1 without a name", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("El nombre es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("Paso 1 de 2 · Qué y para quién")).toBeInTheDocument();
  });

  it("goes to date and place, and says what the series will create before creating", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillStepOne(user);

    expect(screen.getByText("Paso 2 de 2 · Fecha y lugar")).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Repetir esta actividad" }));

    // 2026-11-24 is a Tuesday; the year closes on 2026-12-20.
    expect(await screen.findByText("4 sesiones: 24 nov, 1, 8 y 15 dic.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear 4 actividades" })).toBeEnabled();
  });

  it("rejects an activity without a pinned place instead of sending 0,0", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillStepOne(user);

    await user.click(screen.getByRole("button", { name: "Crear actividad" }));

    expect(await screen.findByText("Busca el lugar en el mapa para fijar la ubicación")).toBeInTheDocument();
    expect(createActivityMock).not.toHaveBeenCalled();
  });

  it("swaps the place for the link when the activity is virtual", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillStepOne(user);
    expect(screen.getByTestId("map")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Virtual" }));

    expect(screen.queryByTestId("map")).toBeNull();
    expect(screen.queryByLabelText("Lugar")).toBeNull();
    expect(screen.getByLabelText("Enlace de la reunión")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Crear actividad" }));
    expect(await screen.findByText("Pega el enlace de la reunión")).toBeInTheDocument();
    expect(createActivityMock).not.toHaveBeenCalled();
  });

  it("creates the activity with the place and pin picked on the map", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillStepOne(user);

    await user.click(screen.getByTestId("map"));
    await user.click(screen.getByRole("button", { name: "Crear actividad" }));

    await waitFor(() => expect(createActivityMock).toHaveBeenCalledTimes(1));
    expect(createActivityMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        name: "Clase de nudos",
        club_type_id: 2,
        club_section_id: 3,
        activity_place: "Parque del Lago, Valle Alto",
        lat: 19.17,
        long: -96.13,
        activity_date: "2026-11-24",
        platform: 0,
      }),
    );
  });
});
