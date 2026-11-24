"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInvestitureRequestErrorMessageByCode } from "./investiture-request-errors";
import { PersonStatusBadge } from "./person-status-badge";
import type {
  InvestitureRequestPerson,
  InvestitureResolution,
} from "@/lib/api/investiture-requests";

export interface ResolutionSummaryProps {
  resolution: InvestitureResolution;
  /** People of the request, used to name `blocked` / `already_resolved` entries. */
  people: InvestitureRequestPerson[];
  onDismiss?: () => void;
}

/**
 * Outcome line shown after confirming. The per-person result lives in the
 * table below; this only counts and lists what the system did not apply.
 */
export function ResolutionSummary({ resolution, people, onDismiss }: ResolutionSummaryProps) {
  const t = useTranslations("investiture_requests.summary");
  const tResult = useTranslations("queues.investitures.detail.result");
  const tErrors = useTranslations("investiture_requests");

  const namesById = new Map(people.map((p) => [p.person_id, p.user_name]));
  const nameOf = (id: string) => namesById.get(id) ?? t("unknownPerson");

  const parts = [
    resolution.invested.length > 0
      ? tResult("invested", { count: resolution.invested.length })
      : null,
    resolution.rejected_by_person.length > 0
      ? tResult("rejectedByYou", { count: resolution.rejected_by_person.length })
      : null,
    resolution.rejected_by_system.length > 0
      ? tResult("rejectedBySystem", { count: resolution.rejected_by_system.length })
      : null,
    resolution.retired.length > 0 ? tResult("retired", { count: resolution.retired.length }) : null,
  ].filter((part): part is string => part !== null);

  const hasNotApplied = resolution.blocked.length > 0 || resolution.already_resolved.length > 0;

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-sm"
    >
      <div className="space-y-1.5">
        <p className="font-medium text-foreground">{tResult("title")}</p>
        {parts.length > 0 && <p className="text-muted-foreground">{parts.join(" · ")}</p>}
        {resolution.rejected_by_system.length > 0 && (
          <p className="text-muted-foreground">{tResult("systemExplain")}</p>
        )}
        {hasNotApplied && (
          <div className="space-y-1 pt-1">
            <p className="font-medium text-foreground">{t("notApplied")}</p>
            <ul className="space-y-1">
              {resolution.blocked.map((entry) => (
                <li key={`blocked-${entry.person_id}`}>
                  <span className="font-medium">{nameOf(entry.person_id)}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {getInvestitureRequestErrorMessageByCode(entry.code, tErrors)}
                  </span>
                </li>
              ))}
              {resolution.already_resolved.map((entry) => (
                <li key={`resolved-${entry.person_id}`} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{nameOf(entry.person_id)}</span>
                  <PersonStatusBadge status={entry.status} />
                  <span className="text-muted-foreground">{t("alreadyResolved")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {onDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("dismiss")}
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
