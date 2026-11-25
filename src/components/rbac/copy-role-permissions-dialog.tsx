"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  isProtectedRole,
  validateCopyRolePermissions,
} from "@/lib/rbac/copy-role-permissions";
import { diffRolePermissions, isEmptyDiff } from "@/lib/rbac/role-permission-diff";
import type { Role } from "@/lib/rbac/types";

export function CopyRolePermissionsDialog({ roles }: { roles: Role[] }) {
  const t = useTranslations("admin.roles.copy");
  const tCopy = useTranslations("rbac.copyPermissions");
  const tScope = useTranslations("admin.roles");
  const translateRole = useRoleLabel();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sourceRoleId, setSourceRoleId] = useState("");
  const [targetRoleId, setTargetRoleId] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectableRoles = useMemo(() => roles.filter((role) => !isProtectedRole(role)), [roles]);
  const source = selectableRoles.find((role) => role.role_id === sourceRoleId);
  const target = selectableRoles.find((role) => role.role_id === targetRoleId);
  const issue = validateCopyRolePermissions(source ?? null, target ?? null);
  const ready = Boolean(source && target) && issue === null;
  const diff = useMemo(
    () => (ready ? diffRolePermissions(source, target) : null),
    [ready, source, target],
  );
  const categoryMismatch = ready && source?.role_category !== target?.role_category;

  function reset() {
    setSourceRoleId("");
    setTargetRoleId("");
  }

  function optionLabel(role: Role) {
    const name = translateRole(role.role_name);
    return role.active === false ? `${name} · ${t("inactiveSuffix")}` : name;
  }

  function handleCopy() {
    if (!source || !target || issue) return;
    startTransition(async () => {
      const result = await copyRolePermissionsAction(source.role_id, target.role_id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.success ??
          tCopy("successToast", {
            source: translateRole(source.role_name),
            target: translateRole(target.role_name),
          }),
      );
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const scopeOf = (role: Role) =>
    role.role_category === "CLUB" ? tScope("scopeClub") : tScope("scopeGlobal");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
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
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="copy-source-role">{t("from")}</Label>
              <Select
                value={sourceRoleId || undefined}
                onValueChange={(value) => {
                  setSourceRoleId(value);
                  if (value === targetRoleId) setTargetRoleId("");
                }}
                disabled={isPending}
              >
                <SelectTrigger id="copy-source-role" className="w-full">
                  <SelectValue placeholder={t("placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {selectableRoles.map((role) => (
                    <SelectItem key={role.role_id} value={role.role_id}>
                      {optionLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copy-target-role">{t("to")}</Label>
              <Select
                value={targetRoleId || undefined}
                onValueChange={setTargetRoleId}
                disabled={isPending}
              >
                <SelectTrigger id="copy-target-role" className="w-full">
                  <SelectValue placeholder={t("placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {selectableRoles
                    .filter((role) => role.role_id !== sourceRoleId)
                    .map((role) => (
                      <SelectItem key={role.role_id} value={role.role_id}>
                        {optionLabel(role)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {diff && source && target ? (
            <div className="rounded-lg bg-muted p-3 text-sm" role="status">
              {isEmptyDiff(diff) ? (
                <p className="font-medium text-foreground">
                  {t("noChange", { target: translateRole(target.role_name) })}
                </p>
              ) : (
                <>
                  <p className="font-medium text-foreground">
                    {t("summaryTitle", {
                      target: translateRole(target.role_name),
                      before: diff.before,
                      after: diff.after,
                    })}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {t("summaryDetail", {
                      gained: diff.gained,
                      gainedDestructive: diff.gainedDestructive,
                      lost: diff.lost,
                      lostDestructive: diff.lostDestructive,
                    })}
                  </p>
                </>
              )}
            </div>
          ) : null}

          {categoryMismatch && source && target ? (
            <p className="text-muted-foreground text-sm">
              {tCopy("categoryMismatch", {
                sourceCategory: scopeOf(source),
                targetCategory: scopeOf(target),
              })}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive-solid"
            loading={isPending}
            onClick={handleCopy}
            disabled={!ready || isPending || (diff !== null && isEmptyDiff(diff))}
          >
            {isPending ? t("replacing") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
