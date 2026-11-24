import { BookOpen, FileText, Image, Play, Radio, type LucideIcon } from "lucide-react";
import type { ResourceType, ScopeLevel } from "@/lib/api/resources";
import { toPositiveNumber, toText } from "@/lib/resources/resource-display";
import type { LocalField, Union } from "@/lib/api/geography";

import type { ErrorStateKind } from "@/lib/api/error-state";

export type ResourceRecord = Record<string, unknown>;

/** A failed list request, serializable from a server page to the client list. */
export type ResourcesLoadFailure = {
  kind: ErrorStateKind;
  detail?: { code?: string | number; at?: string };
};
export type CategoryOption = { resource_category_id: number; name: string };

/** Order matters: it is the order of the type selector. */
export const RESOURCE_TYPES: ResourceType[] = ["document", "audio", "image", "video_link", "text"];

/** Broadest to narrowest; the level selector keeps this order. */
export const SCOPE_LEVELS: ScopeLevel[] = ["system", "division", "union", "local_field"];

export const RESOURCE_TYPE_ICONS: Record<ResourceType, LucideIcon> = {
  document: FileText,
  audio: Radio,
  image: Image,
  video_link: Play,
  text: BookOpen,
};

export const FILE_RESOURCE_TYPES: ResourceType[] = ["document", "audio", "image"];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export const FILE_ACCEPT: Partial<Record<ResourceType, string>> = {
  document: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx",
  audio: ".mp3,.wav,.ogg,.aac,.m4a",
  image: "image/*",
};

export function isFileResourceType(type: ResourceType): boolean {
  return FILE_RESOURCE_TYPES.includes(type);
}

export function toResourceType(value: unknown): ResourceType | null {
  return typeof value === "string" && (RESOURCE_TYPES as string[]).includes(value)
    ? (value as ResourceType)
    : null;
}

export function toScopeLevel(value: unknown): ScopeLevel | null {
  return typeof value === "string" && (SCOPE_LEVELS as string[]).includes(value)
    ? (value as ScopeLevel)
    : null;
}

export function formatFileSize(bytes: unknown): string {
  const size = toPositiveNumber(bytes);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** Upper-case extension of a file name or URL path ("PDF"), or null. */
export function fileExtension(source: string | null | undefined): string | null {
  if (!source) return null;
  const path = source.split(/[?#]/)[0] ?? "";
  const match = /\.([A-Za-z0-9]{1,5})$/.exec(path);
  return match?.[1] ? match[1].toUpperCase() : null;
}

/** Host of an external video URL without "www." ("youtube.com"), or null. */
export function externalHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export type ScopeDescription = {
  level: ScopeLevel;
  /** Territory name when it can be resolved from the loaded catalogs. */
  name: string | null;
  id: number | null;
};

/** Level and territory of a resource row; names come from the catalogs the role can see. */
export function describeScope(
  item: ResourceRecord,
  unions: Union[],
  localFields: LocalField[],
): ScopeDescription | null {
  const level = toScopeLevel(item.scope_level);
  if (!level) return null;
  const id = toPositiveNumber(item.scope_id);
  let name: string | null = toText(item.scope_name);
  if (!name && id) {
    if (level === "union") name = unions.find((u) => u.union_id === id)?.name ?? null;
    if (level === "local_field") {
      name = localFields.find((lf) => lf.local_field_id === id)?.name ?? null;
    }
  }
  return { level, name, id };
}
