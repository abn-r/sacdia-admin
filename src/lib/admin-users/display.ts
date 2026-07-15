import type { AdminUser } from "@/lib/api/admin-users";

const DELETED_ACCOUNT_EMAIL_PATTERN = /^deleted-[0-9a-f-]+@sacdia\.deleted$/i;

export function isDeletedAccountUser(
  user: Pick<AdminUser, "active" | "email" | "is_deleted">,
): boolean {
  return (
    user.is_deleted === true ||
    (user.active === false &&
      DELETED_ACCOUNT_EMAIL_PATTERN.test(user.email ?? ""))
  );
}

export function getAdminUserDisplayName(
  user: Pick<
    AdminUser,
    | "active"
    | "email"
    | "full_name"
    | "is_deleted"
    | "maternal_last_name"
    | "name"
    | "paternal_last_name"
  >,
  labels: {
    deletedAccount: string;
    fallback?: string;
  },
): string {
  if (isDeletedAccountUser(user)) {
    return labels.deletedAccount;
  }

  const fullName =
    user.full_name ??
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
      .join(" ");

  return fullName || user.email || labels.fallback || "—";
}

export function getAdminUserSecondaryLabel(
  user: Pick<AdminUser, "active" | "email" | "is_deleted">,
  labels: {
    anonymized: string;
    fallback?: string;
  },
): string {
  if (isDeletedAccountUser(user)) {
    return labels.anonymized;
  }

  return user.email || labels.fallback || "—";
}

export function sortAdminUsersByName(
  users: AdminUser[],
  labels: {
    deletedAccount: string;
    fallback?: string;
  },
): AdminUser[] {
  return [...users].sort((a, b) =>
    getAdminUserDisplayName(a, labels).localeCompare(
      getAdminUserDisplayName(b, labels),
      "es",
      { sensitivity: "base" },
    ),
  );
}
