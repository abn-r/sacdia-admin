import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();
const mockApiRequestFromClient = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  apiRequestFromClient: (...args: unknown[]) => mockApiRequestFromClient(...args),
}));

import { getFolderEvaluations } from "@/lib/api/annual-folders";

describe("annual folders admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps folder evaluations from the backend success envelope", async () => {
    const evaluations = [
      {
        evaluation_id: "evaluation-1",
        section_id: "section-1",
        section_name: "Administración",
        section_order: 1,
        earned_points: 80,
        max_points: 100,
        notes: "Completa",
        evaluator: null,
        evaluated_at: "2026-06-18T18:00:00.000Z",
        status: "VALIDATED",
        lf_approver: null,
        lf_approved_at: null,
        union_approver: null,
        union_approved_at: null,
        union_decision: null,
      },
    ];

    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: evaluations,
    });

    await expect(getFolderEvaluations("folder-1")).resolves.toEqual(evaluations);
    expect(mockApiRequestFromClient).toHaveBeenCalledWith(
      "/annual-folders/folder-1/evaluations",
    );
  });
});
