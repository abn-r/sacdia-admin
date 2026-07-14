"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Award, BookOpen, FileText, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CertificateBulkImportListPage } from "@/components/certificate-bulk-imports/certificate-bulk-import-list-page";
import { EvidenceReviewPanel } from "@/components/clubs/validations/evidence-review-panel";
import { ValidationQueuePanel } from "@/components/clubs/validations/validation-queue-panel";
import type { CertificateBulkImportBatch } from "@/lib/api/certificate-bulk-imports";
import type { EvidenceItem } from "@/lib/api/evidence-review";
import type { PendingValidation } from "@/lib/api/validation";

export type ClubsValidationTab =
  | "honors"
  | "modules"
  | "sections"
  | "certificates";

const TAB_VALUES: ClubsValidationTab[] = [
  "honors",
  "modules",
  "sections",
  "certificates",
];

interface ClubsValidationsClientProps {
  initialHonors: PendingValidation[];
  initialModules: PendingValidation[];
  initialHonorEvidence: EvidenceItem[];
  initialSectionEvidence: EvidenceItem[];
  certificateBatches: CertificateBulkImportBatch[];
  certificateTotal: number;
  defaultTab: ClubsValidationTab;
}

export function ClubsValidationsClient({
  initialHonors,
  initialModules,
  initialHonorEvidence,
  initialSectionEvidence,
  certificateBatches,
  certificateTotal,
  defaultTab,
}: ClubsValidationsClientProps) {
  const t = useTranslations("clubs.pages.validations");
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab =
    (searchParams.get("tab") as ClubsValidationTab | null) ?? defaultTab;
  const safeTab = TAB_VALUES.includes(activeTab) ? activeTab : defaultTab;

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={safeTab} onValueChange={handleTabChange} className="space-y-4">
      <div className="overflow-x-auto border-b border-border">
        <TabsList variant="line" className="gap-4">
          <TabsTrigger value="honors" className="gap-2 whitespace-nowrap">
            <Award className="size-4" />
            {t("tabs.honors")}
            {initialHonors.length > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initialHonors.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2 whitespace-nowrap">
            <Layers className="size-4" />
            {t("tabs.modules")}
            {initialModules.length > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initialModules.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2 whitespace-nowrap">
            <BookOpen className="size-4" />
            {t("tabs.sections")}
            {initialSectionEvidence.length > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initialSectionEvidence.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="certificates" className="gap-2 whitespace-nowrap">
            <FileText className="size-4" />
            {t("tabs.certificates")}
            {certificateBatches.length > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {certificateBatches.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="honors" className="space-y-8">
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">{t("sections.submissions")}</h3>
            <p className="text-sm text-muted-foreground">{t("sections.submissionsHonorsHint")}</p>
          </div>
          <ValidationQueuePanel entityType="honor" initialItems={initialHonors} />
        </section>
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">{t("sections.evidence")}</h3>
            <p className="text-sm text-muted-foreground">{t("sections.evidenceHonorsHint")}</p>
          </div>
          <EvidenceReviewPanel
            evidenceType="honor"
            initialItems={initialHonorEvidence}
          />
        </section>
      </TabsContent>

      <TabsContent value="modules">
        <ValidationQueuePanel entityType="class" initialItems={initialModules} />
      </TabsContent>

      <TabsContent value="sections">
        <EvidenceReviewPanel
          evidenceType="class"
          initialItems={initialSectionEvidence}
        />
      </TabsContent>

      <TabsContent value="certificates">
        <CertificateBulkImportListPage
          batches={certificateBatches}
          total={certificateTotal}
          detailBasePath="/dashboard/clubs/validations/certificates"
        />
      </TabsContent>
    </Tabs>
  );
}
