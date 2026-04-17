"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function createCatalogItemAction(
  entityKey: EntityKey,
  redirectTo: string,
  _: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireAdminUser();

  const config = getEntityConfig(entityKey);

  if (!config) {
    return { error: "Entidad no soportada" };
  }

  if (config.allowMutations === false) {
    return { error: "Este catalogo es de solo lectura en la API oficial" };
  }

  try {
    const payload = buildPayloadFromForm(config, formData);
    await createEntityItem(entityKey, payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear el registro",
    };
  }

  revalidatePath(config.routeBase);
  redirect(withAlertRedirect(redirectTo, {
    type: "success",
    title: "Registro creado",
    description: "El registro se creó correctamente.",
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

  const config = getEntityConfig(entityKey);

  if (!config) {
    return { error: "Entidad no soportada" };
  }

  if (config.allowMutations === false) {
    return { error: "Este catalogo es de solo lectura en la API oficial" };
  }

  try {
    const payload = buildPayloadFromForm(config, formData);
    await updateEntityItem(entityKey, id, payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar el registro",
    };
  }

  revalidatePath(config.routeBase);
  redirect(withAlertRedirect(redirectTo, {
    type: "success",
    title: "Registro actualizado",
    description: "El registro se actualizó correctamente.",
  }));
}

export async function deleteCatalogItemAction(
  _: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireAdminUser();

  const entityKey = String(formData.get("entityKey")) as EntityKey;
  const rawId = formData.get("id");
  const id = typeof rawId === "string" ? rawId.trim() : "";
  const returnPath = String(formData.get("returnPath") ?? "");
  const config = getEntityConfig(entityKey);

  if (!config || !id) {
    return { error: "No se pudo identificar el registro a eliminar." };
  }

  if (config.allowMutations === false) {
    return { error: "Este catálogo es de solo lectura en la API oficial." };
  }

  try {
    await deleteEntityItem(entityKey, id);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo eliminar el registro.",
    };
  }

  revalidatePath(config.routeBase);

  if (returnPath.startsWith("/")) {
    redirect(withAlertRedirect(returnPath, {
      type: "success",
      title: "Registro eliminado",
      description: "El registro se eliminó correctamente.",
    }));
  }

  return {};
}
