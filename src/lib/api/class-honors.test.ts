import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
  };
});

import { apiRequest } from "@/lib/api/client";
import {
  createClassHonor,
  deleteClassHonor,
  getClassHonors,
  type ClassHonorRelation,
} from "@/lib/api/class-honors";

const mockApiRequest = vi.mocked(apiRequest);

const STUB_RELATION: ClassHonorRelation = {
  class_honor_id: 1,
  class_id: 10,
  honor_id: 200,
  relation_type: "RECOMMENDED",
  active: true,
  honor: {
    honor_id: 200,
    name: "Primeros auxilios",
    honor_image: null,
    honors_category_id: 3,
    skill_level: 1,
  },
};

describe("class-honors API client", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("getClassHonors requests the admin endpoint and unwraps the data envelope", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: [STUB_RELATION] });

    const result = await getClassHonors(10, { active: true });

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/classes/10/honors", {
      params: { active: true },
    });
    expect(result).toEqual([STUB_RELATION]);
  });

  it("getClassHonors returns the raw array when the backend responds unwrapped", async () => {
    mockApiRequest.mockResolvedValue([STUB_RELATION]);

    const result = await getClassHonors(10);

    expect(result).toEqual([STUB_RELATION]);
  });

  it("createClassHonor posts honor_id and relation_type", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: STUB_RELATION });

    const result = await createClassHonor(10, { honor_id: 200, relation_type: "RECOMMENDED" });

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/classes/10/honors", {
      method: "POST",
      body: { honor_id: 200, relation_type: "RECOMMENDED" },
    });
    expect(result).toEqual(STUB_RELATION);
  });

  it("deleteClassHonor issues a DELETE against the relation id", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: { ...STUB_RELATION, active: false },
    });

    const result = await deleteClassHonor(10, 1);

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/classes/10/honors/1", {
      method: "DELETE",
    });
    expect(result.active).toBe(false);
  });
});
