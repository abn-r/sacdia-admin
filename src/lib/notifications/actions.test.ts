import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  sendNotificationMock,
  broadcastNotificationMock,
  sendClubNotificationMock,
  hasPermissionMock,
} = vi.hoisted(() => ({
  sendNotificationMock: vi.fn(),
  broadcastNotificationMock: vi.fn(),
  sendClubNotificationMock: vi.fn(),
  hasPermissionMock: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminUser: vi.fn(async () => ({ user_id: "admin-1" })),
}));

vi.mock("@/lib/api/action-error", () => ({
  getActionErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback),
}));

vi.mock("@/lib/api/notifications", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/notifications")>(
    "@/lib/api/notifications",
  );
  return {
    ...actual,
    sendNotification: sendNotificationMock,
    broadcastNotification: broadcastNotificationMock,
    sendClubNotification: sendClubNotificationMock,
  };
});

vi.mock("@/lib/auth/permission-utils", () => ({
  hasPermission: hasPermissionMock,
}));

import {
  sendDirectNotificationAction,
  broadcastNotificationAction,
  clubNotificationAction,
} from "./actions";

describe("sendDirectNotificationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermissionMock.mockReturnValue(true);
  });

  it("sends the backend contract field userId, not legacy user_id", async () => {
    const formData = new FormData();
    formData.set("user_id", "user-123");
    formData.set("title", "Hola");
    formData.set("body", "Mensaje");

    const result = await sendDirectNotificationAction({}, formData);

    expect(result).toEqual({ success: "success.sent" });
    expect(sendNotificationMock).toHaveBeenCalledWith({
      userId: "user-123",
      title: "Hola",
      body: "Mensaje",
    });
  });

  it("bloquea envío directo si falta notifications:send", async () => {
    hasPermissionMock.mockReturnValue(false);
    const formData = new FormData();
    formData.set("user_id", "user-123");
    formData.set("title", "Hola");
    formData.set("body", "Mensaje");

    const result = await sendDirectNotificationAction({}, formData);

    expect(result).toEqual({ error: "errors.send_failed" });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});

describe("broadcastNotificationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermissionMock.mockReturnValue(true);
  });

  it("bloquea broadcast si falta notifications:broadcast", async () => {
    hasPermissionMock.mockReturnValue(false);
    const formData = new FormData();
    formData.set("title", "Aviso");
    formData.set("body", "Mensaje global");

    const result = await broadcastNotificationAction({}, formData);

    expect(result).toEqual({ error: "errors.broadcast_failed" });
    expect(broadcastNotificationMock).not.toHaveBeenCalled();
  });
});

describe("clubNotificationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermissionMock.mockReturnValue(true);
  });

  it("bloquea envío por club si falta notifications:club", async () => {
    hasPermissionMock.mockReturnValue(false);
    const formData = new FormData();
    formData.set("instance_type", "pathfinders");
    formData.set("instance_id", "10");
    formData.set("title", "Aviso");
    formData.set("body", "Mensaje");

    const result = await clubNotificationAction({}, formData);

    expect(result).toEqual({ error: "errors.club_send_failed" });
    expect(sendClubNotificationMock).not.toHaveBeenCalled();
  });

  it("acepta target combinado desde selector de secciones autorizadas", async () => {
    const formData = new FormData();
    formData.set("instance_target", "pathfinders:33");
    formData.set("title", "Aviso");
    formData.set("body", "Mensaje");

    const result = await clubNotificationAction({}, formData);

    expect(result).toEqual({ success: "success.club_sent" });
    expect(sendClubNotificationMock).toHaveBeenCalledWith("pathfinders", 33, {
      title: "Aviso",
      body: "Mensaje",
    });
  });

  it("rechaza fallback legacy de tipo/id manual si no viene instance_target", async () => {
    const formData = new FormData();
    formData.set("instance_type", "pathfinders");
    formData.set("instance_id", "33");
    formData.set("title", "Aviso");
    formData.set("body", "Mensaje");

    const result = await clubNotificationAction({}, formData);

    expect(result).toEqual({
      fieldErrors: {
        instance_id: "validation.instance_id_required",
      },
    });
    expect(sendClubNotificationMock).not.toHaveBeenCalled();
  });
});
