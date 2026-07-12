import type { ReactNode } from "react";
import { EvidenceReviewI18nProvider } from "@/components/evidence-review/evidence-review-i18n-provider";

export default function EvidenceReviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <EvidenceReviewI18nProvider>{children}</EvidenceReviewI18nProvider>;
}
