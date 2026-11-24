import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ReasonDialog } from "@/components/shared/reason-dialog";

afterEach(cleanup);

function setup() {
  const onConfirm = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ReasonDialog
        open
        onOpenChange={vi.fn()}
        title="Revocar"
        confirmLabel="Revocar acceso"
        onConfirm={onConfirm}
      />
    </NextIntlClientProvider>,
  );
  return { onConfirm };
}

describe("ReasonDialog", () => {
  it("disables confirm until the reason is long enough and sends it trimmed", async () => {
    const { onConfirm } = setup();
    const button = screen.getByRole("button", { name: "Revocar acceso" });
    expect(button).toBeDisabled();
    expect(screen.getByText("0/500")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Motivo"), "  ab  ");
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Motivo"), "cdef  ");
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(onConfirm).toHaveBeenCalledWith("ab  cdef");
  });
});
