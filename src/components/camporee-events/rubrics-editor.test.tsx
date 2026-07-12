import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  );
}

describe("RubricsEditor", () => {
  it("rejects save when rubric sum differs from max points", () => {
    render(<Harness maxPoints={100} initial={[{ title: "A", max_points: 80 }]} />);

    expect(screen.getByText("Rúbricas: 80 / 100 puntos")).toBeInTheDocument();
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

    expect(screen.getByText("Rúbricas: 100 / 100 puntos")).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText("Puntos criterio 1"), {
      target: { value: "100" },
    });

    expect(screen.getByText("Rúbricas: 100 / 100 puntos")).toBeInTheDocument();
    expect(screen.queryByTestId("rubrics-total-guard")).not.toBeInTheDocument();
  });
});
