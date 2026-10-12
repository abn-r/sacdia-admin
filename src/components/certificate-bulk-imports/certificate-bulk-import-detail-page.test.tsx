import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type {
  CertificateBulkImportBatch,
  CertificateBulkImportFile,
  CertificateBulkImportItem,
} from "@/lib/api/certificate-bulk-imports";

const mockDownload = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canCapability: () => true }),
}));

vi.mock("@/lib/api/certificate-bulk-imports", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/certificate-bulk-imports")>();
  return {
    ...original,
    getCertificateBulkImportFileDownloadUrl: (...args: unknown[]) => mockDownload(...args),
  };
});

// The real viewer fetches the blob; here only the props it receives matter.
vi.mock("@/components/shared/pdf-inline-viewer", () => ({
  PdfInlineViewer: ({ src, initialPage }: { src: string; initialPage?: number }) => (
    <div data-testid="pdf-viewer" data-src={src} data-page={initialPage} />
  ),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

Element.prototype.scrollIntoView = () => {};

import { CertificateBulkImportDetailPage } from "@/components/certificate-bulk-imports/certificate-bulk-import-detail-page";

const FILE_A: CertificateBulkImportFile = {
  file_id: "file-a",
  batch_id: "batch-1",
  file_url: "private",
  file_name: "uno.pdf",
  file_type: "application/pdf",
  uploaded_at: "2026-10-01T10:00:00Z",
  page_count: 3,
};
const FILE_B: CertificateBulkImportFile = { ...FILE_A, file_id: "file-b", file_name: "dos.pdf", page_count: 5 };

function honorItem(overrides: Partial<CertificateBulkImportItem> = {}): CertificateBulkImportItem {
  return {
    item_id: "item-1",
    batch_id: "batch-1",
    item_type: "HONOR",
    detected_name: "Primeros auxilios",
    completed_at: "2024-05-12",
    status: "SUBMITTED",
    honor: { honor_id: 12, name: "Primeros Auxilios", category: { honor_category_id: 3, name: "Salud" } },
    ...overrides,
  };
}

function renderPage(batch: Partial<CertificateBulkImportBatch> = {}) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CertificateBulkImportDetailPage
        batch={{
          batch_id: "batch-1",
          user_id: "user-1",
          status: "SUBMITTED",
          files: [FILE_A, FILE_B],
          items: [honorItem()],
          events: [],
          ...batch,
        }}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockDownload.mockImplementation(async (_batchId: string, fileId: string) => ({
    file_id: fileId,
    download_url: `https://r2.test/${fileId}.pdf`,
    expires_in: 300,
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("instructor on the row", () => {
  it("shows a system user", () => {
    renderPage({
      items: [honorItem({ instructor: { kind: "USER", user_id: "u-1", display_name: "Ana Pérez" } })],
    });
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Usuario del sistema")).toBeInTheDocument();
    expect(screen.queryByText("Externo, no verificado")).not.toBeInTheDocument();
  });

  it("flags an external instructor as unverified", () => {
    renderPage({ items: [honorItem({ instructor: { kind: "EXTERNAL", display_name: "Juan López" } })] });
    expect(screen.getByText("Juan López")).toBeInTheDocument();
    expect(screen.getByText("Externo, no verificado")).toBeInTheDocument();
  });

  it.each([
    ["null", { instructor: null }],
    ["a missing key", {}],
  ])("shows 'Sin instructor' with %s", (_label, overrides) => {
    renderPage({ items: [honorItem(overrides)] });
    expect(screen.getByText(/Sin instructor/)).toBeInTheDocument();
  });

  it("does not render an instructor line for CLASS rows", () => {
    renderPage({
      items: [
        honorItem({
          item_type: "CLASS",
          honor: null,
          class: {
            class_id: 4,
            name: "Amigo",
            asset_code: "CL-01",
            club_type: { club_type_id: 1, name: "Conquistadores" },
          },
        }),
      ],
    });
    expect(screen.queryByText(/Instructor:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Conquistadores · Amigo/)).toBeInTheDocument();
    expect(screen.getByText("CL-01")).toBeInTheDocument();
    expect(screen.getByText(/Fecha de investidura/)).toBeInTheDocument();
  });

  it("shows category and honor name", () => {
    renderPage();
    expect(screen.getByText(/Salud · Primeros Auxilios/)).toBeInTheDocument();
  });
});

describe("instructor conflict", () => {
  it("warns before approving", () => {
    renderPage({ items: [honorItem({ instructor_conflict: true })] });
    expect(screen.getByText("Conflicto de instructor")).toBeInTheDocument();
    expect(
      screen.getByText("Ya tiene esta especialidad aprobada con otro instructor; se conservará el existente."),
    ).toBeInTheDocument();
  });

  it("keeps the warning after approving, in the past tense", () => {
    renderPage({ items: [honorItem({ status: "APPROVED", instructor_conflict: true })] });
    expect(
      screen.getByText("Ya tenía esta especialidad aprobada con otro instructor; se conservó el existente."),
    ).toBeInTheDocument();
  });

  it.each([[false], [undefined]])("shows nothing when instructor_conflict is %s", (value) => {
    renderPage({ items: [honorItem({ instructor_conflict: value })] });
    expect(screen.queryByText("Conflicto de instructor")).not.toBeInTheDocument();
  });
});

describe("proof link", () => {
  async function viewerNow() {
    return screen.findByTestId("pdf-viewer");
  }

  it("opens the row's file at the row's page", async () => {
    const user = userEvent.setup();
    renderPage({ items: [honorItem({ source_file_id: "file-b", source_page: 4 })] });

    // Default view: first file, page 1.
    expect((await viewerNow()).getAttribute("data-src")).toBe("https://r2.test/file-a.pdf");

    await user.click(screen.getByRole("button", { name: /Ver en el comprobante · pág\. 4/ }));

    await waitFor(() => {
      const viewer = screen.getByTestId("pdf-viewer");
      expect(viewer.getAttribute("data-src")).toBe("https://r2.test/file-b.pdf");
      expect(viewer.getAttribute("data-page")).toBe("4");
    });
    expect(screen.getByText(/Abierto en la página 4 de 5/)).toBeInTheDocument();
  });

  it("falls back to the first file on page 1 without source_file_id", async () => {
    const user = userEvent.setup();
    renderPage({ items: [honorItem({ source_file_id: null, source_page: 2 })] });
    await user.click(screen.getByRole("button", { name: /Ver en el comprobante · pág\. 1/ }));

    await waitFor(() => {
      const viewer = screen.getByTestId("pdf-viewer");
      expect(viewer.getAttribute("data-src")).toBe("https://r2.test/file-a.pdf");
      expect(viewer.getAttribute("data-page")).toBe("1");
    });
  });

  it("uses page 1 when source_page is out of range", () => {
    renderPage({ items: [honorItem({ source_file_id: "file-a", source_page: 9 })] });
    expect(screen.getByRole("button", { name: /pág\. 1/ })).toBeInTheDocument();
  });

  it("keeps the source page when page_count is null", async () => {
    const user = userEvent.setup();
    renderPage({
      files: [{ ...FILE_A, page_count: null }],
      items: [honorItem({ source_file_id: "file-a", source_page: 2 })],
    });
    await user.click(screen.getByRole("button", { name: /pág\. 2/ }));

    await waitFor(() => expect(screen.getByTestId("pdf-viewer").getAttribute("data-page")).toBe("2"));
    expect(screen.getByText(/Abierto en la página 2$/)).toBeInTheDocument();
    expect(screen.queryByText(/páginas/)).not.toBeInTheDocument();
  });

  it("is hidden when the batch has no files", () => {
    renderPage({ files: [] });
    expect(screen.queryByRole("button", { name: /Ver en el comprobante/ })).not.toBeInTheDocument();
  });

  it("shows page_count for every file", async () => {
    renderPage();
    await viewerNow();
    expect(screen.getByText(/Subido .* · 3 páginas/)).toBeInTheDocument();
    const switcher = screen.getByRole("button", { name: /dos\.pdf/ });
    expect(within(switcher).getByText(/5 páginas/)).toBeInTheDocument();
  });
});

describe("ocr_state", () => {
  it.each([
    ["pending", "Lectura en cola"],
    ["running", "Leyendo…"],
    ["done", "Lectura completa"],
    ["empty", "Sin filas detectadas"],
    ["failed", "Lectura fallida"],
  ] as const)("shows %s", (ocr_state, label) => {
    renderPage({ ocr_state });
    const summary = screen.getByTestId("ocr-state");
    expect(within(summary).getByText(label)).toBeInTheDocument();
  });

  it("explains a known error code when the reading failed", () => {
    renderPage({ ocr_state: "failed", ocr_error_code: "CERTIFICATE_IMPORT_OCR_QUOTA" });
    expect(screen.getByTestId("ocr-state")).toHaveTextContent(/Se alcanzó el límite del servicio de lectura/);
  });

  it("uses a generic text for an unknown error code", () => {
    renderPage({ ocr_state: "failed", ocr_error_code: "SOMETHING_NEW" });
    expect(screen.getByTestId("ocr-state")).toHaveTextContent(/No se pudo leer el comprobante/);
  });

  it("ignores the error code outside the failed state", () => {
    renderPage({ ocr_state: "done", ocr_error_code: "CERTIFICATE_IMPORT_OCR_QUOTA" });
    expect(screen.getByTestId("ocr-state")).not.toHaveTextContent(/límite/);
  });

  it.each([
    ["null", { ocr_state: null }],
    ["a missing key", {}],
  ])("renders nothing with %s", (_label, overrides) => {
    renderPage(overrides);
    expect(screen.queryByTestId("ocr-state")).not.toBeInTheDocument();
  });
});
