"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ActivitiesCalendarGrid } from "@/components/activities/activities-calendar-grid";
import { ActivitiesList } from "@/components/activities/activities-list";
import { ActivitiesPeriodPicker } from "@/components/activities/activities-period-picker";
import { DeleteActivityDialog } from "@/components/activities/delete-activity-dialog";
import { Segmented } from "@/components/shared/segmented";
import type { Activity } from "@/lib/api/activities";
import {
  activityDetailPath,
  groupActivitiesByDate,
  parseDateKey,
  toDateKey,
} from "@/lib/activities/helpers";
import {
  activitiesInPeriod,
  formatPeriodLabel,
  readAnchor,
  readView,
  shiftAnchorKey,
  type ActivitiesView as ViewMode,
} from "@/lib/activities/view";

export interface ActivitiesViewProps {
  activities: Activity[];
  /** Today in the panel zone (`YYYY-MM-DD`), computed on the server. */
  today: string;
  /** Section label by `club_section_id`. */
  sectionLabels: Record<number, string>;
  canEdit: boolean;
}

/** Mes, Semana and Lista behind one control, over the activities of the chosen club. */
export function ActivitiesView({ activities, today, sectionLabels, canEdit }: ActivitiesViewProps) {
  const t = useTranslations("people.activities");
  const tCal = useTranslations("activities.calendar");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleting, setDeleting] = useState<Activity | null>(null);

  const view = readView(searchParams?.get("view"));
  const anchorKey = readAnchor(searchParams?.get("date"), today);
  const anchor = parseDateKey(anchorKey);

  // View and date live in the URL but never need the server: update it in place.
  const update = useCallback(
    (next: { view?: ViewMode; date?: string }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next.view !== undefined) {
        if (next.view === "month") params.delete("view");
        else params.set("view", next.view);
      }
      if (next.date !== undefined) {
        if (next.date === today) params.delete("date");
        else params.set("date", next.date);
      }
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, pathname, today],
  );

  const activitiesByDate = useMemo(() => groupActivitiesByDate(activities), [activities]);
  const inPeriod = useMemo(() => activitiesInPeriod(activities, view, anchorKey), [activities, view, anchorKey]);
  const periodLabel = formatPeriodLabel(view, anchorKey, locale);

  const editPath = (id: number) => `${activityDetailPath(id)}/edit`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label={t("view.label")}
          options={[
            { value: "month" as const, label: tCal("viewMonth") },
            { value: "week" as const, label: tCal("viewWeek") },
            { value: "list" as const, label: t("view.list") },
          ]}
          value={view}
          onChange={(next) => update({ view: next })}
        />

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={tCal("previousPeriod")}
            onClick={() => update({ date: shiftAnchorKey(view, anchorKey, -1) })}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <ActivitiesPeriodPicker
            anchor={anchor}
            periodLabel={periodLabel}
            onSelectDate={(date) => update({ date: toDateKey(date) })}
          />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={tCal("nextPeriod")}
            onClick={() => update({ date: shiftAnchorKey(view, anchorKey, 1) })}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => update({ date: today })}>
            {tCal("today")}
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <ActivitiesList
          key={`${anchorKey.slice(0, 7)}`}
          activities={inPeriod}
          today={today}
          sectionLabels={sectionLabels}
          detailPath={activityDetailPath}
          editPath={editPath}
          canEdit={canEdit}
          onDelete={setDeleting}
        />
      ) : (
        <ActivitiesCalendarGrid
          view={view}
          anchor={anchor}
          activitiesByDate={activitiesByDate}
          today={today}
          onSelectDate={(date) => update({ view: "week", date: toDateKey(date) })}
          detailPath={activityDetailPath}
        />
      )}

      {canEdit ? (
        <DeleteActivityDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          activity={deleting}
          onSuccess={() => {
            setDeleting(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
