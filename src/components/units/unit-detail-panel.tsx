"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  CalendarDays,
  Users,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddMemberDialog } from "@/components/units/add-member-dialog";
import { WeeklyRecordsPanel } from "@/components/units/weekly-records-panel";
import { useTranslations } from "next-intl";
import { removeUnitMember, getUnitUserDisplayName } from "@/lib/api/units";
import type { Unit, UnitMember } from "@/lib/api/units";

// ─── Leader Row ───────────────────────────────────────────────────────────────

function LeaderRow({ label, user }: { label: string; user?: { user_id: string; name?: string | null; paternal_last_name?: string | null } | null }) {
  if (!user) return null;
  return (
    <div className="flex items-center gap-2">
      <Shield className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-xs font-medium">{getUnitUserDisplayName(user)}</span>
    </div>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: UnitMember;
  onRemove: (member: UnitMember) => void;
}

function MemberRow({ member, onRemove }: MemberRowProps) {
  const name = getUnitUserDisplayName(member.users ?? undefined);

  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/30">
      <div className="flex items-center gap-2">
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">{name}</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(member)}
          >
            <UserMinus className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Remover de la unidad</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnitDetailPanelProps {
  unit: Unit;
  clubId: number;
  localFieldId?: number | null;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  onMembersChanged: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnitDetailPanel({
  unit,
  clubId,
  localFieldId,
  onEdit,
  onDelete,
  onMembersChanged,
}: UnitDetailPanelProps) {
  const t = useTranslations("units_admin");
  const [expanded, setExpanded] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<UnitMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const members = (unit.unit_members ?? []).filter((m) => m.active);
  const memberCount = members.length;

  async function handleConfirmRemove() {
    if (!removingMember) return;
    setIsRemoving(true);
    try {
      await removeUnitMember(clubId, unit.unit_id, removingMember.unit_member_id);
      toast.success(t("toasts.member_removed"));
      onMembersChanged();
      setRemovingMember(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.remove_member_failed");
      toast.error(message);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <Card className="overflow-hidden">
          {/* Header row */}
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 py-4">
            <button
              type="button"
              className="flex flex-1 items-center gap-3 text-left"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-4 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{unit.name}</span>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {getUnitUserDisplayName(unit.users_units_captain_idTousers)
                    ? `Cap. ${getUnitUserDisplayName(unit.users_units_captain_idTousers)}`
                    : "Sin capitan asignado"}
                </p>
              </div>

              {expanded ? (
                <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              )}
            </button>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onEdit(unit)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar unidad</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(unit)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desactivar unidad</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

          {/* Expanded content */}
          <CollapsibleContent>
            <CardContent className="border-t px-5 pb-5 pt-4">
              {/* Leaders summary */}
              <div className="mb-4 space-y-1.5 rounded-lg bg-muted/40 px-3 py-2.5">
                <LeaderRow label="Capitan" user={unit.users_units_captain_idTousers} />
                <LeaderRow label="Secretario" user={unit.users_units_secretary_idTousers} />
                <LeaderRow label="Consejero" user={unit.users_units_advisor_idTousers} />
                {unit.users_units_as_substitute_advisor && (
                  <LeaderRow label="Consejero suplente" user={unit.users_units_as_substitute_advisor} />
                )}
              </div>

              {/* Sub-tabs: Members / Weekly records */}
              <Tabs defaultValue="members">
                <TabsList className="mb-3 h-8">
                  <TabsTrigger value="members" className="text-xs">
                    <Users className="mr-1.5 size-3.5" />
                    Miembros ({memberCount})
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs">
                    <CalendarDays className="mr-1.5 size-3.5" />
                    Asistencia semanal
                  </TabsTrigger>
                </TabsList>

                {/* Members tab */}
                <TabsContent value="members" className="mt-0">
                  <div className="flex items-center justify-between pb-2">
                    <p className="text-xs text-muted-foreground">
                      Miembros activos de la unidad
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddMemberOpen(true)}
                    >
                      <UserPlus className="mr-1.5 size-3.5" />
                      Agregar miembro
                    </Button>
                  </div>

                  {members.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-6 text-center">
                      <Users className="mx-auto size-8 text-muted-foreground/40" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Sin miembros en esta unidad
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setAddMemberOpen(true)}
                      >
                        <UserPlus className="mr-1.5 size-3.5" />
                        Agregar miembro
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {members.map((member) => (
                        <MemberRow
                          key={member.unit_member_id}
                          member={member}
                          onRemove={setRemovingMember}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Weekly records tab */}
                <TabsContent value="weekly" className="mt-0">
                  <WeeklyRecordsPanel
                    clubId={clubId}
                    unitId={unit.unit_id}
                    members={members}
                    localFieldId={localFieldId}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Add member dialog */}
      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        clubId={clubId}
        unitId={unit.unit_id}
        unitName={unit.name}
        existingMembers={unit.unit_members}
        onSuccess={onMembersChanged}
      />

      {/* Remove member confirmation */}
      <AlertDialog
        open={!!removingMember}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover miembro</AlertDialogTitle>
            <AlertDialogDescription>
              Estas por remover a{" "}
              <span className="font-medium text-foreground">
                {getUnitUserDisplayName(removingMember?.users)}
              </span>{" "}
              de la unidad. Su historial de asistencia se conserva. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRemoving ? "Removiendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
