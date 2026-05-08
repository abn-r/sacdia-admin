"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { DeleteActivityDialog } from "@/components/activities/delete-activity-dialog";
import type { Activity } from "@/lib/api/activities";

interface ActivityDetailActionsProps {
  activity: Activity;
}

export function ActivityDetailActions({ activity }: ActivityDetailActionsProps) {
  const t = useTranslations("activities");
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleEditSuccess() {
    router.refresh();
  }

  function handleDeleteSuccess() {
    router.push("/dashboard/activities");
  }

  return (
    <>
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
    </>
  );
}
