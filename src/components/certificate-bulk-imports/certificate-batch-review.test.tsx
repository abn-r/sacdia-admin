import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { ApiError } from "@/lib/api/client";
import type {
  CertificateBulkImportBatch,
  CertificateBulkImportFile,
  CertificateBulkImportItem,
} from "@/lib/api/certificate-bulk-imports";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import ptBR from "../../../messages/pt-BR.json";

const certificatesMessages = { es, en, fr, "pt-BR": ptBR };

const mockDownload = vi.hoisted(() => vi.fn());
const mockApproveItem = vi.hoisted(() => vi.fn());
const mockRejectItem = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));

const nav = vi.hoisted(() => {
  let search = "";
  const subs = new Set<() => void>();
  return {
    get: () => search,
    set(next: string) {
      search = next;
      subs.forEach((fn) => fn());
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
});
vi.mock("next/navigation", async () => {
  const react = await import("react");
  return {
    useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: (url: string) => nav.set(url.split("?")[1] ?? "") }),
    usePathname: () => "/dashboard/certificate-bulk-imports/batch-1",
    useSearchParams: () => new URLSearchParams(react.useSyncExternalStore(nav.subscribe, nav.get, nav.get)),
  };
});

vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canCapability: () => true }),
}));

vi.mock("@/lib/api/certificate-bulk-imports", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/certificate-bulk-imports")>();
  return {
    ...original,
    getCertificateBulkImportFileDownloadUrl: (...args: unknown[]) => mockDownload(...args),
    approveCertificateBulkImportItem: (...args: unknown[]) => mockApproveItem(...args),
    rejectCertificateBulkImportItem: (...args: unknown[]) => mockRejectItem(...args),
  };
});

