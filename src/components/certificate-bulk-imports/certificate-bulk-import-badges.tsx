import { Badge } from "@/components/ui/badge";
import type {
  CertificateBulkImportBatchStatus,
  CertificateBulkImportItemStatus,
  CertificateBulkImportItemType,
} from "@/lib/api/certificate-bulk-imports";

const batchLabels: Record<CertificateBulkImportBatchStatus, string> = {
  DRAFT: "Borrador",
  READY_TO_SUBMIT: "Listo",
  SUBMITTED: "Pendiente",
  PARTIALLY_APPROVED: "Parcial",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  NEEDS_CORRECTION: "Corrección",
};

const itemLabels: Record<CertificateBulkImportItemStatus, string> = {
  NEEDS_REVIEW: "Revisar",
  READY: "Listo",
  SUBMITTED: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  RESUBMITTED: "Reenviada",
};

function variantForStatus(status: string): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "APPROVED") return "soft-success";
  if (status === "REJECTED") return "destructive";
  if (status === "NEEDS_CORRECTION" || status === "PARTIALLY_APPROVED") return "soft-warning";
  return "soft-info";
}

export function CertificateBatchStatusBadge({ status }: { status: CertificateBulkImportBatchStatus }) {
  return <Badge variant={variantForStatus(status)}>{batchLabels[status] ?? status}</Badge>;
}

export function CertificateItemStatusBadge({ status }: { status: CertificateBulkImportItemStatus }) {
  return <Badge variant={variantForStatus(status)}>{itemLabels[status] ?? status}</Badge>;
}

export function CertificateItemTypeBadge({ type }: { type: CertificateBulkImportItemType }) {
  return <Badge variant="outline">{type === "HONOR" ? "Especialidad" : "Clase"}</Badge>;
}
