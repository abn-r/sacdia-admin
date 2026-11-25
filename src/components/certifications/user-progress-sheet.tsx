"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ErrorState } from "@/components/shared/error-state";
import { apiRequestFromClient } from "@/lib/api/client";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { useFormatDate } from "@/lib/format-locale";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { useToastError } from "@/lib/feedback/toast-retry";
import {
  allSections,
  applySaved,
  countCompleted,
  draftChanges,
  effectiveCompleted,
  normalizeProgress,
  toggleInDraft,
  type ProgressData,
  type ProgressDraft,
} from "@/lib/certifications/progress";
import { toast } from "sonner";

export interface ProgressTarget {
  userId: string;
  name: string;
}

interface UserProgressSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ProgressTarget | null;
  certificationId: number;
}

function progressPath(userId: string, certificationId: number) {
  return `/certifications/users/${encodeURIComponent(userId)}/certifications/${certificationId}/progress`;
}

/**
 * A person's progress in one certification. Marks are kept as a draft and sent
 * together on «Guardar» (one PATCH per changed section, the API has no batch).
 */
export function UserProgressSheet({
  open,
  onOpenChange,
  target,
  certificationId,
}: UserProgressSheetProps) {
  const t = useTranslations("evaluation.certYear.certifications.progress");
  const tSettings = useTranslations("shared.kit.settings");
  const formatDate = useFormatDate();
  const router = useRouter();
  const toastError = useToastError();
  const { canCapability } = useScreenAccess();
  const canManage = canCapability("certifications-list", "manage");

  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const userId = target?.userId ?? null;
  // One key per load (person + attempt): results and draft belong to a key and
  // are ignored when it changes, so nothing is reset from inside an effect.
  const key = open && userId ? `${userId}:${certificationId}:${attempt}` : null;

  const [result, setResult] = useState<{
    key: string;
    data: ProgressData | null;
    failure: ErrorStateFromError | null;
  } | null>(null);
  const [draftState, setDraftState] = useState<{ key: string | null; draft: ProgressDraft }>({
    key: null,
    draft: {},
  });

  const current = result && result.key === key ? result : null;
  const data = current?.data ?? null;
  const failure = current?.failure ?? null;
  const loading = key !== null && current === null;
  const draft = useMemo<ProgressDraft>(
    () => (draftState.key === key ? draftState.draft : {}),
    [draftState, key],
  );

  const updateDraft = useCallback(
    (update: (previous: ProgressDraft) => ProgressDraft) =>
      setDraftState((previous) => ({
        key,
        draft: update(previous.key === key ? previous.draft : {}),
      })),
    [key],
  );

  useEffect(() => {
    if (!key || !userId) return;
    let cancelled = false;
    apiRequestFromClient<unknown>(progressPath(userId, certificationId))
      .then((raw) => {
        if (!cancelled) {
          setResult({ key, data: normalizeProgress(raw, userId, certificationId), failure: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ key, data: null, failure: errorStateFromError(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [key, userId, certificationId]);

  const changes = useMemo(() => (data ? draftChanges(data.modules, draft) : []), [data, draft]);
  const dirty = changes.length > 0;

  const handleSave = useCallback(async () => {
    if (!data || !key || changes.length === 0) return;
    setSaving(true);
    const savedIds: number[] = [];
    let failed = 0;
    for (const change of changes) {
      try {
        await apiRequestFromClient(progressPath(data.user_id, data.certification_id), {
          method: "PATCH",
          body: { section_id: change.section_id, completed: change.completed },
        });
        savedIds.push(change.section_id);
      } catch {
        failed += 1;
      }
    }
    const next = applySaved(data.modules, draft, savedIds, new Date().toISOString());
    setResult({ key, data: { ...data, modules: next.modules }, failure: null });
    setDraftState({ key, draft: next.draft });
    setSaving(false);
    if (savedIds.length > 0) {
      router.refresh();
      if (failed === 0) toast.success(t("saved"));
    }
    if (failed > 0) {
      // The failed marks stay in the draft: «Guardar» is the retry.
      toastError({ title: t("saveFailed", { count: failed }) });
    }
  }, [data, key, changes, draft, router, t, toastError]);

  const sections = data ? allSections(data.modules) : [];
  const done = data ? countCompleted(data.modules, draft) : 0;

  return (
    <Sheet open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      <SheetContent className="flex h-full flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{target?.name ?? t("title")}</SheetTitle>
          <SheetDescription>
            {data
              ? t("summary", {
                  certification: data.certification_name ?? "",
                  done,
                  total: sections.length,
                })
              : t("title")}
          </SheetDescription>
          {data && (data.enrolled_at || data.completed_at) ? (
            <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
              {data.enrolled_at ? (
                <span>{t("enrolledOn", { date: formatDate(data.enrolled_at) })}</span>
              ) : null}
              {data.completed_at ? (
                <span>{t("certifiedOn", { date: formatDate(data.completed_at) })}</span>
              ) : null}
            </p>
          ) : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          ) : failure ? (
            <ErrorState
              variant="inline"
              kind={failure.kind}
              detail={failure.detail}
              onRetry={() => setAttempt((n) => n + 1)}
            />
          ) : data && data.modules.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("noModules")}</p>
          ) : data ? (
            <div className="space-y-5">
              {!canManage ? (
                <p className="text-[13px] text-muted-foreground">{t("readOnly")}</p>
              ) : null}
              {data.modules.map((mod, index) => (
                <section key={mod.module_id} aria-label={mod.title ?? undefined} className="space-y-1">
                  <h3 className="font-medium text-sm">
                    {mod.title
                      ? t("moduleHeading", { index: index + 1, title: mod.title })
                      : t("moduleHeadingUntitled", { index: index + 1 })}
                  </h3>
                  {mod.sections.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">{t("noSections")}</p>
                  ) : (
                    <ul>
                      {mod.sections.map((section) => {
                        const checked = effectiveCompleted(section, draft);
                        const id = `progress-section-${section.section_id}`;
                        return (
                          <li key={section.section_id} className="flex items-start gap-3 py-2">
                            <Checkbox
                              id={id}
                              checked={checked}
                              disabled={!canManage || saving}
                              onCheckedChange={() =>
                                updateDraft((previous) => toggleInDraft(previous, section))
                              }
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <Label htmlFor={id} className="font-medium text-sm">
                                {section.title ?? t("sectionFallback", { id: section.section_id })}
                              </Label>
                              {checked && section.completed_at && !(section.section_id in draft) ? (
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  {t("completedOn", { date: formatDate(section.completed_at) })}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          ) : null}
        </div>

        {data && canManage ? (
          <SheetFooter className="flex-row items-center gap-3 border-t px-6 py-4">
            {dirty ? (
              <p role="status" className="mr-auto text-[13px] text-muted-foreground">
                {t("unsaved", { count: changes.length })}
              </p>
            ) : (
              <span className="mr-auto" />
            )}
            {dirty ? (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => updateDraft(() => ({}))}>
                {tSettings("cancel")}
              </Button>
            ) : null}
            <Button type="button" disabled={!dirty} loading={saving} onClick={() => void handleSave()}>
              {tSettings("save")}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
