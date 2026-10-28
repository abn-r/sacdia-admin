import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type {
  CertificateBulkImportBatchStatus,
  CertificateBulkImportItemStatus,
  CertificateBulkImportItemType,
} from "@/lib/api/certificate-bulk-imports";

function variantForStatus(status: string): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  if (status === "NEEDS_CORRECTION" || status === "PARTIALLY_APPROVED") return "secondary";
  return "outline";
}

export function CertificateBatchStatusBadge({ status }: { status: CertificateBulkImportBatchStatus }) {
  const t = useTranslations("certificate_bulk_imports.batchStatus");
  return <Badge variant={variantForStatus(status)}>{t.has(status) ? t(status) : status}</Badge>;
}

export function CertificateItemStatusBadge({ status }: { status: CertificateBulkImportItemStatus }) {
  const t = useTranslations("certificate_bulk_imports.itemStatus");
  return <Badge variant={variantForStatus(status)}>{t.has(status) ? t(status) : status}</Badge>;
}

export function CertificateItemTypeBadge({ type }: { type: CertificateBulkImportItemType }) {
  const t = useTranslations("certificate_bulk_imports.itemType");
  return <Badge variant="outline">{t.has(type) ? t(type) : type}</Badge>;
}
