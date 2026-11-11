import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: vi.fn() };
});

import { apiRequest } from "@/lib/api/client";
import { listRoleRequirements, updateRoleRequirement } from "@/lib/api/role-requirements";

const mockApiRequest = vi.mocked(apiRequest);

describe("role-requirements API client", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("unwraps the {items} envelope", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { items: [{ requirement_id: 1 }] } });
    expect(await listRoleRequirements()).toEqual([{ requirement_id: 1 }]);
    expect(mockApiRequest).toHaveBeenCalledWith("/admin/role-requirements");
  });

  it("also accepts a bare array", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: [{ requirement_id: 2 }] });
    expect(await listRoleRequirements()).toEqual([{ requirement_id: 2 }]);
  });

  it("patches only the given fields, keeping explicit nulls", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { requirement_id: 3 } });
    await updateRoleRequirement(3, { mode: "BLOCK", effective_from: null, equivalent_certification_id: null });
    expect(mockApiRequest).toHaveBeenCalledWith("/admin/role-requirements/3", {
      method: "PATCH",
      body: { mode: "BLOCK", effective_from: null, equivalent_certification_id: null },
    });
  });
});
