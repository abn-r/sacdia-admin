import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { FormSection, SectionFormPage } from "@/components/shared/section-form-page";

afterEach(cleanup);

function setup(over: { dirty?: boolean; pending?: boolean } = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SectionFormPage
        sections={[
          { id: "a", title: "General" },
          { id: "b", title: "Fechas" },
        ]}
        dirty={over.dirty ?? false}
        pending={over.pending ?? false}
        onSave={onSave}
        onCancel={onCancel}
      >
        <FormSection id="a" title="General">
          x
        </FormSection>
        <FormSection id="b" title="Fechas" description="Cuándo ocurre">
          y
        </FormSection>
      </SectionFormPage>
    </NextIntlClientProvider>,
  );
  return { onSave, onCancel };
}

describe("SectionFormPage", () => {
  it("renders TOC anchors and section headings", () => {
    setup();
    expect(screen.getByRole("link", { name: "Fechas" })).toHaveAttribute("href", "#b");
    expect(screen.getByRole("heading", { level: 3, name: "Fechas" })).toBeInTheDocument();
    expect(screen.getByText("Cuándo ocurre")).toBeInTheDocument();
  });

  it("shows the unsaved note only when dirty and wires the buttons", async () => {
    const { onSave, onCancel } = setup({ dirty: true });
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("hides the note when clean", () => {
    setup();
    expect(screen.queryByText("Cambios sin guardar")).toBeNull();
  });
});
