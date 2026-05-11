/**
 * Integration tests for PipelineHistoryDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Display-only dialog that fetches via getPipelineHistory() using
 * TanStack Query (useQuery, enabled: open, staleTime: Infinity).
 * Requires QueryClientProvider — fresh client per test to avoid cache bleed.
 *
 * `getPipelineHistory` is mocked at module boundary.
 *
 * Key behaviors:
 *   - Loading skeleton while query is pending
 *   - Empty state when entries is []
 *   - Renders entries with translated action labels
 *   - Performer name shown; system fallback when performer is null
 *   - Rejection reason rendered when entry has reason
 *   - Fetch NOT triggered when open=false
 *   - Error toast fired when getPipelineHistory throws
 *
 * Vitest uses `globals: false` — explicit `cleanup()` per `afterEach`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import messages from "../../../messages/es.json";
import type { PipelineHistoryEntry } from "@/lib/api/investiture";

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetPipelineHistory = vi.fn<(...args: any[]) => Promise<PipelineHistoryEntry[]>>();

vi.mock("@/lib/api/investiture", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/investiture")>();
  return {
    ...original,
    getPipelineHistory: (...args: unknown[]) => mockGetPipelineHistory(...args),
  };
});

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mockToastError(msg),
    success: (msg: string) => mockToastSuccess(msg),
  },
}));

vi.mock("@/lib/format-locale", () => ({
  useFormatDateTime: () => (dateStr: string) => `formatted:${dateStr}`,
}));

import { PipelineHistoryDialog } from "@/components/investiture/pipeline-history-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.investiture.historyDialog;

const STUB_ENTRIES: PipelineHistoryEntry[] = [
  {
    history_id: 1,
    enrollment_id: 10,
    action: "SUBMITTED",
    performed_by: "user-001",
    performer: { user_id: "u1", first_name: "Ana", last_name: "López" },
    reason: null,
    created_at: "2026-01-10T09:00:00.000Z",
  },
  {
    history_id: 2,
    enrollment_id: 10,
    action: "CLUB_APPROVED",
    performed_by: "user-002",
    performer: { user_id: "u2", first_name: "Juan", last_name: "Pérez" },
    reason: null,
    created_at: "2026-02-15T14:00:00.000Z",
  },
  {
    history_id: 3,
    enrollment_id: 10,
    action: "REJECTED",
    performed_by: null,
    performer: null,
    reason: "Documentación incompleta",
    created_at: "2026-03-20T16:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  enrollmentId?: number;
  memberName?: string;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    enrollmentId = 10,
    memberName = "Pedro Martínez",
  } = opts;
  const onOpenChange = vi.fn();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <PipelineHistoryDialog
          open={open}
          enrollmentId={enrollmentId}
          memberName={memberName}
          onOpenChange={onOpenChange}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );

  return { ...utils, onOpenChange, queryClient };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PipelineHistoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPipelineHistory.mockResolvedValue(STUB_ENTRIES);
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog title and member name ────────────────────────────────

  it("renders dialog title and memberName as description", async () => {
    mockGetPipelineHistory.mockResolvedValue([]);

    renderDialog({ memberName: "Pedro Martínez" });

    expect(
      screen.getByRole("heading", { name: new RegExp(t.title, "i") }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pedro Martínez")).toBeInTheDocument();
  });

  // ── 2. Not rendered when closed ───────────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: new RegExp(t.title, "i") }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Shows loading skeleton while query is pending ─────────────────────

  it("shows loading skeleton while getPipelineHistory is pending", async () => {
    let resolve!: (v: PipelineHistoryEntry[]) => void;
    mockGetPipelineHistory.mockReturnValue(
      new Promise<PipelineHistoryEntry[]>((res) => {
        resolve = res;
      }),
    );

    renderDialog();

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    resolve([]);
  });

  // ── 4. Fetch not triggered when open=false ────────────────────────────────

  it("does NOT call getPipelineHistory when open=false", () => {
    renderDialog({ open: false });

    expect(mockGetPipelineHistory).not.toHaveBeenCalled();
  });

  // ── 5. Empty state when entries is [] ────────────────────────────────────

  it("renders empty state text when no history entries", async () => {
    mockGetPipelineHistory.mockResolvedValue([]);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(t.emptyHistory)).toBeInTheDocument();
    });
  });

  // ── 6. Renders SUBMITTED and CLUB_APPROVED action labels ─────────────────

  it("renders translated action labels for SUBMITTED and CLUB_APPROVED", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(t.actionSubmitted)).toBeInTheDocument();
      expect(screen.getByText(t.actionClubApproved)).toBeInTheDocument();
    });
  });

  // ── 7. Renders REJECTED action label ─────────────────────────────────────

  it("renders REJECTED action label", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(t.actionRejected)).toBeInTheDocument();
    });
  });

  // ── 8. Performer names shown ─────────────────────────────────────────────

  it("renders performer names from entries", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/Ana López/)).toBeInTheDocument();
      expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
    });
  });

  // ── 9. System fallback when performer is null ─────────────────────────────

  it("shows system label when performer is null", async () => {
    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(t.system, "i")),
      ).toBeInTheDocument();
    });
  });

  // ── 10. Rejection reason rendered when entry has reason ──────────────────

  it("renders rejection reason when entry has a reason", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("Documentación incompleta")).toBeInTheDocument();
    });
  });

  // ── 11. Error toast when getPipelineHistory throws ApiError ──────────────

  it("shows ApiError message toast when getPipelineHistory throws ApiError", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mockGetPipelineHistory.mockRejectedValue(
      new ApiError("Pipeline no encontrado", 404, null),
    );

    renderDialog();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Pipeline no encontrado");
    });
  });

  // ── 12. Error toast with fallback message for non-ApiError ───────────────

  it("shows i18n fallback error toast for plain Error throws", async () => {
    mockGetPipelineHistory.mockRejectedValue(new Error("Network timeout"));

    renderDialog();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errorLoad);
    });
  });
});
