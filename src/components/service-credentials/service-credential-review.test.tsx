import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type {
  ServiceCredentialReviewDetail,
  ServiceCredentialReviewItem,
  ServiceCredentialReviewPage,
} from "@/lib/api/service-credentials";
import type { AuthUser } from "@/lib/auth/types";
import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const authState = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ user: authState.user }) }));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockList = vi.fn<(...args: any[]) => Promise<ServiceCredentialReviewPage>>();
const mockDetail = vi.fn<(...args: any[]) => Promise<ServiceCredentialReviewDetail>>();
const mockApprove = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockReject = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/service-credentials", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/service-credentials")>();
  return {
    ...original,
    listServiceCredentialReviews: (...args: unknown[]) => mockList(...args),
    getServiceCredentialReview: (...args: unknown[]) => mockDetail(...args),
    approveServiceCredential: (...args: unknown[]) => mockApprove(...args),
    rejectServiceCredential: (...args: unknown[]) => mockReject(...args),
  };
});

vi.mock("@/components/shared/pdf-inline-viewer", () => ({
  PdfInlineViewer: ({ src, title }: { src: string; title: string }) => (
    <iframe data-testid="pdf-viewer" src={src} title={title} />
  ),
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { ServiceCredentialReviewQueue } from "@/components/service-credentials/service-credential-review-queue";
import { ServiceCredentialReviewSheet } from "@/components/service-credentials/service-credential-review-sheet";

const m = messages.service_credentials;

function item(id: string, name: string, overrides: Partial<ServiceCredentialReviewItem> = {}): ServiceCredentialReviewItem {
  return {
    credential_id: id,
    user: { user_id: `u-${id}`, name, photo_url: null },
    club_name: "Club Águilas",
    type: "COUNSELOR_TRAINING",
    completed_at: "2026-09-15",
    status: "PENDING_REVIEW",
    created_at: "2026-10-01T10:00:00.000Z",
    reviewed_at: null,
    reviewer_role: null,
    ...overrides,
  };
}

function page(items: ServiceCredentialReviewItem[], total = items.length): ServiceCredentialReviewPage {
  return { items, meta: { page: 1, limit: 20, total, counts: { pending: 3, approved: 5, rejected: 1 } } };
}

function detail(overrides: Partial<ServiceCredentialReviewDetail> = {}): ServiceCredentialReviewDetail {
  return {
    ...item("c1", "Ana López"),
    file_url: "https://files.example.com/c1.png?sig=abc",
    file_name: "constancia.png",
    mime_type: "image/png",
    decision_reason: null,
    expires_at: null,
    ...overrides,
  };
}

function setUser(opts: { reviewer: boolean }) {
  authState.user = opts.reviewer
    ? buildAuthUser({
        roles: ["director-lf"],
        permissions: ["service_credentials:review"],
        capabilities: ["service_credentials.review"],
      })
    : buildAuthUser({ roles: ["director-lf"], permissions: ["users:read"], capabilities: [] });
}

function renderWithProviders(ui: React.ReactElement, client?: QueryClient) {
  const queryClient =
    client ?? new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const result = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return { ...result, queryClient };
}

beforeEach(() => {
  mockList.mockReset();
  mockDetail.mockReset();
  mockApprove.mockReset();
  mockReject.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  setUser({ reviewer: true });
  mockList.mockResolvedValue(page([item("c1", "Ana López"), item("c2", "Luis Pérez")]));
  mockDetail.mockResolvedValue(detail());
});

afterEach(() => cleanup());

describe("ServiceCredentialReviewQueue", () => {
  it("shows a skeleton, then the rows with their dates", async () => {
    renderWithProviders(<ServiceCredentialReviewQueue />);
    expect(screen.getByTestId("service-credentials-loading")).toBeInTheDocument();

    expect(await screen.findByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
    expect(screen.getAllByText("Club Águilas")).toHaveLength(2);
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING_REVIEW", page: 1, limit: 20 }));
  });

  it("renders the three tabs with the counts of the whole scope", async () => {
    renderWithProviders(<ServiceCredentialReviewQueue />);
    await screen.findByText("Ana López");

    expect(screen.getByRole("tab", { name: `${m.tabs.pending} 3` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: `${m.tabs.approved} 5` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: `${m.tabs.rejected} 1` })).toBeInTheDocument();
  });

  it("switches tab, refetches by status and shows status badge and reviewer role", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceCredentialReviewQueue />);
    await screen.findByText("Ana López");

    mockList.mockResolvedValue(
      page([item("c9", "Marta Ruiz", { status: "APPROVED", reviewer_role: "director-lf", reviewed_at: "2026-10-05T12:00:00.000Z" })]),
    );
    await user.click(screen.getByRole("tab", { name: new RegExp(m.tabs.approved) }));

    expect(await screen.findByText("Marta Ruiz")).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ status: "APPROVED", page: 1 }));
    expect(screen.getByText(m.status.APPROVED)).toBeInTheDocument();
    expect(screen.getByText(/Director de campo local/)).toBeInTheDocument();
    // Counts stay visible while the other tab loads.
    expect(screen.getByRole("tab", { name: `${m.tabs.pending} 3` })).toBeInTheDocument();
  });

  it("debounces the name search and resets to the first page", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceCredentialReviewQueue />);
    await screen.findByText("Ana López");

    await user.type(screen.getByLabelText(m.search.label), "ana");

    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ search: "ana", page: 1 })));
  });

  it("shows the empty state of the tab, and a no-results state with a clear action when searching", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(page([]));
    renderWithProviders(<ServiceCredentialReviewQueue />);
    expect(await screen.findByText(m.empty.pending.title)).toBeInTheDocument();

    await user.type(screen.getByLabelText(m.search.label), "zzz");
    expect(await screen.findByText(m.empty.noResultsTitle)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: m.empty.clearSearch }));
    expect(await screen.findByText(m.empty.pending.title)).toBeInTheDocument();
  });

  it("shows an error banner with retry instead of an empty list", async () => {
    const user = userEvent.setup();
    mockList.mockRejectedValueOnce(new Error("boom"));
    renderWithProviders(<ServiceCredentialReviewQueue />);

    expect(await screen.findByText(m.toasts.listFailed)).toBeInTheDocument();
    expect(screen.queryByText(m.empty.pending.title)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByText("Ana López")).toBeInTheDocument();
  });

  it("opens the detail of the clicked row", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceCredentialReviewQueue />);
    await screen.findByText("Ana López");

    await user.click(screen.getByRole("button", { name: `${m.table.review}: Ana López` }));

    await waitFor(() => expect(mockDetail).toHaveBeenCalledWith("c1"));
    expect(await screen.findByRole("img", { name: "Constancia de Ana López" })).toBeInTheDocument();
  });
});

