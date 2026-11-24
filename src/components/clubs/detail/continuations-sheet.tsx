"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ContinuationsState } from "@/components/clubs/detail/use-continuations";
import { submitAnnualContinuationsFromClient } from "@/lib/api/annual-continuations";
import {
  isContinuationSelectable,
  isKnownContinuationBlockCode,
  suggestedClassView,
} from "@/lib/clubs/detail-continuations";

export interface ContinuationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: number;
  sectionName: string;
  yearLabel: string | null;
  continuations: ContinuationsState;
  classes: Array<{ class_id: number; name: string }>;
}

/** Annual enrollment of a section. The suggested class shows by name, never by number. */
export function ContinuationsSheet({
  open,
  onOpenChange,
  sectionId,
  sectionName,
  yearLabel,
  continuations,
  classes,
}: ContinuationsSheetProps) {
  const t = useTranslations("people.clubDetail.continuations");
  const tSections = useTranslations("clubs.detail.sections");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const { items, loading, failed, reload } = continuations;

  function toggle(userId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  function blockedText(code: string | null | undefined) {
    return isKnownContinuationBlockCode(code)
      ? tSections(`continuationsBlockedReasons.${code}`)
      : tSections("continuationsBlocked");
  }

  async function submit() {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const results = await submitAnnualContinuationsFromClient(sectionId, [...selected]);
      const count = (outcome: string) => results.filter((row) => row.outcome === outcome).length;
      const failedCount = count("failed");
      const message = tSections("continuationsResult", {
        enrolled: count("enrolled"),
        complete: count("path_complete"),
        blocked: count("blocked"),
        failed: failedCount,
      });
      if (failedCount > 0) toast.error(message);
      else toast.success(message);
      setSelected(new Set());
      await reload();
    } catch {
      toast.error(tSections("continuationsSubmitError"), {
        action: { label: t("retry"), onClick: () => void submit() },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>
            {yearLabel ? t("title", { year: yearLabel }) : t("titleNoYear")}
          </SheetTitle>
          <SheetDescription>
            {t("description", { section: sectionName, count: items.length })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <p className="text-muted-foreground text-sm">{tSections("continuationsHint")}</p>

          {loading ? (
            <div role="status" aria-busy="true" className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : failed ? (
            <ErrorState
              variant="inline"
              title={tSections("continuationsLoadError")}
              onRetry={() => void reload()}
            />
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{tSections("continuationsEmpty")}</p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => {
                const selectable = isContinuationSelectable(item);
                const view = suggestedClassView(item, classes);
                const id = `continuation-${item.user_id}`;
                return (
                  <li
                    key={item.user_id}
                    className={`flex items-start gap-3 rounded-lg px-2 py-2 ${selectable ? "" : "opacity-60"}`}
                  >
                    <Checkbox
                      id={id}
                      className="mt-0.5"
                      disabled={!selectable}
                      checked={selected.has(item.user_id)}
                      onCheckedChange={(checked) => toggle(item.user_id, checked === true)}
                      aria-describedby={`${id}-detail`}
                    />
                    <Label htmlFor={id} className="min-w-0 flex-1 flex-col items-start gap-0.5 font-normal">
                      <span className="font-medium">{item.name}</span>
                      <span id={`${id}-detail`} className="text-muted-foreground text-xs">
                        {!selectable
                          ? blockedText(item.blocked_reason)
                          : view.kind === "complete"
                            ? tSections("continuationsPathComplete")
                            : view.kind === "named"
                              ? t("suggestedClass", { name: view.name })
                              : t("classPending")}
                      </span>
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("close")}
          </Button>
          <Button
            onClick={() => void submit()}
            loading={submitting}
            disabled={selected.size === 0}
          >
            {t("submit", { count: selected.size })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
