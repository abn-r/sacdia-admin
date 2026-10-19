/**
 * Tests for MembershipConsentVerifyDialog.
 *
 * Covers: confirm is gated on evidence + the "I verified the signed form"
 * checkbox, upload validation (type/size, HEIC) and call, verify payload
 * (approve on/off), approve_error handling (consent stays verified) and
 * error-code -> translated message mapping (never `details`).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
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
const mockUpload = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockVerify = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    getConsentEvidence: (...args: unknown[]) => mockGetEvidence(...args),
    uploadConsentEvidence: (...args: unknown[]) => mockUpload(...args),
    verifyConsent: (...args: unknown[]) => mockVerify(...args),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastWarning = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
    warning: (msg: string) => mockToastWarning(msg),
  },
}));

import { MembershipConsentVerifyDialog } from "@/components/membership/membership-consent-verify-dialog";
import { ApiError } from "@/lib/api/client";

const dialogMsg = messages.membership.consent.dialog;
const errorsMsg = messages.membership.consent.errors;

function makeRequest(evidenceUploaded: boolean): MembershipRequest {
  return {
    assignment_id: "asg-1",
    club_section_id: 42,
    role_id: "role-1",
    status: "pending",
    created_at: "2026-10-01T00:00:00.000Z",
    users: {
      user_id: "u-1",
      name: "Ana",
      paternal_last_name: "Pérez",
      maternal_last_name: null,
      email: null,
    },
    roles: { role_id: "role-1", role_name: "member" },
    consent: {
      required: true,
      dependent: true,
      guardianship_id: "g-1",
      status: "pending",
      evidence_uploaded: evidenceUploaded,
      guardians: [
        { display_name: "María Pérez", relationship_type_name: "Madre", is_primary: true },
      ],
    },
  };
}

const IMAGE_EVIDENCE = {
  url: "https://r2.example/signed?sig=abc",
  expires_in: 900,
  content_type: "image/jpeg",
  uploaded_at: "2026-10-02T12:00:00.000Z",
  uploaded_by_display_name: "María Pérez",
};

function renderDialog(request: MembershipRequest) {
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
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { onOpenChange, onSuccess };
}

const confirmButton = () => screen.getByRole("button", { name: dialogMsg.confirm });

describe("MembershipConsentVerifyDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEvidence.mockResolvedValue(IMAGE_EVIDENCE);
    mockUpload.mockResolvedValue({ evidence_id: "e-1" });
    mockVerify.mockResolvedValue({
      guardianship: { guardianship_id: "g-1", consent_status: "verified" },
      assignment: { assignment_id: "asg-1" },
      approve_error: null,
    });
  });

  afterEach(() => cleanup());

  it("shows the guardians and the signed form (image) via the signed URL", async () => {
    renderDialog(makeRequest(true));

    expect(screen.getByText("María Pérez", { selector: "span" })).toBeInTheDocument();
    const img = await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
    expect(img).toHaveAttribute("src", IMAGE_EVIDENCE.url);
    expect(mockGetEvidence).toHaveBeenCalledWith(42, "asg-1");
  });

  it("renders a PDF as an external link instead of an inline image", async () => {
    mockGetEvidence.mockResolvedValue({ ...IMAGE_EVIDENCE, content_type: "application/pdf" });
    renderDialog(makeRequest(true));

    const link = await screen.findByRole("link", { name: dialogMsg.evidence_open_pdf });
    expect(link).toHaveAttribute("href", IMAGE_EVIDENCE.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.queryByRole("img", { name: dialogMsg.evidence_image_alt })).toBeNull();
  });

  it("without evidence: shows the upload control, does not fetch, and Confirm is disabled", async () => {
    const user = userEvent.setup();
    renderDialog(makeRequest(false));

    expect(screen.getByText(dialogMsg.evidence_none)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dialogMsg.upload })).toBeInTheDocument();
    expect(mockGetEvidence).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    expect(confirmButton()).toBeDisabled();
  });

  it("with evidence: Confirm stays disabled until the checkbox is ticked", async () => {
    const user = userEvent.setup();
    renderDialog(makeRequest(true));
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });

    expect(confirmButton()).toBeDisabled();
    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    expect(confirmButton()).toBeEnabled();
    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    expect(confirmButton()).toBeDisabled();
  });

  it("verifies and approves by default, then closes and refreshes", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onSuccess } = renderDialog(makeRequest(true));
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });

    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(confirmButton());

    await waitFor(() => expect(mockVerify).toHaveBeenCalledOnce());
    expect(mockVerify).toHaveBeenCalledWith(42, "asg-1", {
      confirm_paper_form_reviewed: true,
      approve: true,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      messages.membership.consent.toasts.verified_approved.replace("{name}", "Ana Pérez"),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("sends approve=false when the approve option is unticked", async () => {
    const user = userEvent.setup();
    renderDialog(makeRequest(true));
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });

    await user.click(screen.getByLabelText(dialogMsg.approve_checkbox));
    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(confirmButton());

    await waitFor(() => expect(mockVerify).toHaveBeenCalledOnce());
    expect(mockVerify.mock.calls[0][2]).toEqual({
      confirm_paper_form_reviewed: true,
      approve: false,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      messages.membership.consent.toasts.verified.replace("{name}", "Ana Pérez"),
    );
  });

  it("approve_error: consent is verified, shows a warning with the mapped reason and still refreshes", async () => {
    mockVerify.mockResolvedValue({
      guardianship: { guardianship_id: "g-1", consent_status: "verified" },
      assignment: null,
      approve_error: "MR_NOT_FOUND",
    });
    const user = userEvent.setup();
    const { onOpenChange, onSuccess } = renderDialog(makeRequest(true));
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });

    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(confirmButton());

    await waitFor(() => expect(mockToastWarning).toHaveBeenCalledOnce());
    expect(mockToastWarning).toHaveBeenCalledWith(
      messages.membership.consent.toasts.approve_failed.replace(
        "{reason}",
        errorsMsg.MR_NOT_FOUND,
      ),
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("an unknown approve_error code falls back to the generic approve message", async () => {
    mockVerify.mockResolvedValue({
      guardianship: { guardianship_id: "g-1", consent_status: "verified" },
      assignment: null,
      approve_error: "SOMETHING_NEW",
    });
    const user = userEvent.setup();
    renderDialog(makeRequest(true));
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(confirmButton());

    await waitFor(() => expect(mockToastWarning).toHaveBeenCalledOnce());
    expect(mockToastWarning.mock.calls[0][0]).toContain(errorsMsg.approve);
  });

  it("maps the error code (not the server message) and keeps the dialog open", async () => {
    mockVerify.mockRejectedValue(
      new ApiError("mensaje del servidor", 403, {
        code: "GUARDIANSHIP_CUSTODIAN_SELF_VERIFY",
        details: { should: "be ignored" },
      }),
    );
    const user = userEvent.setup();
    const { onOpenChange, onSuccess } = renderDialog(makeRequest(true));
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(confirmButton());

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(errorsMsg.GUARDIANSHIP_CUSTODIAN_SELF_VERIFY),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("uses the generic verify message for an unknown failure", async () => {
    mockVerify.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderDialog(makeRequest(true));
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(confirmButton());

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(errorsMsg.verify));
  });

  describe("upload", () => {
    function pick(file: File) {
      const input = screen.getByTestId("consent-file-input") as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
    }

    it("uploads a valid file, then loads the new evidence", async () => {
      renderDialog(makeRequest(false));
      const file = new File(["%PDF-1.4"], "ficha.pdf", { type: "application/pdf" });
      mockGetEvidence.mockResolvedValue({ ...IMAGE_EVIDENCE, content_type: "application/pdf" });

      pick(file);

      await waitFor(() => expect(mockUpload).toHaveBeenCalledOnce());
      expect(mockUpload).toHaveBeenCalledWith(42, "asg-1", file);
      expect(
        await screen.findByRole("link", { name: dialogMsg.evidence_open_pdf }),
      ).toBeInTheDocument();
      expect(mockToastSuccess).toHaveBeenCalledWith(
        messages.membership.consent.toasts.evidence_uploaded,
      );
      expect(screen.getByRole("button", { name: dialogMsg.replace })).toBeInTheDocument();
    });

    it("rejects HEIC client-side without calling the API", async () => {
      renderDialog(makeRequest(false));
      pick(new File(["x"], "foto.heic", { type: "image/heic" }));

      expect(
        await screen.findByText(messages.membership.consent.validation.type),
      ).toBeInTheDocument();
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("rejects files over 10 MB client-side", async () => {
      renderDialog(makeRequest(false));
      const big = new File(["x"], "grande.jpg", { type: "image/jpeg" });
      Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
      pick(big);

      expect(
        await screen.findByText(messages.membership.consent.validation.size),
      ).toBeInTheDocument();
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("maps a server upload error code to a translated toast", async () => {
      mockUpload.mockRejectedValue(
        new ApiError("x", 400, { code: "FILE_TYPE_INVALID" }),
      );
      renderDialog(makeRequest(false));
      pick(new File(["x"], "a.jpg", { type: "image/jpeg" }));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith(errorsMsg.FILE_TYPE_INVALID),
      );
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it("S3: a multer 413 without a code shows the FILE_TOO_LARGE message", async () => {
      mockUpload.mockRejectedValue(new ApiError("Payload Too Large", 413, null));
      renderDialog(makeRequest(false));
      pick(new File(["x"], "a.jpg", { type: "image/jpeg" }));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith(errorsMsg.FILE_TOO_LARGE),
      );
      expect(mockToastError).not.toHaveBeenCalledWith(errorsMsg.upload);
    });

    it("maps GUARDIANSHIP_CONSENT_ALREADY_VERIFIED (409) on upload", async () => {
      mockUpload.mockRejectedValue(
        new ApiError("x", 409, { code: "GUARDIANSHIP_CONSENT_ALREADY_VERIFIED" }),
      );
      renderDialog(makeRequest(false));
      pick(new File(["x"], "a.jpg", { type: "image/jpeg" }));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith(
          errorsMsg.GUARDIANSHIP_CONSENT_ALREADY_VERIFIED,
        ),
      );
    });
  });

  it("maps GUARDIANSHIP_GUARDIAN_SELF_VERIFY (403) on verify", async () => {
    mockVerify.mockRejectedValue(
      new ApiError("x", 403, { code: "GUARDIANSHIP_GUARDIAN_SELF_VERIFY" }),
    );
    const user = userEvent.setup();
    renderDialog(makeRequest(true));
    await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
    await user.click(screen.getByLabelText(dialogMsg.confirm_checkbox));
    await user.click(confirmButton());

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(errorsMsg.GUARDIANSHIP_GUARDIAN_SELF_VERIFY),
    );
  });

  describe("signed URL expiry (S5)", () => {
    const FRESH_EVIDENCE = { ...IMAGE_EVIDENCE, url: "https://r2.example/signed?sig=fresh" };

    it("refetches the signed URL once when the image fails to load, and retries with the new URL", async () => {
      mockGetEvidence
        .mockResolvedValueOnce(IMAGE_EVIDENCE)
        .mockResolvedValue(FRESH_EVIDENCE);
      renderDialog(makeRequest(true));

      const img = await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
      expect(img).toHaveAttribute("src", IMAGE_EVIDENCE.url);

      fireEvent.error(img);

      await waitFor(() => expect(mockGetEvidence).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.getByRole("img", { name: dialogMsg.evidence_image_alt })).toHaveAttribute(
          "src",
          FRESH_EVIDENCE.url,
        ),
      );
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("does not loop: a second failure shows an error with a reload button and no further refetch", async () => {
      mockGetEvidence
        .mockResolvedValueOnce(IMAGE_EVIDENCE)
        .mockResolvedValue(FRESH_EVIDENCE);
      const user = userEvent.setup();
      renderDialog(makeRequest(true));

      fireEvent.error(await screen.findByRole("img", { name: dialogMsg.evidence_image_alt }));
      await waitFor(() => expect(mockGetEvidence).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.getByRole("img", { name: dialogMsg.evidence_image_alt })).toHaveAttribute(
          "src",
          FRESH_EVIDENCE.url,
        ),
      );

      fireEvent.error(screen.getByRole("img", { name: dialogMsg.evidence_image_alt }));

      expect(await screen.findByRole("alert")).toHaveTextContent(errorsMsg.evidence_load);
      expect(mockGetEvidence).toHaveBeenCalledTimes(2);

      // Manual reload still works and clears the error once the image loads.
      await user.click(screen.getByRole("button", { name: dialogMsg.evidence_reload }));
      await waitFor(() => expect(mockGetEvidence).toHaveBeenCalledTimes(3));
      fireEvent.load(screen.getByRole("img", { name: dialogMsg.evidence_image_alt }));
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    });

    it("a successful load re-arms the single retry for a later expiry", async () => {
      mockGetEvidence.mockResolvedValue(IMAGE_EVIDENCE);
      renderDialog(makeRequest(true));

      const img = await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
      fireEvent.error(img);
      await waitFor(() => expect(mockGetEvidence).toHaveBeenCalledTimes(2));

      fireEvent.load(screen.getByRole("img", { name: dialogMsg.evidence_image_alt }));
      fireEvent.error(screen.getByRole("img", { name: dialogMsg.evidence_image_alt }));

      await waitFor(() => expect(mockGetEvidence).toHaveBeenCalledTimes(3));
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("keeps the signed URL fresh while the dialog stays open (proactive refresh before expiry)", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        mockGetEvidence.mockResolvedValue({ ...IMAGE_EVIDENCE, expires_in: 900 });
        renderDialog(makeRequest(true));
        await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
        expect(mockGetEvidence).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(13 * 60 * 1000);
        expect(mockGetEvidence).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
        expect(mockGetEvidence.mock.calls.length).toBeGreaterThanOrEqual(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

describe("consent error messages", () => {
  it("every recognised error code has a translation in every locale", async () => {
    const { CONSENT_ERROR_CODES } = await import("@/lib/api/membership-requests");
    const locales = {
      es: messages,
      en: (await import("../../../messages/en.json")).default,
      fr: (await import("../../../messages/fr.json")).default,
      "pt-BR": (await import("../../../messages/pt-BR.json")).default,
    } as const;
    for (const [locale, bundle] of Object.entries(locales)) {
      const errors = bundle.membership.consent.errors as Record<string, string>;
      for (const code of CONSENT_ERROR_CODES) {
        expect(errors[code], `${locale}:${code}`).toBeTruthy();
      }
    }
  });
});
