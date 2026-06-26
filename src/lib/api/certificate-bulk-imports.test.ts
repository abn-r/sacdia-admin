import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();
const mockApiRequestFromClient = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  apiRequestFromClient: (...args: unknown[]) => mockApiRequestFromClient(...args),
}));

import {
  approveCertificateBulkImportBatch,
  approveCertificateBulkImportItem,
  getCertificateBulkImportDetail,
  getPendingCertificateBulkImports,
  rejectCertificateBulkImportBatch,
  rejectCertificateBulkImportItem,
} from "@/lib/api/certificate-bulk-imports";

describe("certificate bulk imports API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps pending batches from the standard { status, data } envelope", async () => {
    const data = { items: [{ batch_id: "batch-1" }], total: 1, page: 2, limit: 10 };
    mockApiRequest.mockResolvedValue({ status: "success", data });

    await expect(getPendingCertificateBulkImports({ page: 2, limit: 10 })).resolves.toBe(data);

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/certificate-bulk-imports/pending", {
      params: { page: 2, limit: 10 },
    });
  });

  it("fetches a batch detail by id and unwraps the envelope", async () => {
    const data = { batch_id: "batch-1", items: [] };
    mockApiRequest.mockResolvedValue({ status: "success", data });

    await expect(getCertificateBulkImportDetail("batch-1")).resolves.toBe(data);

    expect(mockApiRequest).toHaveBeenCalledWith("/admin/certificate-bulk-imports/batch-1");
  });

  it("sends batch approve/reject mutations through the client request helper", async () => {
    mockApiRequestFromClient.mockResolvedValueOnce({ status: "success", data: { status: "APPROVED" } });
    mockApiRequestFromClient.mockResolvedValueOnce({ status: "success", data: { status: "NEEDS_CORRECTION" } });

    await approveCertificateBulkImportBatch("batch-1", { comment: "OK" });
    await rejectCertificateBulkImportBatch("batch-1", { reason: "Fecha ilegible" });

    expect(mockApiRequestFromClient).toHaveBeenNthCalledWith(1, "/admin/certificate-bulk-imports/batch-1/approve", {
      method: "POST",
      body: { comment: "OK" },
    });
    expect(mockApiRequestFromClient).toHaveBeenNthCalledWith(2, "/admin/certificate-bulk-imports/batch-1/reject", {
      method: "POST",
      body: { reason: "Fecha ilegible" },
    });
  });

  it("sends item approve/reject mutations with batch and item ids", async () => {
    mockApiRequestFromClient.mockResolvedValue({ status: "success", data: { item_id: "item-1" } });

    await approveCertificateBulkImportItem("batch-1", "item-1", { comment: "Validado" });
    await rejectCertificateBulkImportItem("batch-1", "item-1", { reason: "Sin firma" });

    expect(mockApiRequestFromClient).toHaveBeenNthCalledWith(1, "/admin/certificate-bulk-imports/batch-1/items/item-1/approve", {
      method: "POST",
      body: { comment: "Validado" },
    });
    expect(mockApiRequestFromClient).toHaveBeenNthCalledWith(2, "/admin/certificate-bulk-imports/batch-1/items/item-1/reject", {
      method: "POST",
      body: { reason: "Sin firma" },
    });
  });
});
