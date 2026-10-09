import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMock = vi.fn();
const serverMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiRequestFromClient: (...args: unknown[]) => clientMock(...args),
  apiRequest: (...args: unknown[]) => serverMock(...args),
}));

import {
  assignDistrictPastor,
  getFieldClassThreshold,
  getInvestitureWindow,
  getPastorQuota,
  listDistrictPastors,
  removeDistrictPastor,
  searchPastorCandidates,
  updateFieldClassThreshold,
  updateInvestitureWindow,
  updatePastorQuota,
} from "./investiture-field-config";

const ok = (data: unknown) => ({ status: "success", data });

describe("investiture-field-config API", () => {
  beforeEach(() => {
    clientMock.mockReset();
    serverMock.mockReset();
  });

  it("reads the window with the server client", async () => {
    serverMock.mockResolvedValue(ok({ configured: false, start_date: null }));
    const window = await getInvestitureWindow(7, 3);
    expect(serverMock).toHaveBeenCalledWith("/local-fields/7/investiture-windows/3");
    expect(window.configured).toBe(false);
  });

  it("patches the window", async () => {
    clientMock.mockResolvedValue(ok({ configured: true }));
    await updateInvestitureWindow(7, 3, { start_date: "2026-10-01", end_date: "2026-12-20" });
    expect(clientMock).toHaveBeenCalledWith("/local-fields/7/investiture-windows/3", {
      method: "PATCH",
      body: { start_date: "2026-10-01", end_date: "2026-12-20" },
    });
  });

  it("reads and patches the class threshold", async () => {
    serverMock.mockResolvedValue(ok({ minimum_percent: 80 }));
    await getFieldClassThreshold(7, 3);
    expect(serverMock).toHaveBeenCalledWith("/local-fields/7/class-thresholds/3");

    clientMock.mockResolvedValue(ok({ minimum_percent: 90 }));
    const result = await updateFieldClassThreshold(7, 3, 90);
    expect(clientMock).toHaveBeenCalledWith("/local-fields/7/class-thresholds/3", {
      method: "PATCH",
      body: { minimum_percent: 90 },
    });
    expect(result.minimum_percent).toBe(90);
  });

  it("reads and patches the pastor quota", async () => {
    serverMock.mockResolvedValue(ok({ slots: 2 }));
    await getPastorQuota();
    expect(serverMock).toHaveBeenCalledWith("/investiture-pastor-quota");

    clientMock.mockResolvedValue(ok({ slots: 3 }));
    await updatePastorQuota(3);
    expect(clientMock).toHaveBeenCalledWith("/investiture-pastor-quota", {
      method: "PATCH",
      body: { slots: 3 },
    });
  });

  it("lists, assigns and removes district pastors", async () => {
    serverMock.mockResolvedValue(ok({ districlub_type_id: 5, slots: 2, can_assign: true, pastors: [] }));
    await listDistrictPastors(5);
    expect(serverMock).toHaveBeenCalledWith("/districts/5/investiture-pastors");

    clientMock.mockResolvedValue(ok({ districlub_type_id: 5, user_id: "u1", can_authorize: true }));
    const assigned = await assignDistrictPastor(5, "u1");
    expect(clientMock).toHaveBeenCalledWith("/districts/5/investiture-pastors", {
      method: "POST",
      body: { user_id: "u1" },
    });
    expect(assigned.user_id).toBe("u1");

    clientMock.mockResolvedValue(ok({ districlub_type_id: 5, user_id: "u1", can_authorize: false }));
    await removeDistrictPastor(5, "u1");
    expect(clientMock).toHaveBeenCalledWith("/districts/5/investiture-pastors/u1", {
      method: "DELETE",
    });
  });

  it("searches pastor candidates with the q and districtId params", async () => {
    clientMock.mockResolvedValue(ok([{ user_id: "u1", user_name: "Ana", email: null }]));
    const result = await searchPastorCandidates("ana", 5);
    expect(clientMock).toHaveBeenCalledWith("/investiture-pastor-candidates", {
      params: { q: "ana", districtId: 5 },
    });
    expect(result).toHaveLength(1);
  });
});
