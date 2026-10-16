import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import messages from "../../../messages/es.json";
import { RowActions } from "./row-actions";

afterEach(cleanup);

function renderActions(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("RowActions", () => {
  it("labels the trigger with the entity and orders destructive actions last", async () => {
    const onDelete = vi.fn();
    renderActions(
      <RowActions
        label="Club Águilas"
        actions={[
          { label: "Eliminar…", icon: Trash2, destructive: true, onSelect: onDelete },
          { label: "Editar", icon: Pencil, onSelect: vi.fn() },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Acciones de Club Águilas" }));
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Editar", "Eliminar…"]);
    expect(screen.getByRole("separator")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("menuitem", { name: "Eliminar…" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("skips hidden actions and renders nothing when none remain", () => {
    const { container } = renderActions(
      <RowActions label="X" actions={[{ label: "Editar", hidden: true }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders review decision buttons before the menu", () => {
    renderActions(
      <RowActions
        label="Traslado"
        primary={<button type="button">Aprobar</button>}
        actions={[{ label: "Ver detalle", href: "/x" }]}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("Aprobar");
    expect(buttons[1]).toHaveAccessibleName("Acciones de Traslado");
  });
});
