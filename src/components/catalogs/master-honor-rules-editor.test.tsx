import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import {
  MasterHonorRulesEditor,
  type MasterHonorAuxCategory,
  type MasterHonorAuxDivision,
  type MasterHonorAuxHonor,
} from "@/components/catalogs/master-honor-rules-editor";
import type { MasterHonorPayload } from "@/lib/api/phase-e-catalogs";

const HONORS: MasterHonorAuxHonor[] = [
  { honor_id: 101, name: "Buceo" },
  { honor_id: 102, name: "Kayaks" },
];

const CATEGORIES: MasterHonorAuxCategory[] = [
  { honor_category_id: 5, name: "Actividades agropecuarias" },
];

const DIVISIONS: MasterHonorAuxDivision[] = [
  { division_id: 1, name: "Interamericana" },
  { division_id: 2, name: "Sudamericana" },
];

const EMPTY_PAYLOAD: MasterHonorPayload = {
  applicability_scope: "ALL",
  division_ids: [],
  requirement_groups: [],
};

function renderEditor(initial: MasterHonorPayload = EMPTY_PAYLOAD) {
  function Harness() {
    const [value, setValue] = useState<MasterHonorPayload>(initial);
    return (
      <NextIntlClientProvider locale="es" messages={messages}>
        <MasterHonorRulesEditor
          value={value}
          onChange={setValue}
          honors={HONORS}
          honorCategories={CATEGORIES}
          divisions={DIVISIONS}
        />
      </NextIntlClientProvider>
    );
  }

  const utils = render(<Harness />);

  function payload() {
    const input = utils.container.querySelector<HTMLInputElement>(
      'input[name="master_honor_payload"]',
    );
    if (!input) throw new Error("Missing master_honor_payload input");
    return JSON.parse(input.value) as MasterHonorPayload;
  }

  return { ...utils, payload };
}

