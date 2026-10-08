import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { DecisionConfirmDialog } from "./decision-confirm-dialog";

function renderDialog(props: Partial<React.ComponentProps<typeof DecisionConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DecisionConfirmDialog
        open
        onOpenChange={onOpenChange}
        investCount={3}
        rejectCount={1}
        isSubmitting={false}
        onConfirm={onConfirm}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { onConfirm, onOpenChange };
}

describe("DecisionConfirmDialog", () => {
  afterEach(() => cleanup());

  it("states the counts and that the decisions cannot be undone", () => {
    renderDialog();

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/no se pueden deshacer/i)).toBeInTheDocument();
    expect(screen.getByText("Se investirán: 3")).toBeInTheDocument();
    expect(screen.getByText("Se rechazarán: 1")).toBeInTheDocument();
  });

  it("calls onConfirm from the confirm button", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows the submitting label and disables both buttons while confirming", () => {
    renderDialog({ isSubmitting: true });

    expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});
