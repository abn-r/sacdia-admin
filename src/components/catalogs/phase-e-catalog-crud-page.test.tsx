import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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
