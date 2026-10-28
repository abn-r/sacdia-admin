import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { PhaseEActionState } from "@/lib/phase-e-catalogs/actions";
import messages from "../../../messages/es.json";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mocks.refresh }),
  usePathname: () => "/dashboard/catalogs/finance-categories",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import {
  PhaseECatalogCrudPage,
  type PhaseECatalogCrudPageProps,
} from "@/components/catalogs/phase-e-catalog-crud-page";

const typeField = {
  name: "type",
  label: "Tipo",
  placeholder: "Selecciona un tipo",
  options: [
    { value: "0", label: "Ingreso" },
    { value: "1", label: "Egreso" },
  ],
};

function renderPage(overrides: Partial<PhaseECatalogCrudPageProps> = {}) {
  const props: PhaseECatalogCrudPageProps = {
    title: "Categorías de finanzas",
    entityLabel: "Categoría",
    emptyIcon: null,
    includeDescription: false,
    idField: "finance_category_id",
    nameField: "name",
    items: [
      { finance_category_id: 1, name: "Diezmos", type: 0, active: true },
      { finance_category_id: 2, name: "Materiales", type: 1, active: true },
    ],
    meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    canCreate: true,
    canEdit: true,
    canDelete: true,
    createAction: vi.fn(async () => ({})),
    updateAction: vi.fn(async () => ({})),
    deleteAction: vi.fn(async () => ({})),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PhaseECatalogCrudPage {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("PhaseECatalogCrudPage - type field", () => {
  it("shows the type of every category in the list, including income (0)", () => {
    renderPage({ typeField });
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("Ingreso")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Egreso")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tipo" })).toBeInTheDocument();
  });

  it("requires a type in the create form and submits it", async () => {
    const createAction = vi.fn(async (_prev: PhaseEActionState, _data: FormData) => ({}) as PhaseEActionState);
    renderPage({ typeField, createAction });
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: /crear categor/i })[0]!);
    const dialog = await screen.findByRole("dialog");
    const select = within(dialog).getByLabelText(/^Tipo/);
    expect(select).toBeRequired();
    await user.selectOptions(select, "1");
    await user.type(within(dialog).getByLabelText(/^Nombre/), "Transporte");
    await user.click(
      within(dialog).getByRole("button", { name: messages.catalogs.phaseE.createSubmit }),
    );

    expect(createAction).toHaveBeenCalledTimes(1);
    const formData = createAction.mock.calls[0]![1];
    expect(formData.get("type")).toBe("1");
    expect(formData.get("name")).toBe("Transporte");
  });

  it("preselects the stored type when editing (income = 0)", async () => {
    renderPage({ typeField });
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: /acciones/i })[0]!);
    await user.click(await screen.findByRole("menuitem", { name: messages.catalogs.phaseE.edit }));

    const select = (await screen.findByLabelText(/^Tipo/)) as HTMLSelectElement;
    expect(select.value).toBe("0");
  });

  it("does not render a type column or field when the catalog has none", () => {
    renderPage();
    expect(screen.queryByRole("columnheader", { name: "Tipo" })).not.toBeInTheDocument();
  });
});

