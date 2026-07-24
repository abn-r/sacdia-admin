"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/users/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import {
  addCamporeeJudgeAction,
  removeCamporeeJudgeAction,
  updateCamporeeJudgeAction,
} from "@/lib/camporee-scoring/actions";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
import type {
  CamporeeJudge,
  CamporeeJudgeCandidate,
  CamporeeJudgeEligibilityReason,
} from "@/lib/api/camporee-scoring";
import { cn } from "@/lib/utils";

export interface CamporeeJudgesPanelProps {
  camporeeId: number;
  isUnionCamporee?: boolean;
  judges: CamporeeJudge[];
  judgeCandidates?: CamporeeJudgeCandidate[];
  judgeCandidatesError?: string | null;
  canEdit?: boolean;
}

const CLUB_ROLE_NAMES = new Set([
  "director",
  "deputy-director",
  "secretary",
  "treasurer",
  "secretary-treasurer",
  "counselor",
  "instructor",
  "member",
]);

const ROLE_LABELS: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  coordinator: "Coordinador",
  "zone-coordinator": "Coordinador de zona",
  "general-coordinator": "Coordinador general",
  pastor: "Pastor",
  "assistant-lf": "Asistente campo local",
  "director-lf": "Director campo local",
  "assistant-union": "Asistente unión",
  "director-union": "Director unión",
  "assistant-dia": "Asistente DIA",
  "director-dia": "Director DIA",
  director: "Director",
  "deputy-director": "Subdirector",
  secretary: "Secretario",
  treasurer: "Tesorero",
  "secretary-treasurer": "Secretario-tesorero",
  counselor: "Consejero",
  instructor: "Instructor",
  member: "Miembro",
  user: "Usuario",
};

const ELIGIBILITY_LABELS: Record<CamporeeJudgeEligibilityReason, string> = {
  adult: "18+",
  pastor_role: "Pastor",
  invested_master_guide: "GM investido",
};

function getUserName(user: CamporeeJudgeCandidate) {
  return (
    user.full_name ||
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ") ||
    user.email ||
    "Usuario sin nombre"
  );
}

