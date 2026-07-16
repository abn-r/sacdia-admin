"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { getActionErrorMessage } from "@/lib/api/action-error";
import { createClub } from "@/lib/api/clubs";
import { canManageClubsByRole } from "@/lib/auth/permission-utils";
import { requireAdminUser } from "@/lib/auth/session";
import { listLocalFieldsForTerritory } from "@/lib/auth/territory-scope";

export type BulkClubRow = {
  rowNumber: number;
  name: string;
  local_field_id: number;
  district_id: number;
  church_id: number;
  description?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
};

export type BulkClubRowResult = {
  rowNumber: number;
  name: string;
  ok: boolean;
  message?: string;
  clubId?: number;
};

export type BulkClubsImportResult = {
  results: BulkClubRowResult[];
  created: number;
  failed: number;
  forbidden?: boolean;
};

function normalizeCreatedClubId(payload: unknown): number | null {
  const root =
    payload && typeof payload === "object"
      ? ((payload as { data?: unknown }).data ?? payload)
      : null;

  if (!root || typeof root !== "object") {
    return null;
  }

  const record = root as Record<string, unknown>;
  for (const candidate of [record.club_id, record.id]) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export async function bulkCreateClubsAction(
  rows: BulkClubRow[],
): Promise<BulkClubsImportResult> {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs");

  if (!canManageClubsByRole(user)) {
    return {
      results: [],
      created: 0,
      failed: 0,
      forbidden: true,
    };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { results: [], created: 0, failed: 0 };
  }

  const allowedLocalFields = await listLocalFieldsForTerritory(user);
  const allowedLocalFieldIds = new Set(
    allowedLocalFields.map((field) => field.local_field_id),
  );

  const results: BulkClubRowResult[] = [];
  let created = 0;
  let failed = 0;

  for (const row of rows) {
    if (
      !row.name ||
      !Number.isFinite(row.local_field_id) ||
      !Number.isFinite(row.district_id) ||
      !Number.isFinite(row.church_id)
    ) {
      failed++;
      results.push({
        rowNumber: row.rowNumber,
        name: row.name ?? "",
        ok: false,
        message: t("validation.bulk_row_invalid"),
      });
      continue;
    }

    try {
      if (
        allowedLocalFieldIds.size > 0 &&
        !allowedLocalFieldIds.has(row.local_field_id)
      ) {
        throw new Error("El campo local seleccionado está fuera de tu alcance.");
      }

      const createdPayload = await createClub({
        name: row.name,
        description: row.description,
        local_field_id: row.local_field_id,
        districlub_type_id: row.district_id,
        church_id: row.church_id,
        address: row.address,
        coordinates: row.coordinates,
      });
      const clubId = normalizeCreatedClubId(createdPayload) ?? undefined;
      created++;
      results.push({
        rowNumber: row.rowNumber,
        name: row.name,
        ok: true,
        clubId,
      });
    } catch (error) {
      failed++;
      results.push({
        rowNumber: row.rowNumber,
        name: row.name,
        ok: false,
        message: getActionErrorMessage(error, t("errors.create_club_failed"), {
          endpointLabel: "/clubs",
        }),
      });
    }
  }

  if (created > 0) {
    revalidatePath("/dashboard/clubs");
  }

  return { results, created, failed };
}