describe("PhaseECatalogCrudPage - dialogs", () => {
  async function openCreate(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole("button", { name: /crear categor/i })[0]!);
    return screen.findByRole("dialog");
  }

  async function openEdit(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole("button", { name: /acciones/i })[0]!);
    await user.click(await screen.findByRole("menuitem", { name: messages.catalogs.phaseE.edit }));
    return screen.findByRole("dialog");
  }

  it("uses an edit-specific description and a create description with the article", async () => {
    renderPage({ typeField });
    const user = userEvent.setup();

    const createDialog = await openCreate(user);
    expect(
      within(createDialog).getByText("Completa los campos para crear un registro de categoría."),
    ).toBeInTheDocument();
    await user.click(within(createDialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const editDialog = await openEdit(user);
    expect(
      within(editDialog).getByText("Modifica los campos del registro de categoría."),
    ).toBeInTheDocument();
    expect(within(editDialog).queryByText(/Completa los campos/)).not.toBeInTheDocument();
  });

  it("confirms a successful create with a toast and closes the dialog", async () => {
    const createAction = vi.fn(async () => ({ success: true }));
    renderPage({ typeField, createAction });
    const user = userEvent.setup();

    const dialog = await openCreate(user);
    await user.selectOptions(within(dialog).getByLabelText(/^Tipo/), "0");
    await user.type(within(dialog).getByLabelText(/^Nombre/), "Ofrendas");
    await user.click(within(dialog).getByRole("button", { name: "Crear" }));

    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        messages.catalogs.success.op_create_title,
        expect.objectContaining({ description: messages.catalogs.success.op_create_description }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("confirms a successful update with a toast and closes the dialog", async () => {
    const updateAction = vi.fn(async () => ({ success: true }));
    renderPage({ typeField, updateAction });
    const user = userEvent.setup();

    const dialog = await openEdit(user);
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        messages.catalogs.success.op_update_title,
        expect.objectContaining({ description: messages.catalogs.success.op_update_description }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("confirms a successful delete with a toast", async () => {
    const deleteAction = vi.fn(async () => ({ success: true }));
    renderPage({ typeField, deleteAction });
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: /acciones/i })[0]!);
    await user.click(await screen.findByRole("menuitem", { name: /Eliminar/ }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        messages.catalogs.success.op_delete_title,
        expect.anything(),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("keeps what the user typed when the server rejects a create", async () => {
    const createAction = vi.fn(async () => ({ error: "Ya existe una categoría con ese nombre." }));
    renderPage({ typeField, createAction });
    const user = userEvent.setup();

    const dialog = await openCreate(user);
    await user.selectOptions(within(dialog).getByLabelText(/^Tipo/), "1");
    await user.type(within(dialog).getByLabelText(/^Nombre/), "Transporte");
    await user.click(within(dialog).getByRole("button", { name: "Crear" }));

    expect(await within(dialog).findByText("Ya existe una categoría con ese nombre.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Nombre/)).toHaveValue("Transporte");
    expect(within(dialog).getByLabelText(/^Tipo/)).toHaveValue("1");
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("keeps the edited values when the server rejects an update", async () => {
    const updateAction = vi.fn(async () => ({ error: "No se pudo actualizar el registro." }));
    renderPage({ typeField, updateAction });
    const user = userEvent.setup();

    const dialog = await openEdit(user);
    const name = within(dialog).getByLabelText(/^Nombre/);
    await user.clear(name);
    await user.type(name, "Diezmos y ofrendas");
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    expect(await within(dialog).findByText("No se pudo actualizar el registro.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Nombre/)).toHaveValue("Diezmos y ofrendas");
  });

  it("does not carry a rejected attempt into the next time the create dialog opens", async () => {
    const createAction = vi.fn(async () => ({ error: "Falló." }));
    renderPage({ typeField, createAction });
    const user = userEvent.setup();

    let dialog = await openCreate(user);
    await user.selectOptions(within(dialog).getByLabelText(/^Tipo/), "1");
    await user.type(within(dialog).getByLabelText(/^Nombre/), "Transporte");
    await user.click(within(dialog).getByRole("button", { name: "Crear" }));
    await within(dialog).findByText("Falló.");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    dialog = await openCreate(user);
    expect(within(dialog).getByLabelText(/^Nombre/)).toHaveValue("");
    expect(within(dialog).getByLabelText(/^Tipo/)).toHaveValue("");
  });
});

describe("PhaseECatalogCrudPage - embedded", () => {
  it("renders its own page header (H1) by default", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Categorías de finanzas" })).toBeInTheDocument();
  });

  it("renders no heading and keeps the create button when embedded in another page", () => {
    renderPage({ embedded: true });
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText("Categorías de finanzas")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /crear categor/i }).length).toBeGreaterThan(0);
  });

  it("hides the create button when embedded without create permission", () => {
    renderPage({ embedded: true, canCreate: false });
    expect(screen.queryByRole("button", { name: /crear categor/i })).not.toBeInTheDocument();
  });
});
