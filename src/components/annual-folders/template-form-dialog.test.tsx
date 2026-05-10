/**
 * Integration tests for TemplateFormDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form + Zod (schema built with buildSchema factory).
 * On open it fetches listUnions() + listLocalFields() via Promise.all
 * (not RHF, not useQuery — plain useState + useEffect).
 *
 * Two modes:
 *   - Create: no `template` prop — calls createTemplate
 *   - Edit:   `template` prop provided — calls updateTemplate, pre-fills form
 *
 * Radix Selects for club_type_id, ecclesiastical_year_id, owner_union_id,
 * owner_local_field_id are driven by setValue (not register).
 * RadioGroup for owner_tier is controlled by Controller.
 *
 * We mock:
 *   - @/lib/api/annual-folders (createTemplate, updateTemplate)
 *   - @/lib/api/geography (listUnions, listLocalFields)
 *   - sonner (toast)
 *
 * Props pass clubTypes + ecclesiasticalYears as arrays (no fetch for those).
 *
 * Vitest uses `globals: false` — explicit `cleanup()` per `afterEach`.
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
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { FolderTemplate } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ---------------------------------------------------------------------------
// jsdom polyfills (Radix Dialog uses ResizeObserver + scrollIntoView)
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateTemplate = vi.fn<(...args: any[]) => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateTemplate = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/annual-folders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/annual-folders")>();
  return {
    ...original,
    createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
    updateTemplate: (...args: unknown[]) => mockUpdateTemplate(...args),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListUnions = vi.fn<() => Promise<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListLocalFields = vi.fn<() => Promise<any>>();

vi.mock("@/lib/api/geography", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/geography")>();
  return {
    ...original,
    listUnions: () => mockListUnions(),
    listLocalFields: () => mockListLocalFields(),
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

import { TemplateFormDialog } from "@/components/annual-folders/template-form-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STUB_CLUB_TYPES: ClubType[] = [
  { club_type_id: 1, name: "Conquistadores" },
  { club_type_id: 2, name: "Aventureros" },
];

const STUB_YEARS: EcclesiasticalYear[] = [
  {
    ecclesiastical_year_id: 10,
    name: "2026",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    active: true,
  },
  {
    ecclesiastical_year_id: 9,
    name: "2025",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    active: false,
  },
];

const STUB_UNIONS = [
  { union_id: 1, name: "Unión Norte", country_id: 1 },
  { union_id: 2, name: "Unión Sur", country_id: 1 },
];

const STUB_LOCAL_FIELDS = [
  { local_field_id: 100, name: "Campo Central", union_id: 1 },
  { local_field_id: 101, name: "Campo Oeste", union_id: 1 },
];

const STUB_TEMPLATE: FolderTemplate = {
  template_id: "tmpl-001",
  name: "Plantilla Conquistadores 2026",
  club_type_id: 1,
  ecclesiastical_year_id: 10,
  active: true,
  minimum_points: 80,
  closing_date: null,
  created_at: null,
  owner_union_id: 1,
  owner_local_field_id: null,
};

const t = messages.annual_folders;

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  template?: FolderTemplate | null;
  clubTypes?: ClubType[];
  ecclesiasticalYears?: EcclesiasticalYear[];
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    template = null,
    clubTypes = STUB_CLUB_TYPES,
    ecclesiasticalYears = STUB_YEARS,
  } = opts;
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TemplateFormDialog
        open={open}
        onOpenChange={onOpenChange}
        clubTypes={clubTypes}
        ecclesiasticalYears={ecclesiasticalYears}
        template={template}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
}

async function submitForm() {
  const form = document.querySelector("form")!;
  await act(async () => {
    fireEvent.submit(form);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TemplateFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTemplate.mockResolvedValue({ template_id: "new-tmpl" });
    mockUpdateTemplate.mockResolvedValue({ template_id: "tmpl-001" });
    mockListUnions.mockResolvedValue(STUB_UNIONS);
    mockListLocalFields.mockResolvedValue(STUB_LOCAL_FIELDS);
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Create mode — renders create title ────────────────────────────────

  it("renders create mode title and name input when no template prop", async () => {
    renderDialog();

    // Wait for geography catalogs to load
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: t.templateDialog.titleCreate }),
      ).toBeInTheDocument();
    });

    expect(document.querySelector('input[name="name"]')).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t.templateDialog.submitCreate }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t.templateDialog.cancel }),
    ).toBeInTheDocument();
  });

  // ── 2. Edit mode — renders edit title and pre-fills name ─────────────────

  it("renders edit mode title and pre-fills name from template prop", async () => {
    renderDialog({ template: STUB_TEMPLATE });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: t.templateDialog.titleEdit }),
      ).toBeInTheDocument();
    });

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement | null;
    expect(nameInput?.value).toBe("Plantilla Conquistadores 2026");

    expect(
      screen.getByRole("button", { name: t.templateDialog.submitEdit }),
    ).toBeInTheDocument();
  });

  // ── 3. Geography catalogs loaded on open ────────────────────────────────

  it("calls listUnions and listLocalFields when dialog opens", async () => {
    renderDialog();

    await waitFor(() => {
      expect(mockListUnions).toHaveBeenCalledOnce();
      expect(mockListLocalFields).toHaveBeenCalledOnce();
    });
  });

  // ── 4. Validation — name too short ───────────────────────────────────────

  it("shows name validation error when name is too short on submit", async () => {
    renderDialog();

    await waitFor(() => expect(mockListUnions).toHaveBeenCalled());

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "AB" } });
    });

    await submitForm();

    await waitFor(() => {
      // name_min: "El nombre debe tener al menos {min} caracteres" (min=3)
      expect(screen.getByText(/nombre debe tener al menos/i)).toBeInTheDocument();
    });

    expect(mockCreateTemplate).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — create template ──────────────────────────────────────

  it("calls createTemplate with correct payload and shows success toast", async () => {
    const { onOpenChange, onSuccess } = renderDialog();

    await waitFor(() => expect(mockListUnions).toHaveBeenCalled());

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Mi Plantilla Nueva" } });
    });

    // Set owner_union_id via native select (Radix hidden select)
    // The dialog defaults to owner_tier="union". Select union via Radix hidden native select.
    const selects = document.querySelectorAll("select");
    // selects[0] = club_type, selects[1] = ecclesiastical_year, selects[2] = owner_union
    if (selects[2]) {
      await act(async () => {
        fireEvent.change(selects[2], { target: { value: "1" } });
      });
    }

    await submitForm();

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledOnce();
    });

    const [payload] = mockCreateTemplate.mock.calls[0] as [{ name: string; club_type_id: number; minimum_points: number }];
    expect(payload.name).toBe("Mi Plantilla Nueva");
    expect(payload.club_type_id).toBe(1);
    expect(payload.minimum_points).toBeGreaterThanOrEqual(0);

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.template_created);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 6. Happy path — edit template ────────────────────────────────────────

  it("calls updateTemplate (not create) in edit mode and shows update toast", async () => {
    const { onOpenChange, onSuccess } = renderDialog({ template: STUB_TEMPLATE });

    await waitFor(() => expect(mockListUnions).toHaveBeenCalled());

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Plantilla Actualizada" } });
    });

    // Ensure union select has a value (template already has owner_union_id=1)
    const selects = document.querySelectorAll("select");
    if (selects[2]) {
      await act(async () => {
        fireEvent.change(selects[2], { target: { value: "1" } });
      });
    }

    await submitForm();

    await waitFor(() => {
      expect(mockUpdateTemplate).toHaveBeenCalledOnce();
    });

    expect(mockCreateTemplate).not.toHaveBeenCalled();

    const [templateId, payload] = mockUpdateTemplate.mock.calls[0] as [
      string,
      { name: string },
    ];
    expect(templateId).toBe("tmpl-001");
    expect(payload.name).toBe("Plantilla Actualizada");

    expect(mockToastSuccess).toHaveBeenCalledWith(t.toasts.template_updated);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── 7. Cancel button calls onOpenChange(false) without API call ──────────

  it("calls onOpenChange(false) without calling API when cancel clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await waitFor(() => expect(mockListUnions).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: t.templateDialog.cancel }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateTemplate).not.toHaveBeenCalled();
    expect(mockUpdateTemplate).not.toHaveBeenCalled();
  });

  // ── 8. API error — shows server error message ─────────────────────────────

  it("shows error toast with server message when createTemplate throws Error", async () => {
    mockCreateTemplate.mockRejectedValue(new Error("Duplicate template name"));

    renderDialog();

    await waitFor(() => expect(mockListUnions).toHaveBeenCalled());

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Nombre Válido Test" } });
    });

    const selects = document.querySelectorAll("select");
    if (selects[2]) {
      await act(async () => {
        fireEvent.change(selects[2], { target: { value: "1" } });
      });
    }

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Duplicate template name");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 9. API error — fallback translated message for non-Error ─────────────

  it("shows fallback translated error when createTemplate throws non-Error value", async () => {
    mockCreateTemplate.mockRejectedValue("unexpected string");

    renderDialog();

    await waitFor(() => expect(mockListUnions).toHaveBeenCalled());

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Nombre Válido Test" } });
    });

    const selects = document.querySelectorAll("select");
    if (selects[2]) {
      await act(async () => {
        fireEvent.change(selects[2], { target: { value: "1" } });
      });
    }

    await submitForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.save_template_failed);
    });
  });

  // ── 10. minimum_points input exists and is settable ──────────────────────

  it("renders minimum_points input and accepts numeric input", async () => {
    renderDialog();

    await waitFor(() => expect(mockListUnions).toHaveBeenCalled());

    const minPointsInput = document.querySelector(
      'input[name="minimum_points"]',
    ) as HTMLInputElement | null;
    expect(minPointsInput).toBeInTheDocument();

    await act(async () => {
      if (minPointsInput) fireEvent.change(minPointsInput, { target: { value: "50" } });
    });

    expect(minPointsInput?.value).toBe("50");
  });
});
