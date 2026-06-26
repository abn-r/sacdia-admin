"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Clock,
  Pin,
  Copy,
  Edit,
  MoreHorizontal,
  Trophy,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import {
  EVENT_CATEGORY_MAP,
  EVENT_STATUS_LABEL,
  EVENT_STATUS_VARIANT,
  SECTION_COLOR,
} from "@/lib/camporee-timeline/event-categories";
import type { CamporeeEvent, Venue } from "@/lib/camporee-timeline/types";
import { durMin, initials } from "@/lib/camporee-timeline/helpers";
import { cancelCamporeeEventAction, softDeleteCamporeeEventAction } from "@/lib/camporee-events/actions";

interface Props {
  event: CamporeeEvent;
  venue: Venue;
  camporeeId: string;
  onEdit?: () => void;
  readonly?: boolean;
}

type DialogType = "cancel" | "delete" | null;

export function EventRow({ event, venue, camporeeId, onEdit, readonly = false }: Props) {
  const t = useTranslations("camporeeEvents.timeline");
  const router = useRouter();
  const cat = EVENT_CATEGORY_MAP[event.category];
  const status = event.status;
  const capPct = event.capacity > 0 ? (event.registered / event.capacity) * 100 : 0;
  const hasCapacity = event.registered > 0;

  const [dialogOpen, setDialogOpen] = React.useState<DialogType>(null);
  const [isPending, startTransition] = React.useTransition();

  const isCancelled = status === "cancelado";
  const isTerminal = status === "realizado" || status === "cancelado";

  function handleEdit() {
    if (onEdit) {
      onEdit();
    } else {
      router.push(`/dashboard/camporees/${camporeeId}/events/${event.id}/edit`);
    }
  }

  function handleConfirmCancel() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", event.id);
      formData.set("camporee_id", camporeeId);
      formData.set("is_union", "false");

      const result = await cancelCamporeeEventAction({}, formData);

      if (result?.error) {
        toast.error(result.error);
        setDialogOpen(null);
        return;
      }

      toast.success(`Evento "${event.title}" cancelado.`);
      setDialogOpen(null);
      // The server action redirects; router.refresh() is a safety net
      router.refresh();
    });
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", event.id);
      formData.set("camporee_id", camporeeId);
      formData.set("is_union", "false");

      const result = await softDeleteCamporeeEventAction({}, formData);

      if (result?.error) {
        toast.error(result.error);
        setDialogOpen(null);
        return;
      }

      toast.success(`Evento "${event.title}" eliminado.`);
      setDialogOpen(null);
      router.refresh();
    });
  }

  return (
    <>
      <div
        className={cn(
          "group grid items-center gap-3.5 px-4 py-3 border-b border-border/60 last:border-b-0",
          "grid-cols-1 md:grid-cols-[88px_1fr_220px_180px_180px_140px_110px_auto]",
          "transition-colors hover:bg-muted/50 cursor-pointer relative",
          isCancelled && "opacity-60",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity",
            cat.dot,
          )}
        />

        {/* Time */}
        <div className="tabular-nums">
          <div className={cn(
            "text-[14px] font-bold tracking-tight leading-tight",
            isCancelled && "line-through",
          )}>
            {event.startsAt}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">a {event.endsAt}</div>
          <div className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
            <Clock className="size-2.5" />
            {durMin(event.startsAt, event.endsAt)} min
          </div>
        </div>

        {/* Title + category */}
        <div className="min-w-0">
          <div className={cn(
            "text-[13.5px] font-semibold tracking-tight leading-snug flex items-center gap-1.5 flex-wrap",
            isCancelled && "line-through text-muted-foreground",
          )}>
            {event.title}
            {event.fromCatalog && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded"
                title={t("catalogImportTitle")}
              >
                <Copy className="size-2.5" />
                Catálogo
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">
            {event.description}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wide",
                cat.tint,
              )}
            >
              <span className={cn("size-1.5 rounded-full", cat.dot)} />
              {cat.label}
            </span>
            {event.sections.map((s) => {
              const sc = SECTION_COLOR[s];
              return (
                <span
                  key={s}
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    sc?.tint,
                  )}
                >
                  {s.slice(0, 4)}
                </span>
              );
            })}
          </div>
        </div>

        {/* Venue */}
        <div className="flex items-start gap-1.5 text-[12px]">
          <Pin className="size-3 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="truncate font-medium">{venue.name}</div>
            <div className="text-[10.5px] text-muted-foreground">cap. {venue.capacity}</div>
          </div>
        </div>

        {/* Leader */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
              {initials(event.leaderName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-[12px] font-medium truncate">{event.leaderName}</div>
            <div className="text-[10.5px] text-muted-foreground truncate">
              {event.leaderRole ?? "responsable"}
            </div>
          </div>
        </div>

        {/* Capacity */}
        <div className="text-right tabular-nums">
          {hasCapacity ? (
            <>
              <div className="text-[13px] font-bold leading-tight">
                {event.registered}
                <span className="text-muted-foreground/70 font-medium"> / {event.capacity}</span>
              </div>
              <Progress
                value={capPct}
                className={cn("h-1 mt-1", capPct > 90 && "[&>div]:bg-warning")}
              />
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {Math.round(capPct)}% del cupo
              </div>
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground/70">
              {event.points > 0 ? "—" : "asistencia abierta"}
            </div>
          )}
        </div>

        {/* Points */}
        <div className="text-center">
          {event.points > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-warning-soft-foreground bg-warning-soft px-2 py-0.5 rounded">
              <Trophy className="size-2.5" />
              {event.points} pts
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/60">—</span>
          )}
        </div>

        {/* Status badge */}
        <div>
          <Badge variant={EVENT_STATUS_VARIANT[status] as never}>
            {EVENT_STATUS_LABEL[status]}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-1 justify-end">
          {!readonly && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
              >
                <Edit className="size-3.5" />
                <span className="sr-only">Editar</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">Más opciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleEdit()}
                  >
                    <Edit className="size-3.5 mr-2" />
                    Editar evento
                  </DropdownMenuItem>

                  {!isTerminal && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDialogOpen("cancel")}
                        className="text-warning"
                      >
                        <XCircle className="size-3.5 mr-2" />
                        Cancelar evento
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDialogOpen("delete")}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-3.5 mr-2" />
                    Eliminar evento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* ── Cancel AlertDialog ── */}
      <AlertDialog open={dialogOpen === "cancel"} onOpenChange={(v) => !v && setDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              El evento{" "}
              <span className="font-medium text-foreground">&ldquo;{event.title}&rdquo;</span>{" "}
              quedará marcado como <b>cancelado</b> y seguirá visible en la agenda con ese estado.
              Esta acción puede revertirse editando el estado manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Volver</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleConfirmCancel}
              disabled={isPending}
              className="border-warning text-warning hover:bg-warning/10"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              Confirmar cancelación
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={dialogOpen === "delete"} onOpenChange={(v) => !v && setDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              El evento{" "}
              <span className="font-medium text-foreground">&ldquo;{event.title}&rdquo;</span>{" "}
              será eliminado de la agenda del camporee. El registro se conserva en la base de datos
              (borrado lógico) pero no será visible para nadie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Volver</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
