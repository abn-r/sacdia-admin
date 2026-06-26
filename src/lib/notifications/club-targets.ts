import { apiRequest } from "@/lib/api/client";
import type { NotificationInstanceType } from "@/lib/api/notifications";

type AnyRecord = Record<string, unknown>;

export type NotificationClubTarget = {
  clubId: number;
  clubName: string;
  sectionId: number;
  sectionName: string;
  instanceType: NotificationInstanceType;
  instanceId: number;
  label: string;
};

type ClubTargetsResponse = {
  data?: unknown;
};

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const { data } = payload as ClubTargetsResponse;
    if (Array.isArray(data)) return data as AnyRecord[];
  }
  return [];
}

function isValidInstanceType(value: unknown): value is NotificationInstanceType {
  return (
    value === "adventurers" ||
    value === "pathfinders" ||
    value === "master_guilds"
  );
}

function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeTarget(raw: AnyRecord): NotificationClubTarget | null {
  const clubId = Number(raw.clubId);
  const sectionId = Number(raw.sectionId);
  const instanceId = Number(raw.instanceId);
  const clubName = readNonEmptyString(raw.clubName);
  const sectionName = readNonEmptyString(raw.sectionName);
  const label = readNonEmptyString(raw.label);

  if (
    !Number.isFinite(clubId) ||
    clubId <= 0 ||
    !Number.isFinite(sectionId) ||
    sectionId <= 0 ||
    !Number.isFinite(instanceId) ||
    instanceId <= 0 ||
    !clubName ||
    !sectionName ||
    !label ||
    !isValidInstanceType(raw.instanceType)
  ) {
    return null;
  }

  return {
    clubId,
    clubName,
    sectionId,
    sectionName,
    instanceType: raw.instanceType,
    instanceId,
    label,
  };
}

export async function listAuthorizedNotificationClubTargets(): Promise<
  NotificationClubTarget[]
> {
  const payload = await apiRequest<unknown>("/notifications/targets/club");
  return extractArray(payload)
    .map(normalizeTarget)
    .filter((target): target is NotificationClubTarget => target !== null);
}
