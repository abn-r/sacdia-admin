"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { getSectionMembersFromClient, type MemberRankingItem } from "@/lib/api/section-rankings";
import { useFormatNumber } from "@/lib/format-locale";
import { sectionMemberName, sortMembersByScore } from "@/lib/progress/section";

export interface SectionMembersSheetTarget {
  sectionId: number;
  title: string;
  subtitle?: string | null;
}

interface SectionMembersSheetProps {
  target: SectionMembersSheetTarget | null;
  yearId: number;
  yearLabel?: string;
  onOpenChange: (open: boolean) => void;
}

function SectionMembersBody({ sectionId, yearId }: { sectionId: number; yearId: number }) {
  const t = useTranslations("evaluation.progress.section.sheet");
  const formatNumber = useFormatNumber();
  const [members, setMembers] = useState<MemberRankingItem[] | null>(null);
  const [error, setError] = useState<ErrorStateFromError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSectionMembersFromClient(sectionId, yearId).then(
      (result) => {
        if (!cancelled) setMembers(sortMembersByScore(result));
      },
      (err: unknown) => {
        if (!cancelled) setError(errorStateFromError(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [sectionId, yearId, attempt]);

  const percent = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : `${formatNumber(value, { maximumFractionDigits: 1 })}%`;

  const investiture = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : value === 100 ? t("invested") : t("inProgress");

  if (error) {
    return (
      <ErrorState
        kind={error.kind}
        detail={error.detail}
        onRetry={() => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  if (members === null) {
    return (
      <div className="space-y-3" role="status" aria-busy>
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (members.length === 0) {
    return <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <ul className="divide-y">
      {members.map((member) => (
        <li key={member.member_ranking_id} className="space-y-0.5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium">{sectionMemberName(member.user) || "—"}</span>
            <span className="shrink-0 text-sm tabular-nums">{percent(member.composite_score_pct)}</span>
          </div>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            {t("detail", {
              class: percent(member.class_score_pct),
              investiture: investiture(member.investiture_score_pct),
              camporee: percent(member.camporee_score_pct),
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Members of one section, opened inside the list. A 403 says «no access», never «not found». */
export function SectionMembersSheet({ target, yearId, yearLabel, onOpenChange }: SectionMembersSheetProps) {
  const t = useTranslations("evaluation.progress.section.sheet");

  return (
    <Sheet open={target !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{target?.title}</SheetTitle>
          <SheetDescription>
            {[target?.subtitle, yearLabel].filter(Boolean).join(" · ") || t("description")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {target ? <SectionMembersBody key={`${target.sectionId}-${yearId}`} sectionId={target.sectionId} yearId={yearId} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
