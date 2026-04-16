"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequestFromClient } from "@/lib/api/client";
import {
  updateAdminUserApprovalFromClient,
  type UpdateAdminUserPayload,
} from "@/lib/api/admin-users";
import {
  normalizeApprovalStatus,
  type ApprovalStatus,
} from "@/lib/admin-users/approval-status";

interface UserAccessTogglesProps {
  userId: string;
  initialAccessApp: boolean | undefined;
  initialAccessPanel: boolean | undefined;
  initialActive: boolean | undefined;
  initialApprovalStatus: ApprovalStatus | null;
}

async function patchUser(userId: string, payload: UpdateAdminUserPayload): Promise<void> {
  await apiRequestFromClient<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function UserAccessToggles({
  userId,
  initialAccessApp,
  initialAccessPanel,
  initialActive,
  initialApprovalStatus,
}: UserAccessTogglesProps) {
  const [accessApp, setAccessApp] = useState(initialAccessApp ?? false);
  const [accessPanel, setAccessPanel] = useState(initialAccessPanel ?? false);
  const [active, setActive] = useState(initialActive ?? true);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(
    initialApprovalStatus,
  );

  const [pendingField, setPendingField] = useState<
    "access_app" | "access_panel" | "active" | "approval_status" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(
    field: "access_app" | "access_panel" | "active",
    currentValue: boolean,
    setter: (v: boolean) => void,
  ) {
    const nextValue = !currentValue;
    setter(nextValue);
    setPendingField(field);

    const patch: UpdateAdminUserPayload = {};
    patch[field] = nextValue;

    startTransition(async () => {
      try {
        await patchUser(userId, patch);
        toast.success("Acceso actualizado correctamente.");
      } catch {
        setter(currentValue);
        toast.error("No se pudo actualizar el acceso. Intenta de nuevo.");
      } finally {
        setPendingField(null);
      }
    });
  }

  function handleApprovalChange(value: string) {
    const next = value as ApprovalStatus;
    const previous = approvalStatus;
    setApprovalStatus(next);
    setPendingField("approval_status");

    startTransition(async () => {
      try {
        // Use dedicated PATCH /admin/users/:userId/approval endpoint.
        // Falls back to generic PATCH on 404/405/422 automatically.
        const decision = next === "approved" ? "approve" : next === "rejected" ? "reject" : null;
        if (decision) {
          await updateAdminUserApprovalFromClient({ userId, decision });
        } else {
          // "pending" state — reset via generic PATCH since dedicated endpoint only handles approve/reject
          await apiRequestFromClient<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
            method: "PATCH",
            body: { approval: 0, approval_status: "pending", approved: false },
          });
        }
        toast.success("Estado de aprobación actualizado.");
      } catch {
        setApprovalStatus(previous);
        toast.error("No se pudo actualizar la aprobación. Intenta de nuevo.");
      } finally {
        setPendingField(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accesos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="toggle-access-app" className="text-sm text-muted-foreground">
            Acceso a App
          </Label>
          <div className="flex items-center gap-2">
            {isPending && pendingField === "access_app" && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="toggle-access-app"
              checked={accessApp}
              disabled={isPending}
              onCheckedChange={() =>
                handleToggle("access_app", accessApp, setAccessApp)
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="toggle-access-panel" className="text-sm text-muted-foreground">
            Acceso a Panel
          </Label>
          <div className="flex items-center gap-2">
            {isPending && pendingField === "access_panel" && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="toggle-access-panel"
              checked={accessPanel}
              disabled={isPending}
              onCheckedChange={() =>
                handleToggle("access_panel", accessPanel, setAccessPanel)
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="toggle-active" className="text-sm text-muted-foreground">
            Activo
          </Label>
          <div className="flex items-center gap-2">
            {isPending && pendingField === "active" && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="toggle-active"
              checked={active}
              disabled={isPending}
              onCheckedChange={() =>
                handleToggle("active", active, setActive)
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label className="text-sm text-muted-foreground">Aprobación</Label>
          <div className="flex items-center gap-2">
            {isPending && pendingField === "approval_status" && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Select
              value={approvalStatus ?? ""}
              onValueChange={handleApprovalChange}
              disabled={isPending}
            >
              <SelectTrigger size="sm" className="w-[130px]">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { normalizeApprovalStatus } from "@/lib/admin-users/approval-status";
