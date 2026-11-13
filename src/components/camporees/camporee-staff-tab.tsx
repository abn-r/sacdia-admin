"use client";

/**
 * CamporeeStaffTab — «Personal» tab of the camporee detail (local and union).
 *
 * Roster of people taking part in the camporee. Event assignments (including the
 * `responsible` required to publish an event) pick from this roster.
 * Reads need `camporee_events:read`; add / edit / deactivate need
 * `camporee_events:update` (`canManage`, same gate as `events.update`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/users/user-avatar";
import { classifyActionError } from "@/lib/api/action-error";
import {
  addCamporeeStaffMember,
  CAMPOREE_STAFF_CATEGORIES,
  deactivateCamporeeStaffMember,
  getCamporeeStaffDisplayName,
  getCamporeeStaffErrorCode,
  listCamporeeStaff,
  listCamporeeStaffCandidates,
  updateCamporeeStaffMember,
  type CamporeeStaffCandidate,
  type CamporeeStaffCategory,
  type CamporeeStaffKind,
  type CamporeeStaffMember,
} from "@/lib/api/camporee-staff";
import { cn } from "@/lib/utils";

export interface CamporeeStaffTabProps {
  camporeeId: number;
  camporeeType: CamporeeStaffKind;
  /** `camporee_events:update` — add, edit and deactivate roster members. */
  canManage?: boolean;
  /** Reports the roster size so the tab trigger can show a count. */
  onCountChange?: (count: number) => void;
}

