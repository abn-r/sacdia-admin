export function clubLocationName(
  primary?: { name?: string | null } | null,
  fallback?: { name?: string | null } | null,
): string | undefined {
  const name = primary?.name?.trim() || fallback?.name?.trim();
  return name || undefined;
}
