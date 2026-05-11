/**
 * Integration tests for EvidenceDetailDialog.
 *
 * Architecture notes:
 * ------------------------------------------------------------------
 * Display-only dialog that fetches evidence detail via getEvidenceDetail()
 * on open (useEffect, not useQuery).
 * Mocked at module boundary.
 *
 * Key behaviors:
 *   - Shows loading spinner while fetch is in flight
 *   - Renders member name, section name, file count badge after successful fetch
 *   - Shows rejection reason panel when rejection_reason is present
 *   - Error panel (not toast) on ApiError; ApiError.message used directly
 *   - Fetch NOT triggered when open=false
 *   - Resets state on close (detail + error cleared on next open)
 *
 * Vitest uses `globals: false` — explicit `cleanup()` per `afterEach`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { EvidenceDetail, EvidenceType } from "@/lib/api/evidence-review";

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
const mockGetEvidenceDetail = vi.fn<(...args: any[]) => Promise<EvidenceDetail>>();

vi.mock("@/lib/api/evidence-review", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/evidence-review")>();
  return {
    ...original,
    getEvidenceDetail: (...args: unknown[]) => mockGetEvidenceDetail(...args),
  };
});

vi.mock("@/lib/format-locale", () => ({
  useFormatDateTime: () => (dateStr: string) => `formatted:${dateStr}`,
}));

// EvidenceStatusBadge and EvidenceTypeBadge — render as simple text nodes
vi.mock("@/components/evidence-review/evidence-status-badge", () => ({
  EvidenceStatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

vi.mock("@/components/evidence-review/evidence-type-badge", () => ({
  EvidenceTypeBadge: ({ type }: { type: string }) => <span data-testid="type-badge">{type}</span>,
}));

import { EvidenceDetailDialog } from "@/components/evidence-review/evidence-detail-dialog";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t = messages.evidence_review;

const STUB_DETAIL: EvidenceDetail = {
  id: 42,
  type: "class",
  status: "pending",
  member_name: "Carlos Ruiz",
  member_id: "user-123",
  section_name: "Clase de natación",
  submitted_at: "2026-03-15T10:00:00.000Z",
  validated_at: null,
  validated_by_name: null,
  rejection_reason: null,
  file_count: 2,
  files: [
    {
      evidence_file_id: 1,
      file_url: "https://example.com/foto1.jpg",
      file_name: "foto1.jpg",
      file_type: "image/jpeg",
      uploaded_at: "2026-03-15T10:00:00.000Z",
    },
    {
      evidence_file_id: 2,
      file_url: "https://example.com/doc.pdf",
      file_name: "doc.pdf",
      file_type: "application/pdf",
      uploaded_at: "2026-03-15T10:05:00.000Z",
    },
  ],
};

const STUB_DETAIL_REJECTED: EvidenceDetail = {
  ...STUB_DETAIL,
  id: 99,
  member_id: "user-456",
  status: "rechazado",
  rejection_reason: "Imagen borrosa, no se puede verificar",
  validated_at: "2026-04-01T12:00:00.000Z",
  validated_by_name: "Admin Pérez",
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOpts {
  open?: boolean;
  type?: EvidenceType;
  id?: number;
}

function renderDialog(opts: RenderOpts = {}) {
  const { open = true, type = "class", id = 42 } = opts;
  const onOpenChange = vi.fn();

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EvidenceDetailDialog
        open={open}
        type={type}
        id={id}
        onOpenChange={onOpenChange}
      />
    </NextIntlClientProvider>,
  );

  return { ...utils, onOpenChange };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EvidenceDetailDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEvidenceDetail.mockResolvedValue(STUB_DETAIL);
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Renders dialog title ────────────────────────────────────────────────

  it("renders 'Detalle de evidencia' heading when open", async () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: /detalle de evidencia/i }),
    ).toBeInTheDocument();
  });

  // ── 2. Not rendered when closed ───────────────────────────────────────────

  it("does not render dialog content when open=false", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("heading", { name: /detalle de evidencia/i }),
    ).not.toBeInTheDocument();
  });

  // ── 3. Shows loading spinner while fetching ───────────────────────────────

  it("shows loading spinner while getEvidenceDetail is pending", async () => {
    let resolve!: (v: EvidenceDetail) => void;
    mockGetEvidenceDetail.mockReturnValue(
      new Promise<EvidenceDetail>((res) => {
        resolve = res;
      }),
    );

    renderDialog();

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();

    resolve(STUB_DETAIL);
  });

  // ── 4. Fetch not triggered when open=false ────────────────────────────────

  it("does NOT call getEvidenceDetail when open=false", () => {
    mockGetEvidenceDetail.mockResolvedValue(STUB_DETAIL);

    renderDialog({ open: false });

    expect(mockGetEvidenceDetail).not.toHaveBeenCalled();
  });

  // ── 5. Calls getEvidenceDetail with correct type and id ───────────────────

  it("calls getEvidenceDetail with type='honor' and id=77 when open", async () => {
    renderDialog({ type: "honor", id: 77 });

    await waitFor(() => {
      expect(mockGetEvidenceDetail).toHaveBeenCalledWith("honor", 77);
    });
  });

  // ── 6. Renders member and section names after fetch ───────────────────────

  it("renders member name, section name after successful fetch", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
      expect(screen.getByText("Clase de natación")).toBeInTheDocument();
    });
  });

  // ── 7. File count badge is shown ─────────────────────────────────────────

  it("renders file count badge", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/2 archivos/)).toBeInTheDocument();
    });
  });

  // ── 8. Rejection reason panel when status is rejected ────────────────────

  it("shows rejection reason when status is rechazado", async () => {
    mockGetEvidenceDetail.mockResolvedValue(STUB_DETAIL_REJECTED);

    renderDialog({ id: 99 });

    await waitFor(() => {
      expect(screen.getByText(/motivo de rechazo/i)).toBeInTheDocument();
      expect(
        screen.getByText("Imagen borrosa, no se puede verificar"),
      ).toBeInTheDocument();
    });
  });

  // ── 9. No rejection panel when rejection_reason is null ──────────────────

  it("does NOT show rejection panel when rejection_reason is null", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
    });

    expect(screen.queryByText(/motivo de rechazo/i)).not.toBeInTheDocument();
  });

  // ── 10. ApiError message shown in error panel ─────────────────────────────

  it("shows ApiError message in error panel when fetch throws ApiError", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mockGetEvidenceDetail.mockRejectedValue(
      new ApiError("Evidencia no encontrada", 404, null),
    );

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("Evidencia no encontrada")).toBeInTheDocument();
    });
  });

  // ── 11. Fallback i18n error for non-ApiError ──────────────────────────────

  it("shows i18n fallback error when fetch throws a plain error", async () => {
    mockGetEvidenceDetail.mockRejectedValue(new Error("Network issue"));

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(t.errors.load_detail_failed)).toBeInTheDocument();
    });
  });

  // ── 12. Type and status badges rendered ───────────────────────────────────

  it("renders type and status badges after fetch", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByTestId("type-badge")).toBeInTheDocument();
      expect(screen.getByTestId("status-badge")).toBeInTheDocument();
    });
  });
});
