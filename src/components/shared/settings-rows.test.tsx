import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { SettingsRow, SettingsSaveBar, SettingsSection } from "./settings-rows";

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="es" messages={{ shared: { kit: { settings: { save: "Guardar", unsaved: "Cambios sin guardar" } } } }}>
      {ui}
    </NextIntlClientProvider>,
  );

describe("settings rows", () => {
  afterEach(cleanup);

  it("renders section and rows", () => {
    wrap(
      <SettingsSection title="General" description="Ajustes base">
        <SettingsRow label="Nombre" description="Visible" control={<input aria-label="n" />} />
      </SettingsSection>,
    );
    expect(screen.getByRole("heading", { name: "General" })).toBeInTheDocument();
    expect(screen.getByText("Ajustes base")).toBeInTheDocument();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("n")).toBeInTheDocument();
  });

  it("save bar: clean state hides the notice and disables save", () => {
    wrap(<SettingsSaveBar dirty={false} onSave={() => {}} />);
    expect(screen.queryByText("Cambios sin guardar")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("save bar: dirty state shows notice and saves/cancels", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    wrap(<SettingsSaveBar dirty onSave={onSave} onCancel={onCancel} cancelLabel="Descartar" />);
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("save bar: pending disables save", () => {
    wrap(<SettingsSaveBar dirty pending onSave={() => {}} />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });
});
