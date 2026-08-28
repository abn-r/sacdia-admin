"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CertificationEligibilityRulesEditor } from "@/components/certifications/certification-eligibility-rules-editor";
import { CertificationTreeEditor } from "@/components/certifications/certification-tree-editor";
import {
  cloneCertificationVersion,
  getCertificationVersionDetail,
  publishCertificationVersion,
  retireCertificationVersion,
  updateVersionMetadata,
  type AdminCertificationModule,
  type AdminCertificationVersion,
  type AdminEligibilityRule,
} from "@/lib/api/certifications";

export type CertificationWorkbenchState = {
  certification: { certification_id: number; name: string; description?: string | null };
  version: AdminCertificationVersion;
  modules: AdminCertificationModule[];
  rules: AdminEligibilityRule[];
};

interface CertificationVersionWorkbenchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: CertificationWorkbenchState;
  canPublish: boolean;
  onStateChange: (next: CertificationWorkbenchState) => void;
}

function isPublishable(state: CertificationWorkbenchState): boolean {
  if (state.rules.length === 0) return false;
  if (state.modules.length === 0) return false;
  return state.modules.every(
    (module) =>
      (module.certification_sections?.length ?? 0) > 0 &&
      module.certification_sections.every(
        (section) => (section.certification_requirement_components?.length ?? 0) > 0,
      ),
  );
}

function statusBadgeVariant(status: AdminCertificationVersion["status"]) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "RETIRED") return "outline" as const;
  return "soft-warning" as const;
}

