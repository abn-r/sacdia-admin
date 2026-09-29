import { Badge } from "@/components/ui/badge";
import type { InstitutionalCertificateRequestStatus } from "@/lib/api/institutional-certificate-requests";

const STATUS_LABELS: Record<InstitutionalCertificateRequestStatus, string> = {
  PENDING_REVIEW: "Pendiente",
  APPROVED: "Validación aprobada",
  REJECTED: "Rechazada",
};

function variantForStatus(
  status: InstitutionalCertificateRequestStatus,
): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

export function InstitutionalRequestStatusBadge({
  status,
}: {
  status: InstitutionalCertificateRequestStatus;
}) {
  return (
    <Badge variant={variantForStatus(status)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
