"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListChecks,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { DeleteActivityDialog } from "@/components/activities/delete-activity-dialog";
import { ActivitiesCalendarGrid } from "@/components/activities/activities-calendar-grid";
import type { Activity } from "@/lib/api/activities";
import { apiRequestFromClient } from "@/lib/api/client";
import {
  ACTIVITIES_BASE_PATH,
  activityDetailPath,
  addDays,
  filterActivitiesByPeriod,
  groupActivitiesByDate,
  normalizeActivities,
  parseDateKey,
  sortActivitiesByTime,
  startOfWeek,
  toDateKey,
} from "@/lib/activities/helpers";
import { ActivitiesDateList } from "@/components/activities/activities-date-list";
import { cn } from "@/lib/utils";

export type CalendarViewMode = "month" | "week" | "day";

export type LocalFieldOption = {
  label: string;
  value: number;
};

export type ClubOption = {
  club_id: number;
  name: string;
  local_field_id?: number;
};

export type SectionOption = {
  club_section_id: number;
  name: string;
  club_type_id: number;
};

export interface ActivitiesCalendarClientProps {
  localFieldOptions: LocalFieldOption[];
  initialClubs: ClubOption[];
  initialSectionsByClub: Record<number, SectionOption[]>;
  initialActivities: Activity[];
  initialLocalFieldId: number | null;
  initialClubId: number | null;
  canCreate: boolean;
  canEdit: boolean;
}

function readViewMode(value: string | null): CalendarViewMode {
  if (value === "week" || value === "day") return value;
  return "month";
}

