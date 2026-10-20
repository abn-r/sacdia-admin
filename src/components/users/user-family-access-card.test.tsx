/**
 * Tests for UserFamilyAccessCard + hasFamilyAccessContent.
 *
 * Covers: login block (status badges Activa / Pendiente de tutor / Desactivada,
 * method, handle, origin, who enabled it), null handle/enabled_by as an em dash,
 * linked devices table (active vs revoked), the AlertDialog with a REQUIRED
 * reason (>= 5 trimmed chars) for disable and revoke, error mapping by machine
 * `code` only, no action offered without permission, and no enable / reset /
 * password control anywhere (the backend has no such admin route).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type {
  AdminFamilyAccess,
  AdminLinkedDevice,
  AdminSupervisedLogin,
} from "@/lib/api/admin-users";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockDisable = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockRevoke = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/admin-users", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/admin-users")>();
  return {
    ...original,
    disableSupervisedLoginFromClient: (...args: unknown[]) => mockDisable(...args),
    revokeLinkedDeviceFromClient: (...args: unknown[]) => mockRevoke(...args),
  };
});

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

import { UserFamilyAccessCard } from "@/components/users/user-family-access-card";
import { hasFamilyAccessContent } from "@/lib/admin-users/family-access";
import { ApiError } from "@/lib/api/client";

const f = messages.familyAccess;

function login(overrides: Partial<AdminSupervisedLogin> = {}): AdminSupervisedLogin {
  return {
    status: "active",
    method: "handle",
    login_handle: "ana-7k3m9q2x",
    origin: "guardian_enabled",
    enabled_at: "2026-10-05T15:00:00.000Z",
    enabled_by: { user_id: "u-g", display_name: "María Pérez" },
    disabled_at: null,
    disabled_reason: null,
    password_set_by: "guardian",
    pending_since: null,
    ...overrides,
  };
}

function device(overrides: Partial<AdminLinkedDevice> = {}): AdminLinkedDevice {
  return {
    linked_device_id: "dev-1",
    label: "iPad de Ana",
    platform: "ios",
    app_version: "2.4.0",
    status: "active",
    paired_by: { user_id: "u-g", display_name: "María Pérez" },
    paired_at: "2026-10-06T10:00:00.000Z",
    last_seen_at: "2026-10-18T10:00:00.000Z",
    absolute_expires_at: "2027-04-04T10:00:00.000Z",
    revoked_at: null,
    revoked_reason: null,
    ...overrides,
  };
}

function access(overrides: Partial<AdminFamilyAccess> = {}): AdminFamilyAccess {
  return {
    supervision: "active",
    supervised_login: login(),
    linked_devices: [],
    ...overrides,
  };
}

function renderCard(familyAccess: AdminFamilyAccess, canManage = true) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <UserFamilyAccessCard userId="u-1" familyAccess={familyAccess} canManage={canManage} />
    </NextIntlClientProvider>,
  );
}

const disableButton = () => screen.getByRole("button", { name: f.login.disableAria });

describe("hasFamilyAccessContent", () => {
  it("is false for null/undefined (no permission) and for an empty block", () => {
    expect(hasFamilyAccessContent(null)).toBe(false);
    expect(hasFamilyAccessContent(undefined)).toBe(false);
    expect(
      hasFamilyAccessContent({ supervision: null, supervised_login: null, linked_devices: [] }),
    ).toBe(false);
  });

  it("is true with a supervised login or with linked devices", () => {
    expect(hasFamilyAccessContent(access())).toBe(true);
    expect(
      hasFamilyAccessContent(access({ supervised_login: null, linked_devices: [device()] })),
    ).toBe(true);
  });
});

describe("UserFamilyAccessCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  describe("supervised login", () => {
    it("shows an active login: status, method, handle, origin, who enabled it and who set the password", () => {
      renderCard(access());
      const block = screen.getByTestId("family-supervised-login");

      expect(within(block).getByText(f.login.status.active)).toBeInTheDocument();
      const methodField = within(block).getByText(f.login.fields.method).parentElement as HTMLElement;
      expect(within(methodField).getByText(f.login.method.handle)).toBeInTheDocument();
      expect(within(block).getByText("ana-7k3m9q2x")).toBeInTheDocument();
      expect(within(block).getByText(f.login.origin.guardian_enabled)).toBeInTheDocument();
      expect(within(block).getByText("María Pérez")).toBeInTheDocument();
      expect(within(block).getByText(f.login.passwordSetBy.guardian)).toBeInTheDocument();
    });

    it("shows the supervision state of the guardian", () => {
      renderCard(access({ supervision: "pending_guardian" }));
      expect(screen.getByText(f.supervision.label)).toBeInTheDocument();
      expect(
        within(screen.getByTestId("family-supervision")).getByText(f.supervision.pending_guardian),
      ).toBeInTheDocument();
    });

    it("pending_guardian login shows its own badge and since date", () => {
      renderCard(
        access({
          supervised_login: login({
            status: "pending_guardian",
            origin: "self_registered",
            enabled_by: null,
            enabled_at: null,
            password_set_by: "self",
            pending_since: "2026-10-10T10:00:00.000Z",
          }),
        }),
      );
      const block = screen.getByTestId("family-supervised-login");
      expect(within(block).getByText(f.login.status.pending_guardian)).toBeInTheDocument();
      expect(within(block).getByText(f.login.fields.pendingSince)).toBeInTheDocument();
      expect(within(block).getByText(f.login.origin.self_registered)).toBeInTheDocument();
      expect(within(block).getByText(f.login.passwordSetBy.self)).toBeInTheDocument();
      // Still disable-able: the account exists even without a verified guardian.
      expect(disableButton()).toBeInTheDocument();
    });

    it("disabled login shows the reason and offers no Desactivar", () => {
      renderCard(
        access({
          supervised_login: login({
            status: "disabled",
            disabled_at: "2026-10-12T10:00:00.000Z",
            disabled_reason: "guardian",
          }),
        }),
      );
      const block = screen.getByTestId("family-supervised-login");
      expect(within(block).getByText(f.login.status.disabled)).toBeInTheDocument();
      expect(within(block).getByText(f.login.disabledReason.guardian)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: f.login.disableAria })).toBeNull();
    });

    it("renders a null handle (email login) and a null enabled_by as an em dash", () => {
      renderCard(
        access({
          supervised_login: login({
            method: "email",
            login_handle: null,
            enabled_by: null,
          }),
        }),
      );
      const block = screen.getByTestId("family-supervised-login");
      const handleField = within(block).getByText(f.login.fields.handle).parentElement as HTMLElement;
      expect(within(handleField).getByText("—")).toBeInTheDocument();
      const byField = within(block).getByText(f.login.fields.enabledBy).parentElement as HTMLElement;
      expect(within(byField).getByText("—")).toBeInTheDocument();
    });

    it("with devices only: explains there is no own login", () => {
      renderCard(access({ supervised_login: null, linked_devices: [device()] }));
      expect(screen.getByText(f.login.empty)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: f.login.disableAria })).toBeNull();
    });
  });

  describe("linked devices", () => {
    it("lists active and revoked devices; only the active one can be revoked", () => {
      renderCard(
        access({
          linked_devices: [
            device(),
            device({
              linked_device_id: "dev-2",
              label: "Tablet vieja",
              platform: "android",
              status: "revoked",
              last_seen_at: null,
              revoked_at: "2026-10-19T10:00:00.000Z",
              revoked_reason: "admin",
            }),
          ],
        }),
      );

      const rows = screen.getAllByTestId("family-linked-device");
      expect(rows).toHaveLength(2);
      expect(within(rows[0]).getByText("iPad de Ana")).toBeInTheDocument();
      expect(within(rows[0]).getByText(f.devices.platform.ios)).toBeInTheDocument();
      expect(within(rows[0]).getByText("María Pérez")).toBeInTheDocument();
      expect(within(rows[0]).getByText(f.devices.status.active)).toBeInTheDocument();
      expect(
        within(rows[0]).getByRole("button", { name: "Revocar el dispositivo iPad de Ana" }),
      ).toBeInTheDocument();

      expect(within(rows[1]).getByText("Tablet vieja")).toBeInTheDocument();
      expect(within(rows[1]).getByText(f.devices.status.revoked)).toBeInTheDocument();
      expect(within(rows[1]).queryByRole("button")).toBeNull();
      // never seen: em dash
      expect(within(rows[1]).getAllByText("—").length).toBeGreaterThan(0);
    });

    it("an empty device list says so when the login block exists", () => {
      renderCard(access());
      expect(screen.getByText(f.devices.empty)).toBeInTheDocument();
    });
  });

  describe("sessions", () => {
    it("offers the on-demand sessions list without fetching it", () => {
      renderCard(access({ linked_devices: [device()] }));
      const sessions = screen.getByTestId("family-sessions");
      expect(
        within(sessions).getByRole("button", { name: f.sessions.load }),
      ).toBeInTheDocument();
    });
  });

  describe("permissions and forbidden controls", () => {
    it("without canManage there is no action at all", () => {
      renderCard(access({ linked_devices: [device()] }), false);
      // Only the read-only sessions loader remains.
      expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([f.sessions.load]);
    });

    it("never offers enable / reactivate / reset / password controls", () => {
      renderCard(access({ linked_devices: [device()] }));
      const names = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
      expect(names).toEqual([
        f.login.disableAria,
        "Revocar el dispositivo iPad de Ana",
        f.sessions.load,
      ]);
    });
  });

  describe("disable flow (reason required)", () => {
    it("Desactivar opens an AlertDialog; confirm stays disabled until the TRIMMED reason has 5 chars", async () => {
      const user = userEvent.setup();
      renderCard(access());

      await user.click(disableButton());
      const dialog = await screen.findByRole("alertdialog");
      const confirm = within(dialog).getByRole("button", { name: f.dialog.disableConfirm });
      expect(confirm).toBeDisabled();

      const textarea = within(dialog).getByLabelText(f.dialog.reasonLabel);
      await user.type(textarea, "  ab  ");
      expect(confirm).toBeDisabled();
      expect(within(dialog).getByText(f.dialog.reasonTooShort)).toBeInTheDocument();

      await user.clear(textarea);
      await user.type(textarea, "  Pedido del tutor  ");
      expect(confirm).toBeEnabled();
      expect(mockDisable).not.toHaveBeenCalled();
    });

    it("confirm calls the API with the reason, flips the badge to Desactivada and refreshes", async () => {
      mockDisable.mockResolvedValue({
        supervised_login: {
          status: "disabled",
          method: "handle",
          origin: "guardian_enabled",
          enabled_at: "2026-10-05T15:00:00.000Z",
          disabled_at: "2026-10-20T12:00:00.000Z",
          disabled_reason: "admin",
          password_set_by: "guardian",
        },
      });
      const user = userEvent.setup();
      renderCard(access());

      await user.click(disableButton());
      const dialog = await screen.findByRole("alertdialog");
      await user.type(within(dialog).getByLabelText(f.dialog.reasonLabel), "Pedido del tutor");
      await user.click(within(dialog).getByRole("button", { name: f.dialog.disableConfirm }));

      await waitFor(() => expect(mockDisable).toHaveBeenCalledWith("u-1", "Pedido del tutor"));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      expect(mockToastSuccess).toHaveBeenCalledWith(f.toasts.disabled);
      expect(mockRefresh).toHaveBeenCalled();

      const block = screen.getByTestId("family-supervised-login");
      expect(within(block).getByText(f.login.status.disabled)).toBeInTheDocument();
      expect(within(block).getByText(f.login.disabledReason.admin)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: f.login.disableAria })).toBeNull();
    });

    it("cancel closes without calling the API", async () => {
      const user = userEvent.setup();
      renderCard(access());

      await user.click(disableButton());
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: f.dialog.cancel }));

      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      expect(mockDisable).not.toHaveBeenCalled();
    });

    it.each([
      [403, null, f.errors.forbidden],
      [404, "SUPERVISED_LOGIN_NOT_FOUND", f.errors.SUPERVISED_LOGIN_NOT_FOUND],
      [404, "ADMIN_USER_NOT_FOUND", f.errors.ADMIN_USER_NOT_FOUND],
      [400, null, f.errors.invalid_reason],
      [500, null, f.errors.generic],
    ])("error %s / code %s keeps the dialog open with a mapped message", async (status, code, expected) => {
      mockDisable.mockRejectedValue(
        new ApiError("server text", status, code ? { code, details: { x: 1 } } : null),
      );
      const user = userEvent.setup();
      renderCard(access());

      await user.click(disableButton());
      const dialog = await screen.findByRole("alertdialog");
      await user.type(within(dialog).getByLabelText(f.dialog.reasonLabel), "Pedido del tutor");
      await user.click(within(dialog).getByRole("button", { name: f.dialog.disableConfirm }));

      await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent(expected));
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(mockToastSuccess).not.toHaveBeenCalled();
      // Nothing changed in the card behind the dialog.
      expect(screen.getByTestId("family-supervised-login")).toHaveTextContent(f.login.status.active);
    });
  });

  describe("revoke flow (reason required)", () => {
    it("confirm calls the API with user, device and reason; the row flips to Revocado", async () => {
      mockRevoke.mockResolvedValue({
        linked_device_id: "dev-1",
        revoked_at: "2026-10-20T12:00:00.000Z",
        revoked_reason: "admin",
      });
      const user = userEvent.setup();
      renderCard(access({ linked_devices: [device()] }));

      await user.click(screen.getByRole("button", { name: "Revocar el dispositivo iPad de Ana" }));
      const dialog = await screen.findByRole("alertdialog");
      const confirm = within(dialog).getByRole("button", { name: f.dialog.revokeConfirm });
      expect(confirm).toBeDisabled();
      expect(within(dialog).getByText(/iPad de Ana/)).toBeInTheDocument();

      await user.type(within(dialog).getByLabelText(f.dialog.reasonLabel), "Dispositivo perdido");
      await user.click(confirm);

      await waitFor(() =>
        expect(mockRevoke).toHaveBeenCalledWith("u-1", "dev-1", "Dispositivo perdido"),
      );
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      expect(mockToastSuccess).toHaveBeenCalledWith(f.toasts.revoked);
      expect(mockRefresh).toHaveBeenCalled();

      const row = screen.getByTestId("family-linked-device");
      expect(within(row).getByText(f.devices.status.revoked)).toBeInTheDocument();
      expect(within(row).queryByRole("button")).toBeNull();
    });

    it("maps DEVICE_NOT_FOUND by code and does not flip the row", async () => {
      mockRevoke.mockRejectedValue(new ApiError("x", 404, { code: "DEVICE_NOT_FOUND" }));
      const user = userEvent.setup();
      renderCard(access({ linked_devices: [device()] }));

      await user.click(screen.getByRole("button", { name: "Revocar el dispositivo iPad de Ana" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.type(within(dialog).getByLabelText(f.dialog.reasonLabel), "Dispositivo perdido");
      await user.click(within(dialog).getByRole("button", { name: f.dialog.revokeConfirm }));

      await waitFor(() =>
        expect(within(dialog).getByRole("alert")).toHaveTextContent(f.errors.DEVICE_NOT_FOUND),
      );
      expect(
        within(screen.getByTestId("family-linked-device")).getByText(f.devices.status.active),
      ).toBeInTheDocument();
    });
  });
});
