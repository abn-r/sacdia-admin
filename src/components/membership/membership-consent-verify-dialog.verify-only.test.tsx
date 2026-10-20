/**
 * MembershipConsentVerifyDialog with canApprove={false} (verify-only reviewers).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import messages from "../../../messages/es.json";
import type { MembershipRequest } from "@/lib/api/membership-requests";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockGetEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockVerify = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    getConsentEvidence: (...args: unknown[]) => mockGetEvidence(...args),
    verifyConsent: (...args: unknown[]) => mockVerify(...args),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
    warning: vi.fn(),
  },
}));

import { MembershipConsentVerifyDialog } from "@/components/membership/membership-consent-verify-dialog";
import { ApiError } from "@/lib/api/client";

const dialogMsg = messages.membership.consent.dialog;
const errorsMsg = messages.membership.consent.errors;

const request: MembershipRequest = {
  assignment_id: "asg-1",
  club_section_id: 42,
  status: "pending",
  created_at: "2026-10-01T00:00:00.000Z",
  users: { user_id: "u-1", name: "Ana", paternal_last_name: "Pérez", email: null },
  roles: { role_id: "r", role_name: "member" },
  consent: {
    required: true,
    dependent: true,
    guardianship_id: "g-1",
    status: "pending",
    evidence_uploaded: true,
    guardians: [{ display_name: "María Pérez", relationship_type_name: "Madre", is_primary: true }],
  },
};

function renderDialog(canApprove: boolean | undefined) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <MembershipConsentVerifyDialog
          open
          clubSectionId={42}
          request={request}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
          {...(canApprove === undefined ? {} : { canApprove })}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { onOpenChange, onSuccess };
}

describe("MembershipConsentVerifyDialog canApprove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEvidence.mockResolvedValue({
      url: "https://r2.example/signed",
      expires_in: 900,
      content_type: "image/jpeg",
      uploaded_at: "2026-10-02T12:00:00.000Z",
    });
    mockVerify.mockResolvedValue({
      guardianship: { guardianship_id: "g-1", consent_status: "verified" },
      assignment: null,
      approve_error: null,
    });
  });

  afterEach(() => cleanup());

  it("canApprove=false: no approve checkbox, explains that a director approves later", async () => {
    renderDialog(false);
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });

    expect(screen.queryByLabelText(dialogMsg.approve_checkbox)).toBeNull();
    expect(screen.getByText(dialogMsg.verify_only_note)).toBeInTheDocument();
  });

  it("canApprove=false: sends approve:false and shows the verified-only toast", async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderDialog(false);
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });

    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(screen.getByRole("button", { name: dialogMsg.confirm }));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledOnce());
    expect(mockVerify.mock.calls[0][2]).toEqual({
      confirm_paper_form_reviewed: true,
      approve: false,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      messages.membership.consent.toasts.verified.replace("{name}", "Ana Pérez"),
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("default keeps the approve checkbox ticked and sends approve:true (regression)", async () => {
    const user = userEvent.setup();
    renderDialog(undefined);
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });

    expect(screen.getByLabelText(dialogMsg.approve_checkbox)).toBeChecked();
    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(screen.getByRole("button", { name: dialogMsg.confirm }));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledOnce());
    expect(mockVerify.mock.calls[0][2]).toEqual({
      confirm_paper_form_reviewed: true,
      approve: true,
    });
  });

  it("maps a 403 GUARD_CLUB_SCOPE_REQUIRED (section left the coordinator scope) by code", async () => {
    mockVerify.mockRejectedValue(
      new ApiError("Forbidden", 403, { code: "GUARD_CLUB_SCOPE_REQUIRED", message: "raw" }),
    );
    const user = userEvent.setup();
    const { onSuccess } = renderDialog(false);
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });

    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(screen.getByRole("button", { name: dialogMsg.confirm }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(errorsMsg.GUARD_CLUB_SCOPE_REQUIRED),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
