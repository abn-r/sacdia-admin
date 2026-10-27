import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireAdminUser: vi.fn() }));
vi.mock("@/lib/auth/screen-catalog", () => ({
  camporeeScreenId: vi.fn(),
  canCapability: vi.fn(() => true),
}));
vi.mock("@/lib/auth/territory-scope", () => ({
  listLocalFieldsForTerritory: vi.fn(),
  listUnionsForTerritory: vi.fn(),
  resolveAdminTerritoryScope: vi.fn(),
}));
vi.mock("@/lib/api/camporee-events", () => ({}));
vi.mock("@/lib/api/camporee-scoring", () => ({}));

import { createCamporeeEventTemplateAction } from "./actions";

describe("camporee event actions validation field", () => {
  it("reports the offending input name", async () => {
    const fd = new FormData();
    fd.set("scope", "union");
    fd.set("event_type_id", "1");
    fd.set("title", "");
    const result = await createCamporeeEventTemplateAction({}, fd);
    expect(result).toEqual({ error: "El título es obligatorio.", field: "title" });
  });
});
