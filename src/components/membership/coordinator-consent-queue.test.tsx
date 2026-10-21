/**
 * CoordinatorConsentQueue: one queue of consent forms across all the sections a
 * coordinator covers, backed by GET /coordination/me/consent-pending.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import messages from "../../../messages/es.json";
import type {
  CoordinatorConsentPendingItem,
  CoordinatorConsentPendingPage,
} from "@/lib/api/membership-requests";
import { TooltipProvider } from "@/components/ui/tooltip";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockQueue = vi.fn<(...args: any[]) => Promise<CoordinatorConsentPendingPage>>();
const mockVerify = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockGetEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/membership-requests", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/membership-requests")>();
  return {
    ...original,
    listCoordinatorConsentPendingFromClient: (...args: unknown[]) => mockQueue(...args),
    verifyConsent: (...args: unknown[]) => mockVerify(...args),
    getConsentEvidence: (...args: unknown[]) => mockGetEvidence(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { CoordinatorConsentQueue } from "@/components/membership/coordinator-consent-queue";
import { ApiError } from "@/lib/api/client";

const queueMsg = messages.membership.queue;
const consentMsg = messages.membership.consent;
const dialogMsg = consentMsg.dialog;
const paginationMsg = messages.shared.pagination;

const PAGE_SIZE = 25;

/** Accessible name of a row's verify button (includes the minor's name). */
const verifyLabel = (name: string) => queueMsg.verify_aria.replace("{name}", name);
const ANY_VERIFY = new RegExp(`^${queueMsg.verify_aria.split("{name}")[0]}`);

function item(
  assignmentId: string,
  sectionId: number,
  name: string,
  overrides: Partial<CoordinatorConsentPendingItem> = {},
): CoordinatorConsentPendingItem {
  return {
    assignment_id: assignmentId,
    user_id: `u-${assignmentId}`,
    club_section_id: sectionId,
    status: "pending",
    created_at: "2026-10-01T00:00:00.000Z",
    expires_at: null,
    effective_expires_at: "2026-10-31T00:00:00.000Z",
    users: { user_id: `u-${assignmentId}`, name, paternal_last_name: "Pérez", email: null },
    roles: { role_id: "r", role_name: "member" },
    consent: {
      required: true,
      dependent: true,
      guardianship_id: `g-${assignmentId}`,
      status: "pending",
      evidence_uploaded: true,
      guardians: [],
      viewer_can_verify: true,
      viewer_verify_block: null,
    },
    consent_form_uploaded_at: "2026-10-02T10:00:00.000Z",
    club_name: sectionId === 7 ? "Club Águilas" : "Club Halcones",
    club_type_name: sectionId === 7 ? "Conquistadores" : "Aventureros",
    district_name: sectionId === 7 ? "Distrito Norte" : null,
    ...overrides,
  };
}

const bySection = [
  {
    club_section_id: 7,
    club_name: "Club Águilas",
    club_type_name: "Conquistadores",
    district_name: "Distrito Norte",
    pending_consent_count: 2,
  },
  {
    club_section_id: 9,
    club_name: "Club Halcones",
    club_type_name: "Aventureros",
    district_name: null,
    pending_consent_count: 1,
  },
];

// Oldest form first: Zoe (9) is the oldest, then Ana (7), then Beto (7).
function firstPage(): CoordinatorConsentPendingPage {
  return {
    items: [
      item("asg-zoe", 9, "Zoe", { consent_form_uploaded_at: "2026-09-20T10:00:00.000Z" }),
      item("asg-ana", 7, "Ana", { consent_form_uploaded_at: "2026-09-25T10:00:00.000Z" }),
      item("asg-beto", 7, "Beto", { consent_form_uploaded_at: "2026-10-02T10:00:00.000Z" }),
    ],
    total: 3,
    limit: PAGE_SIZE,
    offset: 0,
    by_section: bySection.map((s) => ({ ...s })),
  };
}

function renderQueue(onSelectSection = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <TooltipProvider>
          <CoordinatorConsentQueue onSelectSection={onSelectSection} />
        </TooltipProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { onSelectSection, queryClient };
}

function bodyRows() {
  return screen.getAllByRole("row").slice(1);
}