export function CertificationVersionWorkbench({
  open,
  onOpenChange,
  state,
  canPublish,
  onStateChange,
}: CertificationVersionWorkbenchProps) {
  const t = useTranslations("certificationsAdmin");
  const isDraft = state.version.status === "DRAFT";

  const [title, setTitle] = useState(state.version.title ?? "");
  const [description, setDescription] = useState(state.version.description ?? "");
  const [minDuration, setMinDuration] = useState(
    state.version.min_duration_months != null ? String(state.version.min_duration_months) : "",
  );
  const [maxDuration, setMaxDuration] = useState(
    state.version.max_duration_months != null ? String(state.version.max_duration_months) : "",
  );
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRetiring, setIsRetiring] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"publish" | "retire" | "clone" | null>(null);

  useEffect(() => {
    setTitle(state.version.title ?? "");
    setDescription(state.version.description ?? "");
    setMinDuration(
      state.version.min_duration_months != null ? String(state.version.min_duration_months) : "",
    );
    setMaxDuration(
      state.version.max_duration_months != null ? String(state.version.max_duration_months) : "",
    );
  }, [state.version]);

  async function handleSaveMetadata() {
    setIsSavingMetadata(true);
    try {
      const updated = await updateVersionMetadata(
        state.certification.certification_id,
        state.version.certification_version_id,
        {
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          min_duration_months: minDuration.trim() ? Number(minDuration) : undefined,
          max_duration_months: maxDuration.trim() ? Number(maxDuration) : undefined,
        },
      );
      onStateChange({ ...state, version: updated });
      toast.success(t("metadata.toasts.saved"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("metadata.toasts.saveFailed");
      toast.error(message);
    } finally {
      setIsSavingMetadata(false);
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    try {
      const updated = await publishCertificationVersion(
        state.certification.certification_id,
        state.version.certification_version_id,
      );
      onStateChange({ ...state, version: updated });
      toast.success(t("publishDialog.toasts.published"));
      setConfirmAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("publishDialog.toasts.failed");
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleRetire() {
    setIsRetiring(true);
    try {
      const updated = await retireCertificationVersion(
        state.certification.certification_id,
        state.version.certification_version_id,
      );
      onStateChange({ ...state, version: updated });
      toast.success(t("retireDialog.toasts.retired"));
      setConfirmAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("retireDialog.toasts.failed");
      toast.error(message);
    } finally {
      setIsRetiring(false);
    }
  }

  async function handleClone() {
    setIsCloning(true);
    try {
      const clonedVersion = await cloneCertificationVersion(
        state.certification.certification_id,
        state.version.certification_version_id,
      );
      const detail = await getCertificationVersionDetail(
        state.certification.certification_id,
        clonedVersion.certification_version_id,
      );
      onStateChange({
        ...state,
        version: detail,
        modules: detail.certification_modules ?? [],
        rules: detail.certification_eligibility_rules ?? [],
      });
      toast.success(t("cloneDialog.toasts.cloned"));
      setConfirmAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("cloneDialog.toasts.failed");
      toast.error(message);
    } finally {
      setIsCloning(false);
    }
  }

  const publishable = isPublishable(state);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{state.certification.name}</DialogTitle>
              <Badge variant={statusBadgeVariant(state.version.status)}>
                {t(`status.${state.version.status}`)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t("versionLabel", { number: state.version.version_number })}
              </span>
            </div>
            <DialogDescription>{t("workbenchDescription")}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto pr-1">
            {!isDraft && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
                {t("immutableNotice")}
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-border p-3">
              <h3 className="text-sm font-medium">{t("metadata.title")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="workbench-title">{t("metadata.fieldTitle")}</Label>
                  <Input
                    id="workbench-title"
                    value={title}
                    disabled={!isDraft}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="workbench-min-duration">{t("metadata.fieldMinDuration")}</Label>
                  <Input
                    id="workbench-min-duration"
                    type="number"
                    min={0}
                    disabled={!isDraft}
                    value={minDuration}
                    onChange={(e) => setMinDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="workbench-description">{t("metadata.fieldDescription")}</Label>
                  <Textarea
                    id="workbench-description"
                    rows={2}
                    disabled={!isDraft}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="workbench-max-duration">{t("metadata.fieldMaxDuration")}</Label>
                  <Input
                    id="workbench-max-duration"
                    type="number"
                    min={0}
                    disabled={!isDraft}
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(e.target.value)}
                  />
                </div>
              </div>
              {isDraft && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveMetadata}
                    disabled={isSavingMetadata}
                  >
                    <Save className="size-4" />
                    {isSavingMetadata ? t("metadata.saving") : t("metadata.save")}
                  </Button>
                </div>
              )}
            </div>

            <Tabs defaultValue="eligibility">
              <TabsList>
                <TabsTrigger value="eligibility">{t("tabs.eligibility")}</TabsTrigger>
                <TabsTrigger value="tree">{t("tabs.tree")}</TabsTrigger>
              </TabsList>
              <TabsContent value="eligibility" className="pt-4">
                <CertificationEligibilityRulesEditor
                  certificationId={state.certification.certification_id}
                  versionId={state.version.certification_version_id}
                  rules={state.rules}
                  readOnly={!isDraft}
                  onSaved={(rules) => onStateChange({ ...state, rules })}
                />
              </TabsContent>
              <TabsContent value="tree" className="pt-4">
                <CertificationTreeEditor
                  certificationId={state.certification.certification_id}
                  versionId={state.version.certification_version_id}
                  modules={state.modules}
                  readOnly={!isDraft}
                  onSaved={(modules) => onStateChange({ ...state, modules })}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="text-xs text-muted-foreground">
              {isDraft
                ? publishable
                  ? t("publishDialog.readyHint")
                  : t("publishDialog.notReadyHint")
                : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {(state.version.status === "PUBLISHED" || state.version.status === "RETIRED") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction("clone")}
                >
                  <Copy className="size-4" />
                  {t("cloneDialog.trigger")}
                </Button>
              )}
              {canPublish && state.version.status === "PUBLISHED" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction("retire")}
                >
                  {t("retireDialog.trigger")}
                </Button>
              )}
              {canPublish && isDraft && (
                <Button type="button" size="sm" onClick={() => setConfirmAction("publish")}>
                  {t("publishDialog.trigger")}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmAction === "publish"}
        onOpenChange={(next) => {
          if (!next && !isPublishing) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("publishDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {publishable
                ? t("publishDialog.confirmDescription")
                : t("publishDialog.notReadyDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>
              {t("publishDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handlePublish();
              }}
              disabled={isPublishing}
            >
              {isPublishing ? t("publishDialog.publishing") : t("publishDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmAction === "retire"}
        onOpenChange={(next) => {
          if (!next && !isRetiring) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("retireDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("retireDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRetiring}>{t("retireDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRetire();
              }}
              disabled={isRetiring}
            >
              {isRetiring ? t("retireDialog.retiring") : t("retireDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmAction === "clone"}
        onOpenChange={(next) => {
          if (!next && !isCloning) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cloneDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cloneDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCloning}>{t("cloneDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleClone();
              }}
              disabled={isCloning}
            >
              {isCloning ? t("cloneDialog.cloning") : t("cloneDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
