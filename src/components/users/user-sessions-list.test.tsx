/**
 * Tests for UserSessionsList: on-demand read-only list of a user's active
 * sessions. Sessions minted by a linked device (kind "device") carry the
 * "Dispositivo vinculado" badge and the device label; null ip / user agent
 * render as an em dash.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AdminUserSession } from "@/lib/api/admin-users";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockList = vi.fn<(...args: any[]) => Promise<AdminUserSession[]>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/admin-users", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/admin-users")>();
  return {
    ...original,
    listAdminUserSessionsFromClient: (...args: unknown[]) => mockList(...args),
  };
});

import { UserSessionsList } from "@/components/users/user-sessions-list";

const s = messages.familyAccess.sessions;

function session(overrides: Partial<AdminUserSession> = {}): AdminUserSession {
  return {
    sessionId: "s-1",
    userId: "u-1",
    createdAt: "2026-10-01T10:00:00.000Z",
    expiresAt: "2026-10-09T10:00:00.000Z",
    ipAddress: "10.0.0.1",
    userAgent: "SACDIA/2.4 (iOS)",
    kind: "user",
    linkedDeviceId: null,
    ...overrides,
  };
}

function listElement(deviceLabels: Record<string, string> = {}, refreshKey?: number) {
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      <UserSessionsList userId="u-1" deviceLabels={deviceLabels} refreshKey={refreshKey} />
    </NextIntlClientProvider>
  );
}

function renderList(deviceLabels: Record<string, string> = {}, refreshKey?: number) {
  return render(listElement(deviceLabels, refreshKey));
}

describe("UserSessionsList", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("does not fetch until the admin asks for the sessions", () => {
    renderList();
    expect(screen.getByRole("button", { name: s.load })).toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("labels device sessions as Dispositivo vinculado and user sessions as such", async () => {
    mockList.mockResolvedValue([
      session(),
      session({
        sessionId: "s-2",
        kind: "device",
        linkedDeviceId: "dev-1",
        ipAddress: null,
        userAgent: null,
      }),
    ]);
    const user = userEvent.setup();
    renderList({ "dev-1": "iPad de Ana" });

    await user.click(screen.getByRole("button", { name: s.load }));

    const rows = await screen.findAllByTestId("user-session");
    expect(mockList).toHaveBeenCalledWith("u-1");
    expect(rows).toHaveLength(2);

    expect(within(rows[0]).getByText(s.userBadge)).toBeInTheDocument();
    expect(within(rows[0]).queryByText(s.deviceBadge)).toBeNull();
    expect(within(rows[0]).getByText("10.0.0.1")).toBeInTheDocument();

    expect(within(rows[1]).getByText(s.deviceBadge)).toBeInTheDocument();
    expect(within(rows[1]).queryByText(s.userBadge)).toBeNull();
    expect(within(rows[1]).getByText("Dispositivo: iPad de Ana")).toBeInTheDocument();
    // null ip + null user agent
    expect(within(rows[1]).getAllByText("—").length).toBe(2);
  });

  it("a device session whose device is unknown still gets the badge, without a label", async () => {
    mockList.mockResolvedValue([session({ kind: "device", linkedDeviceId: "dev-x" })]);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: s.load }));

    const row = await screen.findByTestId("user-session");
    expect(within(row).getByText(s.deviceBadge)).toBeInTheDocument();
    expect(within(row).queryByText(/^Dispositivo: /)).toBeNull();
  });

  it("explains an empty list", async () => {
    mockList.mockResolvedValue([]);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: s.load }));

    expect(await screen.findByText(s.empty)).toBeInTheDocument();
  });

  it("shows an error and lets the admin retry", async () => {
    mockList.mockRejectedValueOnce(new Error("boom")).mockResolvedValue([session()]);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: s.load }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(s.error));

    await user.click(screen.getByRole("button", { name: s.retry }));
    expect(await screen.findByTestId("user-session")).toBeInTheDocument();
  });

  describe("refreshKey", () => {
    it("reloads an already opened list when the key changes", async () => {
      mockList.mockResolvedValueOnce([session(), session({ sessionId: "s-2" })]).mockResolvedValue([session()]);
      const user = userEvent.setup();
      const view = renderList({}, 0);

      await user.click(screen.getByRole("button", { name: s.load }));
      expect(await screen.findAllByTestId("user-session")).toHaveLength(2);
      expect(mockList).toHaveBeenCalledTimes(1);

      view.rerender(listElement({}, 1));

      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.getAllByTestId("user-session")).toHaveLength(1));
    });

    it("does not fetch when the key changes while the list was never opened", () => {
      const view = renderList({}, 0);
      view.rerender(listElement({}, 1));
      expect(mockList).not.toHaveBeenCalled();
    });

    it("does not refetch on a re-render with the same key", async () => {
      mockList.mockResolvedValue([session()]);
      const user = userEvent.setup();
      const view = renderList({}, 0);
      await user.click(screen.getByRole("button", { name: s.load }));
      await screen.findByTestId("user-session");

      view.rerender(listElement({}, 0));
      expect(mockList).toHaveBeenCalledTimes(1);
    });
  });
});
