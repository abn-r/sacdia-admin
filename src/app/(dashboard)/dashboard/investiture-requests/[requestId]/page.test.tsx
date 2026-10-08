import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../../../messages/es.json";
import { ApiError } from "@/lib/api/client";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));

vi.mock("@/lib/auth/session", () => ({ requireAdminUser: vi.fn() }));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : path.join(".");
  },
}));

const listYearsMock = vi.fn();
vi.mock("@/lib/api/catalogs", () => ({
  listEcclesiasticalYears: () => listYearsMock(),
}));

const getRequestMock = vi.fn();
vi.mock("@/lib/api/investiture-requests", () => ({
  getInvestitureRequest: (...args: unknown[]) => getRequestMock(...args),
}));

vi.mock("@/components/investiture-requests/request-detail-client-page", () => ({
  RequestDetailClientPage: () => null,
}));

import InvestitureRequestDetailRoute from "./page";

type Element = { props: Record<string, unknown>; type: unknown };

describe("InvestitureRequestDetailRoute", () => {
  beforeEach(() => {
    notFoundMock.mockClear();
    getRequestMock.mockReset().mockResolvedValue({
      request_id: "r1",
      ecclesiastical_year_id: 7,
      people: [],
    });
    listYearsMock.mockReset().mockResolvedValue([
      { ecclesiastical_year_id: 7, name: "2026", active: true },
    ]);
  });

  it("loads the request and resolves the year name", async () => {
    const element = (await InvestitureRequestDetailRoute({
      params: Promise.resolve({ requestId: "r1" }),
    })) as unknown as Element;

    expect(getRequestMock).toHaveBeenCalledWith("r1");
    expect(element.props.yearName).toBe("2026");
    expect((element.props.request as { request_id: string }).request_id).toBe("r1");
  });

  it("still renders when the year catalog fails", async () => {
    listYearsMock.mockRejectedValue(new Error("down"));

    const element = (await InvestitureRequestDetailRoute({
      params: Promise.resolve({ requestId: "r1" }),
    })) as unknown as Element;

    expect(element.props.yearName).toBeNull();
  });

  it("returns notFound for a 404", async () => {
    getRequestMock.mockRejectedValue(new ApiError("nope", 404, {}));

    await expect(
      InvestitureRequestDetailRoute({ params: Promise.resolve({ requestId: "r1" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders a forbidden banner for a 403", async () => {
    getRequestMock.mockRejectedValue(new ApiError("Forbidden", 403, {}));

    const element = (await InvestitureRequestDetailRoute({
      params: Promise.resolve({ requestId: "r1" }),
    })) as unknown as { props: { children: Array<{ props: Record<string, unknown> }> } };

    const banner = element.props.children[1];
    expect(banner.props.state).toBe("forbidden");
    expect(banner.props.detail).toBe(messages.investiture_requests.errors.forbidden);
  });
});