export function ActivitiesCalendarClient({
  localFieldOptions,
  initialClubs,
  initialSectionsByClub,
  initialActivities,
  initialLocalFieldId,
  initialClubId,
  canCreate,
  canEdit,
}: ActivitiesCalendarClientProps) {
  const t = useTranslations("activities");
  const tCal = useTranslations("activities.calendar");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activities, setActivities] = useState(initialActivities);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sectionsByClub = initialSectionsByClub;
  const clubs = initialClubs;

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);

  const localFieldId = searchParams.get("localFieldId") ?? String(initialLocalFieldId ?? "all");
  const clubId = searchParams.get("clubId") ?? String(initialClubId ?? "all");
  const view = readViewMode(searchParams.get("view"));
  const anchorDate = searchParams.get("date") ?? toDateKey(new Date());

  const selectedLocalFieldId =
    localFieldId !== "all" && Number.isFinite(Number(localFieldId))
      ? Number(localFieldId)
      : null;
  const selectedClubId =
    clubId !== "all" && Number.isFinite(Number(clubId)) ? Number(clubId) : null;

  const filteredClubs = useMemo(() => {
    if (!selectedLocalFieldId) return clubs;
    return clubs.filter((club) => club.local_field_id === selectedLocalFieldId);
  }, [clubs, selectedLocalFieldId]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all") params.delete(key);
        else params.set(key, value);
      }
      router.push(`${ACTIVITIES_BASE_PATH}?${params.toString()}`);
    },
    [router, searchParams],
  );

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const targetClubs =
        selectedClubId != null
          ? filteredClubs.filter((club) => club.club_id === selectedClubId)
          : filteredClubs;

      if (targetClubs.length === 0) {
        setActivities([]);
        return;
      }

      const results = await Promise.all(
        targetClubs.map(async (club) => {
          const payload = await apiRequestFromClient<unknown>(
            `/clubs/${club.club_id}/activities`,
            { params: { page: 1, limit: 200, active: true } },
          );
          return normalizeActivities(payload, club.name);
        }),
      );

      const merged = results.flat();
      const unique = new Map<number, Activity>();
      for (const activity of merged) unique.set(activity.activity_id, activity);
      setActivities(sortActivitiesByTime([...unique.values()]));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : t("view.errors.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [filteredClubs, selectedClubId, t]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const activitiesByDate = useMemo(
    () => groupActivitiesByDate(activities),
    [activities],
  );

  const anchor = parseDateKey(anchorDate);

  const listActivities = useMemo(
    () => sortActivitiesByTime(filterActivitiesByPeriod(activities, view, anchor)),
    [activities, view, anchor],
  );

  const shiftAnchor = (delta: number) => {
    if (view === "month") {
      const next = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
      updateParams({ date: toDateKey(next) });
      return;
    }
    if (view === "week") {
      updateParams({ date: toDateKey(addDays(anchor, delta * 7)) });
      return;
    }
    updateParams({ date: toDateKey(addDays(anchor, delta)) });
  };

  const periodLabel = useMemo(() => {
    if (view === "month") {
      return anchor.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    }
    if (view === "week") {
      const weekStart = startOfWeek(anchor);
      const weekEnd = addDays(weekStart, 6);
      return `${weekStart.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [anchor, view]);

  const handleLocalFieldChange = (value: string) => {
    updateParams({ localFieldId: value, clubId: null });
  };

  const handleClubChange = (value: string) => {
    updateParams({ clubId: value });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        breadcrumbs={[
          { label: "Clubes", href: "/dashboard/clubs" },
          { label: t("page.title") },
        ]}
        actions={
          canCreate && selectedClubId ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingActivity(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("view.newActivity")}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-xs md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="activities-local-field">{tCal("filterLocalField")}</Label>
          <Select value={localFieldId} onValueChange={handleLocalFieldChange}>
            <SelectTrigger id="activities-local-field">
              <SelectValue placeholder={tCal("filterLocalFieldAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCal("filterLocalFieldAll")}</SelectItem>
              {localFieldOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="activities-club">{tCal("filterClub")}</Label>
          <Select
            value={clubId}
            onValueChange={handleClubChange}
            disabled={filteredClubs.length === 0}
          >
            <SelectTrigger id="activities-club">
              <SelectValue placeholder={t("view.selectClubPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCal("filterClubAll")}</SelectItem>
              {filteredClubs.map((club) => (
                <SelectItem key={club.club_id} value={String(club.club_id)}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={view}
          onValueChange={(value) => updateParams({ view: value })}
        >
          <TabsList>
            <TabsTrigger value="month">
              <LayoutGrid className="mr-1.5 size-4" />
              {tCal("viewMonth")}
            </TabsTrigger>
            <TabsTrigger value="week">
              <CalendarDays className="mr-1.5 size-4" />
              {tCal("viewWeek")}
            </TabsTrigger>
            <TabsTrigger value="day">
              <ListChecks className="mr-1.5 size-4" />
              {tCal("viewDay")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => shiftAnchor(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium capitalize">
            {periodLabel}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => shiftAnchor(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => updateParams({ date: toDateKey(new Date()) })}
          >
            {tCal("today")}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => void loadActivities()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {filteredClubs.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t("page.empty_no_clubs_title")}
          description={t("page.empty_no_clubs_description")}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{activities.length}</Badge>
            <span>
              {activities.length === 1
                ? t("view.activitiesFoundOne")
                : t("view.activitiesFoundOther")}
            </span>
          </div>

          <ActivitiesCalendarGrid
            view={view}
            anchor={anchor}
            activitiesByDate={activitiesByDate}
            onSelectDate={(date) => updateParams({ date: toDateKey(date), view: "day" })}
            detailPath={activityDetailPath}
          />

          <ActivitiesDateList
            activities={listActivities}
            detailPath={activityDetailPath}
          />
        </div>
      )}

      {canCreate && selectedClubId ? (
        <ActivityFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          clubId={selectedClubId}
          sections={sectionsByClub[selectedClubId] ?? []}
          activity={editingActivity}
          onSuccess={() => {
            setFormOpen(false);
            setEditingActivity(null);
            void loadActivities();
          }}
        />
      ) : null}

      {canEdit && deletingActivity ? (
        <DeleteActivityDialog
          open
          activity={deletingActivity}
          onOpenChange={(open) => {
            if (!open) setDeletingActivity(null);
          }}
          onSuccess={() => {
            setDeletingActivity(null);
            void loadActivities();
          }}
        />
      ) : null}
    </div>
  );
}
