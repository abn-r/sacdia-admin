import { useTranslations } from "next-intl";

const KNOWN_ROLE_KEYS = new Set([
  "super_admin",
  "admin",
  "coordinator",
  "zone_coordinator",
  "general_coordinator",
  "pastor",
  "director",
  "deputy_director",
  "director_club",
  "assistant_club",
  "director_dia",
  "assistant_dia",
  "director_lf",
  "assistant_lf",
  "director_union",
  "assistant_union",
  "instructor",
  "member",
  "user",
  "secretary",
  "treasurer",
  "counselor",
]);

export function roleToI18nKey(roleName: string): string {
  return roleName.trim().toLowerCase().replace(/-/g, "_");
}

function fallbackTitleCase(roleName: string): string {
  return roleName
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type RoleTranslator = (roleName: string | null | undefined) => string;

type RolesT = ReturnType<typeof useTranslations<"roles">>;

export function buildRoleTranslator(t: RolesT): RoleTranslator {
  return (roleName) => {
    if (!roleName || typeof roleName !== "string") return "";
    const key = roleToI18nKey(roleName);
    if (KNOWN_ROLE_KEYS.has(key)) {
      return t(key as Parameters<typeof t>[0]);
    }
    return fallbackTitleCase(roleName);
  };
}

export function useRoleLabel(): RoleTranslator {
  const t = useTranslations("roles");
  return buildRoleTranslator(t);
}
