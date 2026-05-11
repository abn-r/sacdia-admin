/**
 * Integration tests for ValidationHistoryDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Display-only dialog that fetches via getValidationHistory() using
 * TanStack Query (useQuery, enabled: open, staleTime: Infinity).
 * Requires QueryClientProvider — fresh client per test to avoid cache bleed.
 *
 * `getValidationHistory` is mocked at module boundary.
 *
 * Key behaviors:
 *   - Loading skeleton while query is pending
 *   - Empty state when entries is []
 *   - Renders entries with APPROVED / REJECTED action labels
 *   - Performer name shown; system fallback when performer is null
 *   - Comment rendered when entry has comment
 *   - Fetch NOT triggered when open=false
 *   - Error toast fired when getValidationHistory throws
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
import type { ValidationHistoryEntry, ValidationEntityType } from "@/lib/api/validation";

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
const mockGetValidationHistory = vi.fn<(...args: any[]) => Promise<ValidationHistoryEntry[]>>();

vi.mock("@/lib/api/validation", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/validation")>();
  return {
    ...original,
    getValidationHistory: (...args: unknown[]) => mockGetValidationHistory(...args),
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

import { ValidationHistoryDialog } from "@/components/validation/validation-history-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.validation_admin;

const STUB_ENTRIES: ValidationHistoryEntry[] = [
  {
    history_id: 1,
    action: "APPROVED",
    performed_by: "user-001",
    performer: { user_id: "u1", first_name: "Ana", last_name: "García" },
    comment: null,
    created_at: "2026-03-10T10:00:00.000Z",
  },
  {
    history_id: 2,
    action: "REJECTED",
    performed_by: "user-002",
    performer: { user_id: "u2", first_name: "Luis", last_name: "Martínez" },
    comment: "Falta la firma del director de club",
    created_at: "2026-03-15T14:00:00.000Z",
  },
  {
    history_id: 3,
    action: "APPROVED",
    performed_by: null,
    performer: null,
    comment: null,
    created_at: "2026-03-20T09:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  entityType?: ValidationEntityType;
  entityId?: number | string;
  title?: string;
}

function renderDialog(opts: RenderOpts = {}) {
  const {
    open = true,
    entityType = "class",
    entityId = 42,
    title = "Juan Pérez — Salvavidas",
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
        <ValidationHistoryDialog
          open={open}
          entityType={entityType}
          entityId={entityId}
          title={title}
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

describe("ValidationHistoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValidationHistory.mockResolvedValue(STUB_ENTRIES);
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog title and entity title ───────────────────────────────

  it("renders dialog title and entity title as description", async () => {
    mockGetValidationHistory.mockResolvedValue([]);

    renderDialog({ title: "Juan Pérez — Salvavidas" });

    expect(
      screen.getByRole("heading", { name: new RegExp(t.history.title, "i") }),
    ).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez — Salvavidas")).toBeInTheDocument();
  });

  // ── 2. Not rendered when closed ───────────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: new RegExp(t.history.title, "i") }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Shows loading skeleton while query is pending ─────────────────────

  it("shows loading skeleton while getValidationHistory is pending", async () => {
    let resolve!: (v: ValidationHistoryEntry[]) => void;
    mockGetValidationHistory.mockReturnValue(
      new Promise<ValidationHistoryEntry[]>((res) => {
        resolve = res;
      }),
    );

    renderDialog();

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    resolve([]);
  });

  // ── 4. Fetch not triggered when open=false ────────────────────────────────

  it("does NOT call getValidationHistory when open=false", () => {
    renderDialog({ open: false });

    expect(mockGetValidationHistory).not.toHaveBeenCalled();
  });

  // ── 5. Called with correct entityType and entityId ───────────────────────

  it("calls getValidationHistory with correct entityType and entityId", async () => {
    renderDialog({ entityType: "honor", entityId: 77 });

    await waitFor(() => {
      expect(mockGetValidationHistory).toHaveBeenCalledWith("honor", 77);
    });
  });

  // ── 6. Empty state when entries is [] ────────────────────────────────────

  it("renders empty state text when no history entries", async () => {
    mockGetValidationHistory.mockResolvedValue([]);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(t.history.empty)).toBeInTheDocument();
    });
  });

  // ── 7. Renders APPROVED and REJECTED action labels ───────────────────────

  it("renders translated APPROVED and REJECTED action labels", async () => {
    renderDialog();

    await waitFor(() => {
      // "Aprobado" appears twice (entries 1 and 3), "Rechazado" once (entry 2)
      const approved = screen.getAllByText(t.history.actions.APPROVED);
      expect(approved.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(t.history.actions.REJECTED)).toBeInTheDocument();
    });
  });

  // ── 8. Performer names shown ─────────────────────────────────────────────

  it("renders performer names from history entries", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/Ana García/)).toBeInTheDocument();
      expect(screen.getByText(/Luis Martínez/)).toBeInTheDocument();
    });
  });

  // ── 9. System fallback when performer is null ─────────────────────────────

  it("shows system label when performer is null", async () => {
    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(t.history.performer.system, "i")),
      ).toBeInTheDocument();
    });
  });

  // ── 10. Comment rendered when entry has one ───────────────────────────────

  it("renders comment text when an entry has a comment", async () => {
    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByText("Falta la firma del director de club"),
      ).toBeInTheDocument();
    });
  });

  // ── 11. Error toast when getValidationHistory throws ApiError ────────────

  it("shows ApiError message in error toast when getValidationHistory throws ApiError", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mockGetValidationHistory.mockRejectedValue(
      new ApiError("Historial no disponible", 503, null),
    );

    renderDialog();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Historial no disponible");
    });
  });

  // ── 12. Fallback error toast for non-ApiError ─────────────────────────────

  it("shows i18n fallback error toast for plain Error throws", async () => {
    mockGetValidationHistory.mockRejectedValue(new Error("Network timeout"));

    renderDialog();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(t.errors.loadHistory);
    });
  });
});
