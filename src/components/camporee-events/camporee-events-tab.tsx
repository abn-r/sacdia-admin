"use client";

/**
 * CamporeeEventsTab
 *
 * Tab content for the "Eventos" tab on the camporee detail page.
 * Shows list of event instances ordered by display_order.
 *
 * Features:
 *   - "Agregar desde template" dialog (template picker → POST from-template)
 *   - "Crear personalizado" → dedicated route /dashboard/camporees/[id]/events/new
 *   - Edit → /dashboard/camporees/[id]/events/[eventId]/edit
 *   - Delete → AlertDialog confirmation via server action
 *   - Reorder with ↑/↓ buttons via server action
 */

import { useState, useTransition, useCallback } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  deleteCamporeeEventAction,
  reorderCamporeeEventAction,
  cloneTemplateToLocalCamporeeAction,
  cloneTemplateToUnionCamporeeAction,
  type CamporeeEventActionState,
} from "@/lib/camporee-events/actions";
import type { CamporeeEvent, CamporeeEventTemplate } from "@/lib/api/camporee-events";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeeEventsTabProps {
  camporeeId: number;
  initialEvents: CamporeeEvent[];
  availableTemplates: CamporeeEventTemplate[];
  isUnionCamporee?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  return "—";
}

function participantsSummary(event: CamporeeEvent): string {
  if (event.participants_mode === "count") {
    return `${event.participants_count ?? "—"}`;
  }
  const rows = Array.isArray(event.participants_by_class) ? event.participants_by_class : [];
  return `${rows.length} clase(s)`;
}

// ─── DeleteButton ─────────────────────────────────────────────────────────────

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      Eliminar
    </Button>
  );
}

// ─── CloneButton ──────────────────────────────────────────────────────────────

function CloneButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      Agregar
    </Button>
  );
}

// ─── CamporeeEventsTab ────────────────────────────────────────────────────────

