type AnyRecord = Record<string, unknown>;

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function nameOf(value: unknown): string | null {
  return value && typeof value === "object" ? toText((value as AnyRecord).name) : null;
}

/**
 * Union name carried by a union camporee payload.
 * The detail endpoint embeds the relation as `unions` ({ union_id, name, ... });
 * `union_name` / `union` are accepted for other shapes (list rows, older payloads).
 */
export function readUnionNameFromCamporee(raw: AnyRecord): string | null {
  return toText(raw.union_name) ?? nameOf(raw.union) ?? nameOf(raw.unions);
}

/** Union id of a union camporee payload, from the flat column or the embedded relation. */
export function readUnionIdFromCamporee(raw: AnyRecord): number | null {
  const embedded = raw.unions ?? raw.union;
  return (
    toPositiveNumber(raw.union_id) ??
    (embedded && typeof embedded === "object"
      ? toPositiveNumber((embedded as AnyRecord).union_id)
      : null)
  );
}

/**
 * Union name for a union camporee: the payload first, otherwise the catalog
 * entry for its `union_id` (looked up lazily, only when the payload has none).
 */
export async function resolveUnionCamporeeUnionName(
  raw: AnyRecord,
  loadUnions: () => Promise<Array<{ union_id: number; name: string }>>,
): Promise<string | null> {
  const fromPayload = readUnionNameFromCamporee(raw);
  if (fromPayload) return fromPayload;

  const unionId = readUnionIdFromCamporee(raw);
  if (!unionId) return null;

  try {
    const unions = await loadUnions();
    return toText(unions.find((union) => union.union_id === unionId)?.name) ?? null;
  } catch {
    return null;
  }
}
