"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Pencil, Repeat, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { DeleteActivityDialog } from "@/components/activities/delete-activity-dialog";
import {
  cancelFutureActivitySeries,
  extendActivitySeries,
  getCurrentEcclesiasticalYearFromClient,
} from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import { ACTIVITIES_BASE_PATH } from "@/lib/activities/helpers";

interface ActivityDetailActionsProps {
  activity: Activity;
}

export function ActivityDetailActions({ activity }: ActivityDetailActionsProps) {
  const t = useTranslations("activities");
  const tSeries = useTranslations("activities.series");
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendUntil, setExtendUntil] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const seriesId = activity.activity_series_id ?? null;

  function handleEditSuccess() {
    router.refresh();
  }

  function handleDeleteSuccess() {
    router.push(ACTIVITIES_BASE_PATH);
  }

  function viewSeries() {
    if (!seriesId) return;
    router.push(
      `${ACTIVITIES_BASE_PATH}?clubId=${activity.club_id}&seriesId=${seriesId}`,
    );
  }

  async function handleCancelFuture() {
    if (!seriesId) return;
    setBusy(true);
    try {
      const result = await cancelFutureActivitySeries(seriesId);
      toast.success(tSeries("canceled", { count: result.canceled_count ?? 0 }));
      setCancelOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("errors.save_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function openExtend() {
    try {
      const year = await getCurrentEcclesiasticalYearFromClient();
      setYearEnd(year.end_date ?? "");
    } catch {
      setYearEnd("");
    }
    setExtendUntil("");
    setExtendOpen(true);
  }

  async function handleExtend() {
    if (!seriesId || !extendUntil) return;
    setBusy(true);
    try {
      const result = await extendActivitySeries(seriesId, extendUntil);
      toast.success(tSeries("extended", { count: result.created_count ?? 0 }));
      setExtendOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("errors.save_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {seriesId ? (
        <>
          <Button variant="outline" size="sm" onClick={viewSeries}>
            <Repeat className="mr-2 size-3.5 text-success" />
            {tSeries("viewSeries")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setCancelOpen(true)}
          >
            {tSeries("cancelFuture")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void openExtend()}>
            <CalendarPlus className="mr-2 size-3.5" />
            {tSeries("extend")}
          </Button>
        </>
      ) : null}
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="mr-2 size-3.5" />
        {t("detailActions.edit")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="mr-2 size-3.5" />
        {t("detailActions.delete")}
      </Button>

      <ActivityFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        clubId={activity.club_id}
        sections={[
          {
            club_section_id: activity.club_section_id,
            name: t("detailActions.sectionFallback", { id: activity.club_section_id }),
            club_type_id: activity.club_type_id,
          },
        ]}
        activity={activity}
        onSuccess={handleEditSuccess}
      />

      <DeleteActivityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        activity={activity}
        onSuccess={handleDeleteSuccess}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tSeries("cancelFutureConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tSeries("cancelFutureConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{tSeries("dismiss")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleCancelFuture();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {tSeries("cancelFutureAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tSeries("extendTitle")}</DialogTitle>
            <DialogDescription>{tSeries("extendBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="extend-until">{tSeries("extendUntil")}</Label>
            <Input
              id="extend-until"
              type="date"
              max={yearEnd || undefined}
              value={extendUntil}
              onChange={(event) => setExtendUntil(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)} disabled={busy}>
              {tSeries("dismiss")}
            </Button>
            <Button onClick={() => void handleExtend()} disabled={busy || !extendUntil}>
              {tSeries("extendAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
