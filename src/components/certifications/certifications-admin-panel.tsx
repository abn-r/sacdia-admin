"use client";

import { useEffect, useState } from "react";
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
import {
  createDraftVersion,
  getCertificationVersionDetail,
  listAdminCertifications,
  type AdminCertificationListItem,
  type AdminCertificationVersionSummary,
} from "@/lib/api/certifications";

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

function statusBadgeVariant(status: AdminCertificationVersionSummary["status"]) {
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
  const [items, setItems] = useState<AdminCertificationListItem[] | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [openingVersionId, setOpeningVersionId] = useState<number | null>(null);
  const [creatingDraftForId, setCreatingDraftForId] = useState<number | null>(null);
  const [activeWorkbench, setActiveWorkbench] = useState<CertificationWorkbenchState | null>(null);

  async function loadList() {
    setIsLoadingList(true);
    try {
      const list = await listAdminCertifications();
      setItems(list);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.listLoadFailed");
      toast.error(message);
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    if (!canConfigure) return;
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canConfigure]);

  if (!canConfigure) {
    return null;
  }

  // Fallback while the admin list has not loaded (or failed): server-provided
  // summaries without version info.
  const rows: AdminCertificationListItem[] =
    items ??
    certifications.map((certification) => ({
      ...certification,
      certification_versions: [],
    }));

  async function openVersion(certification: CertificationSummary, versionId: number) {
    setOpeningVersionId(versionId);
    try {
      const detail = await getCertificationVersionDetail(
        certification.certification_id,
        versionId,
      );
      setActiveWorkbench({
        certification,
        version: detail,
        modules: detail.certification_modules ?? [],
        rules: detail.certification_eligibility_rules ?? [],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.versionLoadFailed");
      toast.error(message);
    } finally {
      setOpeningVersionId(null);
    }
  }

  async function handleCreateDraft(certification: CertificationSummary) {
    setCreatingDraftForId(certification.certification_id);
    try {
      const version = await createDraftVersion(certification.certification_id);
      toast.success(t("toasts.draftCreated"));
      await openVersion(certification, version.certification_version_id);
      void loadList();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.draftCreateFailed");
      toast.error(message);
    } finally {
      setCreatingDraftForId(null);
    }
  }

  function closeWorkbench() {
    setActiveWorkbench(null);
    void loadList();
  }

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
                {t("table.versions")}
              </TableHead>
              <TableHead className="h-9 w-48 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingList && items === null ? (
              <TableRow>
                <TableCell colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("table.loading")}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("table.empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((certification) => {
                const summary: CertificationSummary = {
                  certification_id: certification.certification_id,
                  name: certification.name,
                  description: certification.description,
                };
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
                      {certification.certification_versions.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {t("table.noVersions")}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {certification.certification_versions.map((version) => (
                            <Button
                              key={version.certification_version_id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 px-2"
                              disabled={openingVersionId === version.certification_version_id}
                              onClick={() =>
                                openVersion(summary, version.certification_version_id)
                              }
                            >
                              {t("versionLabel", { number: version.version_number })}
                              <Badge variant={statusBadgeVariant(version.status)}>
                                {t(`status.${version.status}`)}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isCreatingDraft}
                        onClick={() => handleCreateDraft(summary)}
                      >
                        {isCreatingDraft ? t("table.creatingDraft") : t("table.createDraft")}
                      </Button>
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
          setActiveWorkbench({
            certification: {
              certification_id: result.certification.certification_id,
              name: result.certification.name,
              description: result.certification.description,
            },
            version: result.version,
            modules: [],
            rules: [],
          });
          void loadList();
        }}
      />

      {activeWorkbench && (
        <CertificationVersionWorkbench
          open
          onOpenChange={(open) => {
            if (!open) closeWorkbench();
          }}
          state={activeWorkbench}
          canPublish={canPublish}
          onStateChange={setActiveWorkbench}
        />
      )}
    </div>
  );
}
