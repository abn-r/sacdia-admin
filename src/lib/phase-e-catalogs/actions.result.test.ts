import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  createFinanceCategory: vi.fn(),
  updateFinanceCategory: vi.fn(),
  deleteFinanceCategory: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({ requireAdminUser: vi.fn(async () => ({})) }));
vi.mock("@/lib/auth/screen-catalog", () => ({ canCapability: vi.fn(() => true) }));
vi.mock("@/lib/api/phase-e-catalogs", () => ({
  createAdminFinanceCategory: mocks.createFinanceCategory,
  updateAdminFinanceCategory: mocks.updateFinanceCategory,
  deleteAdminFinanceCategory: mocks.deleteFinanceCategory,
}));

import {
  createFinanceCategoryAction,
  deleteFinanceCategoryAction,
  updateFinanceCategoryAction,
} from "./actions";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createFinanceCategory.mockResolvedValue({});
  mocks.updateFinanceCategory.mockResolvedValue({});
  mocks.deleteFinanceCategory.mockResolvedValue({});
});

describe("finance category actions", () => {
  it("creates with the mandatory type (income = 0) and returns success without redirecting", async () => {
    const result = await createFinanceCategoryAction({}, form({ name: "Diezmos", type: "0", active: "on" }));

    expect(result).toEqual({ success: true });
    expect(mocks.createFinanceCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Diezmos", type: 0, active: true }),
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/catalogs/finance-categories");
  });

  it("refuses to create without a type and never calls the API", async () => {
    const result = await createFinanceCategoryAction({}, form({ name: "Diezmos" }));

    expect(result.error).toMatch(/tipo/i);
    expect(mocks.createFinanceCategory).not.toHaveBeenCalled();
  });

  it("sends the new type on update", async () => {
    const result = await updateFinanceCategoryAction({}, form({ id: "7", name: "Materiales", type: "1" }));

    expect(result).toEqual({ success: true });
    expect(mocks.updateFinanceCategory).toHaveBeenCalledWith(7, expect.objectContaining({ type: 1 }));
  });

  it("returns success after a delete", async () => {
    expect(await deleteFinanceCategoryAction({}, form({ id: "7" }))).toEqual({ success: true });
    expect(mocks.deleteFinanceCategory).toHaveBeenCalledWith(7);
  });
});
