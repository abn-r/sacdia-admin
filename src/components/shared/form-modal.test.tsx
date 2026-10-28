import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn(), back: vi.fn(), refresh: mocks.refresh }),
}));

import { FormPageFrame, useFormModal } from "@/components/shared/form-modal";

function FormProbe() {
  const modal = useFormModal("/fallback");
  return (
    <div>
      <button type="button" onClick={modal.close}>
        cancel-form
      </button>
      <button type="button" onClick={modal.complete}>
        save-form
      </button>
    </div>
  );
}

function renderFrame() {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FormPageFrame
        title="Editar evento"
        description="Modifica los datos del evento."
        backHref="/dashboard/campamentos/union/138?tab=events"
        backLabel="Volver a eventos"
      >
        <FormProbe />
      </FormPageFrame>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe("FormPageFrame", () => {
  it("renders the form as a page: one H1, a way back and no dialog", () => {
    renderFrame();

    expect(screen.getByRole("heading", { level: 1, name: "Editar evento" })).toBeInTheDocument();
    expect(screen.getByText("Modifica los datos del evento.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Volver a eventos/ })).toHaveAttribute(
      "href",
      "/dashboard/campamentos/union/138?tab=events",
    );
    expect(screen.getByRole("button", { name: "cancel-form" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("makes useFormModal navigate to the way back on cancel", async () => {
    renderFrame();
    await userEvent.setup().click(screen.getByRole("button", { name: "cancel-form" }));

    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/union/138?tab=events");
  });

  it("navigates back and refreshes the list when the form completes", async () => {
    renderFrame();
    await userEvent.setup().click(screen.getByRole("button", { name: "save-form" }));

    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/union/138?tab=events");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
