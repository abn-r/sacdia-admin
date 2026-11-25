import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { UrlTabs, type UrlTabItem } from "@/components/shared/url-tabs";
import { CopyRolePermissionsDialog } from "@/components/rbac/copy-role-permissions-dialog";
import { PermissionsTable } from "@/components/rbac/permissions-table";
import { RolePermissionsEditor } from "@/components/rbac/role-permissions-editor";
import { RolesTable } from "@/components/rbac/roles-table";
import { UserPermissionsSearch } from "@/components/rbac/user-permissions-search";
import { errorStateFromError } from "@/lib/api/error-state";
import { ROLES_READ } from "@/lib/auth/permissions";
import { canCapability, canViewScreen, evaluateAccess, subjectFromUser } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { paginateInMemory, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { listPermissions, listRoles } from "@/lib/rbac/service";
import {
  createPermissionAction,
  deletePermissionAction,
  updatePermissionAction,
} from "@/lib/rbac/actions";
import { isProtectedRole } from "@/lib/rbac/copy-role-permissions";
import { buildRolesHref, resolveRolesTab, type RolesTab } from "@/lib/rbac/roles-view";
import type { Role } from "@/lib/rbac/types";

export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.roles");
  return { title: t("title") };
}

function LoadError({ error }: { error: unknown }) {
  const { kind, detail } = errorStateFromError(error);
  return <ErrorState kind={kind} {...(detail ? { detail } : {})} retry />;
}

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    console.error("[RolesPage] load failed:", error);
    return { ok: false, error };
  }
}

export default async function ConfigurationRolesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const user = await requireAdminUser();
  const params: SearchParams = searchParams ? await searchParams : {};

  // Each tab answers to its own permission; a missing one hides the tab.
  const subject = subjectFromUser(user);
  const canRoles = evaluateAccess(subject, { permissions: [ROLES_READ] });
  const canByRole = canViewScreen(user, "admin-system-matrix");
  const canCatalog = canViewScreen(user, "admin-system-permissions");
  const canDirect = canCatalog && canCapability(user, "admin-system-permissions", "user_grants");

  const visible: RolesTab[] = [
    ...(canRoles ? (["roles"] as const) : []),
    ...(canByRole ? (["by-role"] as const) : []),
    ...(canCatalog ? (["catalog"] as const) : []),
    ...(canDirect ? (["direct"] as const) : []),
  ];
  const tab = resolveRolesTab(params.tab, visible);
  if (!tab) return <PageAccessForbidden />;
  const defaultTab = visible[0] ?? "roles";

  const t = await getTranslations("admin.roles");
  const isSuperAdmin = canCapability(user, "admin-system-roles", "manage");

  // The list feeds the count of the first tab and both role tabs.
  const needsRoles = canRoles || tab === "by-role";
  const rolesResult: Settled<Role[]> | null = needsRoles ? await settle(listRoles("all")) : null;
  const roles = rolesResult?.ok ? rolesResult.value : [];

  const tabLabels: Record<RolesTab, string> = {
    roles: t("tabs.roles"),
    "by-role": t("tabs.byRole"),
    catalog: t("tabs.catalog"),
    direct: t("tabs.direct"),
  };
  const tabs: UrlTabItem[] = visible.map((value) => ({
    value,
    label: tabLabels[value],
    href: buildRolesHref(value, {}, defaultTab),
    ...(value === "roles" && rolesResult?.ok ? { count: roles.length } : {}),
  }));

  let content: React.ReactNode;
  let actions: React.ReactNode;

  if (tab === "roles") {
    if (!rolesResult?.ok) {
      content = <LoadError error={rolesResult?.error} />;
    } else if (roles.length === 0) {
      content = (
        <EmptyState icon={ShieldCheck} title={t("emptyTitle")} description={t("emptyDescription")}>
          {isSuperAdmin ? <NewRoleButton label={t("newRole")} /> : null}
        </EmptyState>
      );
    } else {
      content = <RolesTable roles={roles} isSuperAdmin={isSuperAdmin} />;
    }
    if (isSuperAdmin) {
      actions = (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {rolesResult?.ok && roles.length > 0 ? <CopyRolePermissionsDialog roles={roles} /> : null}
          <NewRoleButton label={t("newRole")} />
        </div>
      );
    }
  } else if (tab === "by-role") {
    const permsResult = await settle(listPermissions());
    if (!rolesResult?.ok) {
      content = <LoadError error={rolesResult?.error} />;
    } else if (!permsResult.ok) {
      content = <LoadError error={permsResult.error} />;
    } else {
      const editable = roles
        .filter((role) => !isProtectedRole(role))
        .sort((a, b) => a.role_name.localeCompare(b.role_name));
      const requested = typeof params.role === "string" ? params.role : "";
      content =
        editable.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <RolePermissionsEditor
            roles={editable}
            permissions={permsResult.value}
            roleId={requested}
            canWrite={canCapability(user, "admin-system-matrix", "write")}
            defaultTab={defaultTab}
          />
        );
    }
  } else if (tab === "catalog") {
    const permsResult = await settle(listPermissions());
    if (!permsResult.ok) {
      content = <LoadError error={permsResult.error} />;
    } else {
      const canWrite = canCapability(user, "admin-system-permissions", "manage");
      // The permissions endpoint returns the whole catalog: page it here.
      const page = readPositiveNumberParam(params, "page") ?? 1;
      const limit = readPositiveNumberParam(params, "limit") ?? 20;
      const { items, meta } = paginateInMemory(permsResult.value, page, limit);
      content = (
        <PermissionsTable
          items={items}
          createAction={createPermissionAction}
          updateAction={updatePermissionAction}
          deleteAction={deletePermissionAction}
          canWrite={canWrite}
          pagination={meta}
        />
      );
    }
  } else {
    const permsResult = await settle(listPermissions());
    content = permsResult.ok ? (
      <UserPermissionsSearch allPermissions={permsResult.value} />
    ) : (
      <LoadError error={permsResult.error} />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("description")} actions={actions} />
      <UrlTabs ariaLabel={t("title")} defaultValue={defaultTab} tabs={tabs} />
      {content}
    </div>
  );
}

function NewRoleButton({ label }: { label: string }) {
  return (
    <Button asChild>
      <Link href="/dashboard/configuration/roles/new">
        <Plus className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