describe("CoordinatorConsentQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue.mockResolvedValue(firstPage());
    mockGetEvidence.mockResolvedValue({
      url: "https://r2.example/signed",
      expires_in: 900,
      content_type: "image/jpeg",
      uploaded_at: "2026-10-02T12:00:00.000Z",
    });
    mockVerify.mockResolvedValue({
      guardianship: { guardianship_id: "g", consent_status: "verified" },
      assignment: null,
      approve_error: null,
    });
  });

  afterEach(() => cleanup());

  describe("queue rendering and order", () => {
    it("requests the first page of the aggregate endpoint", async () => {
      renderQueue();

      await screen.findByText("Zoe Pérez");
      expect(mockQueue).toHaveBeenCalledTimes(1);
      expect(mockQueue).toHaveBeenCalledWith({ limit: PAGE_SIZE, offset: 0 });
    });

    it("keeps the server order (oldest form first) in one table", async () => {
      renderQueue();
      await screen.findByText("Zoe Pérez");

      const rows = bodyRows();
      expect(rows).toHaveLength(3);
      expect(within(rows[0]).getByText("Zoe Pérez")).toBeInTheDocument();
      expect(within(rows[1]).getByText("Ana Pérez")).toBeInTheDocument();
      expect(within(rows[2]).getByText("Beto Pérez")).toBeInTheDocument();
    });

    it("shows club, type, district, minor and the form upload date per row", async () => {
      renderQueue();
      await screen.findByText("Ana Pérez");

      for (const header of [
        queueMsg.col_club,
        queueMsg.col_type,
        queueMsg.col_district,
        queueMsg.col_minor,
        queueMsg.col_form_uploaded,
      ]) {
        expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
      }

      const ana = bodyRows()[1];
      expect(within(ana).getByText("Club Águilas")).toBeInTheDocument();
      expect(within(ana).getByText("Conquistadores")).toBeInTheDocument();
      expect(within(ana).getByText("Distrito Norte")).toBeInTheDocument();
      expect(ana.textContent).toMatch(/2026/);

      // A club with no district shows a dash instead of an empty cell.
      const zoe = bodyRows()[0];
      expect(within(zoe).getByText("Club Halcones")).toBeInTheDocument();
      expect(within(zoe).getByText("—")).toBeInTheDocument();
    });

    it("is verify-only: no approve / reject, only the verify action", async () => {
      renderQueue();
      await screen.findByText("Zoe Pérez");

      expect(screen.getAllByRole("button", { name: ANY_VERIFY })).toHaveLength(3);
      expect(
        screen.queryByRole("button", { name: messages.membership.table.aria_approve }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: messages.membership.table.aria_reject }),
      ).toBeNull();
    });

    it("disables verify for a minor the viewer may not verify (server verdict)", async () => {
      mockQueue.mockResolvedValue({
        ...firstPage(),
        items: [
          item("asg-zoe", 9, "Zoe", {
            consent: {
              required: true,
              dependent: true,
              guardianship_id: "g-zoe",
              status: "pending",
              evidence_uploaded: true,
              guardians: [],
              viewer_can_verify: false,
              viewer_verify_block: "self_guardian",
            },
          }),
        ],
        total: 1,
      });
      renderQueue();

      const button = await screen.findByRole("button", { name: verifyLabel("Zoe Pérez") });
      expect(button).toBeDisabled();
    });

    it("shows the empty state when nothing is waiting", async () => {
      mockQueue.mockResolvedValue({
        items: [],
        total: 0,
        limit: PAGE_SIZE,
        offset: 0,
        by_section: [],
      });
      renderQueue();

      expect(await screen.findByText(queueMsg.empty_title)).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
    });
  });

  describe("pagination (offset)", () => {
    function bigPage(offset: number, count: number): CoordinatorConsentPendingPage {
      return {
        items: Array.from({ length: count }, (_, i) =>
          item(`asg-${offset + i}`, 7, `Menor${offset + i}`),
        ),
        total: 60,
        limit: PAGE_SIZE,
        offset,
        by_section: [{ ...bySection[0], pending_consent_count: 60 }],
      };
    }

    it("shows the range and total, previous disabled on the first page", async () => {
      mockQueue.mockResolvedValue(bigPage(0, PAGE_SIZE));
      renderQueue();
      await screen.findByText("Menor0 Pérez");

      expect(
        screen.getByText(
          paginationMsg.showing.replace("{from}", "1").replace("{to}", "25").replace("{total}", "60"),
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: paginationMsg.prevPage })).toBeDisabled();
      expect(screen.getByRole("button", { name: paginationMsg.nextPage })).toBeEnabled();
    });

    it("next page asks for offset = limit; previous goes back", async () => {
      const user = userEvent.setup();
      mockQueue.mockImplementation(async ({ offset }: { offset: number }) =>
        bigPage(offset, offset === 50 ? 10 : PAGE_SIZE),
      );
      renderQueue();
      await screen.findByText("Menor0 Pérez");

      await user.click(screen.getByRole("button", { name: paginationMsg.nextPage }));
      await screen.findByText("Menor25 Pérez");
      expect(mockQueue).toHaveBeenLastCalledWith({ limit: PAGE_SIZE, offset: 25 });
      expect(screen.queryByText("Menor0 Pérez")).toBeNull();

      await user.click(screen.getByRole("button", { name: paginationMsg.prevPage }));
      await screen.findByText("Menor0 Pérez");
      // The first page is still cached (60 s): going back does not hit the API again.
      expect(mockQueue).toHaveBeenCalledTimes(2);
    });

    it("next is disabled on the last page", async () => {
      const user = userEvent.setup();
      mockQueue.mockImplementation(async ({ offset }: { offset: number }) =>
        bigPage(offset, offset === 50 ? 10 : PAGE_SIZE),
      );
      renderQueue();
      await screen.findByText("Menor0 Pérez");

      await user.click(screen.getByRole("button", { name: paginationMsg.nextPage }));
      await screen.findByText("Menor25 Pérez");
      await user.click(screen.getByRole("button", { name: paginationMsg.nextPage }));
      await screen.findByText("Menor50 Pérez");

      expect(screen.getByRole("button", { name: paginationMsg.nextPage })).toBeDisabled();
    });

    it("hides the pager when everything fits in one page", async () => {
      renderQueue();
      await screen.findByText("Zoe Pérez");

      expect(screen.queryByRole("button", { name: paginationMsg.nextPage })).toBeNull();
    });
  });

  describe("section summary", () => {
    it("lists every section with its pending count", async () => {
      renderQueue();
      await screen.findByText("Zoe Pérez");

      const summary = screen.getByRole("group", { name: queueMsg.summary_title });
      expect(
        within(summary).getByRole("button", { name: /Club Águilas · Conquistadores/ }),
      ).toHaveTextContent("2");
      expect(
        within(summary).getByRole("button", { name: /Club Halcones · Aventureros/ }),
      ).toHaveTextContent("1");
    });

    it("appends the district to the chip when present and falls back to an i18n club label", async () => {
      mockQueue.mockResolvedValue({
        ...firstPage(),
        by_section: [
          { ...bySection[0] },
          { ...bySection[1], club_name: null },
        ],
      });
      renderQueue();
      await screen.findByText("Zoe Pérez");

      const summary = screen.getByRole("group", { name: queueMsg.summary_title });
      expect(
        within(summary).getByRole("button", {
          name: /Club Águilas · Conquistadores · Distrito Norte/,
        }),
      ).toBeInTheDocument();
      // No club name: the translated fallback, not a hardcoded string; no district: nothing appended.
      expect(
        within(summary).getByRole("button", {
          name: new RegExp(`^${queueMsg.club_fallback} · Aventureros\\s*1$`),
        }),
      ).toBeInTheDocument();
    });

    it("clicking a section switches to that section's own list", async () => {
      const user = userEvent.setup();
      const { onSelectSection } = renderQueue();
      await screen.findByText("Zoe Pérez");

      const summary = screen.getByRole("group", { name: queueMsg.summary_title });
      await user.click(within(summary).getByRole("button", { name: /Club Halcones/ }));

      expect(onSelectSection).toHaveBeenCalledWith(9);
    });

    it("counts are for the whole queue, not just the loaded page", async () => {
      mockQueue.mockResolvedValue({
        items: [item("asg-zoe", 9, "Zoe")],
        total: 40,
        limit: PAGE_SIZE,
        offset: 0,
        by_section: [
          { ...bySection[0], pending_consent_count: 30 },
          { ...bySection[1], pending_consent_count: 10 },
        ],
      });
      renderQueue();
      await screen.findByText("Zoe Pérez");

      const summary = screen.getByRole("group", { name: queueMsg.summary_title });
      expect(within(summary).getByRole("button", { name: /Club Águilas/ })).toHaveTextContent("30");
    });
  });

  describe("verify", () => {
    // A server that remembers what was verified, so the refetch after a verify
    // returns the truth instead of the original fixture.
    const gone = new Set<string>();
    function serverWithGone(base: () => CoordinatorConsentPendingPage = firstPage) {
      mockQueue.mockImplementation(async () => {
        const page = base();
        const items = page.items.filter((row) => !gone.has(row.assignment_id));
        const removed = page.items.length - items.length;
        return {
          ...page,
          items,
          total: page.total - removed,
          by_section: page.by_section
            .map((section) => ({
              ...section,
              pending_consent_count:
                items.filter((row) => row.club_section_id === section.club_section_id).length,
            }))
            .filter((section) => section.pending_consent_count > 0),
        };
      });
    }

    beforeEach(() => {
      gone.clear();
      serverWithGone();
      mockVerify.mockImplementation(async (_section: number, assignmentId: string) => {
        gone.add(assignmentId);
        return {
          guardianship: { guardianship_id: "g", consent_status: "verified" },
          assignment: null,
          approve_error: null,
        };
      });
    });

    async function verifyRow(user: ReturnType<typeof userEvent.setup>, rowIndex: number) {
      const row = bodyRows()[rowIndex];
      await user.click(within(row).getByRole("button", { name: ANY_VERIFY }));
      const dialog = await screen.findByRole("alertdialog");
      await screen.findByRole("img", { name: dialogMsg.evidence_image_alt });
      await user.click(within(dialog).getByLabelText(dialogMsg.confirm_checkbox));
      await user.click(within(dialog).getByRole("button", { name: dialogMsg.confirm }));
      return dialog;
    }

    it("opens the verify-only dialog: no approve option, no upload", async () => {
      const user = userEvent.setup();
      renderQueue();
      await screen.findByText("Ana Pérez");

      await user.click(
        within(bodyRows()[1]).getByRole("button", { name: verifyLabel("Ana Pérez") }),
      );

      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).queryByLabelText(dialogMsg.approve_checkbox)).toBeNull();
      expect(within(dialog).queryByRole("button", { name: dialogMsg.upload })).toBeNull();
      await waitFor(() => expect(mockGetEvidence).toHaveBeenCalledWith(7, "asg-ana"));
    });

    it("verifies with the item's own section and approve:false", async () => {
      const user = userEvent.setup();
      renderQueue();
      await screen.findByText("Ana Pérez");

      await verifyRow(user, 1);

      await waitFor(() => expect(mockVerify).toHaveBeenCalledOnce());
      expect(mockVerify).toHaveBeenCalledWith(7, "asg-ana", {
        confirm_paper_form_reviewed: true,
        approve: false,
      });
    });

    it("removes the verified row and decrements the totals at once", async () => {
      const user = userEvent.setup();
      renderQueue();
      await screen.findByText("Ana Pérez");
      expect(
        screen.getByText(queueMsg.count_other.replace("{count}", "3")),
      ).toBeInTheDocument();

      await verifyRow(user, 1);

      await waitFor(() => expect(screen.queryByText("Ana Pérez")).toBeNull());
      expect(bodyRows()).toHaveLength(2);
      expect(screen.getByText("Zoe Pérez")).toBeInTheDocument();
      expect(screen.getByText("Beto Pérez")).toBeInTheDocument();
      expect(
        screen.getByText(queueMsg.count_other.replace("{count}", "2")),
      ).toBeInTheDocument();

      // Ana was in section 7: 2 -> 1. Section 9 is untouched.
      const summary = screen.getByRole("group", { name: queueMsg.summary_title });
      expect(within(summary).getByRole("button", { name: /Club Águilas/ })).toHaveTextContent("1");
      expect(within(summary).getByRole("button", { name: /Club Halcones/ })).toHaveTextContent("1");
    });

    it("refetches the active page after verifying so the shrunk page refills", async () => {
      const user = userEvent.setup();
      renderQueue();
      await screen.findByText("Ana Pérez");
      expect(mockQueue).toHaveBeenCalledTimes(1);

      await verifyRow(user, 1);

      await waitFor(() => expect(mockQueue).toHaveBeenCalledTimes(2));
      expect(mockQueue).toHaveBeenLastCalledWith({ limit: PAGE_SIZE, offset: 0 });
    });

    it("a full page refills to 25 rows after a verify, so next does not skip a row", async () => {
      const user = userEvent.setup();
      let verified = false;
      mockQueue.mockImplementation(async ({ offset }: { offset: number }) => {
        // Server queue of 60 forms; after the verify there are 59 left.
        const all = Array.from({ length: 60 }, (_, i) => i).filter((i) => !(verified && i === 0));
        return {
          items: all.slice(offset, offset + PAGE_SIZE).map((i) => item(`asg-${i}`, 7, `Menor${i}`)),
          total: all.length,
          limit: PAGE_SIZE,
          offset,
          by_section: [{ ...bySection[0], pending_consent_count: all.length }],
        };
      });
      mockVerify.mockImplementation(async () => {
        verified = true;
        return { guardianship: { guardianship_id: "g", consent_status: "verified" }, assignment: null, approve_error: null };
      });
      renderQueue();
      await screen.findByText("Menor0 Pérez");

      await verifyRow(user, 0);

      // The refetched first page holds Menor1..Menor25 again (25 rows).
      await screen.findByText("Menor25 Pérez");
      expect(bodyRows()).toHaveLength(PAGE_SIZE);
      await user.click(screen.getByRole("button", { name: paginationMsg.nextPage }));
      // Next starts at server offset 25 = Menor26: Menor25 was already shown.
      expect(await screen.findByText("Menor26 Pérez")).toBeInTheDocument();
      expect(mockQueue).toHaveBeenLastCalledWith({ limit: PAGE_SIZE, offset: 25 });
    });

    it("marks the other cached queue pages stale after a verify", async () => {
      const user = userEvent.setup();
      const { queryClient } = renderQueue();
      await screen.findByText("Ana Pérez");
      queryClient.setQueryData(["membership", "consent-queue", 25], firstPage());

      await verifyRow(user, 1);

      await waitFor(() =>
        expect(
          queryClient.getQueryState(["membership", "consent-queue", 25])?.isInvalidated,
        ).toBe(true),
      );
    });

    it("MR_NOT_FOUND on verify (someone else did it): closes the dialog and drops the row", async () => {
      const user = userEvent.setup();
      mockVerify.mockImplementation(async (_section: number, assignmentId: string) => {
        gone.add(assignmentId);
        throw new ApiError("not found", 404, { code: "MR_NOT_FOUND" });
      });
      renderQueue();
      await screen.findByText("Ana Pérez");

      await verifyRow(user, 1);

      await waitFor(() => expect(screen.queryByText("Ana Pérez")).toBeNull());
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(bodyRows()).toHaveLength(2);
      await waitFor(() => expect(mockQueue).toHaveBeenCalledTimes(2));
    });

    it("other verify errors keep the row and the dialog", async () => {
      const user = userEvent.setup();
      mockVerify.mockRejectedValue(
        new ApiError("nope", 409, { code: "GUARDIANSHIP_CONSENT_ALREADY_VERIFIED" }),
      );
      renderQueue();
      await screen.findByText("Ana Pérez");

      await verifyRow(user, 1);

      await waitFor(() => expect(mockVerify).toHaveBeenCalledOnce());
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("Ana Pérez", { selector: "p" })).toBeInTheDocument();
    });

    it("drops a section from the summary when its last form is verified", async () => {
      const user = userEvent.setup();
      renderQueue();
      await screen.findByText("Zoe Pérez");

      await verifyRow(user, 0);

      await waitFor(() => expect(screen.queryByText("Zoe Pérez")).toBeNull());
      const summary = screen.getByRole("group", { name: queueMsg.summary_title });
      expect(within(summary).queryByRole("button", { name: /Club Halcones/ })).toBeNull();
      expect(within(summary).getByRole("button", { name: /Club Águilas/ })).toBeInTheDocument();
    });

    it("shows the empty state after verifying the last form", async () => {
      const user = userEvent.setup();
      serverWithGone(() => ({
        items: [item("asg-zoe", 9, "Zoe")],
        total: 1,
        limit: PAGE_SIZE,
        offset: 0,
        by_section: [{ ...bySection[1], pending_consent_count: 1 }],
      }));
      renderQueue();
      await screen.findByText("Zoe Pérez");

      await verifyRow(user, 0);

      expect(await screen.findByText(queueMsg.empty_title)).toBeInTheDocument();
    });

    it("an emptied page that still has forms behind it reloads the previous page", async () => {
      const user = userEvent.setup();
      mockQueue.mockImplementation(async ({ offset }: { offset: number }) =>
        offset === 0
          ? {
              items: Array.from({ length: PAGE_SIZE }, (_, i) => item(`asg-${i}`, 7, `Menor${i}`)),
              total: 26,
              limit: PAGE_SIZE,
              offset: 0,
              by_section: [{ ...bySection[0], pending_consent_count: 26 }],
            }
          : {
              items: [item("asg-last", 7, "Ultimo")],
              total: 26,
              limit: PAGE_SIZE,
              offset: 25,
              by_section: [{ ...bySection[0], pending_consent_count: 26 }],
            },
      );
      renderQueue();
      await screen.findByText("Menor0 Pérez");
      await user.click(screen.getByRole("button", { name: paginationMsg.nextPage }));
      await screen.findByText("Ultimo Pérez");

      await verifyRow(user, 0);

      await waitFor(() =>
        expect(mockQueue).toHaveBeenLastCalledWith({ limit: PAGE_SIZE, offset: 0 }),
      );
      expect(await screen.findByText("Menor0 Pérez")).toBeInTheDocument();
    });
  });

  describe("errors by code", () => {
    it("403 GUARD_PERMISSION_DENIED: not-a-coordinator-role message, no table", async () => {
      mockQueue.mockRejectedValue(
        new ApiError("Forbidden resource", 403, { code: "GUARD_PERMISSION_DENIED" }),
      );
      renderQueue();

      expect(await screen.findByText(queueMsg.error_permission)).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("403 GUARD_CLUB_SCOPE_REQUIRED: no-covering-assignment message", async () => {
      mockQueue.mockRejectedValue(
        new ApiError("whatever the server wrote", 403, { code: "GUARD_CLUB_SCOPE_REQUIRED" }),
      );
      renderQueue();

      expect(await screen.findByText(queueMsg.error_scope)).toBeInTheDocument();
      expect(screen.queryByText("whatever the server wrote")).toBeNull();
    });

    it("a 403 with an unknown code falls back to the generic message, never the server text", async () => {
      mockQueue.mockRejectedValue(new ApiError("Forbidden resource", 403, { code: "SOMETHING_NEW" }));
      renderQueue();

      expect(await screen.findByText(queueMsg.error_generic)).toBeInTheDocument();
      expect(screen.queryByText("Forbidden resource")).toBeNull();
    });

    it("a network failure falls back to the generic message", async () => {
      mockQueue.mockRejectedValue(new Error("boom"));
      renderQueue();

      expect(await screen.findByText(queueMsg.error_generic)).toBeInTheDocument();
    });

    it("a generic error offers Retry, which reloads the queue", async () => {
      const user = userEvent.setup();
      mockQueue.mockRejectedValueOnce(new Error("boom"));
      renderQueue();
      await screen.findByText(queueMsg.error_generic);

      await user.click(screen.getByRole("button", { name: queueMsg.retry }));

      expect(await screen.findByText("Zoe Pérez")).toBeInTheDocument();
      expect(screen.queryByText(queueMsg.error_generic)).toBeNull();
      expect(mockQueue).toHaveBeenCalledTimes(2);
    });

    it("permission and scope errors do not offer Retry", async () => {
      mockQueue.mockRejectedValue(
        new ApiError("Forbidden resource", 403, { code: "GUARD_PERMISSION_DENIED" }),
      );
      renderQueue();
      await screen.findByText(queueMsg.error_permission);

      expect(screen.queryByRole("button", { name: queueMsg.retry })).toBeNull();
    });
  });
});
