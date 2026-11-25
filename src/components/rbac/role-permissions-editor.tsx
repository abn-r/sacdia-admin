"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Segmented } from "@/components/shared/segmented";
import { SettingsSaveBar } from "@/components/shared/settings-rows";
import { EmptyState } from "@/components/shared/empty-state";
import { PermissionPicker } from "@/components/rbac/permission-picker";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { setRolePermissionsAction } from "@/lib/rbac/actions";
import { activePermissionIds } from "@/lib/rbac/copy-role-permissions";
import { countPermissionChanges } from "@/lib/rbac/role-permission-diff";
import { buildRolesHref, type RolesTab } from "@/lib/rbac/roles-view";
import type { PickerSurfaceFilter } from "@/lib/rbac/permission-picker-groups";
import type { Permission, Role } from "@/lib/rbac/types";

interface RolePermissionsEditorProps {
  /** Roles whose permissions can be edited (the protected one is left out). */
  roles: Role[];
  permissions: Permission[];
  roleId: string;
  canWrite: boolean;
  /** Tab that is the default of the page, so links stay short. */
  defaultTab: RolesTab;
}

/**
 * "Por rol": pick a role, tick its permissions, save once. Changes are
 * collected locally; nothing is written until "Guardar".
 */
export function RolePermissionsEditor({
  roles,
  permissions,
  roleId,
  canWrite,
  defaultTab,
}: RolePermissionsEditorProps) {
  const role = roles.find((item) => item.role_id === roleId) ?? roles[0];
  if (!role) return null;
  // Keyed by role: switching role starts from that role's saved permissions.
  return (
    <EditorBody
      key={role.role_id}
      role={role}
      roles={roles}
      permissions={permissions}
      canWrite={canWrite}
      defaultTab={defaultTab}
    />
  );
}

function EditorBody({
  role,
  roles,
  permissions,
  canWrite,
  defaultTab,
}: Omit<RolePermissionsEditorProps, "roleId"> & { role: Role }) {
  const t = useTranslations("admin.roles.byRole");
  const tCategory = useTranslations("admin.roles");
  const tPicker = useTranslations("rbac.permissionPicker");
  const translateRole = useRoleLabel();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [saved, setSaved] = useState<Set<string>>(() => new Set(activePermissionIds(role)));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(activePermissionIds(role)));
  const [search, setSearch] = useState("");
  const [surface, setSurface] = useState<PickerSurfaceFilter>("all");

  const changes = useMemo(() => countPermissionChanges(saved, selected), [saved, selected]);
  const dirty = changes > 0;
  const roleName = translateRole(role.role_name);

  const scopeLabel = (category: string) =>
    category === "CLUB" ? tCategory("scopeClub") : tCategory("scopeGlobal");

  function save() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await setRolePermissionsAction(role.role_id, ids);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSaved(new Set(ids));
      toast.success(t("saved", { role: roleName }));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={role.role_id}
          onValueChange={(value) =>
            router.replace(buildRolesHref("by-role", { role: value }, defaultTab), { scroll: false })
          }
          disabled={dirty || isPending}
        >
          <SelectTrigger aria-label={t("roleLabel")} className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((item) => (
              <SelectItem key={item.role_id} value={item.role_id}>
                {translateRole(item.role_name)} · {scopeLabel(item.role_category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>

        <Segmented<PickerSurfaceFilter>
          label={tPicker("surfaceFilterLabel")}
          value={surface}
          onChange={setSurface}
          options={[
            { value: "all", label: tPicker("surfaceAll") },
            { value: "admin", label: tPicker("surfaceAdmin") },
            { value: "app", label: tPicker("surfaceApp") },
          ]}
        />
      </div>

      {dirty ? <p className="text-muted-foreground text-xs">{t("switchBlocked")}</p> : null}
      {!canWrite ? <p className="text-muted-foreground text-sm">{t("readOnly")}</p> : null}

      {permissions.length === 0 ? (
        <EmptyState icon={Search} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <PermissionPicker
          permissions={permissions}
          selected={selected}
          onChange={setSelected}
          search={search}
          surface={surface}
          hideToolbar
          disabled={!canWrite || isPending}
        />
      )}

      {canWrite ? (
        <SettingsSaveBar
          dirty={dirty}
          pending={isPending}
          onSave={save}
          onCancel={() => setSelected(new Set(saved))}
          cancelLabel={t("discard")}
          message={t("unsaved", { count: changes, role: roleName })}
        />
      ) : null}
    </div>
  );
}
