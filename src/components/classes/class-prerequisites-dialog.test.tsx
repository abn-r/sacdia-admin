/**
 * Integration tests for ClassPrerequisitesDialog.
 *
 * Mirrors ClassHonorsDialog.test.tsx: initial data comes from props, mutations
 * hit the class-prerequisites API client (mocked here), and local state is
 * updated on success.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
  within,
} from "@testing-library/react";
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

const mockCreateClassPrerequisite = vi.fn();
const mockDeleteClassPrerequisite = vi.fn();

vi.mock("@/lib/api/class-prerequisites", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/class-prerequisites")>();
  return {
    ...original,
    createClassPrerequisite: (...args: unknown[]) => mockCreateClassPrerequisite(...args),
    deleteClassPrerequisite: (...args: unknown[]) => mockDeleteClassPrerequisite(...args),
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

import {
  ClassPrerequisitesDialog,
  type ClassPrerequisiteOption,
} from "@/components/classes/class-prerequisites-dialog";
import type { ClassPrerequisiteRelation } from "@/lib/api/class-prerequisites";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AMIGO_PREREQUISITE: ClassPrerequisiteRelation = {
  class_prerequisite_id: 1,
  class_id: 30,
  prerequisite_class_id: 10,
  active: true,
  prerequisite: { class_id: 10, name: "Amigo", active: true },
};

const CLASS_OPTIONS: ClassPrerequisiteOption[] = [
  { class_id: 10, name: "Amigo" },
  { class_id: 20, name: "Compañero" },
  { class_id: 30, name: "Explorador" },
];

const NEW_PREREQUISITE: ClassPrerequisiteRelation = {
  class_prerequisite_id: 2,
  class_id: 30,
  prerequisite_class_id: 20,
  active: true,
  prerequisite: { class_id: 20, name: "Compañero", active: true },
};

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof ClassPrerequisitesDialog>> = {},
) {
  const props: React.ComponentProps<typeof ClassPrerequisitesDialog> = {
    classId: 30,
    initialPrerequisites: [AMIGO_PREREQUISITE],
    classOptions: CLASS_OPTIONS,
    canCreate: true,
    canDelete: true,
    ...overrides,
  };
  return render(<ClassPrerequisitesDialog {...props} />);
}

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: /prerrequisitos/i }));
}

describe("ClassPrerequisitesDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a badge with the initial prerequisite count on the trigger button", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: /prerrequisitos/i })).toHaveTextContent("1");
  });

  it("renders the current prerequisites list", async () => {
    renderDialog();
    await openDialog();

    expect(screen.getByText("Prerrequisitos de la clase")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("class-prerequisites-list")).getByText("Amigo"),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no prerequisites", async () => {
    renderDialog({ initialPrerequisites: [] });
    await openDialog();

    expect(
      screen.getByText("Esta clase no tiene prerrequisitos configurados."),
    ).toBeInTheDocument();
  });

  it("excludes the class itself and already-added prerequisites from the combobox options", async () => {
    renderDialog();
    await openDialog();

    const [classTrigger] = screen.getAllByRole("combobox");
    await userEvent.click(classTrigger);

    expect(screen.queryByRole("option", { name: "Amigo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Explorador" })).not.toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Compañero" })).toBeInTheDocument();
  });

  it("hides the create form and delete buttons without permissions", async () => {
    renderDialog({ canCreate: false, canDelete: false });
    await openDialog();

    expect(screen.queryByLabelText("Clase prerrequisito")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar amigo/i })).not.toBeInTheDocument();
  });

  it("adds a new prerequisite and shows it in the list", async () => {
    mockCreateClassPrerequisite.mockResolvedValue(NEW_PREREQUISITE);
    renderDialog();
    await openDialog();

    const [classTrigger] = screen.getAllByRole("combobox");
    await userEvent.click(classTrigger);
    const option = await screen.findByRole("option", { name: "Compañero" });
    await userEvent.click(option);

    await userEvent.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(mockCreateClassPrerequisite).toHaveBeenCalledWith(30, {
        prerequisite_class_id: 20,
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("Prerrequisito agregado a la clase.");
    await waitFor(() => {
      expect(
        within(screen.getByTestId("class-prerequisites-list")).getByText("Compañero"),
      ).toBeInTheDocument();
    });
  });

  it("shows a friendly message when the backend reports a prerequisite cycle", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mockCreateClassPrerequisite.mockRejectedValue(
      new ApiError("ADMIN_CLASS_PREREQUISITE_CYCLE", 400, {
        code: "ADMIN_CLASS_PREREQUISITE_CYCLE",
      }),
    );
    renderDialog();
    await openDialog();

    const [classTrigger] = screen.getAllByRole("combobox");
    await userEvent.click(classTrigger);
    const option = await screen.findByRole("option", { name: "Compañero" });
    await userEvent.click(option);

    await userEvent.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Crearía un ciclo de prerrequisitos entre clases.",
      );
    });
  });

  it("deletes a prerequisite after confirming", async () => {
    mockDeleteClassPrerequisite.mockResolvedValue({ ...AMIGO_PREREQUISITE, active: false });
    renderDialog();
    await openDialog();

    await userEvent.click(screen.getByRole("button", { name: /eliminar amigo/i }));
    expect(screen.getByText("Eliminar prerrequisito")).toBeInTheDocument();

    const dialogs = screen.getAllByRole("alertdialog");
    const confirmButton = within(dialogs[dialogs.length - 1]).getByRole("button", {
      name: "Eliminar",
    });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockDeleteClassPrerequisite).toHaveBeenCalledWith(30, 1);
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Prerrequisito eliminado de la clase.");
    await waitFor(() => {
      expect(
        screen.getByText("Esta clase no tiene prerrequisitos configurados."),
      ).toBeInTheDocument();
    });
  });
});
