/**
 * Integration tests for EvidenceHistoryDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * The dialog uses `useQuery` from @tanstack/react-query to fetch evidence
 * history via `getEvidenceHistory` from `@/lib/api/evidence-review`.
 * We mock `getEvidenceHistory` at module level — no MSW handler needed
 * (consistent with other test files in this suite that mock API modules).
 *
 * The component is display-only (no form, no RHF). Tests verify:
 *   - Loading skeleton is shown while query is pending
 *   - History entries are rendered with correct action labels/icons
 *   - Empty state is shown when entries are []
 *   - Error toast fires when getEvidenceHistory throws
 *   - Fetch is NOT triggered when dialog is closed (enabled: open)
 *
 * Requires QueryClientProvider — a fresh client per test to avoid cache bleed.
 *
 * Renders are wrapped in `NextIntlClientProvider` with real `messages/es.json`.
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
import type { EvidenceHistoryEntry, EvidenceType } from "@/lib/api/evidence-review";

// ---------------------------------------------------------------------------
// jsdom polyfills (Radix Dialog uses ResizeObserver + scrollIntoView)
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
const mockGetEvidenceHistory = vi.fn<(...args: any[]) => Promise<EvidenceHistoryEntry[]>>();

vi.mock("@/lib/api/evidence-review", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/evidence-review")>();
  return {
    ...original,
    getEvidenceHistory: (...args: unknown[]) => mockGetEvidenceHistory(...args),
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

import { EvidenceHistoryDialog } from "@/components/evidence-review/evidence-history-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const th = messages.evidence_review.history;

const STUB_ENTRIES: EvidenceHistoryEntry[] = [
  {
    action: "SUBMITTED",
    performed_by_name: "Ana López",
    comment: null,
    created_at: "2026-04-01T10:00:00.000Z",
  },
  {
    action: "REJECTED",
    performed_by_name: "Carlos Díaz",
    comment: "Falta la firma del director",
    created_at: "2026-04-05T14:30:00.000Z",
  },
  {
    action: "APPROVED",
    performed_by_name: null,
    comment: null,
    created_at: "2026-04-10T09:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  type?: EvidenceType;
  id?: number;
  memberName?: string;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    type = "class",
    id = 42,
    memberName = "Juan Pérez",
  } = opts;
  const onOpenChange = vi.fn();

  // Fresh QueryClient per test — prevents cache bleed between tests
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,       // no retries in tests
        gcTime: 0,         // garbage-collect immediately after unmount
      },
    },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <EvidenceHistoryDialog
          open={open}
          type={type}
          id={id}
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

describe("EvidenceHistoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Title and member name rendering ────────────────────────────────────

  it("renders dialog title and memberName as description", async () => {
    mockGetEvidenceHistory.mockResolvedValue([]);

    renderDialog({ memberName: "Juan Pérez" });

    expect(
      screen.getByRole("heading", { name: th.title }),
    ).toBeInTheDocument();

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });

  // ── 2. Loading skeleton while query is in flight ──────────────────────────

  it("shows loading skeleton while getEvidenceHistory is pending", async () => {
    // Never resolves during the check
    let resolve!: (v: EvidenceHistoryEntry[]) => void;
    mockGetEvidenceHistory.mockReturnValue(
      new Promise<EvidenceHistoryEntry[]>((res) => {
        resolve = res;
      }),
    );

    renderDialog();

    // The skeleton renders div.animate-pulse elements while loading
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    // Resolve to allow cleanup
    resolve([]);
  });

  // ── 3. Empty state — no history entries ───────────────────────────────────

  it("renders empty state text when history entries are empty", async () => {
    mockGetEvidenceHistory.mockResolvedValue([]);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(th.empty)).toBeInTheDocument();
    });

    expect(mockGetEvidenceHistory).toHaveBeenCalledOnce();
  });

  // ── 4. Renders history entries with correct action labels ─────────────────

  it("renders all history entries with translated action labels", async () => {
    mockGetEvidenceHistory.mockResolvedValue(STUB_ENTRIES);

    renderDialog();

    await waitFor(() => {
      // Three entries should appear
      expect(screen.getByText(th.action_submitted)).toBeInTheDocument();
      expect(screen.getByText(th.action_rejected)).toBeInTheDocument();
      expect(screen.getByText(th.action_approved)).toBeInTheDocument();
    });

    // Performed-by names
    expect(screen.getByText(/Ana López/)).toBeInTheDocument();
    expect(screen.getByText(/Carlos Díaz/)).toBeInTheDocument();
  });

  // ── 5. Renders comment when present ──────────────────────────────────────

  it("renders comment text when an entry has a comment", async () => {
    mockGetEvidenceHistory.mockResolvedValue(STUB_ENTRIES);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("Falta la firma del director")).toBeInTheDocument();
    });
  });

  // ── 6. System fallback for null performed_by_name ────────────────────────

  it("shows 'Sistema' when performed_by_name is null", async () => {
    mockGetEvidenceHistory.mockResolvedValue(STUB_ENTRIES);

    renderDialog();

    await waitFor(() => {
      // STUB_ENTRIES[2].performed_by_name is null → should fall back to "Sistema"
      expect(screen.getByText(new RegExp(th.system, "i"))).toBeInTheDocument();
    });
  });

  // ── 7. getEvidenceHistory is called with correct type and id ─────────────

  it("calls getEvidenceHistory with type='class' and id=99 when open", async () => {
    mockGetEvidenceHistory.mockResolvedValue([]);

    renderDialog({ type: "class", id: 99 });

    await waitFor(() => {
      expect(mockGetEvidenceHistory).toHaveBeenCalledWith("class", 99);
    });
  });

  // ── 8. Fetch NOT triggered when dialog is closed ──────────────────────────

  it("does NOT call getEvidenceHistory when open=false", () => {
    mockGetEvidenceHistory.mockResolvedValue([]);

    renderDialog({ open: false });

    // useQuery is disabled when open=false — the function must NOT be called
    expect(mockGetEvidenceHistory).not.toHaveBeenCalled();
  });

  // ── 9. Error path — ApiError message is shown directly ──────────────────

  it("shows ApiError message directly when getEvidenceHistory throws ApiError", async () => {
    // The queryFn checks `error instanceof ApiError` — uses error.message
    // We import ApiError to construct a proper instance.
    const { ApiError } = await import("@/lib/api/client");
    mockGetEvidenceHistory.mockRejectedValue(
      new ApiError("Historial no disponible", 503, null),
    );

    renderDialog();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Historial no disponible");
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ── 10. Error path — fallback error_load for plain Error or non-Error ─────

  it("shows error_load toast when getEvidenceHistory throws a plain Error (non-ApiError)", async () => {
    // Plain Error is NOT instanceof ApiError → falls back to t("error_load")
    mockGetEvidenceHistory.mockRejectedValue(new Error("Network timeout"));

    renderDialog();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(th.error_load);
    });
  });
});
