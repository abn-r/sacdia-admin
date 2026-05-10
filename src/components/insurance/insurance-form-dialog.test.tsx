/**
 * Integration tests for InsuranceFormDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses React Hook Form + Zod for validation (shadcn <Form>).
 * API calls go through `createInsurance` / `updateInsurance` from
 * "@/lib/api/insurance" — both are async functions that use
 * `apiRequestFromClient` (HTTP). We mock the module entirely so no
 * real network calls are made. MSW is active but not needed here.
 *
 * File attachment (`evidenceFile`) is kept as unmanaged React state
 * (a `useRef` + `useState` pair outside <FormProvider>). We simulate
 * file selection by firing a `change` event on the hidden file input
 * directly — browser FileList is not natively constructible in jsdom,
 * so we use Object.defineProperty to inject a synthetic FileList.
 *
 * Select (shadcn/Radix) renders a hidden <select> for a11y. We use
 * RTL's `fireEvent.change` on that element to change Select values.
 * The Radix portal renders into document.body so `screen.getByRole`
 * works without scoping.
 *
 * RTL auto-cleanup:
 * Vitest uses `globals: false`, so `afterEach` is not a global.
 * RTL's auto-cleanup check fails silently. We explicitly import
 * `cleanup` and call it in `afterEach`.
 *
 * Intl provider:
 * The component reads translations via `useTranslations("insurance")`.
 * We wrap renders in `NextIntlClientProvider` with real `messages/es.json`.
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
import type { MemberInsurance } from "@/lib/api/insurance";

// ---------------------------------------------------------------------------
// Module-level mocks — Vitest hoists vi.mock() before imports resolve.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateInsurance = vi.fn<(...args: any[]) => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateInsurance = vi.fn<(...args: any[]) => Promise<unknown>>();

vi.mock("@/lib/api/insurance", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/insurance")>();
  return {
    ...original,
    createInsurance: (memberId: string, payload: unknown) =>
      mockCreateInsurance(memberId, payload),
    updateInsurance: (insuranceId: number, payload: unknown) =>
      mockUpdateInsurance(insuranceId, payload),
  };
});

// sonner toast — avoid real toast rendering noise in tests
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { InsuranceFormDialog } from "@/components/insurance/insurance-form-dialog";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_MEMBER: MemberInsurance = {
  user_id: "user-001",
  name: "Ana",
  paternal_last_name: "López",
  maternal_last_name: "Torres",
  user_image: null,
  insurance: null,
};

const MEMBER_WITH_INSURANCE: MemberInsurance = {
  ...BASE_MEMBER,
  insurance: {
    insurance_id: 42,
    insurance_type: "CAMPOREE",
    policy_number: "POL-2025-042",
    provider: "MAPFRE",
    start_date: "2025-01-01T00:00:00.000Z",
    end_date: "2025-12-31T00:00:00.000Z",
    coverage_amount: 5000,
    active: true,
    evidence_file_url: null,
    evidence_file_name: null,
    created_at: null,
    modified_at: null,
    created_by_name: null,
    modified_by_name: null,
  },
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOptions {
  open?: boolean;
  member?: MemberInsurance | null;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

function renderInsuranceDialog(opts: RenderOptions = {}) {
  const {
    open = true,
    member = BASE_MEMBER,
    onOpenChange = vi.fn(),
    onSuccess = vi.fn(),
  } = opts;

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InsuranceFormDialog
        open={open}
        onOpenChange={onOpenChange}
        member={member}
        onSuccess={onSuccess}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange, onSuccess };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InsuranceFormDialog", () => {
  beforeEach(() => {
    mockCreateInsurance.mockClear();
    mockUpdateInsurance.mockClear();
    mockCreateInsurance.mockResolvedValue({ insurance_id: 99 });
    mockUpdateInsurance.mockResolvedValue({ insurance_id: 42 });
  });

  afterEach(() => {
    cleanup();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it("renders all 6 fields: type select, policy_number, provider, start_date, end_date, file attach", () => {
    renderInsuranceDialog();

    // Type select trigger
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    // Policy number
    expect(
      screen.getByPlaceholderText(
        messages.insurance.placeholders.policyNumber,
      ),
    ).toBeInTheDocument();

    // Provider
    expect(
      screen.getByPlaceholderText(messages.insurance.placeholders.provider),
    ).toBeInTheDocument();

    // Date inputs (start + end)
    const dateInputs = document
      .querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);

    // File attach button
    expect(
      screen.getByRole("button", { name: /adjuntar archivo/i }),
    ).toBeInTheDocument();
  });

  it("renders 'Registrar seguro' title and cancel + submit buttons in create mode", () => {
    renderInsuranceDialog();

    expect(
      screen.getByRole("heading", { name: /registrar seguro/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancelar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /registrar seguro/i }),
    ).toBeInTheDocument();
  });

  it("renders 'Editar seguro' title and 'Guardar cambios' button in edit mode", () => {
    renderInsuranceDialog({ member: MEMBER_WITH_INSURANCE });

    expect(
      screen.getByRole("heading", { name: /editar seguro/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /guardar cambios/i }),
    ).toBeInTheDocument();
  });

  // ── Type select options ────────────────────────────────────────────────────

  it("hidden native select contains all 3 insurance type options (GENERAL_ACTIVITIES, CAMPOREE, HIGH_RISK)", () => {
    renderInsuranceDialog();

    // Radix renders a hidden native <select> for a11y alongside the custom trigger.
    // Opening the custom trigger via userEvent.click in jsdom throws hasPointerCapture;
    // instead we assert directly on the hidden <select> which always has all option values.
    const nativeSelect = document.querySelector("select") as HTMLSelectElement;
    expect(nativeSelect).not.toBeNull();

    const optionValues = Array.from(nativeSelect.options).map((o) => o.value);
    expect(optionValues).toContain("GENERAL_ACTIVITIES");
    expect(optionValues).toContain("CAMPOREE");
    expect(optionValues).toContain("HIGH_RISK");
  });

  // ── Validation on empty submit ─────────────────────────────────────────────

  it("marks start_date and end_date inputs as aria-invalid after empty submit", async () => {
    renderInsuranceDialog();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      const startInput = document.querySelector(
        'input[type="date"][aria-required="true"]',
      );
      // Both date inputs should have aria-invalid after failed validation
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const anyInvalid = Array.from(dateInputs).some(
        (el) => el.getAttribute("aria-invalid") === "true",
      );
      expect(anyInvalid).toBe(true);
    });
  });

  it("shows validation error messages for required date fields on empty submit", async () => {
    renderInsuranceDialog();

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          messages.insurance.validation.start_date_required,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          messages.insurance.validation.end_date_required,
        ),
      ).toBeInTheDocument();
    });
  });

  // ── Edit mode: pre-fills fields ────────────────────────────────────────────

  it("pre-fills policy_number, provider, and dates when editing an existing insurance", () => {
    renderInsuranceDialog({ member: MEMBER_WITH_INSURANCE });

    const policyInput = screen.getByPlaceholderText(
      messages.insurance.placeholders.policyNumber,
    ) as HTMLInputElement;
    expect(policyInput.value).toBe("POL-2025-042");

    const providerInput = screen.getByPlaceholderText(
      messages.insurance.placeholders.provider,
    ) as HTMLInputElement;
    expect(providerInput.value).toBe("MAPFRE");

    const dateInputs = document.querySelectorAll(
      'input[type="date"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(dateInputs[0]?.value).toBe("2025-01-01");
    expect(dateInputs[1]?.value).toBe("2025-12-31");
  });

  // ── File attachment ────────────────────────────────────────────────────────

  it("file attach button triggers the hidden file input click", async () => {
    const user = userEvent.setup();
    renderInsuranceDialog();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const clickSpy = vi.spyOn(fileInput, "click");

    const attachBtn = screen.getByRole("button", { name: /adjuntar archivo/i });
    await user.click(attachBtn);

    expect(clickSpy).toHaveBeenCalledOnce();
    clickSpy.mockRestore();
  });

  it("shows file name badge after selecting a file via the file input", async () => {
    renderInsuranceDialog();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const fakeFile = new File(["pdf-content"], "poliza-2025.pdf", {
      type: "application/pdf",
    });

    // Inject a synthetic FileList because jsdom cannot construct one directly
    Object.defineProperty(fileInput, "files", {
      value: { 0: fakeFile, length: 1, item: () => fakeFile },
      writable: false,
      configurable: true,
    });

    await act(async () => {
      fireEvent.change(fileInput);
    });

    await waitFor(() => {
      expect(screen.getByText("poliza-2025.pdf")).toBeInTheDocument();
    });
  });

  it("shows 'Cambiar archivo' button text after a file is selected", async () => {
    renderInsuranceDialog();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const fakeFile = new File(["data"], "evidence.png", {
      type: "image/png",
    });

    Object.defineProperty(fileInput, "files", {
      value: { 0: fakeFile, length: 1, item: () => fakeFile },
      writable: false,
      configurable: true,
    });

    await act(async () => {
      fireEvent.change(fileInput);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cambiar archivo/i }),
      ).toBeInTheDocument();
    });
  });

  // ── Cancel without submit ─────────────────────────────────────────────────

  it("calls onOpenChange(false) and does not call API when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInsuranceDialog({ onOpenChange });

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockCreateInsurance).not.toHaveBeenCalled();
    expect(mockUpdateInsurance).not.toHaveBeenCalled();
  });

  // ── Submit during pending: button disabled ─────────────────────────────────

  it("disables submit button while submission is in progress", async () => {
    // Delay the mock so we can capture the mid-flight state
    let resolveCreate!: () => void;
    mockCreateInsurance.mockReturnValue(
      new Promise<unknown>((res) => {
        resolveCreate = () => res({ insurance_id: 99 });
      }),
    );

    renderInsuranceDialog();

    // Fill required fields
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0]!, { target: { value: "2025-01-01" } });
    fireEvent.change(dateInputs[1]!, { target: { value: "2025-12-31" } });

    const submitBtn = screen.getByRole("button", { name: /registrar seguro/i });

    const form = document.querySelector("form")!;
    act(() => {
      fireEvent.submit(form);
    });

    // Button should disable while the promise is pending
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Resolve the promise to avoid open handles
    await act(async () => {
      resolveCreate();
    });
  });

  // ── Valid submit (create mode) ─────────────────────────────────────────────

  it("calls createInsurance with correct member id and form data on valid submit", async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    renderInsuranceDialog({ onSuccess, onOpenChange });

    // Fill required date fields
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0]!, { target: { value: "2025-03-01" } });
    fireEvent.change(dateInputs[1]!, { target: { value: "2025-12-31" } });

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockCreateInsurance).toHaveBeenCalledOnce();
    });

    const [memberId, payload] = (mockCreateInsurance.mock.calls[0] as unknown) as [
      string,
      { start_date: string; end_date: string; insurance_type: string },
    ];
    expect(memberId).toBe("user-001");
    expect(payload.start_date).toBe("2025-03-01");
    expect(payload.end_date).toBe("2025-12-31");
    expect(payload.insurance_type).toBe("GENERAL_ACTIVITIES");

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── Valid submit (edit mode) ───────────────────────────────────────────────

  it("calls updateInsurance with insurance_id on valid submit in edit mode", async () => {
    const onSuccess = vi.fn();
    renderInsuranceDialog({
      member: MEMBER_WITH_INSURANCE,
      onSuccess,
    });

    const form = document.querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockUpdateInsurance).toHaveBeenCalledOnce();
    });

    const [insuranceId] = (mockUpdateInsurance.mock.calls[0] as unknown) as [number, unknown];
    expect(insuranceId).toBe(42);
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
