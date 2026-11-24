"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/shared/error-state";
import { RowActions } from "@/components/shared/row-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/users/user-avatar";
import { useRoleLabel } from "@/lib/auth/role-labels";
import type { PositionHolder, PositionKey, PositionRow } from "@/lib/clubs/detail-positions";

export interface SectionPositionsProps {
  rows: PositionRow[];
  /** clubs:manage_roles: shows "Asignar". */
  canAssign: boolean;
  /** clubs:revoke_roles: shows "Quitar cargo". */
  canRevoke: boolean;
  /** Counselors come from a separate request. */
  counselorsLoading: boolean;
  counselorsFailed: boolean;
  onRetryCounselors: () => void;
  /** Positions with no catalog role cannot be assigned. */
  assignable: Record<PositionKey, boolean>;
  onAssign: (key: PositionKey) => void;
  onRevoke: (key: PositionKey, holder: PositionHolder) => void;
}

/**
 * Decision A: each position is a row. It names who holds it, or offers
 * "Asignar", so what is missing reads at a glance. Counselors per class live
 * in the "Consejeros" row with the class next to the name.
 */
export function SectionPositions({
  rows,
  canAssign,
  canRevoke,
  counselorsLoading,
  counselorsFailed,
  onRetryCounselors,
  assignable,
  onAssign,
  onRevoke,
}: SectionPositionsProps) {
  const t = useTranslations("people.clubDetail.positions");
  const tSections = useTranslations("clubs.detail.sections");
  const translateRole = useRoleLabel();

  function labelOf(key: PositionKey) {
    return key === "counselor" ? tSections("counselorsLabel") : translateRole(key);
  }

  return (
    <ul className="divide-y rounded-xl bg-card shadow-card">
      {rows.map((row) => {
        const isCounselor = row.key === "counselor";
        const showAssign =
          canAssign && assignable[row.key] && (isCounselor || row.holders.length === 0);
        return (
          <li
            key={row.key}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-6"
          >
            <span className="w-40 shrink-0 pt-1 text-muted-foreground text-sm">
              {labelOf(row.key)}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              {isCounselor && counselorsLoading ? (
                <Skeleton className="h-7 w-48" />
              ) : isCounselor && counselorsFailed ? (
                <ErrorState
                  variant="inline"
                  title={t("counselorsLoadError")}
                  onRetry={onRetryCounselors}
                />
              ) : row.holders.length === 0 ? (
                <span className="inline-block pt-1 text-muted-foreground text-sm">
                  {tSections("unassigned")}
                </span>
              ) : (
                row.holders.map((holder) => (
                  <div
                    key={`${holder.userId}-${holder.assignmentId ?? ""}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <UserAvatar src={holder.image} name={holder.name} size={28} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">{holder.name}</span>
                      {holder.className ? (
                        <span className="text-muted-foreground"> · {holder.className}</span>
                      ) : null}
                    </span>
                    {canRevoke && holder.assignmentId ? (
                      <RowActions
                        label={holder.name}
                        actions={[
                          {
                            label: t("revoke"),
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => onRevoke(row.key, holder),
                          },
                        ]}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
            {showAssign && !(isCounselor && (counselorsLoading || counselorsFailed)) ? (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                aria-label={t("assignFor", { position: labelOf(row.key) })}
                onClick={() => onAssign(row.key)}
              >
                {t("assign")}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
