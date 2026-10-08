import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../../messages/es.json";
import { ApiError } from "@/lib/api/client";

vi.mock("@/lib/auth/session", () => ({ requireAdminUser: vi.fn() }));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : path.join(".");
  },
}));

const getActiveYearMock = vi.fn();
const listYearsMock = vi.fn();
vi.mock("@/lib/api/catalogs", () => ({
  getActiveEcclesiasticalYearId: () => getActiveYearMock(),
  listEcclesiasticalYears: () => listYearsMock(),
}));

const listRequestsMock = vi.fn();
vi.mock("@/lib/api/investiture-requests", () => ({
  listInvestitureRequestsForAuthorizer: (...args: unknown[]) => listRequestsMock(...args),
}));

vi.mock("@/components/investiture-requests/requests-list-client-page", () => ({
  RequestsListClientPage: () => null,
}));

import InvestitureRequestsPage from "./page";

type ElementProps = {
  props: {
    requests: unknown[];
    yearId: number | null;
    loadError: { status: number | null; message: string } | null;
  };
};

describe("InvestitureRequestsPage", () => {
  beforeEach(() => {
    getActiveYearMock.mockReset().mockResolvedValue(7);
    listYearsMock.mockReset().mockResolvedValue([]);
    listRequestsMock.mockReset().mockResolvedValue([{ request_id: "r1" }]);
  });

  it("loads the active year by default", async () => {
    const element = (await InvestitureRequestsPage({
      searchParams: Promise.resolve({}),
    })) as unknown as ElementProps;

    expect(listRequestsMock).toHaveBeenCalledWith(7);
    expect(element.props.yearId).toBe(7);
    expect(element.props.requests).toHaveLength(1);
    expect(element.props.loadError).toBeNull();
  });

  it("honours ?year= over the active year", async () => {
    await InvestitureRequestsPage({ searchParams: Promise.resolve({ year: "3" }) });

    expect(listRequestsMock).toHaveBeenCalledWith(3);
    expect(getActiveYearMock).not.toHaveBeenCalled();
  });

  it("hands a 403 (admin / super-admin) to the page as a forbidden load error", async () => {
    listRequestsMock.mockRejectedValue(new ApiError("Forbidden", 403, {}));

    const element = (await InvestitureRequestsPage({
      searchParams: Promise.resolve({}),
    })) as unknown as ElementProps;

    expect(element.props.requests).toEqual([]);
    expect(element.props.loadError?.status).toBe(403);
    expect(element.props.loadError?.message).toBe(messages.investiture_requests.errors.forbidden);
  });
});
