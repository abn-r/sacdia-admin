"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { copyRolePermissionsAction } from "@/lib/rbac/actions";
import {
  activePermissionIds,
  isProtectedRole,
  validateCopyRolePermissions,
} from "@/lib/rbac/copy-role-permissions";
import type { Role } from "@/lib/rbac/types";

interface CopyRolePermissionsDialogProps {
  roles: Role[];
}

export function CopyRolePermissionsDialog({
  roles,
}: CopyRolePermissionsDialogProps) {
  const t = useTranslations("rbac.copyPermissions");
  const tCategory = useTranslations("rbac.pages.matrix");
  const translateRole = useRoleLabel();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sourceRoleId, setSourceRoleId] = useState("");
  const [targetRoleId, setTargetRoleId] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectableRoles = useMemo(
    () => roles.filter((role) => !isProtectedRole(role)),
    [roles],
  );

  const source = selectableRoles.find((role) => role.role_id === sourceRoleId);
  const target = selectableRoles.find((role) => role.role_id === targetRoleId);
  const issue = validateCopyRolePermissions(
    source ?? null,
    target ?? null,
  );
  const permissionCount = activePermissionIds(source);
  const categoryMismatch =
    Boolean(source && target) &&
    source?.role_category !== target?.role_category;
  const canSubmit = Boolean(source && target) && issue === null && !isPending;

  function reset() {
    setSourceRoleId("");
    setTargetRoleId("");
  }

  function handleCopy() {
    if (!source || !target || issue) {
      return;
    }

    startTransition(async () => {
      const result = await copyRolePermissionsAction(
        source.role_id,
        target.role_id,
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.success ??
          t("successToast", {
            source: translateRole(source.role_name),
            target: translateRole(target.role_name),
          }),
      );
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  function categoryLabel(category: string) {
    return category === "CLUB" ? tCategory("categoryClub") : tCategory("categoryGlobal");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Copy className="size-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="copy-source-role">{t("sourceLabel")}</Label>
            <Select
              value={sourceRoleId || undefined}
              onValueChange={(value) => {
                setSourceRoleId(value);
                if (value === targetRoleId) {
                  setTargetRoleId("");
                }
              }}
              disabled={isPending}
            >
              <SelectTrigger id="copy-source-role" className="w-full">
                <SelectValue placeholder={t("sourcePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {selectableRoles.map((role) => (
                  <SelectItem key={role.role_id} value={role.role_id}>
                    {translateRole(role.role_name)} ({role.role_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="copy-target-role">{t("targetLabel")}</Label>
            <Select
              value={targetRoleId || undefined}
              onValueChange={setTargetRoleId}
              disabled={isPending}
            >
              <SelectTrigger id="copy-target-role" className="w-full">
                <SelectValue placeholder={t("targetPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {selectableRoles
                  .filter((role) => role.role_id !== sourceRoleId)
                  .map((role) => (
                    <SelectItem key={role.role_id} value={role.role_id}>
                      {translateRole(role.role_name)} ({role.role_name})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {source && target && issue === null ? (
            <Alert>
              <AlertDescription>
                {permissionCount.length === 0
                  ? t("previewEmpty", {
                      source: translateRole(source.role_name),
                      target: translateRole(target.role_name),
                    })
                  : t("preview", {
                      count: permissionCount.length,
                      source: translateRole(source.role_name),
                      target: translateRole(target.role_name),
                    })}
              </AlertDescription>
            </Alert>
          ) : null}

          {categoryMismatch && source && target ? (
            <Alert>
              <AlertDescription>
                {t("categoryMismatch", {
                  sourceCategory: categoryLabel(source.role_category),
                  targetCategory: categoryLabel(target.role_category),
                })}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleCopy} disabled={!canSubmit}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? t("copying") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
