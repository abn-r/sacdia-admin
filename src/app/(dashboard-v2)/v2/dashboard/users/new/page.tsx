import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { NewUserForm } from "@/components/users/new-user-form";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles } from "@/lib/auth/roles";
import type { AdminCreatableRole } from "@/lib/api/admin-users";

// ─── Role-to-allowed-creatable-roles mapping ──────────────────────────────────

const ALLOWED_PAGE_ROLES = new Set([
  "super-admin",
  "admin",
  "director-dia",
  "assistant-dia",
  "director-union",
  "assistant-union",
  "director-lf",
  "assistant-lf",
]);

/**
 * Returns the subset of AdminCreatableRole values the actor may assign.
 *
 * Hierarchy rule (Adventist club authority chain — must mirror backend
 * `ROLE_HIERARCHY` in `admin-users.service.ts`):
 *   - super-admin → all roles, including admin
 *   - admin → everything below admin (NOT admin itself; only super-admin
 *     creates admin). admin assigns director-dia.
 *   - director-dia / assistant-dia → UNION + LF + base (NOT DIA peers).
 *   - director-union / assistant-union → LF + base (NOT UNION peers).
 *   - director-lf / assistant-lf → base only (NOT LF peers). LF directors
 *     are appointed by the union, so the LF tier cannot grow itself.
 *
 * The backend enforces this server-side too; the UI filters the dropdown to
 * match so the actor never sees options that would bounce with a 403.
 */
const BASE_T5_ROLES: AdminCreatableRole[] = [
  "user",
  "coordinator",
  "zone-coordinator",
  "general-coordinator",
  "pastor",
];
const LF_ROLES: AdminCreatableRole[] = ["assistant-lf", "director-lf"];
const UNION_ROLES: AdminCreatableRole[] = [
  "assistant-union",
  "director-union",
];
const DIA_ROLES: AdminCreatableRole[] = ["assistant-dia", "director-dia"];

function resolveAllowedRoles(userRoles: string[]): AdminCreatableRole[] {
  const roleSet = new Set(userRoles);

  if (roleSet.has("super-admin")) {
    return [...BASE_T5_ROLES, ...LF_ROLES, ...UNION_ROLES, ...DIA_ROLES, "admin"];
  }
  if (roleSet.has("admin")) {
    return [...BASE_T5_ROLES, ...LF_ROLES, ...UNION_ROLES, ...DIA_ROLES];
  }
  if (roleSet.has("director-dia") || roleSet.has("assistant-dia")) {
    return [...BASE_T5_ROLES, ...LF_ROLES, ...UNION_ROLES];
  }
  if (roleSet.has("director-union") || roleSet.has("assistant-union")) {
    return [...BASE_T5_ROLES, ...LF_ROLES];
  }
  if (roleSet.has("director-lf") || roleSet.has("assistant-lf")) {
    return [...BASE_T5_ROLES];
  }
  return [];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NewUserPage() {
  const currentUser = await requireAdminUser();
  const userRoles = extractRoles(currentUser);

  // Check that at least one of the allowed page roles is present
  const hasAccess = userRoles.some((r) => ALLOWED_PAGE_ROLES.has(r));
  if (!hasAccess) {
    notFound();
  }

  const allowedRoles = resolveAllowedRoles(userRoles);
  const t = await getTranslations("users.pages.new");
  const tList = await getTranslations("users.pages.list");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: tList("title"), href: "/dashboard/users" },
          { label: t("breadcrumb") },
        ]}
      />

      <NewUserForm allowedRoles={allowedRoles} />
    </div>
  );
}
