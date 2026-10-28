import { beforeEach, describe, expect, it, vi } from "vitest";

const { listUnions, listLocalFields, listCamporeeEventTypes, resolveScope } = vi.hoisted(
  () => ({
    listUnions: vi.fn(),
    listLocalFields: vi.fn(),
    listCamporeeEventTypes: vi.fn(),
    resolveScope: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/auth/screen-catalog", () => ({ canCapability: vi.fn(() => true) }));
vi.mock("@/lib/auth/territory-scope", () => ({
  resolveAdminTerritoryScope: resolveScope,
}));
vi.mock("@/lib/api/geography", () => ({ listUnions, listLocalFields }));
vi.mock("@/lib/api/camporee-events", () => ({
  getCamporeeEventTemplate: vi.fn(),
  listCamporeeEventTypes,
}));
vi.mock("@/lib/api/classes", () => ({ listClasses: vi.fn(async () => ({ data: [] })) }));
vi.mock("@/lib/camporee-events/actions", () => ({
  createCamporeeEventTemplateAction: vi.fn(),
  updateCamporeeEventTemplateAction: vi.fn(),
}));

import type { AuthUser } from "@/lib/auth/types";
import { loadCreateEventTemplateFormData } from "./event-template-form-data";

const user = {} as AuthUser;

describe("loadCreateEventTemplateFormData geography (field roles)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCamporeeEventTypes.mockResolvedValue({ data: [{ event_type_id: 3, name: "Marcha" }] });
    listUnions.mockResolvedValue([
      { union_id: 7, name: "Union Siete" },
      { union_id: 8, name: "Union Ocho" },
    ]);
    listLocalFields.mockResolvedValue([
      { local_field_id: 10, name: "Campo Diez", union_id: 7 },
      { local_field_id: 11, name: "Campo Once", union_id: 7 },
    ]);
  });

  it("local_field actor: uses public catalog helpers and only sees its own LF", async () => {
    resolveScope.mockReturnValue({ level: "local_field", localFieldId: 10, unionId: 7 });

    const result = await loadCreateEventTemplateFormData(user);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(listLocalFields).toHaveBeenCalledWith(7);
    expect(listUnions).toHaveBeenCalled();
    expect(result.props.allowedScopes).toEqual(["local_field"]);
    expect(result.props.localFields).toEqual([{ value: 10, label: "Campo Diez" }]);
    expect(result.props.unions).toEqual([{ value: 7, label: "Union Siete" }]);
  });

  it("union actor: gets the union's LFs from the public helpers", async () => {
    resolveScope.mockReturnValue({ level: "union", unionId: 7 });

    const result = await loadCreateEventTemplateFormData(user);

    if (result.status !== "ok") throw new Error("expected ok");
    expect(listLocalFields).toHaveBeenCalledWith(7);
    expect(result.props.localFields.map((o) => o.value)).toEqual([10, 11]);
    expect(result.props.unions).toEqual([{ value: 7, label: "Union Siete" }]);
  });

  it("division actor: filters unions by divisionId through the public helper", async () => {
    resolveScope.mockReturnValue({ level: "division", divisionId: 3 });
    listUnions.mockResolvedValue([{ union_id: 7, name: "Union Siete" }]);

    const result = await loadCreateEventTemplateFormData(user);

    if (result.status !== "ok") throw new Error("expected ok");
    expect(listUnions).toHaveBeenCalledWith({ divisionId: 3 });
    expect(result.props.localFields.length).toBeGreaterThan(0);
  });
});

describe("loadCreateEventTemplateFormData event types", () => {
  it("reads event types from the public route, not the admin-only one", async () => {
    resolveScope.mockReturnValue({ level: "local_field", localFieldId: 10, unionId: 7 });
    listCamporeeEventTypes.mockResolvedValue({ data: [{ event_type_id: 3, name: "Marcha" }] });
    listUnions.mockResolvedValue([{ union_id: 7, name: "Union Siete" }]);
    listLocalFields.mockResolvedValue([{ local_field_id: 10, name: "Campo Diez", union_id: 7 }]);

    const data = await loadCreateEventTemplateFormData(user);

    expect(listCamporeeEventTypes).toHaveBeenCalled();
    expect(JSON.stringify(data)).toContain("Marcha");
  });
});
