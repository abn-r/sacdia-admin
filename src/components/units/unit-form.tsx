"use client";

import { useActionState, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberCombobox } from "@/components/units/member-combobox";
import type { UnitActionState } from "@/lib/units/actions";
import type { Unit } from "@/lib/api/units";
import type { ClubSectionMember } from "@/lib/api/clubs";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLUB_TYPES = [
  { value: 1, label: "Aventureros" },
  { value: 2, label: "Conquistadores" },
  { value: 3, label: "Guias Mayores" },
];

// ─── Submit button ────────────────────────────────────────────────────────────

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {pending
        ? mode === "create"
          ? "Creando..."
          : "Guardando..."
        : mode === "create"
          ? "Crear unidad"
          : "Guardar cambios"}
    </Button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnitFormProps {
  mode: "create" | "edit";
  clubId: number;
  initialData?: Unit | null;
  formAction: (
    prev: UnitActionState,
    formData: FormData,
  ) => Promise<UnitActionState>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const initialState: UnitActionState = {};

export function UnitForm({ mode, clubId, initialData, formAction }: UnitFormProps) {
  const [state, action] = useActionState(formAction, initialState);

  const defaultClubType = initialData?.club_type_id ?? 2;

  // Controlled state for the 4 leader comboboxes
  const [captainId, setCaptainId] = useState(initialData?.captain_id ?? "");
  const [secretaryId, setSecretaryId] = useState(initialData?.secretary_id ?? "");
  const [advisorId, setAdvisorId] = useState(initialData?.advisor_id ?? "");
  const [substituteAdvisorId, setSubstituteAdvisorId] = useState(
    initialData?.substitute_advisor_id ?? "",
  );

  // Shared member list — fetched once, reused across the 4 comboboxes
  const [sharedMembers, setSharedMembers] = useState<ClubSectionMember[] | undefined>(undefined);
  const handleMembersLoaded = useCallback((members: ClubSectionMember[]) => {
    setSharedMembers(members);
  }, []);

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* ── Datos generales ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la unidad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Nombre */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialData?.name ?? ""}
              placeholder="Ej. Unidad Aguilas"
              required
            />
          </div>

          {/* Tipo de club */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="club_type_id">
              Tipo de club <span className="text-destructive">*</span>
            </Label>
            <select
              id="club_type_id"
              name="club_type_id"
              defaultValue={defaultClubType}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CLUB_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── Lideres de la unidad ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lideres de la unidad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Los campos marcados con{" "}
            <span className="text-destructive">*</span> son obligatorios.
          </p>

          {/* Capitan */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              Capitan <span className="text-destructive">*</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              value={captainId}
              onChange={setCaptainId}
              placeholder="Seleccionar capitan..."
              excludeUserIds={[secretaryId, advisorId, substituteAdvisorId].filter(Boolean)}
              members={sharedMembers}
              onMembersLoaded={handleMembersLoaded}
            />
            {/* Hidden input carries the value into FormData */}
            <input type="hidden" name="captain_id" value={captainId} />
          </div>

          {/* Secretario */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              Secretario <span className="text-destructive">*</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              value={secretaryId}
              onChange={setSecretaryId}
              placeholder="Seleccionar secretario..."
              excludeUserIds={[captainId, advisorId, substituteAdvisorId].filter(Boolean)}
              members={sharedMembers}
              onMembersLoaded={handleMembersLoaded}
            />
            <input type="hidden" name="secretary_id" value={secretaryId} />
          </div>

          {/* Consejero */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              Consejero <span className="text-destructive">*</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              value={advisorId}
              onChange={setAdvisorId}
              placeholder="Seleccionar consejero..."
              excludeUserIds={[captainId, secretaryId, substituteAdvisorId].filter(Boolean)}
              members={sharedMembers}
              onMembersLoaded={handleMembersLoaded}
            />
            <input type="hidden" name="advisor_id" value={advisorId} />
          </div>

          {/* Consejero suplente */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              Consejero suplente{" "}
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              value={substituteAdvisorId}
              onChange={setSubstituteAdvisorId}
              placeholder="Seleccionar consejero suplente (opcional)..."
              excludeUserIds={[captainId, secretaryId, advisorId].filter(Boolean)}
              members={sharedMembers}
              onMembersLoaded={handleMembersLoaded}
            />
            <input type="hidden" name="substitute_advisor_id" value={substituteAdvisorId} />
          </div>
        </CardContent>
      </Card>

      {/* ── Acciones ── */}
      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
