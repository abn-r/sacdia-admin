"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/shared/row-actions";
import { DeleteActivityDialog } from "@/components/activities/delete-activity-dialog";
import type { Activity } from "@/lib/api/activities";
import { activityDetailPath } from "@/lib/activities/helpers";

interface ActivityDetailActionsProps {
  activity: Activity;
  canEdit: boolean;
  /** The list of the activity's club, where deleting leaves to. */
  listHref: string;
}

/** Editar (a route modal over the detail) and Eliminar… in the more menu. */
export function ActivityDetailActions({ activity, canEdit, listHref }: ActivityDetailActionsProps) {
  const t = useTranslations("people.activities");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <Button asChild variant="outline" size="sm">
        <Link href={`${activityDetailPath(activity.activity_id)}/edit`}>
          <Pencil aria-hidden />
          {t("list.edit")}
        </Link>
      </Button>
      <RowActions
        label={activity.name}
        actions={[{ label: t("list.delete"), icon: Trash2, destructive: true, onSelect: () => setDeleteOpen(true) }]}
      />
      <DeleteActivityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        activity={activity}
        onSuccess={() => {
          setDeleteOpen(false);
          router.push(listHref);
          router.refresh();
        }}
      />
    </>
  );
}
