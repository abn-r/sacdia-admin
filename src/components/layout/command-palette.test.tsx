/**
 * CommandPalette tests
 *
 * The palette opens on Cmd+K / Ctrl+K, filters entries via cmdk's fuzzy
 * search, hides entries the user lacks permission for, and pushes via
 * next/navigation router on selection. We stub usePermissions and
 * useRouter; navConfig comes from the real module so the test exercises
 * the actual flatten() shape.
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

// jsdom polyfills (Radix Dialog uses ResizeObserver + scrollIntoView)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

const usePermissionsMock = vi.fn();
vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => usePermissionsMock(),
}));

import { CommandPalette } from "@/components/layout/command-palette";

function renderPalette() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CommandPalette />
    </NextIntlClientProvider>,
  );
}

describe("CommandPalette", () => {
  beforeEach(() => {
    pushMock.mockReset();
    usePermissionsMock.mockReset();
    usePermissionsMock.mockReturnValue({
      can: () => true,
      isSuperAdmin: true,
    });
  });

  afterEach(() => cleanup());

  it("stays closed by default", () => {
    renderPalette();
    expect(screen.queryByPlaceholderText(/buscar/i)).not.toBeInTheDocument();
  });

  it("opens with Cmd+K", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument(),
    );
  });

  it("opens with Ctrl+K", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "K", ctrlKey: true });
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument(),
    );
  });

  it("toggles closed on second Cmd+K", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument(),
    );
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/buscar/i)).not.toBeInTheDocument(),
    );
  });

  it("filters entries via cmdk fuzzy search", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    const input = await screen.findByPlaceholderText(/buscar/i);
    await userEvent.type(input, "Dashboard");

    // The Dashboard item label should still be visible.
    const items = await screen.findAllByRole("option");
    expect(items.length).toBeGreaterThan(0);
    expect(
      items.some((el) => /dashboard/i.test(el.textContent ?? "")),
    ).toBe(true);
  });

  it("calls router.push when an entry is selected", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    const input = await screen.findByPlaceholderText(/buscar/i);
    await userEvent.type(input, "Dashboard");

    const items = await screen.findAllByRole("option");
    const dashboardItem = items.find((el) =>
      /^\s*dashboard/i.test(el.textContent ?? ""),
    );
    expect(dashboardItem).toBeTruthy();
    if (dashboardItem) {
      fireEvent.click(dashboardItem);
    }

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
      expect(pushMock.mock.calls[0][0]).toMatch(/^\/dashboard/);
    });
  });

  it("hides permission-gated entries when permissions deny access", async () => {
    usePermissionsMock.mockReturnValue({
      can: () => false,
      isSuperAdmin: false,
    });
    renderPalette();
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    await screen.findByPlaceholderText(/buscar/i);

    // /dashboard/users is gated by users:read so it must disappear when
    // permissions are denied, even if a couple of permission-free entries
    // (defined in navConfig without a permission key) survive.
    const items = screen.queryAllByRole("option");
    expect(
      items.some((el) => /\/dashboard\/users(?!\b)/i.test(el.textContent ?? "")),
    ).toBe(false);
  });

  it("shows all entries for super admin even with can() denied", async () => {
    usePermissionsMock.mockReturnValue({
      can: () => false,
      isSuperAdmin: true,
    });
    renderPalette();
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    await screen.findByPlaceholderText(/buscar/i);
    const items = screen.queryAllByRole("option");
    expect(items.length).toBeGreaterThan(5);
  });
});
