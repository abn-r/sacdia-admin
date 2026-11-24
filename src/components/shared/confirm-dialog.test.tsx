import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ConfirmDialog, type ConfirmDialogProps } from "@/components/shared/confirm-dialog";

afterEach(cleanup);

function setup(props: Partial<ConfirmDialogProps> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Cerrar año"
        description="Se congelan los puntos."
        confirmLabel="Cerrar"
        onConfirm={onConfirm}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { onOpenChange, onConfirm };
}

describe("ConfirmDialog", () => {
  it("confirms and closes on success", async () => {
    const { onConfirm, onOpenChange } = setup({ summary: <b>Resumen</b> });
    expect(screen.getByText("Se congelan los puntos.")).toBeInTheDocument();
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("stays open and shows the error when onConfirm rejects", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Falló el servidor"));
    const { onOpenChange } = setup({ onConfirm });
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falló el servidor");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("requires the typed text before enabling confirm", async () => {
    setup({ typedConfirmation: "2026", typedConfirmationLabel: "Escribe 2026 para confirmar" });
    const button = screen.getByRole("button", { name: "Cerrar" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Escribe 2026 para confirmar"), "2026");
    expect(button).toBeEnabled();
  });

  it("uses the destructive-solid style for destructive tone", () => {
    setup({ tone: "destructive" });
    expect(screen.getByRole("button", { name: "Cerrar" }).className).toContain(
      "bg-destructive-solid",
    );
  });
});
