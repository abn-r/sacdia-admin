import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlWrapper, testMessages } from "@/components/requests/test-intl";
import { ReviewSheet, type ReviewSheetProps } from "@/components/requests/review-sheet";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const sheetMsg = testMessages.queues.requests.sheet;

function renderSheet(props: Partial<ReviewSheetProps> = {}) {
  const onOpenChange = vi.fn();
  const onApprove = vi.fn().mockResolvedValue(undefined);
  const onReject = vi.fn().mockResolvedValue(undefined);
  render(
    <IntlWrapper>
      <ReviewSheet
        open
        onOpenChange={onOpenChange}
        title="Traslado de Sofía Mendoza"
        description="Enviado el 6 nov"
        approve={{
          label: "Aprobar traslado",
          onConfirm: onApprove,
          comment: { label: "Comentario", hint: "Opcional." },
        }}
        reject={{
          label: "Rechazar…",
          confirmLabel: "Rechazar traslado",
          audience: "La persona y su director verán este motivo.",
          onConfirm: onReject,
        }}
        {...props}
      >
        <p>contenido</p>
      </ReviewSheet>
    </IntlWrapper>,
  );
  return { onOpenChange, onApprove, onReject };
}

afterEach(() => cleanup());

describe("ReviewSheet", () => {
  it("approves with the optional comment and closes", async () => {
    const user = userEvent.setup();
    const { onApprove, onOpenChange } = renderSheet();

    await user.type(screen.getByLabelText("Comentario"), "  Bienvenido  ");
    await user.click(screen.getByRole("button", { name: "Aprobar traslado" }));

    await waitFor(() => expect(onApprove).toHaveBeenCalledWith("Bienvenido"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("approves without a comment: the argument is undefined", async () => {
    const user = userEvent.setup();
    const { onApprove } = renderSheet();
    await user.click(screen.getByRole("button", { name: "Aprobar traslado" }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledWith(undefined));
  });

  it("'Rechazar…' swaps the footer to a required reason that says who will read it", async () => {
    const user = userEvent.setup();
    const { onReject, onOpenChange } = renderSheet();

    await user.click(screen.getByRole("button", { name: "Rechazar…" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Aprobar traslado" })).toBeNull();
    expect(screen.getByText(/La persona y su director verán este motivo\./)).toBeInTheDocument();

    const reason = screen.getByLabelText(new RegExp(sheetMsg.reasonLabel));
    await user.type(reason, "no");
    await user.click(screen.getByRole("button", { name: "Rechazar traslado" }));
    expect(screen.getByText("Escribe al menos 5 caracteres.")).toBeInTheDocument();
    expect(onReject).not.toHaveBeenCalled();

    await user.clear(reason);
    await user.type(reason, "  Sin cupo en la clase  ");
    await user.click(screen.getByRole("button", { name: "Rechazar traslado" }));
    await waitFor(() => expect(onReject).toHaveBeenCalledWith("Sin cupo en la clase"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("'Volver' returns to the review footer", async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole("button", { name: "Rechazar…" }));
    await user.click(screen.getByRole("button", { name: sheetMsg.back }));
    expect(screen.getByRole("button", { name: "Aprobar traslado" })).toBeInTheDocument();
  });

  it("opens straight on the reason form with startRejecting", () => {
    renderSheet({ startRejecting: true });
    expect(screen.getByLabelText(new RegExp(sheetMsg.reasonLabel))).toBeInTheDocument();
  });

  it("a failing action keeps the sheet open and shows the message inline", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn().mockRejectedValue(new Error("boom"));
    const { onOpenChange } = renderSheet({
      approve: { label: "Aprobar traslado", onConfirm: onApprove },
      errorMessage: () => "No se pudo aprobar",
    });

    await user.click(screen.getByRole("button", { name: "Aprobar traslado" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo aprobar");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("read-only: only 'Cerrar'", () => {
    renderSheet({ approve: undefined, reject: undefined });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("button", { name: sheetMsg.close }).length).toBeGreaterThan(0);
    expect(within(dialog).queryByRole("button", { name: "Rechazar…" })).toBeNull();
  });

  it("shows the custom primary action instead of approve", () => {
    renderSheet({ approve: undefined, primary: <button type="button">Confirmar</button> });
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });
});
