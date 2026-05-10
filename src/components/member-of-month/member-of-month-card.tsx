"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMemberOfMonth } from "@/lib/api/member-of-month";
import type { MemberOfMonthEntry } from "@/lib/api/member-of-month";
import { MONTH_NAMES } from "@/lib/constants";
import type { EvaluateMemberOfMonthDialogProps } from "@/components/member-of-month/evaluate-dialog";
import type { MemberOfMonthHistorySheetProps } from "@/components/member-of-month/history-sheet";

const EvaluateMemberOfMonthDialog = dynamic<EvaluateMemberOfMonthDialogProps>(
  () =>
    import("@/components/member-of-month/evaluate-dialog").then((m) => ({
      default: m.EvaluateMemberOfMonthDialog,
    })),
  { ssr: false, loading: () => null }
);

const MemberOfMonthHistorySheet = dynamic<MemberOfMonthHistorySheetProps>(
  () =>
    import("@/components/member-of-month/history-sheet").then((m) => ({
      default: m.MemberOfMonthHistorySheet,
    })),
  { ssr: false, loading: () => null }
);

// ─── Member avatar ────────────────────────────────────────────────────────────

function MemberAvatar({ member }: { member: MemberOfMonthEntry }) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <Avatar className="size-14 ring-2 ring-warning/60 ring-offset-2 ring-offset-background">
          {member.photo_url && (
            <AvatarImage src={member.photo_url} alt={member.name} />
          )}
          <AvatarFallback className="bg-warning/15 text-sm font-bold text-warning-foreground dark:text-warning">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-warning text-[10px]">
          <Trophy className="size-3 text-warning-foreground" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold leading-tight">{member.name}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {member.total_points} pts
        </p>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberOfMonthCardProps {
  clubId: number;
  sectionId: number;
  sectionName?: string;
  /** Whether the current user is a director (can evaluate). */
  isDirector?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MEMBER_OF_MONTH_QUERY_KEY = "member-of-month" as const;

export function MemberOfMonthCard({
  clubId,
  sectionId,
  sectionName = "la sección",
  isDirector = false,
}: MemberOfMonthCardProps) {
  const t = useTranslations("member_of_month");
  const queryClient = useQueryClient();
  const [evaluateOpen, setEvaluateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [MEMBER_OF_MONTH_QUERY_KEY, clubId, sectionId],
    queryFn: () => getMemberOfMonth(clubId, sectionId),
    // Non-critical data — silently swallow errors so the card simply doesn't render.
    throwOnError: false,
  });

  function handleEvaluateSuccess() {
    toast.success(t("toasts.evaluation_completed"));
    void queryClient.invalidateQueries({
      queryKey: [MEMBER_OF_MONTH_QUERY_KEY, clubId, sectionId],
    });
  }

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        <span>Cargando miembro del mes...</span>
      </div>
    );
  }

  // ─── No data — render nothing ───────────────────────────────────────────────

  const hasWinners = data?.members && data.members.length > 0;

  if (!hasWinners && !isDirector) return null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {hasWinners && data !== undefined ? (
        <div className="rounded-xl border border-warning/25 bg-warning/5 p-4">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-warning-foreground dark:text-warning" />
              <span className="text-sm font-semibold">
                Miembro del Mes —{" "}
                {MONTH_NAMES[data.month]} {data.year}
              </span>
            </div>
            {data.members.length > 1 && (
              <Badge variant="warning" className="text-xs">
                Empate
              </Badge>
            )}
          </div>

          {/* Winners */}
          <div className="flex flex-wrap justify-center gap-6">
            {data.members.map((member) => (
              <MemberAvatar key={member.user_id} member={member} />
            ))}
          </div>

          {/* Actions row */}
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-warning/20 pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setHistoryOpen(true)}
            >
              <Clock className="mr-1.5 size-3" />
              Ver historial
            </Button>
            {isDirector && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setEvaluateOpen(true)}
              >
                <Trophy className="mr-1.5 size-3" />
                Evaluar mes
              </Button>
            )}
          </div>
        </div>
      ) : (
        // No winners yet but user is director — show evaluate button only
        isDirector && (
          <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Sin miembro del mes para el mes actual
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setHistoryOpen(true)}
              >
                <Clock className="mr-1.5 size-3" />
                Historial
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setEvaluateOpen(true)}
              >
                <Trophy className="mr-1.5 size-3" />
                Evaluar mes
              </Button>
            </div>
          </div>
        )
      )}

      <EvaluateMemberOfMonthDialog
        open={evaluateOpen}
        onOpenChange={setEvaluateOpen}
        clubId={clubId}
        sectionId={sectionId}
        sectionName={sectionName}
        onSuccess={handleEvaluateSuccess}
      />

      <MemberOfMonthHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        clubId={clubId}
        sectionId={sectionId}
        sectionName={sectionName}
      />
    </>
  );
}