const ERROR_KEY_BY_CODE: Record<string, string> = {
  CAMPOREE_STAFF_DUPLICATE: "duplicate",
  CAMPOREE_STAFF_MEMBER_NOT_FOUND: "memberNotFound",
  CAMPOREE_STAFF_SCOPE_MISMATCH: "scopeMismatch",
  CAMPOREE_USER_NOT_FOUND: "userNotFound",
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function CamporeeStaffTab({
  camporeeId,
  camporeeType,
  canManage = false,
  onCountChange,
}: CamporeeStaffTabProps) {
  const t = useTranslations("camporees.staffTab");
  const tRef = useRef(t);
  tRef.current = t;

  const [members, setMembers] = useState<CamporeeStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [candidates, setCandidates] = useState<CamporeeStaffCandidate[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [category, setCategory] = useState<CamporeeStaffCategory>("support");
  const [roleLabel, setRoleLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Edit dialog
  const [editing, setEditing] = useState<CamporeeStaffMember | null>(null);

  // Deactivate dialog
  const [removing, setRemoving] = useState<CamporeeStaffMember | null>(null);

  const errorMessage = useCallback(
    (error: unknown): string => {
      const t = tRef.current;
      const code = getCamporeeStaffErrorCode(error);
      if (code && ERROR_KEY_BY_CODE[code]) {
        return t(`errors.${ERROR_KEY_BY_CODE[code]}` as "errors.duplicate");
      }
      if (classifyActionError(error).kind === "forbidden") return t("errors.forbidden");
      return t("toasts.actionFailed");
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCamporeeStaff(camporeeType, camporeeId);
      setMembers(rows);
      onCountChange?.(rows.length);
    } catch {
      toast.error(tRef.current("toasts.loadFailed"));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [camporeeId, camporeeType, onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  // Candidates are only readable with `camporee_events:update`.
  useEffect(() => {
    if (!addOpen || !canManage) return;
    let cancelled = false;
    void listCamporeeStaffCandidates(camporeeType, camporeeId)
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch((error) => {
        if (!cancelled) setFormError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [addOpen, canManage, camporeeId, camporeeType, errorMessage]);

  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => !candidate.already_staff_member_id),
    [candidates],
  );

  const filteredCandidates = useMemo(() => {
    const needle = normalize(search.trim());
    if (!needle) return availableCandidates;
    return availableCandidates.filter((candidate) =>
      normalize(`${candidate.full_name} ${candidate.email ?? ""}`).includes(needle),
    );
  }, [availableCandidates, search]);

  const selectedCandidate =
    availableCandidates.find((candidate) => candidate.user_id === selectedUserId) ?? null;

  function resetForm() {
    setSelectedUserId("");
    setCategory("support");
    setRoleLabel("");
    setNotes("");
    setSearch("");
    setFormError(null);
    setPickerOpen(false);
  }

  function openAdd() {
    resetForm();
    setCandidates([]);
    setAddOpen(true);
  }

  function openEdit(member: CamporeeStaffMember) {
    setCategory(member.category);
    setRoleLabel(member.role_label ?? "");
    setNotes(member.notes ?? "");
    setFormError(null);
    setEditing(member);
  }

  async function handleAdd() {
    if (!selectedUserId) return;
    setBusy(true);
    setFormError(null);
    try {
      await addCamporeeStaffMember(camporeeType, camporeeId, {
        user_id: selectedUserId,
        category,
        ...(roleLabel.trim() ? { role_label: roleLabel.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success(t("toasts.added"));
      setAddOpen(false);
      resetForm();
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit() {
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      await updateCamporeeStaffMember(editing.camporee_staff_member_id, {
        category,
        role_label: roleLabel.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success(t("toasts.updated"));
      setEditing(null);
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!removing) return;
    setBusy(true);
    try {
      await deactivateCamporeeStaffMember(removing.camporee_staff_member_id);
      toast.success(t("toasts.deactivated"));
      setRemoving(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }

  const categoryField = (
    <div className="space-y-2">
      <Label htmlFor="staff-category">{t("categoryLabel")}</Label>
      <Select
        value={category}
        onValueChange={(value) => setCategory(value as CamporeeStaffCategory)}
      >
        <SelectTrigger id="staff-category" className="w-full" aria-label={t("categoryLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CAMPOREE_STAFF_CATEGORIES.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`categories.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const detailFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="staff-role-label">{t("roleLabel")}</Label>
        <Input
          id="staff-role-label"
          value={roleLabel}
          maxLength={100}
          onChange={(event) => setRoleLabel(event.target.value)}
          placeholder={t("roleLabelPlaceholder")}
          disabled={busy}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-notes">{t("notesLabel")}</Label>
        <Input
          id="staff-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("notesPlaceholder")}
          disabled={busy}
        />
      </div>
    </>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{t("title")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("subtitle", { count: members.length })}
          </p>
        </div>
        {canManage ? (
          <Button type="button" size="sm" className="gap-1.5" onClick={openAdd}>
            <UserPlus className="size-4" aria-hidden />
            {t("addButton")}
          </Button>
        ) : (
          <Badge variant="secondary">{t("readOnlyHint")}</Badge>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground" role="status">
            …
          </p>
        ) : members.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={UserPlus}
              title={t("emptyTitle")}
              description={canManage ? t("emptyDescription") : t("emptyDescriptionReadOnly")}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {members.map((member) => {
              const name = getCamporeeStaffDisplayName(member);
              return (
                <li
                  key={member.camporee_staff_member_id}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/40"
                >
                  <UserAvatar
                    src={member.user?.user_image}
                    name={name}
                    email={member.user?.email}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tracking-tight">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.role_label || t("noRole")}
                      {member.user?.email ? ` · ${member.user.email}` : ""}
                    </p>
                    {member.notes ? (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                        {member.notes}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge
                    intent="info"
                    size="xs"
                    label={t(`categories.${member.category}`)}
                  />
                  <StatusBadge
                    intent={member.active ? "success" : "neutral"}
                    size="xs"
                    label={t("active")}
                  />
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          disabled={busy}
                          aria-label={`${t("rowActions")}: ${name}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => openEdit(member)}>
                          <Pencil className="size-4" aria-hidden />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setRemoving(member)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                          {t("deactivate")}
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

      {/* Add */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (busy) return;
          setAddOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>{t("addDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-user">{t("userLabel")}</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="staff-user"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-label={t("userLabel")}
                    aria-expanded={pickerOpen}
                    className="h-auto min-h-11 w-full justify-between gap-2 px-3 py-2 text-left font-normal"
                    disabled={busy}
                  >
                    {selectedCandidate ? (
                      <span className="min-w-0 truncate">{selectedCandidate.full_name}</span>
                    ) : (
                      <span className="min-w-0 truncate text-muted-foreground">
                        {t("userPlaceholder")}
                      </span>
                    )}
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
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
                      <CommandList className="max-h-72">
                        <CommandEmpty>{t("userSearchEmpty")}</CommandEmpty>
                        <CommandGroup>
                          {filteredCandidates.map((candidate) => (
                            <CommandItem
                              key={candidate.user_id}
                              value={candidate.user_id}
                              onSelect={() => {
                                setSelectedUserId(candidate.user_id);
                                setFormError(null);
                                setPickerOpen(false);
                              }}
                              className="min-w-0 gap-2 py-2"
                            >
                              <Check
                                className={cn(
                                  "size-4 shrink-0",
                                  selectedUserId === candidate.user_id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm">
                                  {candidate.full_name}
                                </span>
                                {candidate.email ? (
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {candidate.email}
                                  </span>
                                ) : null}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  ) : null}
                </PopoverContent>
              </Popover>
              {candidates.length > 0 && availableCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noCandidates")}</p>
              ) : null}
            </div>

            {categoryField}
            {detailFields}

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setAddOpen(false);
                resetForm();
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              loading={busy}
              disabled={!selectedUserId}
              onClick={() => void handleAdd()}
            >
              {t("saveAdd")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editing != null}
        onOpenChange={(open) => {
          if (busy) return;
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? getCamporeeStaffDisplayName(editing) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {categoryField}
            {detailFields}
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              {t("cancel")}
            </Button>
            <Button type="button" loading={busy} onClick={() => void handleEdit()}>
              {t("saveEdit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate */}
      <AlertDialog
        open={removing != null}
        onOpenChange={(open) => {
          if (busy) return;
          if (!open) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deactivateTitle", {
                name: removing ? getCamporeeStaffDisplayName(removing) : "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("deactivateDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              loading={busy}
              variant="destructive-solid"
              onClick={(event) => {
                event.preventDefault();
                void handleRemove();
              }}
            >
              {t("deactivateConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
