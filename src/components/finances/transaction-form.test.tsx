import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import type { Finance, FinanceCategory } from "@/lib/api/finances";
import { TransactionForm } from "./transaction-form";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn(), back: vi.fn() }),
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

const mockCategories = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/lib/api/finances", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/finances")>();
  return {
    ...actual,
    getFinanceCategories: () => mockCategories(),
    createFinance: (...args: unknown[]) => mockCreate(...args),
    updateFinance: (...args: unknown[]) => mockUpdate(...args),
    uploadFinanceEvidence: vi.fn(),
  };
});

const CATEGORIES: FinanceCategory[] = [
  { finance_category_id: 1, name: "Cuotas", type: 0 },
  { finance_category_id: 2, name: "Donativos", type: 0 },
  { finance_category_id: 3, name: "Material", type: 1 },
];

const SECTIONS = [
  { club_section_id: 10, club_type_id: 2, name: "Conquistadores", club_type: { name: "Conquistadores" } },
  { club_section_id: 11, club_type_id: 1, name: "Aventureros", club_type: { name: "Aventureros" } },
];

const EXISTING: Finance = {
  finance_id: 42,
  year: 2026,
  month: 10,
  amount: 450,
  description: "Inscripción al campamento",
  club_type_id: 2,
  finance_category_id: 3,
  finance_date: "2026-10-05T00:00:00.000Z",
  club_section_id: 10,
  active: true,
  period_closed: true,
  finances_categories: { name: "Material", type: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCategories.mockResolvedValue(CATEGORIES);
  mockCreate.mockResolvedValue({ finance_id: 99 });
  mockUpdate.mockResolvedValue({ finance_id: 42 });
});
afterEach(cleanup);

function renderForm(props: Partial<React.ComponentProps<typeof TransactionForm>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TransactionForm
        clubId={7}
        sections={SECTIONS}
        defaultSectionId={10}
        listHref="/dashboard/finances?club=7"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

async function chooseCategory(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("combobox", { name: /Categoría/ }));
  await user.click(await screen.findByRole("option", { name }));
}

describe("TransactionForm", () => {
  it("starts with Ingreso / Egreso and filters the categories by the chosen kind", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(mockCategories).toHaveBeenCalled());

    const kind = screen.getByRole("radiogroup", { name: "Tipo de movimiento" });
    expect(within(kind).getByRole("radio", { name: "Egreso" })).toBeChecked();

    await user.click(screen.getByRole("combobox", { name: /Categoría/ }));
    expect(await screen.findByRole("option", { name: "Material" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Cuotas" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(within(kind).getByRole("radio", { name: "Ingreso" }));
    await user.click(screen.getByRole("combobox", { name: /Categoría/ }));
    expect(await screen.findByRole("option", { name: "Cuotas" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Material" })).not.toBeInTheDocument();
  });

  it("derives Year and Month from the date and offers «Cambiar mes» for the rare case", async () => {
    renderForm();
    await waitFor(() => expect(mockCategories).toHaveBeenCalled());

    // No Año / Mes fields until the month is changed by hand.
    expect(screen.queryByRole("combobox", { name: /^Año/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: "2026-03-15" } });
    expect(screen.getByText(/Cuenta en Marzo 2026/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar mes" }));
    expect(screen.getByRole("combobox", { name: /^Año/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Mes/ })).toBeInTheDocument();
  });

  it("creates the movement with the year and month of the date, then leaves through the modal", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(mockCategories).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("combobox", { name: /Categoría/ })).toBeEnabled());

    await user.type(screen.getByLabelText(/Monto/), "640");
    await chooseCategory(user, "Material");
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: "2026-11-24" } });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });

    await waitFor(() => expect(mockCreate).toHaveBeenCalledOnce());
    const [clubId, payload] = mockCreate.mock.calls[0] as [number, Record<string, unknown>];
    expect(clubId).toBe(7);
    expect(payload).toMatchObject({
      year: 2026,
      month: 11,
      amount: 640,
      finance_category_id: 3,
      finance_date: "2026-11-24",
      club_section_id: 10,
      club_type_id: 2,
    });
    expect(mockToastSuccess).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/dashboard/finances?club=7");
  });

  it("asks for the reason when the backend says the month is closed", async () => {
    mockUpdate.mockRejectedValueOnce(
      Object.assign(new Error("closed"), {
        status: 400,
        payload: { code: "FINANCE_CLOSED_PERIOD_NOTE_REQUIRED" },
      }),
    );
    renderForm({ finance: { ...EXISTING, period_closed: false } });
    await waitFor(() => expect(screen.getByRole("combobox", { name: /Categoría/ })).toBeEnabled());

    expect(screen.queryByLabelText(/Motivo del cambio/)).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.getByLabelText(new RegExp(messages.finances.form.noteLabel))).toBeInTheDocument();
  });

  it("requires a reason up front when editing a movement of a closed month", async () => {
    renderForm({ finance: EXISTING });
    await waitFor(() => expect(screen.getByRole("combobox", { name: /Categoría/ })).toBeEnabled());

    expect(screen.getByLabelText(new RegExp(messages.finances.form.noteLabel))).toBeInTheDocument();
    // Edit does not offer to change the month nor the section.
    expect(screen.queryByRole("button", { name: "Cambiar mes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Sección/ })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
