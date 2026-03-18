"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Plus, Users, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClubSectionAction, type ClubActionState } from "@/lib/clubs/actions";

type Section = {
  club_section_id?: number;
  club_type_id?: number;
  club_type?: { name?: string } | null;
  name?: string;
  active?: boolean;
  souls_target?: number | null;
  fee?: number | null;
  members_count?: number;
};

const SECTION_TYPE_LABELS: Record<string, string> = {
  adventurers: "Aventureros",
  pathfinders: "Conquistadores",
  master_guilds: "Guias Mayores",
};

const DAYS_OF_WEEK = [
  { value: "Monday", label: "Lunes" },
  { value: "Tuesday", label: "Martes" },
  { value: "Wednesday", label: "Miercoles" },
  { value: "Thursday", label: "Jueves" },
  { value: "Friday", label: "Viernes" },
  { value: "Saturday", label: "Sabado" },
  { value: "Sunday", label: "Domingo" },
];


function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[140px] text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
      {label}
    </Button>
  );
}

function CreateSectionForm({
  clubId,
  clubTypeId,
  onSuccess,
}: {
  clubId: number;
  clubTypeId: number;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const boundAction = createClubSectionAction.bind(null, clubId);
  const [state, action] = useActionState(boundAction, {} as ClubActionState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess();
    }
  }, [state.success]);

  return (
    <form action={action} className="mt-4 space-y-4 border-t pt-4">
      <input type="hidden" name="club_type_id" value={clubTypeId} />

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`souls_${clubTypeId}`}>Meta de almas</Label>
          <Input id={`souls_${clubTypeId}`} name="souls_target" type="number" min="0" defaultValue="0" />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`fee_${clubTypeId}`}>Cuota de membresia</Label>
          <Input id={`fee_${clubTypeId}`} name="fee" type="number" min="0" step="0.01" defaultValue="0" />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`day_${clubTypeId}`}>Dia de reunion</Label>
          <Select name="meeting_day">
            <SelectTrigger id={`day_${clubTypeId}`}>
              <SelectValue placeholder="Seleccionar dia" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`time_${clubTypeId}`}>Hora de reunion</Label>
          <Input
            id={`time_${clubTypeId}`}
            name="meeting_time"
            type="time"
            defaultValue="09:00"
            step="60"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton label="Crear seccion" />
      </div>
    </form>
  );
}

interface ClubSectionsPanelProps {
  clubId: number;
  sections: Section[];
  clubTypes?: Array<{ club_type_id: number; name: string }>;
}

export function ClubSectionsPanel({ clubId, sections, clubTypes }: ClubSectionsPanelProps) {
  const [openForms, setOpenForms] = useState<Set<number>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const existingByTypeId = new Map(
    sections.map((s) => [s.club_type_id, s]),
  );

  const toggleForm = (typeId: number) => {
    setOpenForms((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  // If clubTypes are provided, iterate over them; otherwise show existing sections only
  const typesToRender = clubTypes ?? sections.map((s) => ({
    club_type_id: s.club_type_id ?? 0,
    name: s.club_type?.name ?? s.name ?? `Seccion ${s.club_section_id}`,
  }));

  return (
    <div className="space-y-4" key={refreshKey}>
      <p className="text-sm text-muted-foreground">
        Un club puede tener secciones para cada tipo de club (Aventureros, Conquistadores, Guias Mayores).
      </p>

      {typesToRender.map((clubType) => {
        const section = existingByTypeId.get(clubType.club_type_id);
        const label = clubType.name;
        const isOpen = openForms.has(clubType.club_type_id);

        if (!section) {
          return (
            <Card key={clubType.club_type_id} className="border-dashed">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <XCircle className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">Sin crear</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleForm(clubType.club_type_id)}
                    type="button"
                  >
                    {isOpen ? (
                      <><ChevronUp className="mr-2 size-4" />Cancelar</>
                    ) : (
                      <><Plus className="mr-2 size-4" />Agregar</>
                    )}
                  </Button>
                </div>

                {isOpen && (
                  <CreateSectionForm
                    clubId={clubId}
                    clubTypeId={clubType.club_type_id}
                    onSuccess={() => {
                      setOpenForms(new Set());
                      setRefreshKey((k) => k + 1);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={clubType.club_type_id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                {section.active !== false ? (
                  <CheckCircle className="size-5 text-green-600" />
                ) : (
                  <XCircle className="size-5 text-muted-foreground" />
                )}
                <CardTitle className="text-base">
                  {section.name ?? section.club_type?.name ?? label}
                </CardTitle>
              </div>
              <Badge variant={section.active !== false ? "default" : "outline"}>
                {section.active !== false ? "Activa" : "Inactiva"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Tipo" value={label} />
              <InfoRow label="ID seccion" value={section.club_section_id} />
              {section.souls_target != null && (
                <InfoRow label="Meta de almas" value={section.souls_target} />
              )}
              {section.fee != null && (
                <InfoRow label="Cuota" value={`$${section.fee}`} />
              )}
              {section.members_count != null && (
                <InfoRow
                  label="Miembros"
                  value={
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {section.members_count}
                    </span>
                  }
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
