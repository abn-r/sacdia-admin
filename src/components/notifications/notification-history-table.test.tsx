import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import messages from "../../../messages/es.json";
import type { NotificationLog } from "@/lib/api/notifications";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : path.join(".");
  },
}));

vi.mock("@/lib/format-locale", () => ({
  getFormatDateTime: async () => (value: string) => value,
}));

vi.mock("@/lib/notifications/history-targets", () => ({
  resolveNotificationTargetUsers: async () => new Map(),
  formatNotificationTargetUser: () => ({ primary: "" }),
}));

vi.mock("@/components/shared/data-table-pagination", () => ({
  DataTablePagination: () => null,
}));

const getHistoryMock = vi.fn();
vi.mock("@/lib/api/notifications", () => ({
  getNotificationHistory: (...args: unknown[]) => getHistoryMock(...args),
}));

import { NotificationHistoryTable } from "./notification-history-table";

function log(overrides: Partial<NotificationLog>): NotificationLog {
  return {
    log_id: 1,
    title: "Aviso",
    body: "Cuerpo",
    type: "USER",
    target_type: "user",
    target_id: null,
    sent_by: null,
    tokens_sent: 1,
    tokens_failed: 0,
    created_at: "2026-10-01T10:00:00Z",
    users: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  getHistoryMock.mockReset();
});

describe("NotificationHistoryTable", () => {
  it("labels every notification type and target the backend can write", async () => {
    getHistoryMock.mockResolvedValue({
      data: [
        log({ log_id: 1, type: "BROADCAST", target_type: "all" }),
        log({ log_id: 2, type: "CLUB", target_type: "club_section", target_id: "7" }),
        log({ log_id: 3, type: "SECTION_ROLE", target_type: "section_role" }),
        log({ log_id: 4, type: "GLOBAL_ROLE", target_type: "global_role" }),
      ],
      total: 4,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(await NotificationHistoryTable({ page: 1, limit: 20 }));

    expect(screen.getByText("Difusión general")).toBeTruthy();
    expect(screen.getAllByText("Rol en sección").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rol global").length).toBeGreaterThan(0);
    expect(screen.queryByText("SECTION_ROLE")).toBeNull();
    expect(screen.queryByText("GLOBAL_ROLE")).toBeNull();
    expect(screen.queryByText("section_role")).toBeNull();
    expect(screen.queryByText("global_role")).toBeNull();
  });

  it("shows a translated sender when the log has no author", async () => {
    getHistoryMock.mockResolvedValue({
      data: [log({ type: "BROADCAST", target_type: "all" })],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(await NotificationHistoryTable({ page: 1, limit: 20 }));

    expect(screen.getByText("Sistema")).toBeTruthy();
  });
});
