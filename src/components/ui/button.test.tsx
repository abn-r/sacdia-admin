import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Save } from "lucide-react";
import { Button } from "./button";

afterEach(cleanup);

describe("Button loading", () => {
  it("disables the button and marks it busy", () => {
    render(<Button loading>Guardar</Button>);
    const button = screen.getByRole("button", { name: "Guardar" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("[data-slot=button-spinner]")).not.toBeNull();
  });

  it("keeps the label and the existing icon in the DOM so the width does not jump", () => {
    render(
      <Button loading>
        <Save data-testid="icon" />
        Guardar
      </Button>,
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("Guardar");
  });

  it("renders no spinner and stays enabled when not loading", () => {
    render(<Button>Guardar</Button>);
    const button = screen.getByRole("button");

    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button.querySelector("[data-slot=button-spinner]")).toBeNull();
  });

  it("ignores loading with asChild because Slot needs a single child", () => {
    render(
      <Button asChild loading>
        <a href="/dashboard">Ir</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ir" });

    expect(link).not.toHaveAttribute("aria-busy");
    expect(link.querySelector("[data-slot=button-spinner]")).toBeNull();
  });
});
