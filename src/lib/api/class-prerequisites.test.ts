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
  createClassPrerequisite,
  deleteClassPrerequisite,
  getClassPrerequisites,
  type ClassPrerequisiteRelation,
} from "@/lib/api/class-prerequisites";

const mockApiRequest = vi.mocked(apiRequest);

const STUB_PREREQUISITE: ClassPrerequisiteRelation = {
  class_prerequisite_id: 1,
  class_id: 20,
  prerequisite_class_id: 10,
  active: true,
  prerequisite: {
    class_id: 10,
    name: "Amigo",
    active: true,
  },
};

describe("class-prerequisites API client", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("getClassPrerequisites requests the admin endpoint and unwraps the data envelope", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: [STUB_PREREQUISITE] });

    const result = await getClassPrerequisites(20, { active: true });

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/classes/20/prerequisites", {
      params: { active: true },
    });
    expect(result).toEqual([STUB_PREREQUISITE]);
  });

  it("createClassPrerequisite posts prerequisite_class_id", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: STUB_PREREQUISITE });

    const result = await createClassPrerequisite(20, { prerequisite_class_id: 10 });

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/classes/20/prerequisites", {
      method: "POST",
      body: { prerequisite_class_id: 10 },
    });
    expect(result).toEqual(STUB_PREREQUISITE);
  });

  it("deleteClassPrerequisite issues a DELETE against the relation id", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: { ...STUB_PREREQUISITE, active: false },
    });

    const result = await deleteClassPrerequisite(20, 1);

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/classes/20/prerequisites/1", {
      method: "DELETE",
    });
    expect(result.active).toBe(false);
  });
});
