"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2, UserRoundCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/users/user-avatar";
import {
  addCamporeeStaffMemberAction,
  deleteCamporeeStaffMemberAction,
} from "@/lib/camporee-staff/actions";
import {
  listCamporeeStaff,
  listCamporeeStaffCandidates,
  type CamporeeStaffCandidate,
  type CamporeeStaffCategory,
  type CamporeeStaffMember,
  type CamporeeStaffScope,
} from "@/lib/api/camporee-staff";
import { cn } from "@/lib/utils";

interface CamporeeStaffPanelProps {
  camporeeId: number;
  isUnionCamporee?: boolean;
  staff: CamporeeStaffMember[];
  candidates: CamporeeStaffCandidate[];
  canEdit?: boolean;
}

const CATEGORY_LABELS: Record<CamporeeStaffCategory, string> = {
  judge: "Juez",
  administrative: "Administrativo",
  kitchen: "Cocina",
  support: "Apoyo",
  spiritual: "Espiritual",
  leadership: "Liderazgo",
  other: "Otro",
};

const CATEGORY_ORDER: CamporeeStaffCategory[] = [
  "leadership",
  "administrative",
  "judge",
  "kitchen",
  "spiritual",
  "support",
  "other",
];

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data as T[];
  }
  return [];
}

function getUserName(user: CamporeeStaffCandidate | CamporeeStaffMember["user"]) {
  if (!user) return "Usuario sin nombre";
  return (
    user.full_name ||
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ") ||
    user.email ||
    "Usuario sin nombre"
  );
}

