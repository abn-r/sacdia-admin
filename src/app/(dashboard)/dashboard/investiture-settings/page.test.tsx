import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../../messages/es.json";
import { ApiError } from "@/lib/api/client";

const requireAdminUserMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireAdminUser: () => requireAdminUserMock() }));

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

const getWindowMock = vi.fn();
const getThresholdMock = vi.fn();
vi.mock("@/lib/api/investiture-field-config", () => ({
  getInvestitureWindow: (...args: unknown[]) => getWindowMock(...args),
  getFieldClassThreshold: (...args: unknown[]) => getThresholdMock(...args),
}));

const resolveScopeMock = vi.fn();
vi.mock("@/lib/auth/user-local-field", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/user-local-field")>()),
  resolveUserLocalField: (...args: unknown[]) => resolveScopeMock(...args),
}));

const listFieldsMock = vi.fn();
vi.mock("@/lib/auth/territory-scope", () => ({
  listLocalFieldsForTerritory: (...args: unknown[]) => listFieldsMock(...args),
}));

vi.mock("@/components/investiture-config/field-config-client-page", () => ({
  FieldConfigClientPage: () => null,
}));
vi.mock("@/components/local-field-config/local-field-picker", () => ({
  LocalFieldPicker: () => null,
}));

import InvestitureSettingsPage from "./page";

type ElementProps = {
  props: {
    localFieldId: number | null;
    yearId: number | null;
    window: unknown;
    threshold: unknown;
    windowError: { status: number | null; message: string } | null;
    thresholdError: { status: number | null; message: string } | null;
    localFieldPicker: unknown;
  };
};

const fields = [
  { local_field_id: 3, name: "Campo Norte", union_id: 1, active: true },
  { local_field_id: 4, name: "Campo Sur", union_id: 1, active: true },
];

async function render(search: Record<string, string> = {}) {
  return (await InvestitureSettingsPage({
    searchParams: Promise.resolve(search),
  })) as unknown as ElementProps;
}

describe("InvestitureSettingsPage", () => {
  beforeEach(() => {
    requireAdminUserMock.mockReset().mockResolvedValue({ id: "u1" });
    getActiveYearMock.mockReset().mockResolvedValue(7);
    listYearsMock.mockReset().mockResolvedValue([]);
    getWindowMock.mockReset().mockResolvedValue({ configured: true });
    getThresholdMock.mockReset().mockResolvedValue({ minimum_percent: 80 });
    resolveScopeMock.mockReset().mockReturnValue({ scope: "single", localFieldId: 3 });
    listFieldsMock.mockReset().mockResolvedValue(fields);
  });

  it("loads the window and percentage of the user's own field for the active year", async () => {
    const element = await render();

    expect(getWindowMock).toHaveBeenCalledWith(3, 7);
    expect(getThresholdMock).toHaveBeenCalledWith(3, 7);
    expect(element.props.localFieldId).toBe(3);
    expect(element.props.yearId).toBe(7);
    expect(element.props.window).toEqual({ configured: true });
    expect(element.props.localFieldPicker).toBeNull();
  });

  it("ignores a ?local_field_id= override for single-field users and honours ?year=", async () => {
    await render({ local_field_id: "4", year: "5" });

    expect(getWindowMock).toHaveBeenCalledWith(3, 5);
    expect(getActiveYearMock).not.toHaveBeenCalled();
  });

  it("renders the picker and waits for a field when the role can pick one", async () => {
    resolveScopeMock.mockReturnValue({ scope: "union", unionId: 1 });

    const element = await render();

    expect(element.props.localFieldPicker).not.toBeNull();
    expect(element.props.localFieldId).toBeNull();
    expect(getWindowMock).not.toHaveBeenCalled();
  });

  it("accepts an in-scope override for roles that can pick a field", async () => {
    resolveScopeMock.mockReturnValue({ scope: "union", unionId: 1 });

    const element = await render({ local_field_id: "4" });

    expect(getWindowMock).toHaveBeenCalledWith(4, 7);
    expect(element.props.localFieldId).toBe(4);
  });

  it("rejects an override outside the user's territory", async () => {
    resolveScopeMock.mockReturnValue({ scope: "union", unionId: 1 });

    const element = await render({ local_field_id: "99" });

    expect(element.props.localFieldId).toBeNull();
    expect(getWindowMock).not.toHaveBeenCalled();
  });

  it("keeps the window when only the percentage is forbidden (union / admin roles)", async () => {
    getThresholdMock.mockRejectedValue(new ApiError("Forbidden", 403, {}));

    const element = await render();

    expect(element.props.window).toEqual({ configured: true });
    expect(element.props.threshold).toBeNull();
    expect(element.props.thresholdError?.status).toBe(403);
    expect(element.props.windowError).toBeNull();
  });

  it("hands a window failure to the page with the mapped message", async () => {
    getWindowMock.mockRejectedValue(
      new ApiError("Forbidden", 403, { code: "GUARD_PERMISSION_DENIED" }),
    );

    const element = await render();

    expect(element.props.window).toBeNull();
    expect(element.props.windowError?.status).toBe(403);
    expect(element.props.windowError?.message).toBe(messages.investiture_requests.errors.forbidden);
  });

  it("does not call the API when there is no usable year", async () => {
    getActiveYearMock.mockResolvedValue(null);

    const element = await render();

    expect(element.props.yearId).toBeNull();
    expect(getWindowMock).not.toHaveBeenCalled();
  });
});
