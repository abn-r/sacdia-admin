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
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock-pdf");
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
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
  EvidenceStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock("@/components/evidence-review/evidence-type-badge", () => ({
  EvidenceTypeBadge: ({ type }: { type: string }) => (
    <span data-testid="type-badge">{type}</span>
  ),
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

const STUB_DETAIL_WITH_MULTIPLE_IMAGES: EvidenceDetail = {
  ...STUB_DETAIL,
  file_count: 3,
  files: [
    STUB_DETAIL.files[0],
    {
      evidence_file_id: 3,
      file_url: "https://example.com/foto2.png",
      file_name: "foto2.png",
      file_type: "image/png",
      uploaded_at: "2026-03-15T10:03:00.000Z",
    },
    STUB_DETAIL.files[1],
  ],
};

const STUB_HONOR_DETAIL_WITH_PACKET = {
  ...STUB_DETAIL,
  id: 77,
  type: "honor",
  status: "PENDING_REVIEW",
  section_name: "Arte cristiano",
  file_count: 4,
  files: [
    ...STUB_DETAIL.files,
    {
      evidence_file_id: -100100,
      file_url: "https://example.com/requisito.jpg",
      file_name: "requisito.jpg",
      file_type: "image/jpeg",
      uploaded_at: "2026-03-15T10:10:00.000Z",
    },
    {
      evidence_file_id: -1,
      file_url: "https://example.com/certificado.pdf",
      file_name: "certificado.pdf",
      file_type: "application/pdf",
      uploaded_at: "2026-03-15T10:15:00.000Z",
    },
  ],
  honor_review_packet: {
    user_honor_id: 77,
    honor_id: 20,
    honor_name: "Arte cristiano",
    validation_status: "PENDING_REVIEW",
    completion_mode: "EXTERNAL",
    progress: {
      total_requirements: 2,
      completed_count: 1,
      progress_percentage: 50,
    },
    completed_format_file: {
      evidence_file_id: -2,
      file_url: "https://example.com/formato.pdf",
      file_name: "formato.pdf",
      file_type: "application/pdf",
      uploaded_at: "2026-03-15T10:15:00.000Z",
    },
    general_files: [
      {
        evidence_file_id: -1,
        file_url: "https://example.com/certificado.pdf",
        file_name: "certificado.pdf",
        file_type: "application/pdf",
        uploaded_at: "2026-03-15T10:15:00.000Z",
      },
    ],
    requirement_files: [
    {
      evidence_file_id: -100100,
        file_url: "https://example.com/requisito.jpg",
        file_name: "requisito.jpg",
        file_type: "image/jpeg",
        uploaded_at: "2026-03-15T10:10:00.000Z",
      },
    ],
    requirements: [
      {
        requirement_id: 1,
        requirement_number: "1",
        display_label: "1",
        requirement_text: "Explicar el objetivo del honor",
        requires_evidence: true,
        completed: true,
        text_response: "Respuesta redactada dentro de la app",
        completed_at: "2026-03-15T10:10:00.000Z",
        evidence_count: 1,
        evidences: [
          {
            evidence_file_id: -100100,
            file_url: "https://example.com/requisito.jpg",
            file_name: "requisito.jpg",
            file_type: "image/jpeg",
            uploaded_at: "2026-03-15T10:10:00.000Z",
          },
        ],
      },
      {
        requirement_id: 2,
        requirement_number: "2",
        display_label: "2",
        requirement_text: "Completar una actividad práctica",
        requires_evidence: false,
        completed: false,
        text_response: null,
        completed_at: null,
        evidence_count: 0,
        evidences: [],
      },
    ],
  },
} as EvidenceDetail;

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

  // ── 13. Honor review packet rendering ────────────────────────────────────

  it("renders honor review packet progress and requirement evidence", async () => {
    mockGetEvidenceDetail.mockResolvedValue(STUB_HONOR_DETAIL_WITH_PACKET);

    renderDialog({ type: "honor", id: 77 });

    await waitFor(() => {
      expect(screen.getByText("Progreso del honor")).toBeInTheDocument();
      expect(screen.getByText("Modo de trabajo")).toBeInTheDocument();
      expect(screen.getByText("Fuera de la app")).toBeInTheDocument();
      expect(screen.getByText(/completó la especialidad fuera de SACDIA/i)).toBeInTheDocument();
      expect(screen.getByText("1 de 2 requisitos")).toBeInTheDocument();
      expect(screen.getByText("50% completado")).toBeInTheDocument();
      expect(
        screen.getByText("Explicar el objetivo del honor"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Respuesta redactada dentro de la app"),
      ).toBeInTheDocument();
      expect(screen.getByText("requisito.jpg")).toBeInTheDocument();
    });
  });

  it("opens an in-panel image viewer with all image thumbnails and zoom controls", async () => {
    const user = userEvent.setup();
    mockGetEvidenceDetail.mockResolvedValue(STUB_DETAIL_WITH_MULTIPLE_IMAGES);

    renderDialog();

    const firstImage = await screen.findByRole("img", { name: "foto1.jpg" });
    await user.click(firstImage);

    expect(
      screen.getByRole("heading", { name: /visor de imágenes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver foto1.jpg" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver foto2.png" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver doc.pdf" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /acercar/i }));

    const zoomedImage = screen.getByTestId("evidence-viewer-image");
    expect(screen.getByTestId("evidence-image-scroll-area")).toHaveClass(
      "overflow-auto",
    );
    expect(zoomedImage).toHaveStyle({ width: "125%" });
    expect(zoomedImage.getAttribute("style") ?? "").not.toContain(
      "transform: scale",
    );
  });

  it("opens PDFs inside an in-panel PDF viewer", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "Abrir visor de doc.pdf" }),
    );

    expect(
      screen.getByRole("heading", { name: /visor pdf/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/evidence-review/pdf?type=class&id=42&fileId=2",
        expect.objectContaining({ credentials: "include" }),
      );
      expect(screen.getByTestId("pdf-inline-viewer")).toBeInTheDocument();
    });

    fetchMock.mockRestore();
  });
});
