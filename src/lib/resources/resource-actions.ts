"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  createResource,
  deleteResource,
  updateResource,
  type ResourcePayload,
  type ResourceType,
  type ClubTypeTarget,
  type ScopeLevel,
} from "@/lib/api/resources";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  RESOURCES_CREATE,
  RESOURCES_DELETE,
  RESOURCES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

type ResourcesTranslator = Awaited<ReturnType<typeof getTranslations<"resources">>>;

const RESOURCES_PATH = "/dashboard/resources";

export type ResourceActionState = {
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parsePositiveNumber(formData: FormData, field: string) {
  const raw = readString(formData, field);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

const VALID_RESOURCE_TYPES: ResourceType[] = ["document", "audio", "image", "video_link", "text"];
const VALID_CLUB_TYPES: ClubTypeTarget[] = ["all", "Aventureros", "Conquistadores", "Guías Mayores"];
const VALID_SCOPE_LEVELS: ScopeLevel[] = ["system", "union", "local_field"];

function toResourceType(value: string): ResourceType | null {
  return VALID_RESOURCE_TYPES.includes(value as ResourceType) ? (value as ResourceType) : null;
}

function toClubType(value: string): ClubTypeTarget | null {
  return VALID_CLUB_TYPES.includes(value as ClubTypeTarget) ? (value as ClubTypeTarget) : null;
}

function toScopeLevel(value: string): ScopeLevel | null {
  return VALID_SCOPE_LEVELS.includes(value as ScopeLevel) ? (value as ScopeLevel) : null;
}

function buildCreateFormData(t: ResourcesTranslator, formData: FormData): FormData {
  const title = readString(formData, "title");
  if (!title) throw new Error(t("validation.title_required"));

  const resourceType = toResourceType(readString(formData, "resource_type"));
  if (!resourceType) throw new Error(t("validation.resource_type_required"));

  const out = new FormData();
  out.set("title", title);
  out.set("resource_type", resourceType);

  const description = readString(formData, "description");
  if (description) out.set("description", description);

  const categoryId = parsePositiveNumber(formData, "category_id");
  if (categoryId) out.set("category_id", String(categoryId));

  const clubType = toClubType(readString(formData, "club_type"));
  if (clubType) out.set("club_type", clubType);

  const scopeLevel = toScopeLevel(readString(formData, "scope_level"));
  if (scopeLevel) out.set("scope_level", scopeLevel);

  if (scopeLevel && scopeLevel !== "system") {
    const scopeId = parsePositiveNumber(formData, "scope_id");
    if (scopeId) out.set("scope_id", String(scopeId));
  }

  if (resourceType === "video_link") {
    const externalUrl = readString(formData, "external_url");
    if (!externalUrl) throw new Error(t("validation.video_url_required"));
    out.set("external_url", externalUrl);
  } else if (resourceType === "text") {
    const content = readString(formData, "content");
    if (!content) throw new Error(t("validation.content_required"));
    out.set("content", content);
  } else {
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      out.set("file", file);
    }
  }

  return out;
}

function buildUpdatePayload(formData: FormData): Partial<ResourcePayload> {
  const payload: Partial<ResourcePayload> = {};

  const title = readString(formData, "title");
  if (title) payload.title = title;

  const description = readString(formData, "description");
  payload.description = description || "";

  const clubType = toClubType(readString(formData, "club_type"));
  if (clubType) payload.club_type = clubType;

  const scopeLevel = toScopeLevel(readString(formData, "scope_level"));
  if (scopeLevel) {
    payload.scope_level = scopeLevel;
    if (scopeLevel !== "system") {
      const scopeId = parsePositiveNumber(formData, "scope_id");
      if (scopeId) payload.scope_id = scopeId;
    }
  }

  const categoryId = parsePositiveNumber(formData, "category_id");
  if (categoryId) payload.category_id = categoryId;

  const externalUrl = readString(formData, "external_url");
  if (externalUrl) payload.external_url = externalUrl;

  const content = readString(formData, "content");
  if (content) payload.content = content;

  return payload;
}

export async function createResourceAction(
  _: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("resources");
  if (!hasAnyPermission(user, [RESOURCES_CREATE])) {
    return { error: t("errors.create_permission_denied") };
  }
  try {
    const outFormData = buildCreateFormData(t, formData);
    await createResource(outFormData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : t("errors.create_failed") };
  }
  revalidatePath(RESOURCES_PATH);
  redirect(RESOURCES_PATH);
}

export async function updateResourceAction(
  _: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("resources");
  if (!hasAnyPermission(user, [RESOURCES_UPDATE])) {
    return { error: t("errors.update_permission_denied") };
  }
  const id = parsePositiveNumber(formData, "id");
  if (!id) return { error: t("errors.update_not_found") };
  try {
    const payload = buildUpdatePayload(formData);
    await updateResource(id, payload);
  } catch (error) {
    return { error: error instanceof Error ? error.message : t("errors.update_failed") };
  }
  revalidatePath(RESOURCES_PATH);
  redirect(RESOURCES_PATH);
}

export async function deleteResourceAction(
  _: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("resources");
  if (!hasAnyPermission(user, [RESOURCES_DELETE])) {
    return { error: t("errors.delete_permission_denied") };
  }
  const id = parsePositiveNumber(formData, "id");
  if (!id) return { error: t("errors.delete_not_found") };
  try {
    await deleteResource(id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : t("errors.delete_failed") };
  }
  revalidatePath(RESOURCES_PATH);
  redirect(RESOURCES_PATH);
}
