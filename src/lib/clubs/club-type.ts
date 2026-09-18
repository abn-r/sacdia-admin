export type ClubTypeIdentity = {
  club_type_id?: number | null;
  value?: number | null;
  name?: string | null;
  label?: string | null;
  slug?: string | null;
  code?: string | null;
};

function normalizeClubTypeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MASTER_GUIDES_EXACT = new Set([
  "gm",
  "guias mayores",
  "guia mayor",
  "master guides",
  "master guide",
  "master guilds",
  "master guild",
  "guides maitres",
  "guide maitre",
  "guias master",
  "guias maiores",
]);

/**
 * Detects the Guías Mayores catalog type from name/slug/code.
 * Do not key off numeric `club_type_id` — seed ids are not a contract.
 */
export function isMasterGuidesClubType(item: ClubTypeIdentity): boolean {
  const tokens = [item.name, item.label, item.slug, item.code]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalizeClubTypeToken);

  return tokens.some((token) => {
    if (MASTER_GUIDES_EXACT.has(token)) return true;

    const hasGuia = token.includes("guia");
    const hasMayor = token.includes("mayor") || token.includes("maitre");
    const hasMaster = token.includes("master");
    const hasGuide = token.includes("guide") || token.includes("guild");

    return (hasGuia && (hasMayor || hasMaster)) || (hasMaster && hasGuide);
  });
}

export function clubTypeIdentityId(item: ClubTypeIdentity): number | null {
  const raw = item.club_type_id ?? item.value;
  const id = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function findMasterGuidesClubTypeId(
  items: readonly ClubTypeIdentity[],
): number | null {
  for (const item of items) {
    if (!isMasterGuidesClubType(item)) continue;
    const id = clubTypeIdentityId(item);
    if (id != null) return id;
  }
  return null;
}
