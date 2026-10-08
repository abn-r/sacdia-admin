import { getTranslations } from "next-intl/server";
import {
  RequestsListClientPage,
  type RequestsListLoadError,
} from "@/components/investiture-requests/requests-list-client-page";
import {
  getInvestitureRequestErrorCode,
  getInvestitureRequestErrorMessage,
} from "@/components/investiture-requests/investiture-request-errors";
import { ApiError } from "@/lib/api/client";
import {
  getActiveEcclesiasticalYearId,
  listEcclesiasticalYears,
  type EcclesiasticalYear,
} from "@/lib/api/catalogs";
import {
  listInvestitureRequestsForAuthorizer,
  type InvestitureRequest,
} from "@/lib/api/investiture-requests";
import { isPastorOnlyUser } from "@/lib/auth/roles";
import { requireAdminUser } from "@/lib/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseYearParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function InvestitureRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("investiture_requests");
  const params = await searchParams;

  const yearId =
    parseYearParam(params.year) ?? (await getActiveEcclesiasticalYearId());

  let years: EcclesiasticalYear[] = [];
  try {
    years = await listEcclesiasticalYears();
  } catch {
    // The selector degrades to an empty list; the requests still load.
  }

  let requests: InvestitureRequest[] = [];
  let loadError: RequestsListLoadError | null = null;

  if (yearId !== null) {
    try {
      requests = await listInvestitureRequestsForAuthorizer(yearId);
    } catch (error) {
      loadError = {
        status: error instanceof ApiError ? error.status : null,
        code: getInvestitureRequestErrorCode(error),
        message: getInvestitureRequestErrorMessage(error, t),
      };
    }
  }

  return (
    <RequestsListClientPage
      requests={requests}
      yearId={yearId}
      years={years}
      loadError={loadError}
      isPastorOnly={isPastorOnlyUser(user)}
    />
  );
}
