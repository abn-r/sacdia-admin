"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { InstitutionalCertificateRequestStatus } from "@/lib/api/institutional-certificate-requests";

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
  const t = useTranslations("institutional_certificate_requests.status");
  return (
    <Badge variant={variantForStatus(status)}>
      {t.has(status) ? t(status) : status}
    </Badge>
  );
}
