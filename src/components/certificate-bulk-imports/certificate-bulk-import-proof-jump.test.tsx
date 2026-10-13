import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type {
  CertificateBulkImportBatch,
  CertificateBulkImportFile,
  CertificateBulkImportItem,
} from "@/lib/api/certificate-bulk-imports";

/**
 * Wires the real PdfInlineViewer into the review page: the page heading and the
 * viewer must be driven by the same page, and each "Ver en el comprobante" click
 * must load a fresh frame on that page. No browser here, so the DOM contract
 * (iframe src fragment + node identity) is what stands in for "the viewer jumped".
 */

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
          items: [],
          events: [],
          ...batch,
        }}
      />
    </NextIntlClientProvider>,
  );
}

/** Each fetched file gets its own blob URL, like the real createObjectURL. */
let blobCounter = 0;

beforeEach(() => {
  blobCounter = 0;
  mockDownload.mockImplementation(async (_batchId: string, fileId: string) => ({
    file_id: fileId,
    download_url: `https://r2.test/${fileId}.pdf`,
    expires_in: 300,
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, blob: async () => ({ size: 8, type: "application/pdf" }) })),
  );
  URL.createObjectURL = vi.fn(() => `blob:http://localhost/pdf-${++blobCounter}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function viewer() {
  return (await screen.findByTestId("pdf-inline-viewer")) as HTMLIFrameElement;
}

/** The "#page=N" the frame loads with, or null when it has no fragment. */
function framePage(frame: HTMLElement): number | null {
  const match = /#page=(\d+)$/.exec(frame.getAttribute("src") ?? "");
  return match ? Number(match[1]) : null;
}

describe("proof viewer page jump", () => {
  it("opens page 1 by default and does not claim a page in the heading", async () => {
    renderPage({ items: [honorItem({ source_file_id: "file-a", source_page: 2 })] });
    const frame = await viewer();
    expect(framePage(frame)).toBe(1);
    expect(screen.queryByText(/Abierto en la página/)).not.toBeInTheDocument();
  });

  it("loads a new frame on the clicked page and the heading names that same page", async () => {
    const user = userEvent.setup();
    renderPage({ items: [honorItem({ source_file_id: "file-a", source_page: 2 })] });
    const initial = await viewer();

    await user.click(screen.getByRole("button", { name: /Ver en el comprobante · pág\. 2/ }));

    await waitFor(() => expect(framePage(screen.getByTestId("pdf-inline-viewer"))).toBe(2));
    const jumped = screen.getByTestId("pdf-inline-viewer");
    expect(jumped).not.toBe(initial);
    expect(initial.isConnected).toBe(false);

    const headingPage = Number(/Abierto en la página (\d+) de 3/.exec(document.body.textContent ?? "")?.[1]);
    expect(headingPage).toBe(2);
    expect(framePage(jumped)).toBe(headingPage);
  });

  it("reloads the frame when two rows point to different pages of the same file", async () => {
    const user = userEvent.setup();
    renderPage({
      items: [
        honorItem({ item_id: "item-1", detected_name: "Uno", source_file_id: "file-a", source_page: 2 }),
        honorItem({ item_id: "item-2", detected_name: "Dos", source_file_id: "file-a", source_page: 3 }),
      ],
    });
    await viewer();

    await user.click(screen.getByRole("button", { name: /pág\. 2/ }));
    await waitFor(() => expect(framePage(screen.getByTestId("pdf-inline-viewer"))).toBe(2));
    const onPageTwo = screen.getByTestId("pdf-inline-viewer");

    await user.click(screen.getByRole("button", { name: /pág\. 3/ }));
    await waitFor(() => expect(framePage(screen.getByTestId("pdf-inline-viewer"))).toBe(3));
    expect(screen.getByTestId("pdf-inline-viewer")).not.toBe(onPageTwo);
    expect(screen.getByText(/Abierto en la página 3 de 3/)).toBeInTheDocument();
  });

  it("reloads the frame when the same page is requested again after scrolling away", async () => {
    const user = userEvent.setup();
    renderPage({
      items: [
        honorItem({ item_id: "item-1", detected_name: "Uno", source_file_id: "file-a", source_page: 2 }),
        honorItem({ item_id: "item-2", detected_name: "Dos", source_file_id: "file-a", source_page: 2 }),
      ],
    });
    await viewer();

    const [first, second] = screen.getAllByRole("button", { name: /pág\. 2/ });
    await user.click(first!);
    await waitFor(() => expect(framePage(screen.getByTestId("pdf-inline-viewer"))).toBe(2));
    const before = screen.getByTestId("pdf-inline-viewer");

    await user.click(second!);
    await waitFor(() => expect(screen.getByTestId("pdf-inline-viewer")).not.toBe(before));
    expect(framePage(screen.getByTestId("pdf-inline-viewer"))).toBe(2);
  });

  it("switching files opens page 1 of the chosen file and drops the page claim", async () => {
    const user = userEvent.setup();
    renderPage({ items: [honorItem({ source_file_id: "file-a", source_page: 2 })] });
    await viewer();
    await user.click(screen.getByRole("button", { name: /Ver en el comprobante · pág\. 2/ }));
    await waitFor(() => expect(screen.getByText(/Abierto en la página 2 de 3/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /dos\.pdf/ }));

    await waitFor(() => expect(screen.queryByText(/Abierto en la página/)).not.toBeInTheDocument());
    expect(framePage(screen.getByTestId("pdf-inline-viewer"))).toBe(1);
  });
});