function getCandidateSearchText(candidate: CamporeeStaffCandidate) {
  return [
    candidate.user_id,
    candidate.email,
    getUserName(candidate),
    candidate.local_field?.name,
    candidate.union?.name,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function getScope(isUnionCamporee: boolean): CamporeeStaffScope {
  return isUnionCamporee ? "union" : "local";
}

function StaffCandidateOption({ candidate }: { candidate: CamporeeStaffCandidate }) {
  const name = getUserName(candidate);
  return (
    <div className="flex min-w-0 items-center gap-3 overflow-hidden">
      <UserAvatar src={candidate.user_image} name={name} email={candidate.email} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {candidate.email ?? "Sin correo"}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {candidate.local_field?.name ?? candidate.union?.name ?? "Sin territorio"}
        </p>
      </div>
    </div>
  );
}

export function CamporeeStaffPanel({
  camporeeId,
  isUnionCamporee = false,
  staff: initialStaff,
  candidates: initialCandidates,
  canEdit = false,
}: CamporeeStaffPanelProps) {
  const [staff, setStaff] = useState(initialStaff);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CamporeeStaffCategory>("support");
  const [roleLabel, setRoleLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const scope = getScope(isUnionCamporee);
  const activeStaffUserIds = useMemo(
    () => new Set(staff.filter((member) => member.active).map((member) => member.user_id)),
    [staff],
  );

  const availableCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          !candidate.already_staff_member_id &&
          !activeStaffUserIds.has(candidate.user_id),
      ),
    [activeStaffUserIds, candidates],
  );

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return availableCandidates.slice(0, 25);
    return availableCandidates
      .filter((candidate) => getCandidateSearchText(candidate).includes(normalizedSearch))
      .slice(0, 25);
  }, [availableCandidates, search]);

  const selectedCandidate = useMemo(
    () => availableCandidates.find((candidate) => candidate.user_id === selectedUserId) ?? null,
    [availableCandidates, selectedUserId],
  );

  const staffByCategory = useMemo(() => {
    const grouped = new Map<CamporeeStaffCategory, CamporeeStaffMember[]>();
    for (const category of CATEGORY_ORDER) grouped.set(category, []);
    for (const member of staff.filter((item) => item.active)) {
      grouped.set(member.category, [...(grouped.get(member.category) ?? []), member]);
    }
    return grouped;
  }, [staff]);

  async function refreshStaff() {
    const [staffPayload, candidatesPayload] = await Promise.all([
      listCamporeeStaff(scope, camporeeId),
      listCamporeeStaffCandidates(scope, camporeeId),
    ]);
    setStaff(extractList<CamporeeStaffMember>(staffPayload));
    setCandidates(extractList<CamporeeStaffCandidate>(candidatesPayload));
  }

  function handleAddStaff() {
    if (!selectedUserId || pending) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("camporee_id", String(camporeeId));
      formData.set("is_union", String(isUnionCamporee));
      formData.set("user_id", selectedUserId);
      formData.set("category", selectedCategory);
      formData.set("role_label", roleLabel);
      formData.set("notes", notes);

      const result = await addCamporeeStaffMemberAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success ?? "Personal agregado.");
      setSelectedUserId("");
      setRoleLabel("");
      setNotes("");
      await refreshStaff();
    });
  }

  function handleDeactivate(member: CamporeeStaffMember) {
    if (pending) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("camporee_id", String(camporeeId));
      formData.set("is_union", String(isUnionCamporee));
      formData.set("staff_member_id", member.camporee_staff_member_id);

      const result = await deleteCamporeeStaffMemberAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success ?? "Personal desactivado.");
      await refreshStaff();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{staff.length}</span>{" "}
            {staff.length === 1 ? "persona asignada" : "personas asignadas"}
          </p>
          <p className="text-xs text-muted-foreground">
            Este roster es la base para asignar responsables y apoyos a cada actividad.
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[minmax(0,1.5fr)_220px_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label>Persona</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-label="Persona del camporee"
                  aria-expanded={open}
                  className="h-auto min-h-10 w-full justify-between gap-2 overflow-hidden px-3 py-2 text-left font-normal"
                  disabled={availableCandidates.length === 0}
                >
                  {selectedCandidate ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                      <UserAvatar
                        src={selectedCandidate.user_image}
                        name={getUserName(selectedCandidate)}
                        email={selectedCandidate.email}
                        size={28}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {getUserName(selectedCandidate)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {selectedCandidate.email ?? "Sin correo"}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="min-w-0 truncate text-muted-foreground">
                      Seleccionar persona del territorio
                    </span>
                  )}
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Buscar por nombre, correo o territorio..."
                  />
                  <CommandList className="max-h-80">
                    <CommandEmpty>No encontramos personas disponibles.</CommandEmpty>
                    <CommandGroup>
                      {filteredCandidates.map((candidate) => (
                        <CommandItem
                          key={candidate.user_id}
                          value={candidate.user_id}
                          onSelect={() => {
                            setSelectedUserId(candidate.user_id);
                            setOpen(false);
                          }}
                          className="min-w-0 items-start gap-2 py-2"
                        >
                          <Check
                            className={cn(
                              "mt-2 size-4 shrink-0",
                              selectedUserId === candidate.user_id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <StaffCandidateOption candidate={candidate} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as CamporeeStaffCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map((category) => (
                  <SelectItem key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-role-label">Rol/cargo opcional</Label>
            <Input
              id="staff-role-label"
              value={roleLabel}
              onChange={(event) => setRoleLabel(event.target.value)}
              maxLength={100}
              placeholder="Ej. Cocina turno tarde"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-notes">Notas</Label>
            <Textarea
              id="staff-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={1}
              placeholder="Opcional"
            />
          </div>

          <Button
            type="button"
            className="self-end"
            disabled={!selectedUserId || pending}
            onClick={handleAddStaff}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <UserRoundCheck className="size-4" />}
            Agregar
          </Button>
        </div>
      )}

      {staff.length === 0 ? (
        <EmptyState
          icon={UserRoundCheck}
          title="Aún no hay personal asignado al camporee"
          description="Agregá primero el roster operativo; después vas a poder asignarlo a actividades específicas."
        />
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.map((category) => {
            const members = staffByCategory.get(category) ?? [];
            if (members.length === 0) return null;

            return (
              <section key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{CATEGORY_LABELS[category]}</h3>
                  <Badge variant="secondary">{members.length}</Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {members.map((member) => {
                    const name = getUserName(member.user);
                    return (
                      <div
                        key={member.camporee_staff_member_id}
                        className="flex items-start justify-between gap-3 rounded-xl border p-3"
                      >
                        <div className="flex min-w-0 gap-3">
                          <UserAvatar
                            src={member.user?.user_image}
                            name={name}
                            email={member.user?.email}
                            size={36}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.role_label ?? CATEGORY_LABELS[member.category]}
                            </p>
                            {member.notes && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {member.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 text-destructive hover:text-destructive"
                            disabled={pending}
                            onClick={() => handleDeactivate(member)}
                            aria-label={`Desactivar ${name}`}
                          >
                            <UserRoundX className="size-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
