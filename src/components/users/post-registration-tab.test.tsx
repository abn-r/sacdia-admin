/**
 * PostRegistrationTab: only the current state and what is missing (no step
 * bar), onboarding modes, forcing a step behind a confirmation, and the
 * invitation block that resends while the invitation is pending.
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import messages from "../../../messages/es.json";
import { renderWithIntl, ud } from "@/components/users/detail/test-utils";
import type { PostRegistrationStatus } from "@/lib/api/post-registration";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockResend = vi.fn<(...args: any[]) => Promise<void>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/admin-users", () => ({
  resendAdminUserInvitationFromClient: (...args: unknown[]) => mockResend(...args),
}));

const mockStep1 = vi.fn();
const mockStep2 = vi.fn();
vi.mock("@/lib/post-registration/actions", () => ({
  completeStep1Action: (...args: unknown[]) => mockStep1(...args),
  completeStep2Action: (...args: unknown[]) => mockStep2(...args),
}));

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

import { PostRegistrationTab } from "@/components/users/post-registration-tab";
import { ApiError } from "@/lib/api/client";

const p = messages.users.postRegistration;

function status(overrides: Partial<PostRegistrationStatus> = {}): PostRegistrationStatus {
  return {
    complete: false,
    steps: { profilePicture: false, personalInfo: false, clubSelection: false },
    nextStep: "profilePicture",
    dateCompleted: null,
    ...overrides,
  };
}

function renderTab(props: Partial<React.ComponentProps<typeof PostRegistrationTab>> = {}) {
  return renderWithIntl(
    <PostRegistrationTab
      userId="user-1"
      status={status()}
      photoStatus={{ has_photo: false }}
      canOverride
      {...props}
    />,
  );
}

function resetMocks() {
  mockResend.mockReset();
  mockStep1.mockReset();
  mockStep2.mockReset();
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
  mockRefresh.mockReset();
}

describe("PostRegistrationTab state", () => {
  beforeEach(resetMocks);
  afterEach(cleanup);

  it("shows the in-progress state and how many steps are missing", () => {
    renderTab();
    expect(screen.getByRole("heading", { name: ud("post.stateInProgress") })).toBeInTheDocument();
    // The count (3 steps) reaches the sentence, whatever the locale copy.
    expect(document.body.textContent).toMatch(/3/);
    // One row per step, no progress bar.
    expect(document.querySelectorAll("[data-step]")).toHaveLength(3);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("complete: says so and lists no pending step", () => {
    renderTab({
      status: status({
        complete: true,
        steps: { profilePicture: true, personalInfo: true, clubSelection: true },
        nextStep: null,
      }),
    });
    expect(screen.getByRole("heading", { name: ud("post.stateComplete") })).toBeInTheDocument();
    expect(screen.queryByText(p.step_status_pending)).toBeNull();
    expect(screen.queryByRole("button", { name: ud("post.forceStep") })).toBeNull();
  });

  it("club_exempt: the club step is not listed", () => {
    renderTab({ status: status({ onboarding_mode: "club_exempt" }) });
    expect(document.querySelectorAll("[data-step]")).toHaveLength(2);
    expect(document.querySelector('[data-step="clubSelection"]')).toBeNull();
  });

  it("panel_only: shows the notice and no steps", () => {
    renderTab({ status: status({ onboarding_mode: "panel_only" }) });
    expect(screen.getByText(p.panel_only_notice)).toBeInTheDocument();
    expect(document.querySelectorAll("[data-step]")).toHaveLength(0);
  });

  it("unknown mode value falls back to club (three steps)", () => {
    renderTab({ status: status({ onboarding_mode: "weird" as never }) });
    expect(document.querySelectorAll("[data-step]")).toHaveLength(3);
  });

  it("the club step cannot be forced and says only the person can", () => {
    renderTab();
    const clubRow = document.querySelector('[data-step="clubSelection"]') as HTMLElement;
    expect(within(clubRow).queryByRole("button")).toBeNull();
    expect(within(clubRow).getByText(ud("post.onlyThePerson"))).toBeInTheDocument();
  });

  it("without override permission: no force buttons and a notice", () => {
    renderTab({ canOverride: false });
    expect(screen.queryByRole("button", { name: ud("post.forceStep") })).toBeNull();
    expect(screen.getByText(ud("post.readonlyNotice"))).toBeInTheDocument();
  });

  it("does not claim a photo state when the photo check failed", () => {
    renderTab({ photoStatus: null });
    expect(screen.queryByText(p.photo_none_label)).toBeNull();
    expect(screen.queryByText(p.photo_has_label)).toBeNull();
  });
});

describe("PostRegistrationTab force complete", () => {
  beforeEach(resetMocks);
  afterEach(cleanup);

  it("asks for confirmation and only then calls the step action", async () => {
    mockStep1.mockResolvedValueOnce({ ok: true, message: "listo" });
    const user = userEvent.setup();
    renderTab();

    const row = document.querySelector('[data-step="profilePicture"]') as HTMLElement;
    await user.click(within(row).getByRole("button", { name: ud("post.forceStep") }));
    expect(mockStep1).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: ud("post.forceConfirm") }));
    await waitFor(() => expect(mockStep1).toHaveBeenCalledWith("user-1"));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("listo"));
  });

  it("step 2 uses its own action; a failure stays inline and does not toast success", async () => {
    mockStep2.mockResolvedValueOnce({ ok: false, error: "faltan datos" });
    const user = userEvent.setup();
    renderTab();

    const row = document.querySelector('[data-step="personalInfo"]') as HTMLElement;
    await user.click(within(row).getByRole("button", { name: ud("post.forceStep") }));
    await user.click(await screen.findByRole("button", { name: ud("post.forceConfirm") }));

    expect(await screen.findByRole("alert")).toHaveTextContent("faltan datos");
    expect(mockStep1).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});

describe("PostRegistrationTab invitation", () => {
  beforeEach(resetMocks);
  afterEach(cleanup);

  it("is hidden by default (invitation_pending missing)", () => {
    renderTab({ canResendInvitation: true });
    expect(screen.queryByRole("button", { name: p.resend_invitation })).toBeNull();
  });

  it("is hidden when pending but the actor cannot create users", () => {
    renderTab({ invitationPending: true, canResendInvitation: false });
    expect(screen.queryByRole("button", { name: p.resend_invitation })).toBeNull();
  });

  it("is hidden when the invitation was accepted", () => {
    renderTab({ invitationPending: false, canResendInvitation: true });
    expect(screen.queryByRole("button", { name: p.resend_invitation })).toBeNull();
  });

  it("resends and confirms with a success toast", async () => {
    mockResend.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderTab({ invitationPending: true, canResendInvitation: true });

    await user.click(screen.getByRole("button", { name: p.resend_invitation }));

    await waitFor(() => expect(mockResend).toHaveBeenCalledWith("user-1"));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(p.resend_invitation_success));
  });

  it.each([
    [409, "resend_invitation_already_accepted"],
    [429, "resend_invitation_rate_limited"],
    [503, "resend_invitation_unavailable"],
    [500, "resend_invitation_failed"],
  ] as const)("maps %s to its toast", async (statusCode, key) => {
    mockResend.mockRejectedValueOnce(new ApiError("x", statusCode, {}));
    const user = userEvent.setup();
    renderTab({ invitationPending: true, canResendInvitation: true });

    await user.click(screen.getByRole("button", { name: p.resend_invitation }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(p[key]));
    // Only an already-accepted invitation reloads the page (the action goes away).
    expect(mockRefresh).toHaveBeenCalledTimes(statusCode === 409 ? 1 : 0);
  });
});
