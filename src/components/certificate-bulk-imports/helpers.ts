import type {
  CertificateBulkImportBatch,
  CertificateBulkImportFile,
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

export function formatCivilDate(value?: string | null): string {
  if (!value) return "—";
  const civil = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = civil
    ? new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

/** "Categoría · Especialidad" or "Tipo de club · Clase"; just the name when the parent is missing. */
export function itemCatalogLabel(item: CertificateBulkImportItem): string {
  const name = itemCatalogName(item);
  const parent = item.honor ? item.honor.category?.name : item.class?.club_type?.name;
  return parent ? `${parent} · ${name}` : name;
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

export type ProofTarget = { fileId: string; page: number };

/**
 * Where "Ver en el comprobante" opens for a row (same rule as the member app):
 * the file is `source_file_id` when it is still in `files`, otherwise the first
 * file. `source_page` only counts when the file came from `source_file_id` and
 * fits in `page_count` (unknown `page_count` only needs >= 1); any other case
 * opens page 1, so inconsistent data never breaks the viewer.
 * Returns null when the batch has no visible files.
 */
export function resolveProofTarget(
  item: Pick<CertificateBulkImportItem, "source_file_id" | "source_page">,
  files: readonly CertificateBulkImportFile[],
): ProofTarget | null {
  const first = files[0];
  if (!first) return null;

  const source = item.source_file_id
    ? files.find((file) => file.file_id === item.source_file_id)
    : undefined;
  if (!source) return { fileId: first.file_id, page: 1 };

  const page = item.source_page;
  const pageCount = source.page_count;
  const validPage =
    typeof page === "number" &&
    Number.isInteger(page) &&
    page >= 1 &&
    (typeof pageCount !== "number" || page <= pageCount);
  return { fileId: source.file_id, page: validPage ? page : 1 };
}

/** What a reviewer decision changes on a row, taken from the API response. */
export type ItemDecision = Pick<CertificateBulkImportItem, "status"> &
  Partial<Pick<CertificateBulkImportItem, "rejection_reason" | "reviewed_at" | "instructor_conflict">>;

/**
 * Builds the local copy of a decision from the item the API returned. Only the
 * fields a decision changes are kept (the approve response also carries
 * unrelated columns). The status falls back to the action when the response has
 * none, so a decision never leaves the row looking undecided.
 */
export function buildItemDecision(
  action: "approve" | "reject",
  decided?: Partial<CertificateBulkImportItem> | null,
): ItemDecision {
  const fallbackStatus = action === "approve" ? "APPROVED" : "REJECTED";
  const decision: ItemDecision = {
    status: decided?.status === "APPROVED" || decided?.status === "REJECTED" ? decided.status : fallbackStatus,
  };
  if (decided?.rejection_reason !== undefined) decision.rejection_reason = decided.rejection_reason;
  if (decided?.reviewed_at !== undefined) decision.reviewed_at = decided.reviewed_at;
  if (decided?.instructor_conflict !== undefined) decision.instructor_conflict = decided.instructor_conflict;
  return decision;
}

/**
 * Overlays locally known decisions on the rows the server sent. A decision only
 * applies while the server row is still reviewable: once the server reports the
 * row as decided, the server wins (and a later resubmission is never masked).
 */
export function applyItemDecisions(
  items: readonly CertificateBulkImportItem[],
  decisions: Readonly<Record<string, ItemDecision>>,
): CertificateBulkImportItem[] {
  return items.map((item) => {
    const decision = decisions[item.item_id];
    return decision && isReviewableItem(item) ? { ...item, ...decision } : item;
  });
}

/** Ids of locally decided rows the server data has not caught up with yet. */
export function undeliveredDecisionIds(
  items: readonly CertificateBulkImportItem[],
  decisions: Readonly<Record<string, ItemDecision>>,
): string[] {
  return items
    .filter((item) => decisions[item.item_id] !== undefined && isReviewableItem(item))
    .map((item) => item.item_id);
}
