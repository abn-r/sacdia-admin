"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ResolutionSummary({ resolution, people, onDismiss }: ResolutionSummaryProps) {
  const t = useTranslations("investiture_requests.summary");
  const tDetail = useTranslations("investiture_requests.detail");
  const tErrors = useTranslations("investiture_requests");

  const namesById = new Map(people.map((p) => [p.person_id, p.user_name]));
  const nameOf = (id: string, fallback?: string | null) =>
    fallback ?? namesById.get(id) ?? t("unknownPerson");

  const hasNotApplied = resolution.blocked.length > 0 || resolution.already_resolved.length > 0;

  const groups: Array<{
    key: string;
    title: string;
    people: InvestitureRequestPerson[];
    showSystemReason?: boolean;
  }> = [
    { key: "invested", title: t("invested"), people: resolution.invested },
    { key: "rejected_by_person", title: t("rejectedByPerson"), people: resolution.rejected_by_person },
    {
      key: "rejected_by_system",
      title: t("rejectedBySystem"),
      people: resolution.rejected_by_system,
      showSystemReason: true,
    },
    { key: "retired", title: t("retired"), people: resolution.retired },
  ];

  return (
    <Card role="region" aria-labelledby="investiture-resolution-title">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle id="investiture-resolution-title" className="text-base font-semibold tracking-tight">
          {t("title")}
        </CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {groups
          .filter((group) => group.people.length > 0)
          .map((group) => (
            <section key={group.key} className="space-y-1.5">
              <h3 className="text-sm font-medium text-foreground">{group.title}</h3>
              <ul className="space-y-1.5">
                {group.people.map((p) => (
                  <li key={p.person_id} className="text-sm">
                    <span className="font-medium">{nameOf(p.person_id, p.user_name)}</span>
                    {group.showSystemReason && (
                      <p className="mt-0.5 text-muted-foreground">
                        {p.system_reason ?? tDetail("systemReasonFallback")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

        {hasNotApplied && (
          <section className="space-y-1.5">
            <h3 className="text-sm font-medium text-foreground">{t("notApplied")}</h3>
            <ul className="space-y-1.5">
              {resolution.blocked.map((entry) => (
                <li key={`blocked-${entry.person_id}`} className="text-sm">
                  <span className="font-medium">{nameOf(entry.person_id)}</span>
                  <p className="mt-0.5 text-muted-foreground">
                    {getInvestitureRequestErrorMessageByCode(entry.code, tErrors)}
                  </p>
                </li>
              ))}
              {resolution.already_resolved.map((entry) => (
                <li key={`resolved-${entry.person_id}`} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{nameOf(entry.person_id)}</span>
                  <PersonStatusBadge status={entry.status} />
                  <span className="text-muted-foreground">{t("alreadyResolved")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
