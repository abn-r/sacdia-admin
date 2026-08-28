/**
 * Integration tests for CertificationTreeEditor.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Bespoke client-side editor for the modules → sections → components tree
 * (full replacement on save, matching PATCH .../tree). `replaceCertificationTree`
 * from `@/lib/api/certifications` is mocked at module boundary.
 *
 * Ordering uses plain up/down buttons (no drag-and-drop dependency in this
 * repo). Component type selection defaults to TEXT_RESPONSE and is not
 * changed via the Radix Select dropdown in these tests (see
 * certification-eligibility-rules-editor.test.tsx for rationale).
 *
 * Vitest uses `globals: false` — explicit `cleanup()` per `afterEach`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminCertificationModule } from "@/lib/api/certifications";

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockReplaceCertificationTree = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("@/lib/api/certifications", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/certifications")>();
  return {
    ...original,
    replaceCertificationTree: (...args: unknown[]) => mockReplaceCertificationTree(...args),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

import { CertificationTreeEditor } from "@/components/certifications/certification-tree-editor";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderEditor(opts: {
  modules?: AdminCertificationModule[];
  readOnly?: boolean;
  onSaved?: ReturnType<typeof vi.fn>;
} = {}) {
  const { modules = [], readOnly = false, onSaved = vi.fn() } = opts;

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CertificationTreeEditor
        certificationId={1}
        versionId={2}
        modules={modules}
        readOnly={readOnly}
        onSaved={onSaved}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onSaved };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CertificationTreeEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplaceCertificationTree.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows empty state when there are no modules", () => {
    renderEditor();

    expect(screen.getByText(/sin módulos todavía/i)).toBeInTheDocument();
  });

  it("adds an empty module row when clicking 'Agregar módulo'", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /agregar módulo/i }));

    expect(screen.getByLabelText(/nombre del módulo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del módulo/i)).toHaveValue("");
  });

  it("shows a validation error and does not save when a module has no name", async () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /agregar módulo/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^guardar estructura$/i }));
    });

    expect(mockToastError).toHaveBeenCalled();
    expect(mockReplaceCertificationTree).not.toHaveBeenCalled();
  });

  it("builds and saves the full nested payload for a module/section/component", async () => {
    const onSaved = vi.fn();
    mockReplaceCertificationTree.mockResolvedValue([{ module_id: 1, name: "Módulo 1", certification_sections: [] }]);

    renderEditor({ onSaved });

    fireEvent.click(screen.getByRole("button", { name: /agregar módulo/i }));
    fireEvent.change(screen.getByLabelText(/nombre del módulo/i), {
      target: { value: "Módulo 1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /agregar sección/i }));
    fireEvent.change(screen.getByLabelText(/nombre de la sección/i), {
      target: { value: "Sección A" },
    });

    fireEvent.click(screen.getByRole("button", { name: /agregar componente/i }));
    fireEvent.change(screen.getByLabelText(/etiqueta/i), {
      target: { value: "Responde tu experiencia" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^guardar estructura$/i }));
    });

    await waitFor(() => {
      expect(mockReplaceCertificationTree).toHaveBeenCalledWith(1, 2, [
        {
          name: "Módulo 1",
          description: undefined,
          sort_order: 0,
          sections: [
            {
              name: "Sección A",
              description: undefined,
              instructions: undefined,
              required: true,
              sort_order: 0,
              components: [
                {
                  component_type: "TEXT_RESPONSE",
                  label: "Responde tu experiencia",
                  instructions: undefined,
                  required: true,
                  sort_order: 0,
                  configuration: {},
                  honor_id: undefined,
                  activity_type_id: undefined,
                },
              ],
            },
          ],
        },
      ]);
    });

    expect(mockToastSuccess).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it("removes a module when clicking its remove button", () => {
    renderEditor({
      modules: [
        {
          name: "Módulo existente",
          certification_sections: [],
        },
      ],
    });

    expect(screen.getByDisplayValue("Módulo existente")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

    expect(screen.getByText(/sin módulos todavía/i)).toBeInTheDocument();
  });

  it("hides mutation controls and disables inputs when readOnly is true", () => {
    renderEditor({
      modules: [{ name: "Módulo existente", certification_sections: [] }],
      readOnly: true,
    });

    expect(screen.queryByRole("button", { name: /agregar módulo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^guardar estructura$/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del módulo/i)).toBeDisabled();
  });
});
