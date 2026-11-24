"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActions } from "@/components/shared/row-actions";
import { cn } from "@/lib/utils";
import type { CamporeeEvent, EventStatus, Venue } from "@/lib/camporee-timeline/types";
import { PROGRAM_NORMAL_STATUSES } from "@/lib/camporee-events/program-groups";
import { cancelCamporeeEventAction, softDeleteCamporeeEventAction } from "@/lib/camporee-events/actions";

interface Props {
  event: CamporeeEvent;
  venue: Venue;
  camporeeId: string;
  isUnionCamporee?: boolean;
  onEdit?: () => void;
  readonly?: boolean;
  /** `table` renders a `<tr>` (md+); `list` renders the 2-line `<li>` for small screens. */
  layout?: "table" | "list";
}

type DialogType = "cancel" | "delete" | null;

/**
 * One event of the program. The title is the primary action (opens the edit
 * page); everything else lives in the "⋯" menu. Only the exception is marked:
 * "Sin publicar", "Cancelado" and "Sin responsable".
 */
export function EventRow({
  event,
  venue,
  camporeeId,
  isUnionCamporee = false,
  onEdit,
  readonly = false,
  layout = "table",
}: Props) {
  const t = useTranslations("evaluation.camporeeEvents.program");
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState<DialogType>(null);

  const status = event.status;
  const isCancelled = status === "cancelado";
  const isTerminal = status === "realizado" || status === "cancelado";
  const hasLeader = event.leaderName !== "—" && event.leaderName.trim() !== "";
  const editPath = isUnionCamporee
    ? `/dashboard/campamentos/union/${camporeeId}/events/${event.id}/edit`
    : `/dashboard/campamentos/${camporeeId}/events/${event.id}/edit`;

  function handleEdit() {
    if (onEdit) onEdit();
    else router.push(editPath);
  }

  async function runAction(
    action: typeof cancelCamporeeEventAction,
    successKey: "cancelledToast" | "deletedToast",
  ) {
    const formData = new FormData();
    formData.set("id", event.id);
    formData.set("camporee_id", camporeeId);
    formData.set("is_union", String(isUnionCamporee));
    const result = await action({}, formData);
    if (result?.error) {
      // Rejecting keeps the dialog open with the message inline.
      throw new Error(result.error);
    }
    toast.success(t(successKey, { title: event.title }));
    router.refresh();
  }

  const statusLabels: Record<EventStatus, string> = {
    programado: t("statusUnpublished"),
    publicado: t("statuses.publicado"),
    en_curso: t("statuses.en_curso"),
    realizado: t("statuses.realizado"),
    cancelado: t("statuses.cancelado"),
  };

  const statusMark = (
    <ExceptionStatus
      value={status}
      normal={PROGRAM_NORMAL_STATUSES}
      labels={statusLabels}
      intents={{ programado: "neutral", cancelado: "destructive" }}
    />
  );

  const actions = readonly ? null : (
    <RowActions
      label={event.title}
      actions={[
        { label: t("actions.edit"), icon: Pencil, onSelect: handleEdit },
        {
          label: t("actions.cancel"),
          icon: XCircle,
          hidden: isTerminal,
          onSelect: () => setDialogOpen("cancel"),
        },
        {
          label: t("actions.delete"),
          icon: Trash2,
          destructive: true,
          onSelect: () => setDialogOpen("delete"),
        },
      ]}
    />
  );

  const venueName = venue.name && venue.name !== "—" ? venue.name : null;
  const timeRange = `${event.startsAt}–${event.endsAt}`;
  const categoryLabel = t(`categories.${event.category}`);
  const titleNode = readonly ? (
    <span className={cn("font-medium", isCancelled && "text-muted-foreground line-through")}>
      {event.title}
    </span>
  ) : (
    <button
      type="button"
      onClick={handleEdit}
      className={cn(
        "rounded-sm text-left font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        isCancelled && "text-muted-foreground line-through",
      )}
    >
      {event.title}
    </button>
  );

  const dialogs = (
    <>
      <ConfirmDialog
        open={dialogOpen === "cancel"}
        onOpenChange={(open) => !open && setDialogOpen(null)}
        title={t("cancelDialog.title", { title: event.title })}
        description={t("cancelDialog.description")}
        confirmLabel={t("cancelDialog.confirm")}
        cancelLabel={t("cancelDialog.back")}
        onConfirm={() => runAction(cancelCamporeeEventAction, "cancelledToast")}
      />
      <ConfirmDialog
        open={dialogOpen === "delete"}
        onOpenChange={(open) => !open && setDialogOpen(null)}
        tone="destructive"
        title={t("deleteDialog.title", { title: event.title })}
        description={t("deleteDialog.description")}
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={t("cancelDialog.back")}
        onConfirm={() => runAction(softDeleteCamporeeEventAction, "deletedToast")}
      />
    </>
  );

  if (layout === "list") {
    return (
      <li className="flex items-start gap-3 border-b py-3 last:border-b-0">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 truncate">{titleNode}</div>
            {statusMark}
          </div>
          <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
            <span>{timeRange}</span>
            {venueName ? <span>{venueName}</span> : null}
            <span className={cn(!hasLeader && "text-foreground")}>
              {hasLeader ? event.leaderName : t("noLeader")}
            </span>
            {event.points > 0 ? <span>{t("points", { points: event.points })}</span> : null}
          </p>
        </div>
        {actions}
        {dialogs}
      </li>
    );
  }

  return (
    <>
      <TableRow className={cn(isCancelled && "text-muted-foreground")}>
        <TableCell className="whitespace-nowrap tabular-nums">
          <span className={cn(isCancelled && "line-through")}>{event.startsAt}</span>
          <span className="block text-[13px] text-muted-foreground">
            {t("until", { time: event.endsAt })}
          </span>
        </TableCell>
        <TableCell>
          {titleNode}
          <span className="block text-[13px] text-muted-foreground">{categoryLabel}</span>
        </TableCell>
        <TableCell>{venueName ?? <span className="text-muted-foreground">—</span>}</TableCell>
        <TableCell>
          {hasLeader ? (
            event.leaderName
          ) : (
            <StatusBadge intent="warning" size="xs" label={t("noLeader")} />
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {event.points > 0 ? event.points : <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell>{statusMark}</TableCell>
        <TableCell>{actions}</TableCell>
      </TableRow>
      {dialogs}
    </>
  );
}