describe("ServiceCredentialReviewSheet", () => {
  function renderSheet(onOpenChange = vi.fn()) {
    const utils = renderWithProviders(
      <ServiceCredentialReviewSheet credentialId="c1" open onOpenChange={onOpenChange} />,
    );
    return { ...utils, onOpenChange };
  }

  it("previews an image and links to the file in a new tab", async () => {
    renderSheet();
    expect(await screen.findByRole("img", { name: "Constancia de Ana López" })).toHaveAttribute(
      "src",
      "https://files.example.com/c1.png?sig=abc",
    );
    const link = screen.getByRole("link", { name: m.detail.preview.openInNewTab });
    expect(link).toHaveAttribute("href", "https://files.example.com/c1.png?sig=abc");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("previews a PDF in the inline viewer", async () => {
    mockDetail.mockResolvedValue(detail({ mime_type: "application/pdf", file_name: "c.pdf", file_url: "https://f.example.com/c.pdf" }));
    renderSheet();
    expect(await screen.findByTestId("pdf-viewer")).toHaveAttribute("src", "https://f.example.com/c.pdf");
  });

  it("refetches the detail every time it opens (signed URL expires)", async () => {
    const { rerender, queryClient, onOpenChange } = renderSheet();
    await screen.findByRole("img", { name: /Constancia de/ });
    expect(mockDetail).toHaveBeenCalledTimes(1);

    const ui = (open: boolean) => (
      <NextIntlClientProvider locale="es" messages={messages}>
        <QueryClientProvider client={queryClient}>
          <ServiceCredentialReviewSheet credentialId="c1" open={open} onOpenChange={onOpenChange} />
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
    rerender(ui(false));
    rerender(ui(true));
    await waitFor(() => expect(mockDetail).toHaveBeenCalledTimes(2));
  });

  it("approves without expiry, toasts, refreshes the list and closes", async () => {
    const user = userEvent.setup();
    mockApprove.mockResolvedValue(detail({ status: "APPROVED" }));
    const { onOpenChange, queryClient } = renderSheet();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(await screen.findByRole("button", { name: m.detail.approve.action }));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith("c1", {}));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(m.toasts.approved));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["service-credentials", "review", "list"] });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sends a future expiry date and blocks a past one before calling the API", async () => {
    const user = userEvent.setup();
    mockApprove.mockResolvedValue(detail({ status: "APPROVED" }));
    renderSheet();
    const input = await screen.findByLabelText(m.detail.approve.expiresLabel);

    fireEvent.change(input, { target: { value: "2020-01-01" } });
    await user.click(screen.getByRole("button", { name: m.detail.approve.action }));
    expect(await screen.findByText(m.detail.approve.expiresPast)).toBeInTheDocument();
    expect(mockApprove).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "2099-12-31" } });
    await user.click(screen.getByRole("button", { name: m.detail.approve.action }));
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith("c1", { expires_at: "2099-12-31" }));
  });

  it("asks for confirmation and a valid reason before rejecting", async () => {
    const user = userEvent.setup();
    mockReject.mockResolvedValue(detail({ status: "REJECTED" }));
    const { onOpenChange } = renderSheet();

    await user.click(await screen.findByRole("button", { name: m.detail.reject.action }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(m.detail.reject.title)).toBeInTheDocument();

    // too short: validation message, no call
    await user.type(within(dialog).getByLabelText(new RegExp(m.detail.reject.reasonLabel)), "mal");
    await user.click(within(dialog).getByRole("button", { name: m.detail.reject.confirm }));
    expect(await within(dialog).findByText("Escribe al menos 5 caracteres.")).toBeInTheDocument();
    expect(mockReject).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(new RegExp(m.detail.reject.reasonLabel)), " ilegible");
    await user.click(within(dialog).getByRole("button", { name: m.detail.reject.confirm }));

    await waitFor(() => expect(mockReject).toHaveBeenCalledWith("c1", "mal ilegible"));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(m.toasts.rejected));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("rejects a reason longer than 500 characters without calling the API", async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(await screen.findByRole("button", { name: m.detail.reject.action }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByLabelText(new RegExp(m.detail.reject.reasonLabel)), {
      target: { value: "x".repeat(501) },
    });
    await user.click(within(dialog).getByRole("button", { name: m.detail.reject.confirm }));
    expect(await within(dialog).findByText("El motivo no puede pasar de 500 caracteres.")).toBeInTheDocument();
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("maps 409 NOT_PENDING to its message, refreshes the list and reloads the detail", async () => {
    const user = userEvent.setup();
    mockApprove.mockRejectedValue(new ApiError("conflict", 409, { code: "SERVICE_CREDENTIAL_NOT_PENDING" }));
    const { queryClient, onOpenChange } = renderSheet();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(await screen.findByRole("button", { name: m.detail.approve.action }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(m.errors.notPending));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["service-credentials", "review", "list"] });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    await waitFor(() => expect(mockDetail.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("maps 404 NOT_FOUND to its message and closes the sheet", async () => {
    const user = userEvent.setup();
    mockApprove.mockRejectedValue(new ApiError("nope", 404, { code: "SERVICE_CREDENTIAL_NOT_FOUND" }));
    const { onOpenChange } = renderSheet();

    await user.click(await screen.findByRole("button", { name: m.detail.approve.action }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(m.errors.notFound));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows SELF_REVIEW inline and keeps the sheet open", async () => {
    const user = userEvent.setup();
    mockApprove.mockRejectedValue(new ApiError("self", 403, { code: "SERVICE_CREDENTIAL_SELF_REVIEW" }));
    const { onOpenChange } = renderSheet();

    await user.click(await screen.findByRole("button", { name: m.detail.approve.action }));

    expect(await screen.findByText(m.errors.selfReview)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("keeps the reject dialog open and shows a server error next to the reason", async () => {
    const user = userEvent.setup();
    mockReject.mockRejectedValue(new ApiError("bad", 400, { code: "SOMETHING_ELSE" }));
    renderSheet();
    await user.click(await screen.findByRole("button", { name: m.detail.reject.action }));
    const dialog = await screen.findByRole("alertdialog");
    await user.type(within(dialog).getByLabelText(new RegExp(m.detail.reject.reasonLabel)), "Documento ilegible");
    await user.click(within(dialog).getByRole("button", { name: m.detail.reject.confirm }));

    expect(await within(dialog).findByText(m.errors.generic)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("hides the decision buttons for an already reviewed credential", async () => {
    mockDetail.mockResolvedValue(
      detail({ status: "REJECTED", decision_reason: "Archivo ilegible", reviewer_role: "coordinator", reviewed_at: "2026-10-03T00:00:00.000Z" }),
    );
    renderSheet();
    expect(await screen.findByText("Archivo ilegible")).toBeInTheDocument();
    expect(screen.getByText("Coordinador")).toBeInTheDocument();
    expect(screen.getByText(m.detail.alreadyReviewed)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: m.detail.approve.action })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: m.detail.reject.action })).not.toBeInTheDocument();
  });

  it("does not render approve or reject without the review capability", async () => {
    setUser({ reviewer: false });
    renderSheet();
    await screen.findByRole("img", { name: /Constancia de/ });
    expect(screen.queryByRole("button", { name: m.detail.approve.action })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: m.detail.reject.action })).not.toBeInTheDocument();
  });
});
