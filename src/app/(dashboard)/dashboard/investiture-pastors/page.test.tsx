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

const listDistrictsMock = vi.fn();
vi.mock("@/lib/api/geography", () => ({
  listDistricts: (...args: unknown[]) => listDistrictsMock(...args),
}));

// The admin districts API is restricted to admin/super-admin: the page must never call it.
const listAdminDistrictsMock = vi.fn();
vi.mock("@/lib/api/admin-districts", () => ({
  listAdminDistricts: (...args: unknown[]) => listAdminDistrictsMock(...args),
}));

const getQuotaMock = vi.fn();
const listPastorsMock = vi.fn();
vi.mock("@/lib/api/investiture-field-config", () => ({
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

vi.mock("@/components/investiture-config/pastors-client-page", () => ({
  PastorsClientPage: () => null,
}));
vi.mock("@/components/local-field-config/local-field-picker", () => ({
  LocalFieldPicker: () => null,
}));

import InvestiturePastorsPage from "./page";

type Entry = {
  districtId: number;
  name: string;
  list: unknown;
  error: { status: number | null; message: string } | null;
};

type ElementProps = {
  props: {
    localFieldId: number | null;
    districts: Entry[];
    quota: unknown;
    quotaError: { status: number | null; message: string } | null;
    loadError: { status: number | null; message: string } | null;
    localFieldPicker: unknown;
  };
};

const fields = [
  { local_field_id: 3, name: "Campo Norte", union_id: 1, active: true },
  { local_field_id: 4, name: "Campo Sur", union_id: 1, active: true },
];

// Shape of GET /catalogs/districts: only active rows, no `active` flag.
function district(id: number, name: string, overrides: Record<string, unknown> = {}) {
  return { district_id: id, name, local_field_id: 3, ...overrides };
}

async function render(search: Record<string, string> = {}) {
  return (await InvestiturePastorsPage({
    searchParams: Promise.resolve(search),
  })) as unknown as ElementProps;
}

describe("InvestiturePastorsPage", () => {
  beforeEach(() => {
    requireAdminUserMock.mockReset().mockResolvedValue({ id: "u1" });
    resolveScopeMock.mockReset().mockReturnValue({ scope: "single", localFieldId: 3 });
    listFieldsMock.mockReset().mockResolvedValue(fields);
    listAdminDistrictsMock.mockReset();
    listDistrictsMock.mockReset().mockResolvedValue([district(6, "Distrito Sur"), district(5, "Distrito Norte")]);
    getQuotaMock.mockReset().mockResolvedValue({ slots: 2, configured: false, can_edit: false });
    listPastorsMock
      .mockReset()
      .mockImplementation(async (id: number) => ({
        districlub_type_id: id,
        slots: 2,
        can_assign: true,
        pastors: [],
      }));
  });

  it("lists the districts of the user's field with their pastors, sorted by name", async () => {
    const element = await render();

    expect(listDistrictsMock).toHaveBeenCalledWith(3);
    expect(listAdminDistrictsMock).not.toHaveBeenCalled();
    expect(listPastorsMock).toHaveBeenCalledWith(5);
    expect(listPastorsMock).toHaveBeenCalledWith(6);
    expect(element.props.districts.map((entry) => entry.name)).toEqual([
      "Distrito Norte",
      "Distrito Sur",
    ]);
    expect(element.props.districts[0].districtId).toBe(5);
    expect(element.props.quota).toEqual({ slots: 2, configured: false, can_edit: false });
    expect(element.props.localFieldPicker).toBeNull();
  });

  it("uses the pk exposed by the districts catalog, accepting districlub_type_id too", async () => {
    listDistrictsMock.mockResolvedValue([
      district(42, "Distrito Único"),
      { districlub_type_id: 43, name: "Distrito Raw", local_field_id: 3 },
    ]);

    await render();

    expect(listPastorsMock).toHaveBeenCalledWith(42);
    expect(listPastorsMock).toHaveBeenCalledWith(43);
  });

  it("skips explicitly inactive districts and districts of other fields", async () => {
    listDistrictsMock.mockResolvedValue([
      district(5, "Activo"),
      district(6, "Inactivo", { active: false }),
      district(7, "Otro Campo", { local_field_id: 4 }),
    ]);

    const element = await render();

    expect(element.props.districts.map((entry) => entry.name)).toEqual(["Activo"]);
    expect(listPastorsMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the other districts when one pastor list fails", async () => {
    listPastorsMock.mockImplementation(async (id: number) => {
      if (id === 6) throw new ApiError("Boom", 500, {});
      return { districlub_type_id: id, slots: 2, can_assign: true, pastors: [] };
    });

    const element = await render();

    const broken = element.props.districts.find((entry) => entry.districtId === 6);
    expect(broken?.list).toBeNull();
    expect(broken?.error?.status).toBe(500);
    expect(element.props.districts.find((entry) => entry.districtId === 5)?.list).not.toBeNull();
  });

  it("renders the picker and loads nothing for the field until a role that can pick chooses one", async () => {
    resolveScopeMock.mockReturnValue({ scope: "union", unionId: 1 });

    const element = await render();

    expect(element.props.localFieldPicker).not.toBeNull();
    expect(element.props.localFieldId).toBeNull();
    expect(listDistrictsMock).not.toHaveBeenCalled();
    expect(element.props.quota).not.toBeNull();
  });

  it("accepts an in-scope local_field_id for union roles and rejects one outside the territory", async () => {
    resolveScopeMock.mockReturnValue({ scope: "union", unionId: 1 });

    const inScope = await render({ local_field_id: "4" });
    expect(inScope.props.localFieldId).toBe(4);
    expect(listDistrictsMock).toHaveBeenCalledWith(4);

    listDistrictsMock.mockClear();
    const outside = await render({ local_field_id: "99" });
    expect(outside.props.localFieldId).toBeNull();
    expect(listDistrictsMock).not.toHaveBeenCalled();
  });

  it("reports a failed districts list as a load error with the mapped message", async () => {
    listDistrictsMock.mockRejectedValue(
      new ApiError("Forbidden", 403, { code: "GUARD_PERMISSION_DENIED" }),
    );

    const element = await render();

    expect(element.props.districts).toEqual([]);
    expect(element.props.loadError?.status).toBe(403);
    expect(element.props.loadError?.message).toBe(messages.investiture_requests.errors.forbidden);
  });

  it("reports a failed quota read without hiding the districts", async () => {
    getQuotaMock.mockRejectedValue(new ApiError("Forbidden", 403, {}));

    const element = await render();

    expect(element.props.quota).toBeNull();
    expect(element.props.quotaError?.status).toBe(403);
    expect(element.props.districts).toHaveLength(2);
  });
});
