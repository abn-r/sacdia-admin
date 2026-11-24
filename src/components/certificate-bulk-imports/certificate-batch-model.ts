import type {
  CertificateBulkImportBatch,
  CertificateBulkImportItem,
} from "@/lib/api/certificate-bulk-imports";
import { getBatchCounts } from "@/components/certificate-bulk-imports/helpers";

export type BatchTab = "pending" | "partial" | "correction" | "all";

export const BATCH_TABS: readonly BatchTab[] = ["pending", "partial", "correction", "all"];

/** Which tab tells a batch's state. Batches in any other state only show under "all". */
export function batchTabOf(batch: Pick<CertificateBulkImportBatch, "status">): BatchTab | null {
  if (batch.status === "SUBMITTED") return "pending";
  if (batch.status === "PARTIALLY_APPROVED") return "partial";
  if (batch.status === "NEEDS_CORRECTION") return "correction";
  return null;
}

export function matchesBatchTab(batch: Pick<CertificateBulkImportBatch, "status">, tab: BatchTab): boolean {
  return tab === "all" || batchTabOf(batch) === tab;
}

/** Rows a reviewer already decided (approved or rejected) and the total. */
export function getBatchProgress(batch: CertificateBulkImportBatch): { done: number; total: number } {
  const counts = getBatchCounts(batch);
  return { done: counts.approved + counts.rejected, total: counts.total };
}

/** GM-02 / GM-03 go to the institutional queue, never to Campo Local. */
const INSTITUTIONAL_ASSET_CODES = ["GM-02", "GM-03"];

export function isInstitutionalItem(item: Pick<CertificateBulkImportItem, "class">): boolean {
  return INSTITUTIONAL_ASSET_CODES.includes(item.class?.asset_code ?? "");
}

export function confidenceLevel(value?: number | null): "high" | "medium" | "low" | null {
  if (typeof value !== "number") return null;
  if (value >= 0.85) return "high";
  if (value >= 0.65) return "medium";
  return "low";
}
