import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../../../messages/es.json";
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

const listDistrictsMock = vi.fn();
vi.mock("@/lib/api/geography", () => ({
  listDistricts: (...args: unknown[]) => listDistrictsMock(...args),
}));

const getWindowMock = vi.fn();
const getQuotaMock = vi.fn();
const listPastorsMock = vi.fn();
vi.mock("@/lib/api/investiture-field-config", () => ({
  getInvestitureWindow: (...args: unknown[]) => getWindowMock(...args),
  getPastorQuota: () => getQuotaMock(),
  listDistrictPastors: (...args: unknown[]) => listPastorsMock(...args),
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

vi.mock("@/components/investiture-config/investiture-settings-client-page", () => ({
  InvestitureSettingsClientPage: () => null,
}));
vi.mock("@/components/local-field-config/local-field-picker", () => ({
  LocalFieldPicker: () => null,
}));

import InvestitureSettingsPage, { generateMetadata } from "./page";

type ElementProps = {
  props: {
    localFieldId: number | null;
    yearId: number | null;
    window: unknown;
    windowError: { status: number | null; message: string } | null;
    districts: Array<{ districtId: number; name: string; list: unknown; error: unknown }>;
    districtsError: unknown;
    quota: unknown;
    quotaError: { status: number | null } | null;
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

describe("InvestitureSettingsPage (window and pastors)", () => {
  beforeEach(() => {
    requireAdminUserMock.mockReset().mockResolvedValue({ id: "u1" });
    getActiveYearMock.mockReset().mockResolvedValue(7);
    listYearsMock.mockReset().mockResolvedValue([]);
    getWindowMock.mockReset().mockResolvedValue({ configured: true });
    getQuotaMock.mockReset().mockResolvedValue({ slots: 2, configured: true, can_edit: false });
    listDistrictsMock.mockReset().mockResolvedValue([
      { district_id: 20, name: "Distrito Sur", local_field_id: 3, active: true },
      { district_id: 10, name: "Distrito Norte", local_field_id: 3, active: true },
      { district_id: 30, name: "Distrito Viejo", local_field_id: 3, active: false },
    ]);
    listPastorsMock.mockReset().mockResolvedValue({ slots: 2, can_assign: true, pastors: [] });
    resolveScopeMock.mockReset().mockReturnValue({ scope: "single", localFieldId: 3 });
    listFieldsMock.mockReset().mockResolvedValue(fields);
  });

  it("titles the screen Investiduras", async () => {
    expect((await generateMetadata()).title).toBe("Investiduras");
  });

  it("loads window, quota and the active districts (sorted) with their pastors in one screen", async () => {
    const element = await render();

    expect(getWindowMock).toHaveBeenCalledWith(3, 7);
    expect(listDistrictsMock).toHaveBeenCalledWith(3);
    expect(element.props.districts.map((d) => d.name)).toEqual(["Distrito Norte", "Distrito Sur"]);
    expect(listPastorsMock).toHaveBeenCalledTimes(2);
    expect(element.props.window).toEqual({ configured: true });
    expect(element.props.quota).toEqual({ slots: 2, configured: true, can_edit: false });
    expect(element.props.localFieldPicker).toBeNull();
  });

  it("ignores a ?local_field_id= override for single-field users and honours ?year=", async () => {
    await render({ local_field_id: "4", year: "5" });

    expect(getWindowMock).toHaveBeenCalledWith(3, 5);
    expect(getActiveYearMock).not.toHaveBeenCalled();
  });

  it("renders the picker and loads nothing until a field is chosen", async () => {
    resolveScopeMock.mockReturnValue({ scope: "union", unionId: 1 });

    const element = await render();

    expect(element.props.localFieldPicker).not.toBeNull();
    expect(element.props.localFieldId).toBeNull();
    expect(getWindowMock).not.toHaveBeenCalled();
    expect(listDistrictsMock).not.toHaveBeenCalled();
  });

  it("rejects an override outside the user's territory", async () => {
    resolveScopeMock.mockReturnValue({ scope: "union", unionId: 1 });

    const element = await render({ local_field_id: "99" });

    expect(element.props.localFieldId).toBeNull();
  });

  it("keeps the other blocks when one fails, with the mapped message", async () => {
    getWindowMock.mockRejectedValue(new ApiError("Forbidden", 403, { code: "GUARD_PERMISSION_DENIED" }));
    getQuotaMock.mockRejectedValue(new ApiError("Boom", 500, {}));

    const element = await render();

    expect(element.props.window).toBeNull();
    expect(element.props.windowError?.status).toBe(403);
    expect(element.props.windowError?.message).toBe(messages.investiture_requests.errors.forbidden);
    expect(element.props.quotaError?.status).toBe(500);
    expect(element.props.districts).toHaveLength(2);
  });

  it("marks only the district whose pastors failed", async () => {
    listPastorsMock
      .mockResolvedValueOnce({ slots: 2, can_assign: true, pastors: [] })
      .mockRejectedValueOnce(new ApiError("Boom", 500, {}));

    const element = await render();

    expect(element.props.districts.filter((d) => d.error !== null)).toHaveLength(1);
  });

  it("does not ask for the window when there is no usable year, but still loads pastors", async () => {
    getActiveYearMock.mockResolvedValue(null);

    const element = await render();

    expect(element.props.yearId).toBeNull();
    expect(getWindowMock).not.toHaveBeenCalled();
    expect(element.props.districts).toHaveLength(2);
  });
});
