import type {
  CertificateBulkImportBatch,
  CertificateBulkImportItem,
  CertificateBulkImportUser,
} from "@/lib/api/certificate-bulk-imports";

export function formatUserName(user?: CertificateBulkImportUser | null): string {
  if (!user) return "Miembro sin nombre";
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email ?? "Miembro sin nombre";
}

export function formatShortId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8).toUpperCase();
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function itemCatalogName(item: CertificateBulkImportItem): string {
  return item.honor?.name ?? item.class?.name ?? "Sin match";
}

export function getBatchCounts(batch: CertificateBulkImportBatch) {
  const items = batch.items ?? [];
  return {
    total: items.length,
    approved: items.filter((item) => item.status === "APPROVED").length,
    rejected: items.filter((item) => item.status === "REJECTED").length,
    pending: items.filter((item) => item.status === "SUBMITTED" || item.status === "RESUBMITTED").length,
    needsReview: items.filter((item) => item.status === "NEEDS_REVIEW" || item.status === "READY").length,
  };
}

export function isReviewableItem(item: CertificateBulkImportItem): boolean {
  return item.status === "SUBMITTED" || item.status === "RESUBMITTED";
}

export function confidenceLabel(value?: number | null): string {
  if (typeof value !== "number") return "—";
  if (value >= 0.85) return "Alta";
  if (value >= 0.65) return "Media";
  return "Baja";
}

export function confidencePercent(value?: number | null): string {
  if (typeof value !== "number") return "—";
  return `${Math.round(value * 100)}%`;
}
