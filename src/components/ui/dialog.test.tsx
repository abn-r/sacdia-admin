import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

const messages = { shared: { uiPrimitives: { close: "Cerrar" } } };

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("localized close buttons", () => {
  afterEach(cleanup);

  it("Dialog close button uses the shared.uiPrimitives.close message", () => {
    render(
      wrap(
        <Dialog open>
          <DialogContent>
            <DialogTitle>T</DialogTitle>
            <DialogDescription>D</DialogDescription>
          </DialogContent>
        </Dialog>,
      ),
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(screen.queryByText("Close")).toBeNull();
  });

  it("Sheet close button uses the shared.uiPrimitives.close message", () => {
    render(
      wrap(
        <Sheet open>
          <SheetContent>
            <SheetTitle>T</SheetTitle>
            <SheetDescription>D</SheetDescription>
          </SheetContent>
        </Sheet>,
      ),
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(screen.queryByText("Close")).toBeNull();
  });
});