export function CamporeeEventsTab({
  camporeeId,
  initialEvents,
  availableTemplates,
  isUnionCamporee = false,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: CamporeeEventsTabProps) {
  const [events, setEvents] = useState<CamporeeEvent[]>(initialEvents);
  const [deleteEvent, setDeleteEvent] = useState<CamporeeEvent | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const [deleteState, deleteFormAction] = useActionState<CamporeeEventActionState, FormData>(
    deleteCamporeeEventAction,
    {},
  );

  const [cloneLocalState, cloneLocalAction] = useActionState<CamporeeEventActionState, FormData>(
    cloneTemplateToLocalCamporeeAction,
    {},
  );

  const [cloneUnionState, cloneUnionAction] = useActionState<CamporeeEventActionState, FormData>(
    cloneTemplateToUnionCamporeeAction,
    {},
  );

  const cloneAction = isUnionCamporee ? cloneUnionAction : cloneLocalAction;
  const cloneState = isUnionCamporee ? cloneUnionState : cloneLocalState;

  // Optimistic reorder: swap adjacent rows
  const handleReorder = useCallback(
    (index: number, direction: "up" | "down") => {
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= events.length) return;

      const updated = [...events];
      [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];

      // Reassign display_order to match new positions
      const reordered = updated.map((e, i) => ({ ...e, display_order: i }));
      setEvents(reordered);

      // Fire server action for the moved event
      const movedEvent = reordered[swapIndex];
      startTransition(async () => {
        const fd = new FormData();
        fd.set("id", String(movedEvent.camporee_event_id));
        fd.set("display_order", String(movedEvent.display_order));
        fd.set("camporee_id", String(camporeeId));
        fd.set("is_union", String(isUnionCamporee));
        await reorderCamporeeEventAction({}, fd);
      });
    },
    [events, camporeeId, isUnionCamporee],
  );

  const basePath = isUnionCamporee
    ? `/dashboard/camporees/union/${camporeeId}`
    : `/dashboard/camporees/${camporeeId}`;

  const newEventPath = `${basePath}/events/new`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {events.length} evento(s)
        </span>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplatePickerOpen(true)}
            >
              <Layers className="size-4" />
              Agregar desde template
            </Button>
            <Button size="sm" asChild>
              <Link href={newEventPath}>
                <Plus className="size-4" />
                Crear personalizado
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {events.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No hay eventos"
          description="Agrega el primer evento a este camporee."
        >
          {canCreate && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplatePickerOpen(true)}
              >
                Agregar desde template
              </Button>
              <Button size="sm" asChild>
                <Link href={newEventPath}>
                  <Plus className="size-4" />
                  Crear personalizado
                </Link>
              </Button>
            </div>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-[100px]">Pts. máx.</TableHead>
                <TableHead>Participantes</TableHead>
                <TableHead>Estado</TableHead>
                {(canEdit || canDelete) && (
                  <TableHead className="sticky right-0 z-20 w-[120px] border-l bg-background">
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event, index) => {
                const eventTypeName =
                  toText((event.event_type as Record<string, unknown>)?.name);

                return (
                  <TableRow key={event.camporee_event_id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {event.display_order + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {toText(event.title)}
                    </TableCell>
                    <TableCell className="text-sm">{eventTypeName}</TableCell>
                    <TableCell>{event.max_points}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {participantsSummary(event)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={event.active !== false ? "soft-success" : "outline"}
                        className="text-xs"
                      >
                        {event.active !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="sticky right-0 z-10 border-l bg-background">
                        <div className="hidden items-center gap-1 md:flex">
                          {/* Reorder buttons */}
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                disabled={index === 0 || isPending}
                                onClick={() => handleReorder(index, "up")}
                                title="Subir"
                              >
                                <ChevronUp className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                disabled={index === events.length - 1 || isPending}
                                onClick={() => handleReorder(index, "down")}
                                title="Bajar"
                              >
                                <ChevronDown className="size-3" />
                              </Button>
                            </>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              asChild
                              title="Editar"
                            >
                              <Link
                                href={`${basePath}/events/${event.camporee_event_id}/edit`}
                              >
                                <Pencil className="size-3.5" />
                              </Link>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteEvent(event)}
                              title="Eliminar"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>

                        {/* Mobile dropdown */}
                        <div className="md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && index > 0 && (
                                <DropdownMenuItem
                                  onSelect={() => handleReorder(index, "up")}
                                >
                                  <ChevronUp className="size-4" />
                                  Subir
                                </DropdownMenuItem>
                              )}
                              {canEdit && index < events.length - 1 && (
                                <DropdownMenuItem
                                  onSelect={() => handleReorder(index, "down")}
                                >
                                  <ChevronDown className="size-4" />
                                  Bajar
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`${basePath}/events/${event.camporee_event_id}/edit`}
                                  >
                                    <Pencil className="size-4" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => setDeleteEvent(event)}
                                >
                                  <Trash2 className="size-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {canDelete && deleteEvent && (
        <AlertDialog
          open={!!deleteEvent}
          onOpenChange={(open) => {
            if (!open) setDeleteEvent(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el evento &quot;{toText(deleteEvent.title)}&quot; de este camporee.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={deleteFormAction}>
                <input
                  type="hidden"
                  name="id"
                  value={String(deleteEvent.camporee_event_id)}
                />
                <input type="hidden" name="camporee_id" value={String(camporeeId)} />
                <input type="hidden" name="is_union" value={String(isUnionCamporee)} />
                {deleteState.error && (
                  <p className="mb-2 text-xs text-destructive">{deleteState.error}</p>
                )}
                <DeleteButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Add from template dialog */}
      <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar evento desde template</DialogTitle>
            <DialogDescription>
              Selecciona un template para clonar como evento de este camporee.
            </DialogDescription>
          </DialogHeader>

          {availableTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay templates disponibles para el alcance de este camporee.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {availableTemplates.map((tpl) => (
                <button
                  key={tpl.event_template_id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tpl.event_template_id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${
                    selectedTemplateId === tpl.event_template_id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="font-medium">{tpl.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {tpl.max_points} pts. máx. ·{" "}
                    {tpl.scope === "union" ? "Unión" : "Campo local"}
                  </div>
                </button>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplatePickerOpen(false)}>
              Cancelar
            </Button>
            {selectedTemplateId && (
              <form action={cloneAction}>
                <input type="hidden" name="camporee_id" value={String(camporeeId)} />
                <input
                  type="hidden"
                  name="template_id"
                  value={String(selectedTemplateId)}
                />
                {cloneState.error && (
                  <p className="mb-2 text-xs text-destructive">{cloneState.error}</p>
                )}
                <CloneButton />
              </form>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
