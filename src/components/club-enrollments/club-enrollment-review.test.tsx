import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { ClubEnrollmentItem, ClubEnrollmentPage } from "@/lib/api/club-enrollment-review";
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
const mockList = vi.fn<(...args: any[]) => Promise<ClubEnrollmentPage>>();
const mockApprove = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockReject = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/club-enrollment-review", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/club-enrollment-review")>();
  return {
    ...original,
    listClubEnrollmentQueue: (...args: unknown[]) => mockList(...args),
    approveClubEnrollment: (...args: unknown[]) => mockApprove(...args),
    rejectClubEnrollment: (...args: unknown[]) => mockReject(...args),
  };
});

vi.mock("@/lib/api/catalogs", () => ({
  getActiveEcclesiasticalYearId: () => Promise.resolve(7),
  listEcclesiasticalYears: () =>
    Promise.resolve([
      { ecclesiastical_year_id: 1, name: "2020", start_date: "2020-01-01", end_date: "2020-12-31", active: false },
      { ecclesiastical_year_id: 2, name: "2021", start_date: "2021-01-01", end_date: "2021-12-31", active: false },
      { ecclesiastical_year_id: 3, name: "2022", start_date: "2022-01-01", end_date: "2022-12-31", active: false },
      { ecclesiastical_year_id: 4, name: "2023", start_date: "2023-01-01", end_date: "2023-12-31", active: false },
      { ecclesiastical_year_id: 5, name: "2024", start_date: "2024-01-01", end_date: "2024-12-31", active: false },
      { ecclesiastical_year_id: 8, name: "2027", start_date: "2027-01-01", end_date: "2027-12-31", active: false },
      { ecclesiastical_year_id: 7, name: "2026", start_date: "2026-01-01", end_date: "2026-12-31", active: true },
      { ecclesiastical_year_id: 6, name: "2025", start_date: "2025-01-01", end_date: "2025-12-31", active: false },
    ]),
  listClubTypes: () => Promise.resolve([{ club_type_id: 2, name: "Conquistadores" }]),
}));
vi.mock("@/lib/api/geography", () => ({
  listLocalFields: () => Promise.resolve([{ local_field_id: 3, name: "Campo Norte", union_id: 1 }]),
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { ClubEnrollmentReviewQueue } from "@/components/club-enrollments/club-enrollment-review-queue";
import { ClubEnrollmentReviewSheet } from "@/components/club-enrollments/club-enrollment-review-sheet";

const m = messages.club_enrollments;

function item(id: string, club: string, overrides: Partial<ClubEnrollmentItem> = {}): ClubEnrollmentItem {
  return {
    enrollment_id: id,
    status: "pending_validation",
    ecclesiastical_year: { id: 7, name: "2026" },
    club: { id: 1, name: club },
    section: { id: 10, club_type_id: 2, club_type_name: "Conquistadores" },
    local_field: { id: 3, name: "Campo Norte" },
    address: "Calle 5 #123, Centro",
    latitude: 19.4326,
    longitude: -99.1332,
    meeting_days: ["Sábado"],
    meeting_schedule: [{ day: "Sábado", time: "10:00" }],
    souls_target: 12,
    fee: true,
    fee_amount: "1200.00",
    board: {
      director: { user_id: "u1", name: "Ana López" },
      deputies: [{ user_id: "u2", name: "Pedro Gómez" }],
      secretary: null,
      treasurer: { user_id: "u3", name: "Luis Pérez" },
      secretary_treasurer: null,
    },
    submitted_by: { user_id: "u1", name: "Ana López" },
    created_at: "2026-10-01T10:00:00.000Z",
    submitted_at: "2026-10-05T10:00:00.000Z",
    modified_at: null,
    reviewed_by: null,
    reviewer_role: null,
    reviewed_at: null,
    decision_reason: null,
    ...overrides,
  };
}

function page(items: ClubEnrollmentItem[], total = items.length): ClubEnrollmentPage {
  return { items, meta: { page: 1, limit: 20, total, counts: { pending: 3, approved: 5, rejected: 1 } } };
}

function setUser(opts: { reviewer: boolean }) {
  authState.user = opts.reviewer
    ? buildAuthUser({
        roles: ["director-lf"],
        permissions: ["club_enrollments:validate"],
        capabilities: ["club_enrollments.validate"],
      })
    : buildAuthUser({ roles: ["director-lf"], permissions: ["users:read"], capabilities: [] });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const result = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return { ...result, queryClient };
}

beforeEach(() => {
  mockList.mockReset();
  mockApprove.mockReset();
  mockReject.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  setUser({ reviewer: true });
  mockList.mockResolvedValue(page([item("e1", "Club Águilas"), item("e2", "Club Halcones")]));
});

afterEach(() => cleanup());

describe("ClubEnrollmentReviewQueue", () => {
  it("shows a skeleton, then the rows, querying the current year by default", async () => {
    renderWithProviders(<ClubEnrollmentReviewQueue />);
    expect(screen.getByTestId("club-enrollments-loading")).toBeInTheDocument();

    expect(await screen.findByText("Club Águilas")).toBeInTheDocument();
    expect(screen.getByText("Club Halcones")).toBeInTheDocument();
    expect(screen.getAllByText("Campo Norte").length).toBeGreaterThanOrEqual(2);
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending_validation", ecclesiasticalYearId: 7, page: 1, limit: 20 }),
    );
  });

  it("renders the three tabs with the counts of the whole scope", async () => {
    renderWithProviders(<ClubEnrollmentReviewQueue />);
    await screen.findByText("Club Águilas");

    expect(screen.getByRole("tab", { name: `${m.tabs.pending} 3` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: `${m.tabs.approved} 5` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: `${m.tabs.rejected} 1` })).toBeInTheDocument();
  });

  it("switches tab, refetches by status and shows the reviewer with its role", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClubEnrollmentReviewQueue />);
    await screen.findByText("Club Águilas");

    mockList.mockResolvedValue(
      page([
        item("e9", "Club Pumas", {
          status: "active",
          reviewed_by: { user_id: "r1", name: "Marta Ruiz" },
          reviewer_role: "director-lf",
          reviewed_at: "2026-10-05T12:00:00.000Z",
        }),
      ]),
    );
    await user.click(screen.getByRole("tab", { name: new RegExp(m.tabs.approved) }));

    expect(await screen.findByText("Club Pumas")).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ status: "active", page: 1 }));
    expect(screen.getByText(/Marta Ruiz · Director de campo local/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${m.table.view}: Club Pumas` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: `${m.tabs.pending} 3` })).toBeInTheDocument();
  });

  it("debounces the club search and resets to the first page", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClubEnrollmentReviewQueue />);
    await screen.findByText("Club Águilas");

    await user.type(screen.getByLabelText(m.search.label), "agu");

    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ search: "agu", page: 1 })));
  });

  it("sends the local field and club type filters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClubEnrollmentReviewQueue />);
    await screen.findByText("Club Águilas");

    await user.selectOptions(await screen.findByLabelText(m.filters.localField), "3");
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ localFieldId: 3 })));

    await user.selectOptions(screen.getByLabelText(m.filters.clubType), "2");
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ localFieldId: 3, clubTypeId: 2 })));

    const yearSelect = screen.getByLabelText(m.filters.year);
    // «Año vigente» + next + active + 4 previous; 2020 (id 1) is out of range.
    expect(within(yearSelect).getAllByRole("option").map((o) => o.textContent)).toEqual([
      m.filters.currentYear,
      "2027",
      "2026",
      "2025",
      "2024",
      "2023",
      "2022",
    ]);
    await user.selectOptions(yearSelect, "6");
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ ecclesiasticalYearId: 6 })));
  });

  it("shows the empty state of the tab, and a no-results state with a clear action when filtering", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(page([]));
    renderWithProviders(<ClubEnrollmentReviewQueue />);
    expect(await screen.findByText(m.empty.pending.title)).toBeInTheDocument();

    await user.type(screen.getByLabelText(m.search.label), "zzz");
    expect(await screen.findByText(m.empty.noResultsTitle)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: m.empty.clearFilters }));
    expect(await screen.findByText(m.empty.pending.title)).toBeInTheDocument();
  });

  it("shows an error banner with retry instead of an empty list", async () => {
    const user = userEvent.setup();
    mockList.mockRejectedValueOnce(new Error("boom"));
    renderWithProviders(<ClubEnrollmentReviewQueue />);

    expect(await screen.findByText(m.toasts.listFailed)).toBeInTheDocument();
    expect(screen.queryByText(m.empty.pending.title)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByText("Club Águilas")).toBeInTheDocument();
  });

  it("opens the sheet of the clicked row", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClubEnrollmentReviewQueue />);
    await screen.findByText("Club Águilas");

    await user.click(screen.getByRole("button", { name: `${m.table.review}: Club Águilas` }));

    expect(await screen.findByRole("heading", { name: "Club Águilas" })).toBeInTheDocument();
    expect(screen.getByText(m.detail.sections.meetings)).toBeInTheDocument();
  });
});

describe("ClubEnrollmentReviewSheet", () => {
  function renderSheet(enrollment: ClubEnrollmentItem = item("e1", "Club Águilas"), onOpenChange = vi.fn()) {
    const utils = renderWithProviders(<ClubEnrollmentReviewSheet item={enrollment} open onOpenChange={onOpenChange} />);
    return { ...utils, onOpenChange };
  }

  it("shows the submission date, falling back to created_at when submitted_at is null", async () => {
    const base = { created_at: "2026-10-01T15:00:00.000Z" };
    const first = renderSheet({ ...item("e1", "Club Águilas"), ...base, submitted_at: "2026-10-20T15:00:00.000Z" });
    const label = await screen.findByText(m.detail.fields.submittedAt);
    expect(label.nextElementSibling?.textContent).toMatch(/^20 /);
    first.unmount();
    renderSheet({ ...item("e1", "Club Águilas"), ...base, submitted_at: null });
    const fallback = await screen.findByText(m.detail.fields.submittedAt);
    expect(fallback.nextElementSibling?.textContent).toMatch(/^01 /);
  });

  it("shows header, meetings with a Google Maps link, goal and fee, board and submission", async () => {
    renderSheet();
    expect(await screen.findByRole("heading", { name: "Club Águilas" })).toBeInTheDocument();
    expect(screen.getByText("Conquistadores · 2026")).toBeInTheDocument();

    expect(screen.getByText("Calle 5 #123, Centro")).toBeInTheDocument();
    const map = screen.getByRole("link", { name: new RegExp(m.detail.openMap) });
    expect(map).toHaveAttribute("href", expect.stringContaining("https://www.google.com/maps?q=19.4326"));
    expect(map).toHaveAttribute("target", "_blank");
    expect(screen.getByText("Sábado · 10:00")).toBeInTheDocument();

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/^Sí, .*1[.,]?200/)).toBeInTheDocument();

    expect(screen.getByText("Pedro Gómez")).toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
    // secretary is null
    expect(screen.getAllByText(m.detail.unassigned)).toHaveLength(1);
    expect(screen.getByText(m.detail.sections.submission)).toBeInTheDocument();
    expect(screen.getByText(m.detail.boardHint)).toBeInTheDocument();
  });

  it("omits the map link without coordinates and shows the fee as «No» without fee", async () => {
    renderSheet(item("e1", "Club Águilas", { latitude: null, longitude: null, fee: false, fee_amount: null }));
    await screen.findByRole("heading", { name: "Club Águilas" });
    expect(screen.queryByRole("link", { name: new RegExp(m.detail.openMap) })).not.toBeInTheDocument();
    expect(screen.getByText(m.detail.feeNo)).toBeInTheDocument();
  });

  it("shows only the secretary-treasurer row when the board uses that single post", async () => {
    renderSheet(
      item("e1", "Club Águilas", {
        board: {
          director: { user_id: "u1", name: "Ana López" },
          deputies: [],
          secretary: null,
          treasurer: null,
          secretary_treasurer: { user_id: "u4", name: "Rosa Díaz" },
        },
      }),
    );
    await screen.findByRole("heading", { name: "Club Águilas" });
    expect(screen.getByText("Rosa Díaz")).toBeInTheDocument();
    expect(screen.getByText(m.detail.fields.secretaryTreasurer)).toBeInTheDocument();
    expect(screen.queryByText(m.detail.fields.treasurer)).not.toBeInTheDocument();
  });

  it("approves, toasts, refreshes the list and closes", async () => {
    const user = userEvent.setup();
    mockApprove.mockResolvedValue(item("e1", "Club Águilas", { status: "active" }));
    const { onOpenChange, queryClient } = renderSheet();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(await screen.findByRole("button", { name: m.detail.approve.action }));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith("e1"));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(m.toasts.approved));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["club-enrollments", "validation", "list"] });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("asks for confirmation and a valid reason before rejecting", async () => {
    const user = userEvent.setup();
    mockReject.mockResolvedValue(item("e1", "Club Águilas", { status: "rejected" }));
    const { onOpenChange } = renderSheet();

    await user.click(await screen.findByRole("button", { name: m.detail.reject.action }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(m.detail.reject.title)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(new RegExp(m.detail.reject.reasonLabel)), "mal");
    await user.click(within(dialog).getByRole("button", { name: m.detail.reject.confirm }));
    expect(await within(dialog).findByText("Escribe al menos 5 caracteres.")).toBeInTheDocument();
    expect(mockReject).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(new RegExp(m.detail.reject.reasonLabel)), " dirección");
    await user.click(within(dialog).getByRole("button", { name: m.detail.reject.confirm }));

    await waitFor(() => expect(mockReject).toHaveBeenCalledWith("e1", "mal dirección"));
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

  it("maps 409 NOT_PENDING to its message, refreshes the list and closes", async () => {
    const user = userEvent.setup();
    mockApprove.mockRejectedValue(new ApiError("conflict", 409, { code: "CE_ENROLLMENT_NOT_PENDING" }));
    const { queryClient, onOpenChange } = renderSheet();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(await screen.findByRole("button", { name: m.detail.approve.action }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(m.errors.notPending));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["club-enrollments", "validation", "list"] });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("maps 404 NOT_FOUND to its message and closes the sheet", async () => {
    const user = userEvent.setup();
    mockApprove.mockRejectedValue(new ApiError("nope", 404, { code: "CE_ENROLLMENT_NOT_FOUND" }));
    const { onOpenChange } = renderSheet();

    await user.click(await screen.findByRole("button", { name: m.detail.approve.action }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(m.errors.notFound));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows SELF_REVIEW inline and keeps the sheet open", async () => {
    const user = userEvent.setup();
    mockApprove.mockRejectedValue(new ApiError("self", 403, { code: "CE_SELF_REVIEW" }));
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
    await user.type(within(dialog).getByLabelText(new RegExp(m.detail.reject.reasonLabel)), "Falta dirección");
    await user.click(within(dialog).getByRole("button", { name: m.detail.reject.confirm }));

    expect(await within(dialog).findByText(m.errors.generic)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows the review block and hides the decision buttons for a reviewed enrollment", async () => {
    renderSheet(
      item("e1", "Club Águilas", {
        status: "rejected",
        decision_reason: "Falta la dirección",
        reviewed_by: { user_id: "r1", name: "Marta Ruiz" },
        reviewer_role: "coordinator",
        reviewed_at: "2026-10-03T12:00:00.000Z",
      }),
    );
    expect(await screen.findByText("Falta la dirección")).toBeInTheDocument();
    expect(screen.getByText(m.detail.sections.review)).toBeInTheDocument();
    expect(screen.getByText(m.status.rejected)).toBeInTheDocument();
    expect(screen.getByText("Marta Ruiz")).toBeInTheDocument();
    expect(screen.getByText(/Coordinador/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: m.detail.approve.action })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: m.detail.reject.action })).not.toBeInTheDocument();
  });

  it("does not render approve or reject without the validate capability", async () => {
    setUser({ reviewer: false });
    renderSheet();
    await screen.findByRole("heading", { name: "Club Águilas" });
    expect(screen.queryByRole("button", { name: m.detail.approve.action })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: m.detail.reject.action })).not.toBeInTheDocument();
  });
});
