/**
 * Rules for the honor image and material uploads. They mirror the backend
 * (`POST /admin/honors-catalog/assets`), which checks them again against the
 * file bytes; checking here only saves a round trip.
 */
export type HonorAssetKind = "image" | "material";

export const HONOR_ASSET_RULES: Record<
  HonorAssetKind,
  { maxMb: number; mimeTypes: readonly string[]; accept: string }
> = {
  image: {
    maxMb: 5,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    accept: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp",
  },
  material: {
    maxMb: 10,
    mimeTypes: ["application/pdf"],
    accept: ".pdf,application/pdf",
  },
};

export type HonorAssetProblem = { kind: "type" } | { kind: "size"; maxMb: number };

/** Null when the file can be uploaded as `kind`. */
export function checkHonorAsset(
  kind: HonorAssetKind,
  file: Pick<File, "type" | "size">,
): HonorAssetProblem | null {
  const rule = HONOR_ASSET_RULES[kind];
  if (!rule.mimeTypes.includes(file.type)) return { kind: "type" };
  if (file.size > rule.maxMb * 1024 * 1024) return { kind: "size", maxMb: rule.maxMb };
  return null;
}

/** Reads `url` from `{ status, data: { url } }` or `{ url }`. */
export function readUploadedUrl(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const inner =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;
  return typeof inner.url === "string" && inner.url.length > 0 ? inner.url : null;
}
