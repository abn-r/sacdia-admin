import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExpireOverdueClassEnrollments = vi.fn();
const mockRequireAdminUser = vi.fn();
const mockHasAnyPermission = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api/classes", () => ({
  expireOverdueClassEnrollments: (...args: unknown[]) =>
    mockExpireOverdueClassEnrollments(...args),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminUser: () => mockRequireAdminUser(),
}));

vi.mock("@/lib/auth/permission-utils", () => ({
  hasAnyPermission: (...args: unknown[]) => mockHasAnyPermission(...args),
}));

import { expireOverdueClassEnrollmentsAction } from "@/lib/classes/actions";

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("expireOverdueClassEnrollmentsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminUser.mockResolvedValue({ user_id: "admin-1" });
    mockHasAnyPermission.mockReturnValue(true);
    mockExpireOverdueClassEnrollments.mockResolvedValue({
      status: "success",
      data: {
        ecclesiastical_year_id: 10,
        dry_run: true,
        scanned_count: 0,
        expired_count: 0,
        enrollment_ids: [],
      },
    });
  });

  it("fails fast when ecclesiastical_year_id is malformed", async () => {
    const result = await expireOverdueClassEnrollmentsAction(
      {},
      makeFormData({ ecclesiastical_year_id: "not-a-year", dry_run: "true" }),
    );

    expect(result.error).toMatch(/año eclesiástico/i);
    expect(mockExpireOverdueClassEnrollments).not.toHaveBeenCalled();
  });

  it("fails fast when ecclesiastical_year_id is nonpositive", async () => {
    const result = await expireOverdueClassEnrollmentsAction(
      {},
      makeFormData({ ecclesiastical_year_id: "0", dry_run: "false" }),
    );

    expect(result.error).toMatch(/año eclesiástico/i);
    expect(mockExpireOverdueClassEnrollments).not.toHaveBeenCalled();
  });

  it("allows empty ecclesiastical_year_id so the backend can use its default year", async () => {
    await expireOverdueClassEnrollmentsAction(
      {},
      makeFormData({ ecclesiastical_year_id: "", dry_run: "true" }),
    );

    expect(mockExpireOverdueClassEnrollments).toHaveBeenCalledWith({ dry_run: true });
  });
});
