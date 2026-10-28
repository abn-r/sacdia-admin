import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminLocalField: vi.fn(),
  updateAdminLocalField: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireAdminUser: vi.fn().mockResolvedValue({ id: "admin" }),
}));
vi.mock("@/lib/auth/screen-catalog", () => ({
  canCapability: vi.fn().mockReturnValue(true),
}));
vi.mock("@/lib/api/admin-local-fields", () => ({
  createAdminLocalField: mocks.createAdminLocalField,
  updateAdminLocalField: mocks.updateAdminLocalField,
  deleteAdminLocalField: vi.fn(),
}));

import {
  createLocalFieldAction,
  updateLocalFieldAction,
} from "@/lib/catalogs/local-fields/actions";
import { localFieldFormSchema } from "@/lib/catalogs/local-fields/schema";
import {
  DEFAULT_LOCAL_FIELD_TIMEZONE,
  LOCAL_FIELD_TIMEZONES,
  localFieldTimezoneOptions,
} from "@/lib/catalogs/local-fields/timezones";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const base = {
  name: "Asociación Centro de Veracruz",
  abbreviation: "ACV",
  union_id: "20",
  active: "true",
};

describe("local field time zone", () => {
  beforeEach(() => {
    mocks.createAdminLocalField.mockReset().mockResolvedValue({});
    mocks.updateAdminLocalField.mockReset().mockResolvedValue({});
  });

  it("offers canonical America zones, with the default first-class", () => {
    expect(LOCAL_FIELD_TIMEZONES).toContain(DEFAULT_LOCAL_FIELD_TIMEZONE);
    expect(LOCAL_FIELD_TIMEZONES.every((zone) => zone.startsWith("America/"))).toBe(true);
    expect(new Set(LOCAL_FIELD_TIMEZONES).size).toBe(LOCAL_FIELD_TIMEZONES.length);
  });

  it("keeps a stored zone that is outside the list", () => {
    expect(localFieldTimezoneOptions("Europe/Madrid")[0]).toBe("Europe/Madrid");
    expect(localFieldTimezoneOptions(DEFAULT_LOCAL_FIELD_TIMEZONE)).toHaveLength(
      LOCAL_FIELD_TIMEZONES.length,
    );
  });

  it("requires a zone only for an active local field", () => {
    const active = { name: "X", abbreviation: "X", union_id: 20, active: true };
    expect(localFieldFormSchema.safeParse({ ...active, timezone: null }).success).toBe(false);
    expect(
      localFieldFormSchema.safeParse({ ...active, timezone: "America/Mexico_City" }).success,
    ).toBe(true);
    expect(
      localFieldFormSchema.safeParse({ ...active, active: false, timezone: null }).success,
    ).toBe(true);
  });

  it("sends the zone when creating an active local field", async () => {
    const result = await createLocalFieldAction(
      {},
      form({ ...base, timezone: "America/Mexico_City" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mocks.createAdminLocalField).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: "America/Mexico_City" }),
    );
  });

  it("sends the zone when editing a local field", async () => {
    const result = await updateLocalFieldAction(
      {},
      form({ ...base, local_field_id: "4", timezone: "America/Merida" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mocks.updateAdminLocalField).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ timezone: "America/Merida" }),
    );
  });

  it("asks for a zone instead of calling the API when an active field has none", async () => {
    const result = await createLocalFieldAction({}, form(base));

    expect(result.error).toBeTruthy();
    expect(mocks.createAdminLocalField).not.toHaveBeenCalled();
  });
});
