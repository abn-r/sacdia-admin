import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: vi.fn() };
});

import { ApiError, apiRequest } from "@/lib/api/client";
import {
  addCamporeeStaffMember,
  deactivateCamporeeStaffMember,
  getCamporeeStaffDisplayName,
  getCamporeeStaffErrorCode,
  listCamporeeEventStaffAssignments,
  listCamporeeStaff,
  listCamporeeStaffCandidates,
  replaceCamporeeEventStaffAssignments,
  updateCamporeeStaffMember,
} from "./camporee-staff";

const mockApiRequest = vi.mocked(apiRequest);

describe("camporee-staff client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the local roster and unwraps the envelope", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: [{ camporee_staff_member_id: "s1" }] });
    const rows = await listCamporeeStaff("local", 7);
    expect(mockApiRequest).toHaveBeenCalledWith("/local-camporees/7/staff");
    expect(rows).toHaveLength(1);
  });

  it("uses union paths for union camporees", async () => {
    mockApiRequest.mockResolvedValue({ data: [] });
    await listCamporeeStaff("union", 3);
    await listCamporeeStaffCandidates("union", 3);
    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/union-camporees/3/staff");
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/union-camporees/3/staff-candidates");
  });

  it("returns [] when the payload is not an array", async () => {
    mockApiRequest.mockResolvedValue({ data: null });
    expect(await listCamporeeStaff("local", 1)).toEqual([]);
    expect(await listCamporeeEventStaffAssignments(1)).toEqual([]);
  });

  it("adds a member with POST", async () => {
    mockApiRequest.mockResolvedValue({ data: { camporee_staff_member_id: "s1" } });
    const body = { user_id: "u1", category: "kitchen" as const, role_label: "Cocina" };
    const created = await addCamporeeStaffMember("local", 7, body);
    expect(mockApiRequest).toHaveBeenCalledWith("/local-camporees/7/staff", {
      method: "POST",
      body,
    });
    expect(created.camporee_staff_member_id).toBe("s1");
  });

  it("patches and deactivates by staff id", async () => {
    mockApiRequest.mockResolvedValue({ data: {} });
    await updateCamporeeStaffMember("s1", { notes: null });
    await deactivateCamporeeStaffMember("s1");
    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/camporee-staff/s1", {
      method: "PATCH",
      body: { notes: null },
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/camporee-staff/s1", {
      method: "DELETE",
    });
  });

  it("replaces event assignments with PUT { assignments }", async () => {
    mockApiRequest.mockResolvedValue({ data: [] });
    const assignments = [
      { camporee_staff_member_id: "s1", assignment_role: "responsible" as const },
    ];
    await replaceCamporeeEventStaffAssignments(9, assignments);
    expect(mockApiRequest).toHaveBeenCalledWith("/camporee-events/9/staff-assignments", {
      method: "PUT",
      body: { assignments },
    });
  });

  it("extracts the machine error code", () => {
    const error = new ApiError("Bad", 400, { code: "CAMPOREE_EVENT_RESPONSIBLE_REQUIRED" });
    expect(getCamporeeStaffErrorCode(error)).toBe("CAMPOREE_EVENT_RESPONSIBLE_REQUIRED");
    expect(getCamporeeStaffErrorCode(new Error("x"))).toBeNull();
  });

  it("builds a display name with fallbacks", () => {
    expect(
      getCamporeeStaffDisplayName({
        user_id: "u1",
        user: { user_id: "u1", email: "a@b.c", name: null, paternal_last_name: null, maternal_last_name: null, full_name: "Ana Pérez", user_image: null },
      }),
    ).toBe("Ana Pérez");
    expect(getCamporeeStaffDisplayName({ user_id: "u1", user: null })).toBe("u1");
  });
});
