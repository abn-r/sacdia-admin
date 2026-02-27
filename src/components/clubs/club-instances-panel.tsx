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
import { createClubInstanceAction, type ClubActionState } from "@/lib/clubs/actions";

type Instance = {
  instance_id?: number;
  instance_type?: string;
  club_type_id?: number;
  club_type?: { name?: string } | null;
  type?: string;
  name?: string;
  active?: boolean;
  soul_goal?: number | null;
  membership_fee?: number | null;
  members_count?: number;
};

const INSTANCE_TYPE_LABELS: Record<string, string> = {
  adventurers: "Aventureros",
  pathfinders: "Conquistadores",
  master_guilds: "Guías Mayores",
};

const DAYS_OF_WEEK = [
  { value: "Monday", label: "Lunes" },
  { value: "Tuesday", label: "Martes" },
  { value: "Wednesday", label: "Miércoles" },
  { value: "Thursday", label: "Jueves" },
  { value: "Friday", label: "Viernes" },
  { value: "Saturday", label: "Sábado" },
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

function CreateInstanceForm({
  clubId,
  instanceType,
  onSuccess,
}: {
  clubId: number;
  instanceType: string;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const boundAction = createClubInstanceAction.bind(null, clubId);
  const [state, action] = useActionState(boundAction, {} as ClubActionState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess();
    }
  }, [state.success]);

  return (
    <form action={action} className="mt-4 space-y-4 border-t pt-4">
      <input type="hidden" name="instance_type" value={instanceType} />

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`souls_${instanceType}`}>Meta de almas</Label>
          <Input id={`souls_${instanceType}`} name="souls_target" type="number" min="0" defaultValue="0" />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`fee_${instanceType}`}>Cuota de membresía</Label>
          <Input id={`fee_${instanceType}`} name="fee" type="number" min="0" step="0.01" defaultValue="0" />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`day_${instanceType}`}>Día de reunión</Label>
          <Select name="meeting_day">
            <SelectTrigger id={`day_${instanceType}`}>
              <SelectValue placeholder="Seleccionar día" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`time_${instanceType}`}>Hora de reunión</Label>
          <Input
            id={`time_${instanceType}`}
            name="meeting_time"
            type="time"
            defaultValue="09:00"
            step="60"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton label="Crear instancia" />
      </div>
    </form>
  );
}

interface ClubInstancesPanelProps {
  clubId: number;
  instances: Instance[];
}

export function ClubInstancesPanel({ clubId, instances }: ClubInstancesPanelProps) {
  const allTypes = ["adventurers", "pathfinders", "master_guilds"] as const;
  const [openForms, setOpenForms] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const existingByType = new Map(
    instances.map((inst) => [inst.instance_type ?? inst.type, inst]),
  );

  const toggleForm = (type: string) => {
    setOpenForms((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="space-y-4" key={refreshKey}>
      <p className="text-sm text-muted-foreground">
        Un club puede tener hasta 3 instancias: Aventureros, Conquistadores y Guías Mayores.
      </p>

      {allTypes.map((type) => {
        const instance = existingByType.get(type);
        const label = INSTANCE_TYPE_LABELS[type] ?? type;
        const isOpen = openForms.has(type);

        if (!instance) {
          return (
            <Card key={type} className="border-dashed">
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
                    onClick={() => toggleForm(type)}
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
                  <CreateInstanceForm
                    clubId={clubId}
                    instanceType={type}
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
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                {instance.active !== false ? (
                  <CheckCircle className="size-5 text-green-600" />
                ) : (
                  <XCircle className="size-5 text-muted-foreground" />
                )}
                <CardTitle className="text-base">
                  {instance.name ?? instance.club_type?.name ?? label}
                </CardTitle>
              </div>
              <Badge variant={instance.active !== false ? "default" : "outline"}>
                {instance.active !== false ? "Activa" : "Inactiva"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Tipo" value={label} />
              <InfoRow label="ID instancia" value={instance.instance_id} />
              {instance.soul_goal != null && (
                <InfoRow label="Meta de almas" value={instance.soul_goal} />
              )}
              {instance.membership_fee != null && (
                <InfoRow label="Cuota de membresía" value={`$${instance.membership_fee}`} />
              )}
              {instance.members_count != null && (
                <InfoRow
                  label="Miembros"
                  value={
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {instance.members_count}
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
