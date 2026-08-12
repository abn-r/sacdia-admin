"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CertificationCreateDialog } from "@/components/certifications/certification-create-dialog";
import {
  CertificationVersionWorkbench,
  type CertificationWorkbenchState,
} from "@/components/certifications/certification-version-workbench";
import { createDraftVersion, type AdminCertificationVersion } from "@/lib/api/certifications";

type CertificationSummary = {
  certification_id: number;
  name: string;
  description?: string | null;
};

interface CertificationsAdminPanelProps {
  certifications: CertificationSummary[];
  canConfigure: boolean;
  canPublish: boolean;
}

function statusBadgeVariant(status: AdminCertificationVersion["status"]) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "RETIRED") return "outline" as const;
  return "soft-warning" as const;
}

export function CertificationsAdminPanel({
  certifications,
  canConfigure,
  canPublish,
}: CertificationsAdminPanelProps) {
  const t = useTranslations("certificationsAdmin");
  const [createOpen, setCreateOpen] = useState(false);
  const [sessionCertifications, setSessionCertifications] = useState<CertificationSummary[]>([]);
  const [workbenches, setWorkbenches] = useState<Record<number, CertificationWorkbenchState>>({});
  const [activeWorkbenchId, setActiveWorkbenchId] = useState<number | null>(null);
  const [creatingDraftForId, setCreatingDraftForId] = useState<number | null>(null);

  if (!canConfigure) {
    return null;
  }

  const knownIds = new Set(certifications.map((c) => c.certification_id));
  const rows = [
    ...sessionCertifications.filter((c) => !knownIds.has(c.certification_id)),
    ...certifications,
  ];

  function openWorkbench(certificationId: number) {
    setActiveWorkbenchId(certificationId);
  }

  async function handleCreateDraft(certification: CertificationSummary) {
    setCreatingDraftForId(certification.certification_id);
    try {
      const version = await createDraftVersion(certification.certification_id);
      setWorkbenches((prev) => ({
        ...prev,
        [certification.certification_id]: {
          certification,
          version,
          modules: [],
          rules: [],
        },
      }));
      toast.success(t("toasts.draftCreated"));
      openWorkbench(certification.certification_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.draftCreateFailed");
      toast.error(message);
    } finally {
      setCreatingDraftForId(null);
    }
  }

  const activeWorkbench = activeWorkbenchId != null ? workbenches[activeWorkbenchId] : null;

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4 text-primary" />
            {t("panelTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("panelDescription")}</p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t("newCertificationButton")}
        </Button>
      </div>

      <div className="rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("table.name")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("table.sessionStatus")}
              </TableHead>
              <TableHead className="h-9 w-48 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("table.empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((certification) => {
                const workbench = workbenches[certification.certification_id];
                const isCreatingDraft = creatingDraftForId === certification.certification_id;
                return (
                  <TableRow key={certification.certification_id} className="hover:bg-muted/30">
                    <TableCell className="px-3 py-2.5 align-middle">
                      <span className="font-medium">{certification.name}</span>
                      {certification.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {certification.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      {workbench ? (
                        <Badge variant={statusBadgeVariant(workbench.version.status)}>
                          {t(`status.${workbench.version.status}`)} · {t("versionLabel", {
                            number: workbench.version.version_number,
                          })}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("table.noSessionDraft")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-right">
                      {workbench ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openWorkbench(certification.certification_id)}
                        >
                          {t("table.openEditor")}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isCreatingDraft}
                          onClick={() => handleCreateDraft(certification)}
                        >
                          {isCreatingDraft ? t("table.creatingDraft") : t("table.createDraft")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CertificationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(result) => {
          setSessionCertifications((prev) => [
            {
              certification_id: result.certification.certification_id,
              name: result.certification.name,
              description: result.certification.description,
            },
            ...prev,
          ]);
          setWorkbenches((prev) => ({
            ...prev,
            [result.certification.certification_id]: {
              certification: {
                certification_id: result.certification.certification_id,
                name: result.certification.name,
                description: result.certification.description,
              },
              version: result.version,
              modules: [],
              rules: [],
            },
          }));
          openWorkbench(result.certification.certification_id);
        }}
      />

      {activeWorkbench && (
        <CertificationVersionWorkbench
          open={activeWorkbenchId != null}
          onOpenChange={(open) => {
            if (!open) setActiveWorkbenchId(null);
          }}
          state={activeWorkbench}
          canPublish={canPublish}
          onStateChange={(next) => {
            setWorkbenches((prev) => ({ ...prev, [next.certification.certification_id]: next }));
          }}
        />
      )}
    </div>
  );
}
