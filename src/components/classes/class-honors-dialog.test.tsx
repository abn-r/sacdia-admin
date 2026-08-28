/**
 * Integration tests for ClassHonorsDialog.
 *
 * The dialog receives initial data as props (fetched server-side by the class
 * detail page) and performs mutations directly against the class-honors API
 * client, updating local state on success — no next-intl dependency, no
 * network fetch-on-mount to mock.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// jsdom polyfills (Radix Dialog/Select use ResizeObserver, scrollIntoView,
// and pointer capture APIs not implemented in jsdom).
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockCreateClassHonor = vi.fn();
const mockDeleteClassHonor = vi.fn();
const mockUpdateClassHonor = vi.fn();

vi.mock("@/lib/api/class-honors", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/class-honors")>();
  return {
    ...original,
    createClassHonor: (...args: unknown[]) => mockCreateClassHonor(...args),
    deleteClassHonor: (...args: unknown[]) => mockDeleteClassHonor(...args),
    updateClassHonor: (...args: unknown[]) => mockUpdateClassHonor(...args),
  };
});

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

import { ClassHonorsDialog, type ClassHonorOption } from "@/components/classes/class-honors-dialog";
import type { ClassHonorRelation } from "@/lib/api/class-honors";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const REQUIRED_RELATION: ClassHonorRelation = {
  class_honor_id: 1,
  class_id: 10,
  honor_id: 100,
  relation_type: "REQUIRED",
  active: true,
  honor: {
    honor_id: 100,
    name: "Primeros auxilios",
    honor_image: null,
    honors_category_id: 1,
    skill_level: 1,
  },
};

const RECOMMENDED_RELATION: ClassHonorRelation = {
  class_honor_id: 2,
  class_id: 10,
  honor_id: 101,
  relation_type: "RECOMMENDED",
  active: true,
  honor: {
    honor_id: 101,
    name: "Natación",
    honor_image: null,
    honors_category_id: 2,
    skill_level: 1,
  },
};

const HONORS_CATALOG: ClassHonorOption[] = [
  { honor_id: 100, name: "Primeros auxilios" },
  { honor_id: 101, name: "Natación" },
  { honor_id: 102, name: "Astronomía" },
];

const MODULES = [
  { module_id: 12, name: "Vida al aire libre" },
  { module_id: 13, name: "Arte de acampar" },
];

const NEW_RELATION: ClassHonorRelation = {
  class_honor_id: 3,
  class_id: 10,
  honor_id: 102,
  relation_type: "ELECTIVE",
  active: true,
  honor: {
    honor_id: 102,
    name: "Astronomía",
    honor_image: null,
    honors_category_id: 3,
    skill_level: 1,
  },
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof ClassHonorsDialog>> = {}) {
  const props: React.ComponentProps<typeof ClassHonorsDialog> = {
    classId: 10,
    initialRelations: [REQUIRED_RELATION, RECOMMENDED_RELATION],
    honorsCatalog: HONORS_CATALOG,
    modules: MODULES,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    ...overrides,
  };
  return render(<ClassHonorsDialog {...props} />);
}

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: /especialidades/i }));
}

describe("ClassHonorsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a badge with the initial relation count on the trigger button", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: /especialidades/i })).toHaveTextContent("2");
  });

  it("renders relations grouped by relation type with badges", async () => {
    renderDialog();
    await openDialog();

    expect(screen.getByText("Especialidades relacionadas")).toBeInTheDocument();
    const list = within(screen.getByTestId("class-honors-list"));
    expect(list.getByText("Requerida")).toBeInTheDocument();
    expect(list.getByText("Recomendada")).toBeInTheDocument();
    expect(list.getByText("Primeros auxilios")).toBeInTheDocument();
    expect(list.getByText("Natación")).toBeInTheDocument();
  });

  it("shows the empty state when there are no relations", async () => {
    renderDialog({ initialRelations: [] });
    await openDialog();

    expect(
      screen.getByText("Esta clase no tiene especialidades relacionadas."),
    ).toBeInTheDocument();
  });

  it("hides the create form and delete buttons without permissions", async () => {
    renderDialog({ canCreate: false, canUpdate: false, canDelete: false });
    await openDialog();

    expect(screen.queryByLabelText("Especialidad")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar primeros auxilios/i })).not.toBeInTheDocument();
  });

  it("adds a new honor relation and shows it in the list", async () => {
    mockCreateClassHonor.mockResolvedValue(NEW_RELATION);
    renderDialog();
    await openDialog();

    const honorTrigger = screen.getByLabelText("Especialidad");
    const relationTrigger = screen.getByLabelText("Tipo de relación");

    await userEvent.click(honorTrigger);
    const honorOption = await screen.findByRole("option", { name: "Astronomía" });
    await userEvent.click(honorOption);

    await userEvent.click(relationTrigger);
    const relationOption = await screen.findByRole("option", { name: "Electiva" });
    await userEvent.click(relationOption);

    await userEvent.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(mockCreateClassHonor).toHaveBeenCalledWith(10, {
        honor_id: 102,
        relation_type: "ELECTIVE",
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("Especialidad agregada a la clase.");
    await waitFor(() => {
      expect(
        within(screen.getByTestId("class-honors-list")).getByText("Astronomía"),
      ).toBeInTheDocument();
    });
  });

  it("shows a friendly message when the backend reports a duplicate relation", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mockCreateClassHonor.mockRejectedValue(
      new ApiError("ADMIN_CLASS_HONOR_DUPLICATE", 409, { code: "ADMIN_CLASS_HONOR_DUPLICATE" }),
    );
    renderDialog();
    await openDialog();

    const honorTrigger = screen.getByLabelText("Especialidad");
    await userEvent.click(honorTrigger);
    const honorOption = await screen.findByRole("option", { name: "Astronomía" });
    await userEvent.click(honorOption);

    await userEvent.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Esta especialidad ya está asociada a la clase con ese tipo de relación.",
      );
    });
  });

  it("deletes a relation after confirming", async () => {
    mockDeleteClassHonor.mockResolvedValue({ ...REQUIRED_RELATION, active: false });
    renderDialog();
    await openDialog();

    await userEvent.click(screen.getByRole("button", { name: /eliminar primeros auxilios/i }));
    expect(screen.getByText("Eliminar especialidad")).toBeInTheDocument();

    const dialogs = screen.getAllByRole("alertdialog");
    const confirmButton = within(dialogs[dialogs.length - 1]).getByRole("button", {
      name: "Eliminar",
    });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockDeleteClassHonor).toHaveBeenCalledWith(10, 1);
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Especialidad eliminada de la clase.");
    await waitFor(() => {
      expect(
        within(screen.getByTestId("class-honors-list")).queryByText("Primeros auxilios"),
      ).not.toBeInTheDocument();
    });
  });

  it("creates a relation assigned to a module", async () => {
    mockCreateClassHonor.mockResolvedValue({
      ...NEW_RELATION,
      module_id: 12,
      module: { module_id: 12, name: "Vida al aire libre" },
    });
    renderDialog();
    await openDialog();

    await userEvent.click(screen.getByLabelText("Especialidad"));
    await userEvent.click(await screen.findByRole("option", { name: "Astronomía" }));

    await userEvent.click(screen.getByLabelText("Módulo"));
    await userEvent.click(await screen.findByRole("option", { name: "Vida al aire libre" }));

    await userEvent.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(mockCreateClassHonor).toHaveBeenCalledWith(10, {
        honor_id: 102,
        relation_type: "RECOMMENDED",
        module_id: 12,
      });
    });
  });

  it("reassigns an existing relation to a module", async () => {
    mockUpdateClassHonor.mockResolvedValue({
      ...REQUIRED_RELATION,
      module_id: 13,
      module: { module_id: 13, name: "Arte de acampar" },
    });
    renderDialog();
    await openDialog();

    await userEvent.click(screen.getByLabelText("Módulo de Primeros auxilios"));
    await userEvent.click(await screen.findByRole("option", { name: "Arte de acampar" }));

    await waitFor(() => {
      expect(mockUpdateClassHonor).toHaveBeenCalledWith(10, 1, { module_id: 13 });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Módulo actualizado.");
  });
});
