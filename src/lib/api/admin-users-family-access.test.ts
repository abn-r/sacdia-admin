import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
    apiRequestFromClient: vi.fn(),
  };
});

import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import {
  disableSupervisedLoginFromClient,
  getAdminUserDetail,
  listAdminUserSessionsFromClient,
  revokeLinkedDeviceFromClient,
} from "./admin-users";

const mockApiRequest = vi.mocked(apiRequest);
const mockClientRequest = vi.mocked(apiRequestFromClient);

const BASE = { user_id: "u-1", name: "Ana", email: null };

const LOGIN = {
  status: "active",
  method: "handle",
  login_handle: "ana-7k3m9q2x",
  origin: "guardian_enabled",
  enabled_at: "2026-10-05T00:00:00.000Z",
  enabled_by: { user_id: "u-g", display_name: "María Pérez" },
  disabled_at: null,
  disabled_reason: null,
  password_set_by: "guardian",
  pending_since: null,
};

const DEVICE = {
  linked_device_id: "dev-1",
  label: "iPad de Ana",
  platform: "ios",
  app_version: "2.4.0",
  status: "active",
  paired_by: { user_id: "u-g", display_name: "María Pérez" },
  paired_at: "2026-10-06T00:00:00.000Z",
  last_seen_at: "2026-10-18T10:00:00.000Z",
  absolute_expires_at: "2027-04-04T00:00:00.000Z",
  revoked_at: null,
  revoked_reason: null,
};

describe("admin user detail family_access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is null when the backend withholds the block (no permission) or omits it", async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { ...BASE, family_access: null } });
    expect((await getAdminUserDetail("u-1")).family_access).toBeNull();

    mockApiRequest.mockResolvedValueOnce({ data: { ...BASE } });
    expect((await getAdminUserDetail("u-1")).family_access).toBeNull();
  });

  it("normalizes the supervised login and the linked devices", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        ...BASE,
        family_access: {
          supervision: "active",
          supervised_login: LOGIN,
          linked_devices: [
            DEVICE,
            {
              ...DEVICE,
              linked_device_id: "dev-2",
              platform: "android",
              status: "revoked",
              app_version: null,
              last_seen_at: null,
              revoked_at: "2026-10-19T00:00:00.000Z",
              revoked_reason: "admin",
            },
          ],
        },
      },
    });

    const fa = (await getAdminUserDetail("u-1")).family_access!;

    expect(fa.supervision).toBe("active");
    expect(fa.supervised_login).toMatchObject({
      status: "active",
      method: "handle",
      login_handle: "ana-7k3m9q2x",
      origin: "guardian_enabled",
      enabled_by: { user_id: "u-g", display_name: "María Pérez" },
      disabled_reason: null,
      password_set_by: "guardian",
    });
    expect(fa.linked_devices).toHaveLength(2);
    expect(fa.linked_devices[0]).toMatchObject({
      linked_device_id: "dev-1",
      label: "iPad de Ana",
      platform: "ios",
      status: "active",
      paired_by: { display_name: "María Pérez" },
      absolute_expires_at: "2027-04-04T00:00:00.000Z",
    });
    expect(fa.linked_devices[1]).toMatchObject({
      platform: "android",
      status: "revoked",
      app_version: null,
      last_seen_at: null,
      revoked_reason: "admin",
    });
  });

  it("an empty block (neither login nor devices) normalizes to nulls and an empty list", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        ...BASE,
        family_access: { supervision: null, supervised_login: null, linked_devices: [] },
      },
    });

    expect((await getAdminUserDetail("u-1")).family_access).toEqual({
      supervision: null,
      supervised_login: null,
      linked_devices: [],
    });
  });

  it("keeps null handle/email-like fields as null and drops unknown enum values to safe defaults", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        ...BASE,
        family_access: {
          supervision: "weird",
          supervised_login: { ...LOGIN, method: "email", login_handle: null, enabled_by: null },
          linked_devices: [{ ...DEVICE, platform: "windows", status: "???" }],
        },
      },
    });

    const fa = (await getAdminUserDetail("u-1")).family_access!;
    expect(fa.supervision).toBeNull();
    expect(fa.supervised_login).toMatchObject({
      method: "email",
      login_handle: null,
      enabled_by: null,
    });
    // A device we cannot classify is never shown as active (no Revocar button).
    expect(fa.linked_devices[0].status).toBe("revoked");
    expect(fa.linked_devices[0].platform).toBeNull();
  });

  it("skips malformed device rows without an id", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        ...BASE,
        family_access: {
          supervision: null,
          supervised_login: null,
          linked_devices: [{ label: "sin id" }, "x", DEVICE],
        },
      },
    });

    const fa = (await getAdminUserDetail("u-1")).family_access!;
    expect(fa.linked_devices.map((d) => d.linked_device_id)).toEqual(["dev-1"]);
  });
});

