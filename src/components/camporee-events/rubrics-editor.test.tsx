import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { RubricsEditor, areRubricsValid } from "@/components/camporee-events/rubrics-editor";
import type { CamporeeTemplateRubricInput } from "@/lib/api/camporee-scoring";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
});

function Harness({
  initial,
  maxPoints,
}: {
  initial: CamporeeTemplateRubricInput[];
  maxPoints: number;
}) {
  const [enabled, setEnabled] = useState(true);
  const [rubrics, setRubrics] = useState(initial);
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
    <form>
      <RubricsEditor
        enabled={enabled}
        onEnabledChange={setEnabled}
        value={rubrics}
        onChange={setRubrics}
        maxPoints={maxPoints}
      />
      <button type="submit">Guardar</button>
    </form>
    </NextIntlClientProvider>
  );
}

describe("RubricsEditor", () => {
  it("rejects save when rubric sum differs from max points", () => {
    render(<Harness maxPoints={100} initial={[{ title: "A", max_points: 80 }]} />);

    expect(screen.getByRole("status")).toHaveTextContent("Las rúbricas suman 80 de 100 pts. Faltan 20 pts");
    expect(screen.getByTestId("rubrics-total-guard")).toBeRequired();
    expect(areRubricsValid(true, [{ title: "A", max_points: 80 }], 100)).toBe(false);
  });

  it("accepts matching rubric sum", () => {
    render(
      <Harness
        maxPoints={100}
        initial={[
          { title: "A", max_points: 40 },
          { title: "B", max_points: 60 },
        ]}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Las rúbricas suman 100 de 100 pts.");
    expect(screen.queryByTestId("rubrics-total-guard")).not.toBeInTheDocument();
    expect(
      areRubricsValid(
        true,
        [
          { title: "A", max_points: 40 },
          { title: "B", max_points: 60 },
        ],
        100,
      ),
    ).toBe(true);
  });

  it("updates total as rubric points change", () => {
    render(<Harness maxPoints={100} initial={[{ title: "A", max_points: 80 }]} />);

    fireEvent.change(screen.getByLabelText("Puntos del criterio 1"), {
      target: { value: "100" },
    });

    expect(screen.getByRole("status")).toHaveTextContent("Las rúbricas suman 100 de 100 pts.");
    expect(screen.queryByTestId("rubrics-total-guard")).not.toBeInTheDocument();
  });

  it("says how many points are left over when the sum goes above the maximum", () => {
    render(<Harness maxPoints={100} initial={[{ title: "A", max_points: 130 }]} />);

    expect(screen.getByRole("status")).toHaveTextContent("Sobran 30 pts");
    expect(screen.getByTestId("rubrics-total-guard")).toBeRequired();
  });

  it("asks for a first criterion and removes one from the row menu", async () => {
    const user = userEvent.setup();
    render(<Harness maxPoints={50} initial={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent("Agrega al menos un criterio");
    await user.click(screen.getByRole("button", { name: "Agregar criterio" }));
    expect(screen.getByLabelText("Puntos del criterio 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Acciones de/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar criterio 1" }));
    expect(screen.queryByLabelText("Puntos del criterio 1")).not.toBeInTheDocument();
  });
});