// The real viewer fetches the blob; here only the props it receives matter.
vi.mock("@/components/shared/pdf-inline-viewer", () => ({
  PdfInlineViewer: ({ src, initialPage }: { src: string; initialPage?: number }) => (
    <div data-testid="pdf-viewer" data-src={src} data-page={initialPage} />
  ),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

import { CertificateBatchReview } from "@/components/certificate-bulk-imports/certificate-batch-review";

const FILE: CertificateBulkImportFile = {
  file_id: "file-a",
  batch_id: "batch-1",
  file_url: "private",
  file_name: "comprobante.pdf",
  file_type: "application/pdf",
  uploaded_at: "2026-11-13T10:00:00Z",
  page_count: 3,
};

function honor(overrides: Partial<CertificateBulkImportItem> = {}): CertificateBulkImportItem {
  return {
    item_id: "item-1",
    batch_id: "batch-1",
    item_type: "HONOR",
    detected_name: "Nudos y amarras",
    completed_at: "2025-11-30",
    ocr_confidence: 0.96,
    status: "SUBMITTED",
    source_file_id: "file-a",
    source_page: 1,
    honor: { honor_id: 1, name: "Nudos y amarras", category: { honor_category_id: 1, name: "Campismo" } },
    ...overrides,
  };
}

function batchOf(items: CertificateBulkImportItem[], extra: Partial<CertificateBulkImportBatch> = {}): CertificateBulkImportBatch {
  return {
    batch_id: "batch-1",
    user_id: "u1",
    status: "SUBMITTED",
    user: { user_id: "u1", name: "Valeria", paternal_last_name: "Cruz" },
    files: [FILE],
    items,
    events: [],
    ...extra,
  };
}

function renderReview(batch: CertificateBulkImportBatch) {
  return render(
    <NextIntlClientProvider locale="es" messages={certificatesMessages.es}>
      <CertificateBatchReview batch={batch} />
    </NextIntlClientProvider>,
  );
}

const THREE = [
  honor({ item_id: "i1", source_page: 1 }),
  honor({ item_id: "i2", item_type: "CLASS", honor: null, class: { class_id: 2, name: "Amigo", asset_code: "CL-01" }, source_page: 2, detected_name: "Amigo" }),
  honor({ item_id: "i3", source_page: 3, detected_name: "Cocina", honor: { honor_id: 3, name: "Cocina" }, instructor_conflict: true }),
];

beforeEach(() => {
  nav.set("");
  mockDownload.mockResolvedValue({ file_id: "file-a", download_url: "https://r2.test/file-a.pdf", expires_in: 300 });
  mockApproveItem.mockResolvedValue({ status: "APPROVED" });
  mockRejectItem.mockResolvedValue({ status: "REJECTED" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CertificateBatchReview", () => {
  it("jumps the viewer to the page of the selected row", async () => {
    const user = userEvent.setup();
    renderReview(batchOf(THREE));

    expect((await screen.findByTestId("pdf-viewer")).getAttribute("data-page")).toBe("1");

    await user.click(screen.getByRole("option", { name: /Clase · Amigo/ }));
    await waitFor(() => expect(screen.getByTestId("pdf-viewer").getAttribute("data-page")).toBe("2"));

    await user.click(screen.getByRole("option", { name: /Cocina/ }));
    await waitFor(() => expect(screen.getByTestId("pdf-viewer").getAttribute("data-page")).toBe("3"));
  });

  it("marks the instructor conflict on the row and explains it in the detail", async () => {
    const user = userEvent.setup();
    renderReview(batchOf(THREE));
    const row = screen.getByRole("option", { name: /Cocina/ });
    expect(within(row).getByText("Conflicto de instructor")).toBeInTheDocument();
    await user.click(row);
    expect(screen.getByText(/se conservará el existente/)).toBeInTheDocument();
  });

  it("marks only decided rows; pending ones carry no status", () => {
    renderReview(batchOf([honor({ item_id: "i1", status: "APPROVED" }), honor({ item_id: "i2" })]));
    const [first, second] = screen.getAllByRole("option");
    expect(within(first as HTMLElement).getByText("Aprobada")).toBeInTheDocument();
    expect(within(second as HTMLElement).queryByText("Pendiente")).not.toBeInTheDocument();
  });

  it("shows system blocks as an informative note, never in red or amber", () => {
    renderReview(batchOf([honor({ approval_blockers: ["SIN_PERIODO"] })]));
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("SIN_PERIODO");
    expect(note).toHaveTextContent(/no rechaces la fila/i);
    expect(note.className).not.toMatch(/amber|destructive|red|blue-/);
  });

  it("approves with an optional comment and moves to the next open row", async () => {
    const user = userEvent.setup();
    renderReview(batchOf(THREE));
    await user.click(screen.getByRole("button", { name: "Aprobar y seguir" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Comentario"), "Todo en orden");
    await user.click(within(dialog).getByRole("button", { name: "Aprobar fila" }));

    await waitFor(() => expect(mockApproveItem).toHaveBeenCalledWith("batch-1", "i1", { comment: "Todo en orden" }));
    expect(mockRefresh).toHaveBeenCalled();
    // The approved row is now marked and the next one is selected.
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Clase · Amigo/ })).toHaveAttribute("aria-selected", "true"),
    );
    expect(within(screen.getAllByRole("option")[0] as HTMLElement).getByText("Aprobada")).toBeInTheDocument();
  });

  it("explains a pending investiture authorization and disables approve", async () => {
    const user = userEvent.setup();
    mockApproveItem.mockRejectedValue(
      new ApiError("pending", 409, { code: "CERTIFICATE_IMPORT_AUTHORIZATION_PENDING" }),
    );
    renderReview(batchOf(THREE));
    await user.click(screen.getByRole("button", { name: "Aprobar y seguir" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Aprobar fila" }));

    const note = await within(dialog).findByRole("status");
    expect(note).toHaveTextContent(/solicitud de investidura pendiente/);
    expect(note.className).not.toMatch(/destructive/);
    expect(within(dialog).getByRole("button", { name: "Aprobar fila" })).toBeDisabled();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("asks a reason of up to 1000 characters to reject a row", async () => {
    const user = userEvent.setup();
    renderReview(batchOf(THREE));
    await user.click(screen.getByRole("button", { name: "Rechazar fila…" }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Rechazar fila" });
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByLabelText("Motivo de rechazo")).toHaveAttribute("maxlength", "1000");

    await user.type(within(dialog).getByLabelText("Motivo de rechazo"), "Fecha ilegible");
    await user.click(confirm);
    await waitFor(() => expect(mockRejectItem).toHaveBeenCalledWith("batch-1", "i1", { reason: "Fecha ilegible" }));
  });

  it("keeps the reject dialog open when the API fails", async () => {
    const user = userEvent.setup();
    mockRejectItem.mockRejectedValue(new ApiError("bad", 500, {}));
    renderReview(batchOf(THREE));
    await user.click(screen.getByRole("button", { name: "Rechazar fila…" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.type(within(dialog).getByLabelText("Motivo de rechazo"), "Fecha ilegible");
    await user.click(within(dialog).getByRole("button", { name: "Rechazar fila" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows an error with retry when the voucher link cannot be fetched", async () => {
    mockDownload.mockRejectedValueOnce(new Error("boom"));
    renderReview(batchOf(THREE));
    expect(await screen.findByText("Comprobante no disponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("hides GM-02/GM-03 rows (institutional queue) and shows the audit as a timeline", async () => {
    const user = userEvent.setup();
    renderReview(
      batchOf(
        [honor({ item_id: "i1" }), honor({ item_id: "gm", item_type: "CLASS", honor: null, class: { class_id: 9, name: "Avanzado", asset_code: "GM-02" } })],
        { events: [{ event_id: "e1", batch_id: "batch-1", action: "BATCH_SUBMITTED", created_at: "2026-11-13T18:09:00Z" }] },
      ),
    );
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.click(screen.getByRole("tab", { name: /Auditoría/ }));
    expect(screen.getByText("Lote enviado")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