describe("family access actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disableSupervisedLoginFromClient posts only the trimmed reason and unwraps the envelope", async () => {
    mockClientRequest.mockResolvedValue({
      status: "success",
      data: {
        supervised_login: {
          status: "disabled",
          method: "handle",
          origin: "guardian_enabled",
          enabled_at: "2026-10-05T00:00:00.000Z",
          disabled_at: "2026-10-20T00:00:00.000Z",
          disabled_reason: "admin",
          password_set_by: "guardian",
        },
      },
    });

    const result = await disableSupervisedLoginFromClient("u 1", "  Solicitud del tutor  ");

    expect(mockClientRequest).toHaveBeenCalledWith(
      "/admin/users/u%201/supervised-login/disable",
      { method: "POST", body: { reason: "Solicitud del tutor" } },
    );
    expect(result.supervised_login.status).toBe("disabled");
    expect(result.supervised_login.disabled_reason).toBe("admin");
  });

  it("revokeLinkedDeviceFromClient posts only the trimmed reason to the device route", async () => {
    mockClientRequest.mockResolvedValue({
      status: "success",
      data: {
        linked_device_id: "d/1",
        revoked_at: "2026-10-20T00:00:00.000Z",
        revoked_reason: "admin",
      },
    });

    const result = await revokeLinkedDeviceFromClient("u-1", "d/1", " Dispositivo perdido ");

    expect(mockClientRequest).toHaveBeenCalledWith(
      "/admin/users/u-1/linked-devices/d%2F1/revoke",
      { method: "POST", body: { reason: "Dispositivo perdido" } },
    );
    expect(result).toEqual({
      linked_device_id: "d/1",
      revoked_at: "2026-10-20T00:00:00.000Z",
      revoked_reason: "admin",
    });
  });

  it.each([
    ["disable", () => disableSupervisedLoginFromClient("u-1", "abcd")],
    ["revoke", () => revokeLinkedDeviceFromClient("u-1", "d-1", "   ab   ")],
  ])("%s refuses a reason shorter than 5 chars without calling the API", async (_n, run) => {
    await expect(run()).rejects.toThrow();
    expect(mockClientRequest).not.toHaveBeenCalled();
  });
});

describe("admin user sessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the camelCase shape and adds kind + linkedDeviceId", async () => {
    mockClientRequest.mockResolvedValue({
      status: "success",
      data: {
        sessions: [
          {
            sessionId: "s-1",
            userId: "u-1",
            createdAt: "2026-10-01T00:00:00.000Z",
            expiresAt: "2026-10-02T00:00:00.000Z",
            ipAddress: "10.0.0.1",
            userAgent: "Mozilla",
            kind: "user",
            linkedDeviceId: null,
          },
          {
            sessionId: "s-2",
            userId: "u-1",
            createdAt: "2026-10-01T00:00:00.000Z",
            expiresAt: "2026-10-02T00:00:00.000Z",
            ipAddress: null,
            userAgent: null,
            kind: "device",
            linkedDeviceId: "dev-1",
          },
        ],
      },
    });

    const sessions = await listAdminUserSessionsFromClient("u-1");

    expect(mockClientRequest).toHaveBeenCalledWith("/admin/users/u-1/sessions");
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ sessionId: "s-1", kind: "user", linkedDeviceId: null });
    expect(sessions[1]).toMatchObject({
      sessionId: "s-2",
      kind: "device",
      linkedDeviceId: "dev-1",
      ipAddress: null,
      userAgent: null,
    });
  });

  it("an older backend without kind defaults every session to user", async () => {
    mockClientRequest.mockResolvedValue({
      data: { sessions: [{ sessionId: "s-1", userId: "u-1", createdAt: "x", expiresAt: "y" }] },
    });

    const [session] = await listAdminUserSessionsFromClient("u-1");
    expect(session.kind).toBe("user");
    expect(session.linkedDeviceId).toBeNull();
  });
});
