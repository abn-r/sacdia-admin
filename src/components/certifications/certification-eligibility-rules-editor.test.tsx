/**
 * Integration tests for CertificationEligibilityRulesEditor.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Bespoke client-side editor for `certification_eligibility_rules` (full
 * array replacement on save, matching PATCH .../eligibility-rules).
 * `replaceEligibilityRules` from `@/lib/api/certifications` is mocked at
 * module boundary (that module internally calls `apiRequest`, so mocking
 * the typed wrapper keeps the test focused on component behavior).
 *
 * Radix Select dropdowns cannot be reliably opened via userEvent.click in
 * jsdom (hasPointerCapture is not implemented) — per existing convention in
 * this codebase (see insurance-form-dialog.test.tsx), we do not open the
 * rule-type dropdown and instead exercise the default rule type (MIN_AGE)
 * plus add/remove/save/validation behaviors.
 *
 * Vitest uses `globals: false` — explicit `cleanup()` per `afterEach`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminEligibilityRule } from "@/lib/api/certifications";

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

const mockReplaceEligibilityRules = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("@/lib/api/certifications", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/certifications")>();
  return {
    ...original,
    replaceEligibilityRules: (...args: unknown[]) => mockReplaceEligibilityRules(...args),
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

import { CertificationEligibilityRulesEditor } from "@/components/certifications/certification-eligibility-rules-editor";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderEditor(opts: {
  rules?: AdminEligibilityRule[];
  readOnly?: boolean;
  onSaved?: ReturnType<typeof vi.fn>;
} = {}) {
  const { rules = [], readOnly = false, onSaved = vi.fn() } = opts;

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CertificationEligibilityRulesEditor
        certificationId={1}
        versionId={2}
        rules={rules}
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

describe("CertificationEligibilityRulesEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplaceEligibilityRules.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows empty state when there are no rules", () => {
    renderEditor();

    expect(screen.getByText(/sin reglas de elegibilidad/i)).toBeInTheDocument();
  });

  it("renders an existing MIN_AGE rule with its configured value", () => {
    renderEditor({
      rules: [{ rule_type: "MIN_AGE", configuration: { min_age: 18 }, sort_order: 0 }],
    });

    expect(screen.getByLabelText(/edad mínima/i)).toHaveValue(18);
  });

  it("adds a new rule row with default MIN_AGE type when clicking 'Agregar regla'", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /agregar regla/i }));

    expect(screen.getByLabelText(/edad mínima/i)).toHaveValue(16);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("removes a rule when clicking the remove button", () => {
    renderEditor({
      rules: [{ rule_type: "MIN_AGE", configuration: { min_age: 18 }, sort_order: 0 }],
    });

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

    expect(screen.getByText(/sin reglas de elegibilidad/i)).toBeInTheDocument();
  });

  it("saves rules with the mapped payload and shows a success toast", async () => {
    const onSaved = vi.fn();
    mockReplaceEligibilityRules.mockResolvedValue([
      { eligibility_rule_id: 10, rule_type: "MIN_AGE", configuration: { min_age: 21 }, sort_order: 0 },
    ]);

    renderEditor({
      rules: [{ rule_type: "MIN_AGE", configuration: { min_age: 18 }, sort_order: 0 }],
      onSaved,
    });

    fireEvent.change(screen.getByLabelText(/edad mínima/i), { target: { value: "21" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^guardar reglas$/i }));
    });

    await waitFor(() => {
      expect(mockReplaceEligibilityRules).toHaveBeenCalledWith(1, 2, [
        { rule_type: "MIN_AGE", sort_order: 0, configuration: { min_age: 21 } },
      ]);
    });

    expect(mockToastSuccess).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith([
      { eligibility_rule_id: 10, rule_type: "MIN_AGE", configuration: { min_age: 21 }, sort_order: 0 },
    ]);
  });

  it("shows an error toast and does not call the API when min_age is invalid", async () => {
    renderEditor({
      rules: [{ rule_type: "MIN_AGE", configuration: { min_age: 18 }, sort_order: 0 }],
    });

    fireEvent.change(screen.getByLabelText(/edad mínima/i), { target: { value: "-3" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^guardar reglas$/i }));
    });

    expect(mockToastError).toHaveBeenCalled();
    expect(mockReplaceEligibilityRules).not.toHaveBeenCalled();
  });

  it("shows an error toast when the save request fails", async () => {
    mockReplaceEligibilityRules.mockRejectedValue(new Error("CERT_VERSION_IMMUTABLE"));

    renderEditor({
      rules: [{ rule_type: "MIN_AGE", configuration: { min_age: 18 }, sort_order: 0 }],
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^guardar reglas$/i }));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("CERT_VERSION_IMMUTABLE");
    });
  });

  it("hides mutation controls when readOnly is true", () => {
    renderEditor({
      rules: [{ rule_type: "MIN_AGE", configuration: { min_age: 18 }, sort_order: 0 }],
      readOnly: true,
    });

    expect(screen.queryByRole("button", { name: /agregar regla/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^guardar reglas$/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/edad mínima/i)).toBeDisabled();
  });
});
