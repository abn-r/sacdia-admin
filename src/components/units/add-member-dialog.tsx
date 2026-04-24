"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MemberCombobox } from "@/components/units/member-combobox";
import { useTranslations } from "next-intl";
import { addUnitMember } from "@/lib/api/units";
import type { UnitMember } from "@/lib/api/units";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  unitId: number;
  unitName: string;
  /** Already-assigned unit members — used to exclude them from the search list */
  existingMembers?: UnitMember[];
  onSuccess: () => void;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  clubId,
  unitId,
  unitName,
  existingMembers = [],
  onSuccess,
}: AddMemberDialogProps) {
  const t = useTranslations("units_admin");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const excludedIds = existingMembers
    .filter((m) => m.active)
    .map((m) => m.user_id);

  function handleClose(val: boolean) {
    if (!val) {
      setUserId("");
      setError(null);
    }
    onOpenChange(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) {
      setError("Selecciona un miembro para agregar");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await addUnitMember(clubId, unitId, userId);
      toast.success("Miembro agregado correctamente");
      setUserId("");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.add_member_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-muted-foreground" />
            Agregar miembro
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Agrega un miembro a la unidad{" "}
            <span className="font-medium text-foreground">{unitName}</span>.
          </p>

          <div className="space-y-1.5">
            <Label>
              Miembro <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              value={userId}
              onChange={(id) => {
                setUserId(id);
                if (error) setError(null);
              }}
              placeholder="Buscar miembro del club..."
              disabled={isSubmitting}
              excludeUserIds={excludedIds}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !userId}>
              {isSubmitting ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
