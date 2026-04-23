"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getEntityConfig, type EntityKey } from "@/lib/catalogs/entities";
import {
  APP_ALERT_PARAM_DESCRIPTION,
  APP_ALERT_PARAM_TITLE,
  APP_ALERT_PARAM_TYPE,
  type AppAlertType,
} from "@/lib/ui/app-alert-params";
import {
  buildPayloadFromForm,
  createEntityItem,
  deleteEntityItem,
  updateEntityItem,
} from "@/lib/catalogs/service";
import { requireAdminUser } from "@/lib/auth/session";

type CatalogsTranslator = Awaited<ReturnType<typeof getTranslations<"catalogs">>>;

export type CatalogActionState = {
  error?: string;
};

type RedirectAlert = {
  type: AppAlertType;
  title: string;
  description?: string;
};

function withAlertRedirect(path: string, alert: RedirectAlert) {
  if (!path.startsWith("/")) {
    return path;
  }

  const hashIndex = path.indexOf("#");
  const cleanPath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const queryIndex = cleanPath.indexOf("?");
  const pathname = queryIndex >= 0 ? cleanPath.slice(0, queryIndex) : cleanPath;
  const rawQuery = queryIndex >= 0 ? cleanPath.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(rawQuery);

  params.set(APP_ALERT_PARAM_TYPE, alert.type);
  params.set(APP_ALERT_PARAM_TITLE, alert.title);
  if (alert.description) {
    params.set(APP_ALERT_PARAM_DESCRIPTION, alert.description);
  } else {
    params.delete(APP_ALERT_PARAM_DESCRIPTION);
  }

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

function getErrorMessage(t: CatalogsTranslator, error: unknown, fallbackKey: Parameters<CatalogsTranslator>[0]) {
  return error instanceof Error ? error.message : t(fallbackKey);
}

export async function createCatalogItemAction(
  entityKey: EntityKey,
  redirectTo: string,
  _: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireAdminUser();
  const t = await getTranslations("catalogs");

  const config = getEntityConfig(entityKey);

  if (!config) {
    return { error: t("errors.entity_not_supported") };
  }

  if (config.allowMutations === false) {
    return { error: t("errors.read_only_catalog") };
  }

  try {
    const payload = buildPayloadFromForm(config, formData);
    await createEntityItem(entityKey, payload);
  } catch (error) {
    return {
      error: getErrorMessage(t, error, "errors.op_create_failed"),
    };
  }

  revalidatePath(config.routeBase);
  redirect(withAlertRedirect(redirectTo, {
    type: "success",
    title: t("success.op_create_title"),
    description: t("success.op_create_description"),
  }));
}

export async function updateCatalogItemAction(
  entityKey: EntityKey,
  id: number | string,
  redirectTo: string,
  _: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireAdminUser();
  const t = await getTranslations("catalogs");

  const config = getEntityConfig(entityKey);

  if (!config) {
    return { error: t("errors.entity_not_supported") };
  }

  if (config.allowMutations === false) {
    return { error: t("errors.read_only_catalog") };
  }

  try {
    const payload = buildPayloadFromForm(config, formData);
    await updateEntityItem(entityKey, id, payload);
  } catch (error) {
    return {
      error: getErrorMessage(t, error, "errors.op_update_failed"),
    };
  }

  revalidatePath(config.routeBase);
  redirect(withAlertRedirect(redirectTo, {
    type: "success",
    title: t("success.op_update_title"),
    description: t("success.op_update_description"),
  }));
}

export async function deleteCatalogItemAction(
  _: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireAdminUser();
  const t = await getTranslations("catalogs");

  const entityKey = String(formData.get("entityKey")) as EntityKey;
  const rawId = formData.get("id");
  const id = typeof rawId === "string" ? rawId.trim() : "";
  const returnPath = String(formData.get("returnPath") ?? "");
  const config = getEntityConfig(entityKey);

  if (!config || !id) {
    return { error: t("validation.delete_target_not_identified") };
  }

  if (config.allowMutations === false) {
    return { error: t("errors.read_only_catalog") };
  }

  try {
    await deleteEntityItem(entityKey, id);
  } catch (error) {
    return {
      error: getErrorMessage(t, error, "errors.op_delete_failed"),
    };
  }

  revalidatePath(config.routeBase);

  if (returnPath.startsWith("/")) {
    redirect(withAlertRedirect(returnPath, {
      type: "success",
      title: t("success.op_delete_title"),
      description: t("success.op_delete_description"),
    }));
  }

  return {};
}
