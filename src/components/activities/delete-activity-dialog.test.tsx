import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import { DeleteActivityDialog } from "./delete-activity-dialog";
import { TEST_MESSAGES } from "./test-messages";
import type { Activity } from "@/lib/api/activities";

const deleteActivityMock = vi.fn();
vi.mock("@/lib/api/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/activities")>()),
  deleteActivity: (...args: unknown[]) => deleteActivityMock(...args),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ACTIVITY: Activity = {
  activity_id: 7,
  name: "Reunión directiva",
  club_id: 1,
  club_type_id: 2,
  club_section_id: 3,
  lat: 0,
  long: 0,
  activity_place: "Virtual",
  activity_type_id: 1,
  active: true,
  activity_date: "2026-11-25",
};

function renderDialog(activity: Activity, onSuccess = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={TEST_MESSAGES}>
      <DeleteActivityDialog open onOpenChange={vi.fn()} activity={activity} onSuccess={onSuccess} />
    </NextIntlClientProvider>,
  );
  return onSuccess;
}

describe("DeleteActivityDialog", () => {
  it("names the activity and says it is deactivated", () => {
    renderDialog(ACTIVITY);

    expect(screen.getByText("¿Eliminar «Reunión directiva»?")).toBeInTheDocument();
    expect(screen.getByText(/La actividad se desactiva/)).toBeInTheDocument();
  });

  it("for a series session says it removes only that session and where the rest is handled", () => {
    renderDialog({ ...ACTIVITY, activity_series_id: 5 });

    expect(screen.getByText("¿Eliminar la sesión del 25 de noviembre de 2026?")).toBeInTheDocument();
    expect(screen.getByText(/Solo se elimina esta sesión/)).toBeInTheDocument();
    expect(screen.getByText(/usa «Ver serie»/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar sesión" })).toBeInTheDocument();
  });

  it("deletes and reports success", async () => {
    deleteActivityMock.mockResolvedValue({});
    const onSuccess = renderDialog(ACTIVITY);

    await userEvent.setup().click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(deleteActivityMock).toHaveBeenCalledWith(7);
  });

  it("keeps the dialog open and says why when the API refuses", async () => {
    deleteActivityMock.mockRejectedValue(new Error("Sin permiso para eliminar"));
    const onSuccess = renderDialog(ACTIVITY);

    await userEvent.setup().click(screen.getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Sin permiso para eliminar")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
