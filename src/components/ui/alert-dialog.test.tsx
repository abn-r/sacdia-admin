import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "./alert-dialog";

afterEach(cleanup);

function renderDialog(loading: boolean) {
  render(
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogTitle>Eliminar</AlertDialogTitle>
        <AlertDialogDescription>No se puede deshacer.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction loading={loading}>
            <Trash2 data-testid="icon" />
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>,
  );
  return screen.getByRole("button", { name: "Eliminar" });
}

describe("AlertDialogAction loading", () => {
  it("disables the action, marks it busy and shows the spinner", () => {
    const action = renderDialog(true);

    expect(action).toBeDisabled();
    expect(action).toHaveAttribute("aria-busy", "true");
    expect(action).toHaveAttribute("data-loading", "true");
    expect(action.querySelector("[data-slot=button-spinner]")).not.toBeNull();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders as a normal action when idle", () => {
    const action = renderDialog(false);

    expect(action).toBeEnabled();
    expect(action).not.toHaveAttribute("aria-busy");
    expect(action.querySelector("[data-slot=button-spinner]")).toBeNull();
  });
});
