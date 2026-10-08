import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMock = vi.fn();
const serverMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiRequestFromClient: (...args: unknown[]) => clientMock(...args),
  apiRequest: (...args: unknown[]) => serverMock(...args),
}));

import {
  getInvestitureRequest,
  listInvestitureRequestsForAuthorizer,
  resolveInvestitureRequest,
} from "./investiture-requests";

describe("investiture-requests API", () => {
  beforeEach(() => {
    clientMock.mockReset();
    serverMock.mockReset();
  });

  it("posts decisions and unwraps the envelope", async () => {
    clientMock.mockResolvedValue({
      status: "success",
      data: {
        request_id: "r1",
        invested: [],
        rejected_by_person: [],
        rejected_by_system: [],
        retired: [],
        blocked: [],
        already_resolved: [],
      },
    });

    const result = await resolveInvestitureRequest("r1", {
      invest: [{ person_id: "p1" }],
      reject: [],
    });

    expect(clientMock).toHaveBeenCalledWith(
      "/investiture-requests/r1/resolutions",
      { method: "POST", body: { invest: [{ person_id: "p1" }], reject: [] } },
    );
    expect(result.request_id).toBe("r1");
  });

  it("lists the authorizer requests passing the ecclesiastical year as a param", async () => {
    serverMock.mockResolvedValue({ status: "success", data: [{ request_id: "r1", people: [] }] });

    const result = await listInvestitureRequestsForAuthorizer(12);

    expect(serverMock).toHaveBeenCalledWith("/investiture-requests", {
      params: { ecclesiastical_year_id: 12 },
    });
    expect(result).toHaveLength(1);
  });

  it("reads one request by id", async () => {
    serverMock.mockResolvedValue({ status: "success", data: { request_id: "r 1", people: [] } });

    const result = await getInvestitureRequest("r 1");

    expect(serverMock).toHaveBeenCalledWith("/investiture-requests/r%201");
    expect(result.request_id).toBe("r 1");
  });
});
