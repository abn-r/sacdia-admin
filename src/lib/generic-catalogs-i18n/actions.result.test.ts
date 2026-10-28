import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  createActivityType: vi.fn(),
  updateAdminCamporeeEventType: vi.fn(),
  createAdminCamporeeEventType: vi.fn(),
  deleteAdminCamporeeEventType: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({ requireAdminUser: vi.fn(async () => ({})) }));
vi.mock("@/lib/auth/screen-catalog", () => ({ canCapability: vi.fn(() => true) }));
vi.mock("@/lib/api/generic-catalogs-i18n", () => {
  const noop = vi.fn();
  return new Proxy(
    {
      createAdminActivityType: mocks.createActivityType,
      createAdminCamporeeEventType: mocks.createAdminCamporeeEventType,
      updateAdminCamporeeEventType: mocks.updateAdminCamporeeEventType,
      deleteAdminCamporeeEventType: mocks.deleteAdminCamporeeEventType,
    } as Record<string, unknown>,
    {
      // `then` must stay undefined or the module would be treated as a thenable.
      get: (target, prop: string) => (prop === "then" ? undefined : (target[prop] ?? noop)),
    },
  );
});

import {
  createActivityTypeAction,
  createCamporeeEventTypeAction,
  deleteCamporeeEventTypeAction,
  updateCamporeeEventTypeAction,
} from "./actions";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createActivityType.mockResolvedValue({});
  mocks.createAdminCamporeeEventType.mockResolvedValue({});
  mocks.updateAdminCamporeeEventType.mockResolvedValue({});
  mocks.deleteAdminCamporeeEventType.mockResolvedValue({});
});

describe("generic catalog actions result", () => {
  it("returns success instead of redirecting after a create", async () => {
    const result = await createActivityTypeAction({}, form({ name: "Campamento" }));

    expect(result).toEqual({ success: true });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/catalogs/activity-types");
  });

  it("returns the server error and keeps the dialog open when the create fails", async () => {
    mocks.createActivityType.mockRejectedValue(new Error("Duplicado"));

    const result = await createActivityTypeAction({}, form({ name: "Campamento" }));

    expect(result).toEqual({ error: "Duplicado" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates the camporee configuration pages that list the event types", async () => {
    await createCamporeeEventTypeAction({}, form({ name: "Nudos" }));
    await updateCamporeeEventTypeAction({}, form({ id: "4", name: "Nudos" }));
    const deleted = await deleteCamporeeEventTypeAction({}, form({ id: "4" }));

    expect(deleted).toEqual({ success: true });
    const paths = mocks.revalidatePath.mock.calls.map(([path]) => path);
    expect(paths).toContain("/dashboard/catalogs/camporee-event-types");
    expect(paths).toContain("/dashboard/campamentos/configuracion/campo-local");
    expect(paths).toContain("/dashboard/campamentos/configuracion/union");
  });
});
