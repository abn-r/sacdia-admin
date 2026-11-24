import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import baseMessages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";

const { mockResend, mockDeactivate, mockRefresh, mockCan, toastSuccess, toastErrorFn } = vi.hoisted(() => ({
  mockResend: vi.fn(),
  mockDeactivate: vi.fn(),
  mockRefresh: vi.fn(),
  mockCan: vi.fn(),
  toastSuccess: vi.fn(),
  toastErrorFn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastErrorFn, warning: vi.fn() } }));
vi.mock("@/lib/api/admin-users", () => ({ resendAdminUserInvitationFromClient: mockResend }));
vi.mock("@/lib/users/list-actions", () => ({ deactivateAdminUserFromClient: mockDeactivate }));
vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canCapability: mockCan }),
}));

import { UsersListRowActions } from "@/components/users/users-list-row-actions";

// Supplied here so the test does not depend on the message files being merged.
const messages = baseMessages;

function renderActions(props: Partial<React.ComponentProps<typeof UsersListRowActions>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages as never}>
      <UsersListRowActions
        userId="u-1"
        name="Mateo Herrera"
        active
        isDeleted={false}
        postRegistrationComplete={false}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Mateo Herrera/ }));
}

describe("UsersListRowActions", () => {
  beforeEach(() => {
    mockCan.mockReturnValue(true);
    mockResend.mockReset().mockResolvedValue(undefined);
    mockDeactivate.mockReset().mockResolvedValue(undefined);
    mockRefresh.mockReset();
    toastSuccess.mockReset();
    toastErrorFn.mockReset();
  });
  afterEach(cleanup);

  it("offers view, resend and deactivate to an actor who may do all three", async () => {
    const user = userEvent.setup();
    renderActions();
    await openMenu(user);
    expect(await screen.findByRole("menuitem", { name: "Ver detalle" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Reenviar invitación" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Desactivar cuenta…" })).toBeInTheDocument();
  });

  it("hides what the actor may not do", async () => {
    mockCan.mockImplementation((_screen: string, capability: string) => capability === "view_detail");
    const user = userEvent.setup();
    renderActions();
    await openMenu(user);
    expect(await screen.findByRole("menuitem", { name: "Ver detalle" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Reenviar invitación" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Desactivar cuenta…" })).not.toBeInTheDocument();
  });

  it("does not offer resend once post-registration is complete", async () => {
    const user = userEvent.setup();
    renderActions({ postRegistrationComplete: true });
    await openMenu(user);
    await screen.findByRole("menuitem", { name: "Ver detalle" });
    expect(screen.queryByRole("menuitem", { name: "Reenviar invitación" })).not.toBeInTheDocument();
  });

  it("resends the invitation and confirms with a toast", async () => {
    const user = userEvent.setup();
    renderActions();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Reenviar invitación" }));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith("u-1"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Invitación reenviada a Mateo Herrera."));
  });

  it("explains a 409 on resend instead of a generic failure", async () => {
    mockResend.mockRejectedValue(new ApiError("conflict", 409, {}));
    const user = userEvent.setup();
    renderActions();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Reenviar invitación" }));
    await waitFor(() =>
      expect(toastErrorFn).toHaveBeenCalledWith("Esa persona ya aceptó su invitación.", expect.anything()),
    );
  });

  it("asks for confirmation before deactivating, then refreshes the list", async () => {
    const user = userEvent.setup();
    renderActions();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Desactivar cuenta…" }));

    expect(await screen.findByText("¿Desactivar la cuenta de Mateo Herrera?")).toBeInTheDocument();
    expect(mockDeactivate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Desactivar cuenta" }));
    await waitFor(() => expect(mockDeactivate).toHaveBeenCalledWith("u-1"));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("keeps the dialog open with the failure inline when deactivation fails", async () => {
    mockDeactivate.mockRejectedValue(new ApiError("boom", 500, {}));
    const user = userEvent.setup();
    renderActions();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Desactivar cuenta…" }));
    await user.click(await screen.findByRole("button", { name: "Desactivar cuenta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos desactivar la cuenta de Mateo Herrera.");
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
