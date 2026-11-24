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
  ApiError: class ApiError extends Error {},
}));
vi.mock("@/lib/api/admin-users", () => ({
  resendAdminUserInvitationFromClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { UserDetailAsideActions } from "@/components/users/detail/aside-actions";

function renderActions(props: Partial<React.ComponentProps<typeof UserDetailAsideActions>> = {}) {
  return renderWithIntl(
    <UserDetailAsideActions
      userId="user-1"
      fullName="Mateo Herrera"
      active
      canManageAccess
      canResendInvitation={false}
      accessHref="?tab=access"
      {...props}
    />,
  );
}

describe("UserDetailAsideActions", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue(undefined);
    mockRefresh.mockReset();
  });
  afterEach(cleanup);

  it("links the role action to the access tab", () => {
    renderActions();
    expect(screen.getByRole("link", { name: ud("actions.assignRole") })).toHaveAttribute(
      "href",
      "?tab=access",
    );
  });

  it("hides deactivation without the access-management gate", () => {
    renderActions({ canManageAccess: false });
    expect(screen.queryByRole("button", { name: ud("actions.deactivate") })).toBeNull();
  });

  it("deactivating asks first and PATCHes active:false only after confirming", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: ud("actions.deactivate") }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(mockApiRequest).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: ud("deactivate.confirm") }));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/admin/users/user-1",
        expect.objectContaining({ method: "PATCH", body: { active: false } }),
      ),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("an inactive account offers reactivation instead", async () => {
    const user = userEvent.setup();
    renderActions({ active: false });

    expect(screen.queryByRole("button", { name: ud("actions.deactivate") })).toBeNull();
    await user.click(screen.getByRole("button", { name: ud("actions.reactivate") }));
    await user.click(await screen.findByRole("button", { name: ud("reactivate.confirm") }));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/admin/users/user-1",
        expect.objectContaining({ body: { active: true } }),
      ),
    );
  });
});
