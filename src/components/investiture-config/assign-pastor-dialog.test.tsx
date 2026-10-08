import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";

const mockSearch = vi.hoisted(() => vi.fn());
const mockAssign = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@/lib/api/investiture-field-config", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/investiture-field-config")>()),
  searchPastorCandidates: (...args: unknown[]) => mockSearch(...args),
  assignDistrictPastor: (...args: unknown[]) => mockAssign(...args),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

import { AssignPastorDialog } from "./assign-pastor-dialog";

const ana = { user_id: "u-ana", user_name: "Ana Pérez", email: "ana@example.org" };
const anabel = { user_id: "u-anabel", user_name: "Anabel Soto", email: "anabel@example.org" };

const onOpenChange = vi.fn();
const onAssigned = vi.fn();

function renderDialog(props: Partial<React.ComponentProps<typeof AssignPastorDialog>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AssignPastorDialog
        open
        onOpenChange={onOpenChange}
        districtId={5}
        districtName="Distrito Norte"
        excludeUserIds={[]}
        onAssigned={onAssigned}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

async function openCombobox(user: ReturnType<typeof setup>) {
  await user.click(screen.getByRole("combobox"));
  return screen.getByPlaceholderText("Escribí nombre, apellido o correo");
}

describe("AssignPastorDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSearch.mockReset().mockResolvedValue([ana, anabel]);
    mockAssign.mockReset().mockResolvedValue({ user_id: "u-ana" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("explains that only pastors of the actor's Field show up", () => {
    renderDialog();

    expect(screen.getByText("Asignar pastor a Distrito Norte")).toBeInTheDocument();
    expect(screen.getByText("Solo aparecen pastores registrados en tu Campo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asignar" })).toBeDisabled();
  });

  it("does not search with fewer than 3 characters or words shorter than 2", async () => {
    const user = setup();
    renderDialog();
    const input = await openCombobox(user);

    await user.type(input, "an");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(mockSearch).not.toHaveBeenCalled();
    expect(
      screen.getByText("Escribí al menos 3 caracteres; cada palabra necesita 2 como mínimo."),
    ).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "ana p");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("debounces by 300 ms and searches once with the trimmed text", async () => {
    const user = setup();
    renderDialog();
    const input = await openCombobox(user);

    await user.type(input, "ana");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(mockSearch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith("ana");
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("anabel@example.org")).toBeInTheDocument();
  });

  it("hides candidates that are already assigned to the district", async () => {
    const user = setup();
    renderDialog({ excludeUserIds: ["u-ana"] });
    const input = await openCombobox(user);

    await user.type(input, "ana");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(await screen.findByText("Anabel Soto")).toBeInTheDocument();
    expect(screen.queryByText("Ana Pérez")).not.toBeInTheDocument();
  });

  it("assigns the selected candidate and closes", async () => {
    const user = setup();
    renderDialog();
    const input = await openCombobox(user);

    await user.type(input, "ana");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    await user.click(await screen.findByText("Ana Pérez"));

    const assign = screen.getByRole("button", { name: "Asignar" });
    expect(assign).toBeEnabled();
    await user.click(assign);

    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith(5, "u-ana"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Pastor asignado."));
    expect(onAssigned).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open and maps the backend error when assigning fails", async () => {
    const user = setup();
    mockAssign.mockRejectedValue(
      new ApiError("Conflict", 409, { code: "INVESTITURE_PASTOR_QUOTA_FULL" }),
    );
    renderDialog();
    const input = await openCombobox(user);

    await user.type(input, "ana");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    await user.click(await screen.findByText("Ana Pérez"));
    await user.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        messages.investiture_requests.errors.pastor_quota_full,
      ),
    );
    expect(onAssigned).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("shows an empty message and a search error", async () => {
    const user = setup();
    mockSearch.mockResolvedValueOnce([]);
    renderDialog();
    const input = await openCombobox(user);

    await user.type(input, "zzz");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(await screen.findByText("No hay pastores que coincidan.")).toBeInTheDocument();

    mockSearch.mockRejectedValueOnce(new Error("boom"));
    await user.clear(input);
    await user.type(input, "yyy");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(await screen.findByText("No se pudo buscar. Intentá de nuevo.")).toBeInTheDocument();
  });
});
