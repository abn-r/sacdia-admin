import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl, ud } from "@/components/users/detail/test-utils";

const { mockApiRequest, mockRefresh } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  apiRequestFromClient: mockApiRequest,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { UserAccessToggles } from "@/components/users/user-access-toggles";

function renderToggles(canManage: boolean, active = true) {
  return renderWithIntl(
    <UserAccessToggles
      userId="user-1"
      initialAccessApp={false}
      initialAccessPanel={false}
      initialActive={active}
      canManage={canManage}
    />,
  );
}

describe("UserAccessToggles", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue(undefined);
    mockRefresh.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("hides the Accesos section when the actor cannot manage access flags", () => {
    renderToggles(false);

    expect(screen.queryByText(ud("access.sectionTitle"))).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows the three switches for admin actors", () => {
    renderToggles(true);

    expect(screen.getByText(ud("access.sectionTitle"))).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(3);
  });

  it("does not PATCH until the change is confirmed", async () => {
    const user = userEvent.setup();
    renderToggles(true);

    await user.click(screen.getByRole("switch", { name: ud("access.panelLabel") }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("PATCHes access_panel after confirming and refreshes the page", async () => {
    const user = userEvent.setup();
    renderToggles(true);

    await user.click(screen.getByRole("switch", { name: ud("access.panelLabel") }));
    await user.click(
      await screen.findByRole("button", { name: ud("access.confirm.panelOn.confirm") }),
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/admin/users/user-1",
        expect.objectContaining({ method: "PATCH", body: { access_panel: true } }),
      ),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("cancelling leaves the switch and the server untouched", async () => {
    const user = userEvent.setup();
    renderToggles(true);

    const panel = screen.getByRole("switch", { name: ud("access.panelLabel") });
    await user.click(panel);
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(panel).toHaveAttribute("aria-checked", "false");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("turning the account off asks with the deactivation copy", async () => {
    const user = userEvent.setup();
    renderToggles(true, true);

    await user.click(screen.getByRole("switch", { name: ud("access.activeLabel") }));

    expect(await screen.findByText(ud("access.confirm.activeOff.title"))).toBeInTheDocument();
  });

  it("keeps the dialog open with an inline error when the PATCH fails", async () => {
    mockApiRequest.mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderToggles(true);

    await user.click(screen.getByRole("switch", { name: ud("access.appLabel") }));
    await user.click(
      await screen.findByRole("button", { name: ud("access.confirm.appOn.confirm") }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo actualizar el acceso. Intenta de nuevo.",
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