describe("MasterHonorRulesEditor", () => {
  afterEach(() => cleanup());

  it("renders philosophy, notes and recalculation warning fields", () => {
    const { payload } = renderEditor();

    fireEvent.change(screen.getByLabelText("Filosofía"), {
      target: { value: "Énfasis en recreación acuática." },
    });
    fireEvent.change(screen.getByLabelText("Notas"), {
      target: { value: "Natación I no cuenta para esta maestría." },
    });

    expect(
      screen.getByText(
        "Cambiar estos requisitos puede otorgar o marcar como No vigente maestrías de usuarios existentes. El recálculo se ejecutará automáticamente.",
      ),
    ).toBeInTheDocument();
    expect(payload().philosophy).toBe("Énfasis en recreación acuática.");
    expect(payload().notes).toBe("Natación I no cuenta para esta maestría.");
  });

  it("preserves selected divisions when applicability is selected divisions", () => {
    const { payload } = renderEditor({
      applicability_scope: "SELECTED_DIVISIONS",
      division_ids: [1],
      requirement_groups: [],
    });

    expect(screen.getByLabelText("Interamericana")).toBeChecked();
    expect(screen.getByLabelText("Sudamericana")).not.toBeChecked();

    fireEvent.click(screen.getByLabelText("Sudamericana"));

    expect(payload().applicability_scope).toBe("SELECTED_DIVISIONS");
    expect(payload().division_ids).toEqual([1, 2]);
  });

  it("adds explicit groups and repeatable options", () => {
    const { payload } = renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /agregar grupo/i }));
    expect(payload().requirement_groups).toHaveLength(1);
    expect(payload().requirement_groups[0].group_type).toBe("EXPLICIT_OPTIONS");
    expect(payload().requirement_groups[0].options).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /agregar opción/i }));
    expect(payload().requirement_groups[0].options).toHaveLength(2);
  });

  it("adds multiple equivalent honors to one explicit option", () => {
    const { payload } = renderEditor({
      applicability_scope: "ALL",
      division_ids: [],
      requirement_groups: [
        {
          group_type: "EXPLICIT_OPTIONS",
          title: "Acuáticas",
          minimum_required: 1,
          display_order: 1,
          options: [
            {
              label: "Buceo o Kayaks",
              display_order: 1,
              honor_ids: [101],
              active: true,
            },
          ],
          active: true,
        },
      ],
    });

    expect(screen.getByLabelText("Buceo")).toBeChecked();
    expect(screen.getByLabelText("Kayaks")).not.toBeChecked();

    fireEvent.click(screen.getByLabelText("Kayaks"));

    expect(payload().requirement_groups[0].options[0].honor_ids).toEqual([
      101,
      102,
    ]);
  });

  it("does not mutate the caller payload when editing nested options", () => {
    const initial: MasterHonorPayload = {
      applicability_scope: "ALL",
      division_ids: [],
      requirement_groups: [
        {
          group_type: "EXPLICIT_OPTIONS",
          title: "Acuáticas",
          minimum_required: 1,
          display_order: 1,
          options: [
            {
              label: "Buceo o Kayaks",
              display_order: 1,
              honor_ids: [101],
              active: true,
            },
          ],
          active: true,
        },
      ],
    };

    const { payload } = renderEditor(initial);

    fireEvent.click(screen.getByLabelText("Kayaks"));

    expect(payload().requirement_groups[0].options[0].honor_ids).toEqual([
      101,
      102,
    ]);
    expect(initial.requirement_groups[0].options[0].honor_ids).toEqual([101]);
  });

  it("normaliza y une la forma plana y anidada del backend", () => {
    const { payload } = renderEditor({
      applicability_scope: "SELECTED_DIVISIONS",
      division_ids: [1],
      master_honor_divisions: [{ division_id: 1 }, { division_id: 2 }, { division_id: 2 }],
      requirement_groups: [
        {
          group_type: "EXPLICIT_OPTIONS",
          minimum_required: 1,
          display_order: 1,
          options: [
            {
              option_id: 10,
              label: "Acuáticas",
              display_order: 1,
              honor_ids: [101],
              honors: [{ honor_id: 102 }, { honor: { honor_id: 101 } }, { honor: { honor_id: 101 } }],
              active: true,
            },
          ],
          active: true,
        },
      ],
    } as unknown as MasterHonorPayload);

    expect(payload().division_ids).toEqual([1, 2]);
    expect(payload().requirement_groups).toHaveLength(1);
    expect(payload().requirement_groups[0]?.options[0]?.honor_ids).toEqual([101, 102]);
  });

  it("warns when explicit minimum exceeds active option count", () => {
    renderEditor({
      applicability_scope: "ALL",
      division_ids: [],
      requirement_groups: [
        {
          group_type: "EXPLICIT_OPTIONS",
          minimum_required: 2,
          display_order: 1,
          options: [
            {
              label: "Buceo",
              display_order: 1,
              honor_ids: [101],
              active: true,
            },
          ],
          active: true,
        },
      ],
    });

    expect(
      screen.getByText("El mínimo del grupo 1 no puede superar las opciones activas (1)."),
    ).toBeInTheDocument();
  });

  it("renders category-count groups with the selected category", () => {
    const { payload } = renderEditor({
      applicability_scope: "ALL",
      division_ids: [],
      requirement_groups: [
        {
          group_type: "CATEGORY_COUNT",
          minimum_required: 7,
          honors_category_id: 5,
          display_order: 1,
          options: [],
          active: true,
        },
      ],
    });

    expect(screen.getByText("Cantidad por categoría")).toBeInTheDocument();
    expect(screen.getByText("Actividades agropecuarias")).toBeInTheDocument();
    expect(payload().requirement_groups[0]).toMatchObject({
      group_type: "CATEGORY_COUNT",
      minimum_required: 7,
      honors_category_id: 5,
    });
  });
});