function formatRole(role: string) {
  return (
    ROLE_LABELS[role] ??
    role
      .split(/[-_]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function splitRoleAndPositionLabels(user: CamporeeJudgeCandidate) {
  const roles = [...new Set(user.roles ?? [])];
  const positions = roles.filter((role) => CLUB_ROLE_NAMES.has(role));
  const globalRoles = roles.filter((role) => !CLUB_ROLE_NAMES.has(role));

  return {
    roleLabels: (globalRoles.length > 0 ? globalRoles : roles).map(formatRole),
    positionLabels: positions.map(formatRole),
  };
}

function getEligibilityReasons(user: CamporeeJudgeCandidate) {
  return user.camporee_judge_eligibility_reasons ?? [];
}

function isCamporeeJudgeEligible(user: CamporeeJudgeCandidate) {
  return user.camporee_judge_eligible === true || getEligibilityReasons(user).length > 0;
}

function buildSearchText(user: CamporeeJudgeCandidate) {
  const { roleLabels, positionLabels } = splitRoleAndPositionLabels(user);
  return [
    user.user_id,
    user.email,
    getUserName(user),
    ...(user.roles ?? []),
    ...roleLabels,
    ...positionLabels,
    ...getEligibilityReasons(user).map((reason) => ELIGIBILITY_LABELS[reason]),
    user.local_field?.name,
    user.union?.name,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function JudgeCandidateBadges({
  roleLabels,
  positionLabels,
  eligibilityReasons,
  rolePrefix,
  positionPrefix,
  noPosition,
}: {
  roleLabels: string[];
  positionLabels: string[];
  eligibilityReasons: CamporeeJudgeEligibilityReason[];
  rolePrefix: string;
  positionPrefix: string;
  noPosition: string;
}) {
  const cargoLabel = positionLabels.length > 0 ? positionLabels.join(", ") : noPosition;

  return (
    <div className="mt-1 flex min-w-0 flex-wrap gap-1">
      {eligibilityReasons.map((reason) => (
        <span
          key={reason}
          className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {ELIGIBILITY_LABELS[reason]}
        </span>
      ))}
      {roleLabels.slice(0, 2).map((role) => (
        <span
          key={role}
          className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {rolePrefix}: {role}
        </span>
      ))}
      <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-foreground/10">
        {positionPrefix}: {cargoLabel}
      </span>
    </div>
  );
}

function JudgeCandidateOption({
  user,
  rolePrefix,
  positionPrefix,
  noPosition,
}: {
  user: CamporeeJudgeCandidate;
  rolePrefix: string;
  positionPrefix: string;
  noPosition: string;
}) {
  const name = getUserName(user);
  const { roleLabels, positionLabels } = splitRoleAndPositionLabels(user);
  const eligibilityReasons = getEligibilityReasons(user);

  return (
    <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden">
      <UserAvatar src={user.user_image} name={name} email={user.email} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email ?? "—"}</p>
        <JudgeCandidateBadges
          roleLabels={roleLabels}
          positionLabels={positionLabels}
          eligibilityReasons={eligibilityReasons}
          rolePrefix={rolePrefix}
          positionPrefix={positionPrefix}
          noPosition={noPosition}
        />
      </div>
    </div>
  );
}

function JudgeCandidateTriggerLabel({ user }: { user: CamporeeJudgeCandidate }) {
  const name = getUserName(user);
  const { roleLabels, positionLabels } = splitRoleAndPositionLabels(user);
  const eligibilityLabel = getEligibilityReasons(user)
    .map((reason) => ELIGIBILITY_LABELS[reason])
    .join(" · ");
  const detail = [
    user.email ?? null,
    roleLabels[0] ?? null,
    positionLabels[0] ?? null,
    eligibilityLabel || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      <UserAvatar src={user.user_image} name={name} email={user.email} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </span>
  );
}

export function CamporeeJudgesPanel({
  camporeeId,
  isUnionCamporee = false,
  judges,
  judgeCandidates = [],
  judgeCandidatesError = null,
  canEdit = false,
}: CamporeeJudgesPanelProps) {
  const t = useTranslations("campamentos.pages.judges");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAddPending, startAddTransition] = useTransition();

  const [addOpen, setAddOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [editingJudge, setEditingJudge] = useState<CamporeeJudge | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [removingJudge, setRemovingJudge] = useState<CamporeeJudge | null>(null);

  useEffect(() => {
    if (!pickerOpen) setSearch("");
  }, [pickerOpen]);

  useEffect(() => {
    if (!addOpen) {
      setSelectedUserId("");
      setNotes("");
      setPickerOpen(false);
      setSearch("");
      setAddError(null);
    }
  }, [addOpen]);

  const judgeList = Array.isArray(judges) ? judges : [];

  const candidateByUserId = useMemo(() => {
    const map = new Map<string, CamporeeJudgeCandidate>();
    for (const candidate of judgeCandidates) {
      map.set(candidate.user_id, candidate);
    }
    return map;
  }, [judgeCandidates]);

  const activeJudgeUserIds = useMemo(
    () =>
      new Set(
        judgeList
          .filter((judge) => judge.active)
          .map((judge) => judge.user_id),
      ),
    [judgeList],
  );

  const availableCandidates = useMemo(
    () =>
      judgeCandidates.filter(
        (candidate) =>
          isCamporeeJudgeEligible(candidate) &&
          !activeJudgeUserIds.has(candidate.user_id),
      ),
    [activeJudgeUserIds, judgeCandidates],
  );

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return availableCandidates.slice(0, 25);
    }

    return availableCandidates
      .filter((candidate) => buildSearchText(candidate).includes(normalizedSearch))
      .slice(0, 25);
  }, [availableCandidates, search]);

  const selectedUser = useMemo(
    () => availableCandidates.find((candidate) => candidate.user_id === selectedUserId) ?? null,
    [availableCandidates, selectedUserId],
  );

  function openEdit(judge: CamporeeJudge) {
    setEditingJudge(judge);
    setEditNotes(judge.notes ?? "");
    setEditError(null);
  }

  function handleAddOpenChange(open: boolean) {
    if (!open && isAddPending) return;
    setAddOpen(open);
  }

  function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUserId || isAddPending) return;

    setAddError(null);
    const formData = new FormData();
    formData.set("camporee_id", String(camporeeId));
    formData.set("is_union", isUnionCamporee ? "true" : "false");
    formData.set("user_id", selectedUserId);
    const trimmedNotes = notes.trim();
    if (trimmedNotes) formData.set("notes", trimmedNotes);

    startAddTransition(async () => {
      const result = await addCamporeeJudgeAction({}, formData);
      if (result.error) {
        setAddError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(result.success ?? t("addSuccess"));
      setSelectedUserId("");
      setNotes("");
      setPickerOpen(false);
      setSearch("");
      setAddError(null);
      setAddOpen(false);
      router.refresh();
    });
  }

  function getJudgeDisplayName(judge: CamporeeJudge) {
    const candidate = candidateByUserId.get(judge.user_id);
    return judge.name || candidate?.full_name || judge.user_id;
  }

  function handleRemove(judge: CamporeeJudge) {
    setRowError(null);
    const formData = new FormData();
    formData.set("camporee_judge_id", judge.camporee_judge_id);
    formData.set("camporee_id", String(camporeeId));
    formData.set("is_union", isUnionCamporee ? "true" : "false");

    startTransition(async () => {
      const result = await removeCamporeeJudgeAction({}, formData);
      if (result.error) {
        setRowError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(result.success ?? t("removeSuccess"));
      setRemovingJudge(null);
      router.refresh();
    });
  }

  function handleSaveNotes() {
    if (!editingJudge) return;
    setEditError(null);
    const formData = new FormData();
    formData.set("camporee_judge_id", editingJudge.camporee_judge_id);
    formData.set("camporee_id", String(camporeeId));
    formData.set("is_union", isUnionCamporee ? "true" : "false");
    formData.set("notes", editNotes);

    startTransition(async () => {
      const result = await updateCamporeeJudgeAction({}, formData);
      if (result.error) {
        setEditError(result.error);
        return;
      }
      setEditingJudge(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-4" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">{t("rosterTitle")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("rosterSubtitle", { count: judgeList.length })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            intent={judgeList.length > 0 ? "success" : "neutral"}
            size="sm"
            label={t("rosterCount", { count: judgeList.length })}
          />
          {canEdit && (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => setAddOpen(true)}
            >
              <UserPlus className="size-4" aria-hidden />
              {t("addButton")}
            </Button>
          )}
        </div>
      </div>

      {rowError && <p className="text-sm text-destructive">{rowError}</p>}

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        {judgeList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={UserPlus}
              title={t("emptyRosterTitle")}
              description={t("emptyRosterDescription")}
              variant="no-results"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {judgeList.map((judge, index) => {
              const candidate = candidateByUserId.get(judge.user_id);
              const displayName = judge.name || candidate?.full_name || judge.user_id;
              const email = judge.email ?? candidate?.email ?? null;
              const image = judge.user_image ?? candidate?.user_image ?? null;
              const isActive = judge.active;

              return (
                <li
                  key={judge.camporee_judge_id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/40 active:bg-muted/60",
                    STAGGER_CLASSES,
                  )}
                  style={getStaggerStyle(index, 30)}
                >
                  <UserAvatar
                    src={image}
                    name={displayName}
                    email={email}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tracking-tight">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {email || "—"}
                    </p>
                    {judge.notes ? (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                        {judge.notes}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge
                    intent={isActive ? "success" : "neutral"}
                    size="xs"
                    label={
                      isActive
                        ? t("statusActive")
                        : judge.status || t("statusInactive")
                    }
                  />
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          disabled={isPending}
                          aria-label={t("rowActions")}
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => openEdit(judge)}>
                          <Pencil className="size-4" aria-hidden />
                          {t("editNotes")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isPending}
                          onSelect={() => setRemovingJudge(judge)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                          {t("removeJudge")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add judge modal — closes on success with toast feedback */}
      <Dialog open={addOpen} onOpenChange={handleAddOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>{t("addHint")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <input type="hidden" name="camporee_id" value={camporeeId} />
            <input
              type="hidden"
              name="is_union"
              value={isUnionCamporee ? "true" : "false"}
            />
            <input type="hidden" name="user_id" value={selectedUserId} />

            <div className="space-y-2">
              <Label htmlFor="judge-user">{t("userLabel")}</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="judge-user"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-label={t("userLabel")}
                    aria-expanded={pickerOpen}
                    className="h-auto min-h-11 w-full justify-between gap-2 overflow-hidden rounded-xl px-3 py-2 text-left font-normal"
                    disabled={availableCandidates.length === 0 || isAddPending}
                  >
                    {selectedUser ? (
                      <JudgeCandidateTriggerLabel user={selectedUser} />
                    ) : (
                      <span className="min-w-0 truncate text-muted-foreground">
                        {t("userPlaceholder")}
                      </span>
                    )}
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
                >
                  {pickerOpen ? (
                    <Command shouldFilter={false}>
                      <CommandInput
                        value={search}
                        onValueChange={setSearch}
                        placeholder={t("userSearchPlaceholder")}
                      />
                      <CommandList className="max-h-80">
                        <CommandEmpty>{t("userSearchEmpty")}</CommandEmpty>
                        <CommandGroup>
                          {filteredCandidates.map((candidate) => (
                            <CommandItem
                              key={candidate.user_id}
                              value={candidate.user_id}
                              onSelect={() => {
                                setSelectedUserId(candidate.user_id);
                                setAddError(null);
                                setPickerOpen(false);
                              }}
                              className="min-w-0 items-start gap-2 py-2"
                            >
                              <Check
                                className={cn(
                                  "mt-2 size-4 shrink-0",
                                  selectedUserId === candidate.user_id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <JudgeCandidateOption
                                user={candidate}
                                rolePrefix={t("rolePrefix")}
                                positionPrefix={t("positionPrefix")}
                                noPosition={t("noPosition")}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  ) : null}
                </PopoverContent>
              </Popover>
              {judgeCandidatesError ? (
                <p className="text-xs text-destructive">{judgeCandidatesError}</p>
              ) : availableCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noCandidates")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="judge-notes">{t("notesLabel")}</Label>
              <Input
                id="judge-notes"
                name="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("notesPlaceholder")}
                className="h-11 rounded-xl"
                disabled={isAddPending}
              />
            </div>

            {addError ? (
              <p className="text-sm text-destructive" role="alert">
                {addError}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isAddPending}
                onClick={() => handleAddOpenChange(false)}
              >
                {t("closeAdd")}
              </Button>
              <Button
                type="submit"
                disabled={!selectedUserId || isAddPending}
                className="rounded-full px-6"
              >
                {isAddPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {t("addingButton")}
                  </>
                ) : (
                  t("addButton")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit notes modal */}
      <Dialog
        open={editingJudge != null}
        onOpenChange={(open) => {
          if (!open) setEditingJudge(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editNotesTitle")}</DialogTitle>
            <DialogDescription>
              {editingJudge?.name ||
                candidateByUserId.get(editingJudge?.user_id ?? "")?.full_name ||
                t("editNotesDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="edit-judge-notes">{t("notesLabel")}</Label>
            <Input
              id="edit-judge-notes"
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              placeholder={t("notesPlaceholder")}
              className="h-11 rounded-xl"
            />
          </div>

          {editError && <p className="text-sm text-destructive">{editError}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => setEditingJudge(null)}
            >
              {t("cancelEdit")}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              className="rounded-full px-6"
              onClick={handleSaveNotes}
            >
              {t("saveNotes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removingJudge != null}
        onOpenChange={(open) => {
          if (!open && isPending) return;
          if (!open) setRemovingJudge(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeConfirmDescription", {
                name: removingJudge ? getJudgeDisplayName(removingJudge) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("removeCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending || !removingJudge}
              onClick={(event) => {
                event.preventDefault();
                if (removingJudge) handleRemove(removingJudge);
              }}
            >
              {t("removeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
