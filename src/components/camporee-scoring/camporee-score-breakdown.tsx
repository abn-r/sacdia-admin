"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatTabularNumber } from "@/lib/format-locale";
import type {
  CamporeeScoreBreakdown as CamporeeScoreBreakdownData,
  CamporeeScoreBreakdownEvent,
  CamporeeScoreBreakdownResult,
  CamporeeScoreBreakdownSection,
} from "@/lib/api/camporee-scoring";

export interface CamporeeScoreBreakdownProps {
  breakdown?: CamporeeScoreBreakdownData | null;
}

interface SelectedCell {
  section: CamporeeScoreBreakdownSection;
  event: CamporeeScoreBreakdownEvent;
  result: CamporeeScoreBreakdownResult;
}

const STICKY_CELL = "sticky left-0 z-10 bg-card";

export function CamporeeScoreBreakdown({ breakdown }: CamporeeScoreBreakdownProps) {
  const t = useTranslations("camporees.scoreBreakdown");
  const locale = useLocale();
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const events = useMemo(() => breakdown?.events ?? [], [breakdown]);
  const sections = useMemo(() => breakdown?.sections ?? [], [breakdown]);

  const resultsBySection = useMemo(() => {
    const map = new Map<number, Map<number, CamporeeScoreBreakdownResult>>();
    for (const section of sections) {
      map.set(
        section.club_section_id,
        new Map(section.results.map((r) => [r.camporee_event_id, r])),
      );
    }
    return map;
  }, [sections]);

  const isEmpty = events.length === 0 || sections.length === 0;
  const sectionLabel = (s: CamporeeScoreBreakdownSection) =>
    s.section_name ?? t("sectionFallback", { id: s.club_section_id });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold tracking-tight">
          {t("title")}
        </CardTitle>
        {!isEmpty && <CardDescription>{t("description")}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            icon={Trophy}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className={`${STICKY_CELL} min-w-48`}>
                    {t("colSection")}
                  </TableHead>
                  {events.map((event) => (
                    <TableHead
                      key={event.camporee_event_id}
                      className="min-w-36 text-right align-bottom"
                    >
                      <div className="font-medium text-foreground whitespace-normal">
                        {event.title}
                      </div>
                      <div className="text-xs font-normal text-muted-foreground tabular-nums">
                        {t("maxPoints", { points: formatTabularNumber(event.max_points) })}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="min-w-28 text-right align-bottom">
                    {t("colTotal")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.club_section_id}>
                    <TableCell className={STICKY_CELL}>
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium tabular-nums text-muted-foreground">
                          {section.rank === null ? "—" : `#${section.rank}`}
                        </span>
                        <div>
                          <div className="font-medium">{section.club_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {sectionLabel(section)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {events.map((event) => {
                      const result = resultsBySection
                        .get(section.club_section_id)
                        ?.get(event.camporee_event_id);
                      if (!result) {
                        return (
                          <TableCell
                            key={event.camporee_event_id}
                            className="text-right text-muted-foreground"
                          >
                            —
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={event.camporee_event_id} className="text-right">
                          <button
                            type="button"
                            aria-label={t("cellLabel", {
                              club: section.club_name ?? sectionLabel(section),
                              event: event.title,
                            })}
                            onClick={() => setSelected({ section, event, result })}
                            className="inline-flex min-h-8 items-center justify-end rounded-md px-2 py-1 text-right tabular-nums outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {result.is_no_show ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                {t("noShow")}
                              </Badge>
                            ) : (
                              <span>
                                {formatTabularNumber(result.total_awarded_points)} /{" "}
                                {formatTabularNumber(result.total_max_points)}
                              </span>
                            )}
                          </button>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatTabularNumber(section.total_awarded_points)} /{" "}
                      {formatTabularNumber(section.total_max_points)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.event.title}</DialogTitle>
                <DialogDescription>
                  {selected.section.club_name ?? "—"} · {sectionLabel(selected.section)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{t("dialogTotal")}</span>
                {selected.result.is_no_show ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t("noShow")}
                  </Badge>
                ) : (
                  <span className="text-lg font-semibold tabular-nums">
                    {formatTabularNumber(selected.result.total_awarded_points)} /{" "}
                    {formatTabularNumber(selected.result.total_max_points)}
                  </span>
                )}
              </div>

              {selected.result.items.length > 0 && (
                <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead>{t("colRubric")}</TableHead>
                        <TableHead className="text-right">{t("colPoints")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.result.items.map((item) => (
                        <TableRow key={item.camporee_event_rubric_id}>
                          <TableCell className="whitespace-normal">
                            <div>{item.title}</div>
                            {item.notes && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {item.notes}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums align-top">
                            {formatTabularNumber(item.awarded_points)} /{" "}
                            {formatTabularNumber(item.max_points)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selected.result.minimum_adjustment_points > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("minimumAdjustment", {
                    raw: formatTabularNumber(selected.result.raw_awarded_points),
                    points: formatTabularNumber(selected.result.minimum_adjustment_points),
                  })}
                </p>
              )}

              <div className="space-y-1 rounded-xl bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("judgeComment")}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {selected.result.notes ?? (
                    <span className="text-muted-foreground">{t("noJudgeComment")}</span>
                  )}
                </p>
              </div>

              {selected.result.evaluator_name && (
                <DialogFooter className="sm:justify-start">
                  <p className="text-xs text-muted-foreground">
                    {selected.result.submitted_at
                      ? t("evaluatedByOn", {
                          name: selected.result.evaluator_name,
                          date: formatDate(selected.result.submitted_at, locale),
                        })
                      : t("evaluatedBy", { name: selected.result.evaluator_name })}
                  </p>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
