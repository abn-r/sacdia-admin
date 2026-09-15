import { getTranslations } from "next-intl/server";
import { ApiError, apiRequest } from "@/lib/api/client";
import { listUnionCamporees, type Camporee } from "@/lib/api/camporees";
import {
  listLocalCamporeeJudgeCandidates,
  listLocalCamporeeJudges,
  listUnionCamporeeJudgeCandidates,
  listUnionCamporeeJudges,
  type CamporeeJudge,
  type CamporeeJudgeCandidate,
} from "@/lib/api/camporee-scoring";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import {
  CampamentosJudgesClient,
  type CamporeeJudgeScope,
} from "@/components/campamentos/campamentos-judges-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type AnyRecord = Record<string, unknown>;

function extractCamporees(payload: unknown): Camporee[] {
  if (Array.isArray(payload)) return payload as Camporee[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as Camporee[];
    if (root.data && typeof root.data === "object") {
      const nested = root.data as AnyRecord;
      if (Array.isArray(nested.data)) return nested.data as Camporee[];
    }
  }
  return [];
}

function readScope(raw: Record<string, string | string[] | undefined>): CamporeeJudgeScope {
  const value = raw.scope;
  return value === "union" ? "union" : "local";
}

function readCamporeeId(raw: Record<string, string | string[] | undefined>): number | null {
  const value = raw.camporeeId;
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default async function CampamentosJudgesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("campamentos.pages.judges");
  const raw = await searchParams;
  const scope = readScope(raw);
  const camporeeId = readCamporeeId(raw);

  if (!canViewScreen(user, "campamentos-judges")) {
    return (
      <EndpointErrorBanner
        state="missing"
        detail={t("permissionDenied")}
      />
    );
  }

  let localCamporees: Camporee[] = [];
  let unionCamporees: Camporee[] = [];
  let judges: CamporeeJudge[] = [];
  let judgeCandidates: CamporeeJudgeCandidate[] = [];
  let judgeCandidatesError: string | null = null;
  let loadError: string | null = null;

  try {
    const [localPayload, unionPayload] = await Promise.all([
      apiRequest<unknown>("/camporees"),
      listUnionCamporees(),
    ]);
    localCamporees = extractCamporees(localPayload);
    unionCamporees = extractCamporees(unionPayload);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadFailed");
  }

  if (!loadError && camporeeId) {
    try {
      if (scope === "union") {
        judges = await listUnionCamporeeJudges(camporeeId);
        if (canCapability(user, "campamentos-judges", "manage")) {
          judgeCandidates = await listUnionCamporeeJudgeCandidates(camporeeId);
        }
      } else {
        judges = await listLocalCamporeeJudges(camporeeId);
        if (canCapability(user, "campamentos-judges", "manage")) {
          judgeCandidates = await listLocalCamporeeJudgeCandidates(camporeeId);
        }
      }
    } catch (error) {
      loadError = error instanceof ApiError ? error.message : t("loadFailed");
    }
  }

  const canEdit = canCapability(user, "campamentos-judges", "manage");

  return (
    <div className="space-y-6">
      {loadError ? <EndpointErrorBanner state="missing" detail={loadError} /> : null}
      <CampamentosJudgesClient
        scope={scope}
        camporeeId={camporeeId}
        localCamporees={localCamporees}
        unionCamporees={unionCamporees}
        judges={judges}
        judgeCandidates={judgeCandidates}
        judgeCandidatesError={judgeCandidatesError}
        canEdit={canEdit}
      />
    </div>
  );
}
