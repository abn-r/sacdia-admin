import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ErrorState } from "@/components/shared/error-state";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import {
  CamporeeFormPage,
  type CamporeeOwnerOption,
} from "@/components/camporees/camporee-form-page";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import { getCamporeeById, getUnionCamporeeById } from "@/lib/api/camporees";
import { camporeeScreenId, canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
} from "@/lib/auth/territory-scope";
import { resolveUserLocalField } from "@/lib/auth/user-local-field";
import { camporeeBasePath } from "@/lib/camporees/groups";
import {
  extractCamporeeRecord,
  normalizeCamporee,
  toPositiveNumber,
  type CamporeeKind,
  type NormalizedCamporee,
} from "@/lib/camporees/normalize";

const LIST_HREF = "/dashboard/campamentos";

function withCurrentOwner(
  options: CamporeeOwnerOption[],
  camporee: NormalizedCamporee | null,
): CamporeeOwnerOption[] {
  if (!camporee) return options;
  const id = camporee.kind === "union" ? camporee.union_id : camporee.local_field_id;
  if (!id || options.some((option) => option.value === id)) return options;
  const label =
    camporee.kind === "union"
      ? (camporee.union_name ?? `#${id}`)
      : (camporee.local_field?.name ?? `#${id}`);
  return [{ value: id, label }, ...options];
}

/**
 * Create / edit as a page with sections, for local and union camporees.
 * Edit loads the stored camporee with every field so saving can never wipe
 * what the form does not touch.
 */
export async function CamporeeFormView({
  kind,
  id,
}: {
  kind: CamporeeKind;
  /** Present when editing. */
  id?: string;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("evaluation.camporees.form");
  const tf = await getTranslations("camporees.form");
  const tUnion = await getTranslations("camporees.unionForm");
  const tl = await getTranslations("camporees.pages.list");
  const union = kind === "union";
  const isEdit = id !== undefined;
  const screen = camporeeScreenId(kind);
  const title = isEdit
    ? union
      ? tUnion("titleEdit")
      : tf("titleEdit")
    : union
      ? tUnion("titleCreate")
      : tf("titleCreate");

  if (!canCapability(user, screen, isEdit ? "update" : "create")) {
    return <PageAccessForbidden title={title} />;
  }

  let camporee: NormalizedCamporee | null = null;
  if (isEdit) {
    const camporeeId = toPositiveNumber(id);
    if (!camporeeId) notFound();
    try {
      const payload = union
        ? await getUnionCamporeeById(camporeeId)
        : await getCamporeeById(camporeeId);
      const raw = extractCamporeeRecord(payload, kind);
      if (!raw) notFound();
      camporee = normalizeCamporee(raw, kind);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        notFound();
      }
      const state = errorStateFromError(error);
      return (
        <div className="space-y-6">
          <PageHeader title={title} breadcrumbs={[{ label: tl("title"), href: LIST_HREF }, { label: title }]} />
          <ErrorState kind={state.kind} detail={state.detail} title={t("loadFailedTitle")} retry />
        </div>
      );
    }
  }

  let owners: CamporeeOwnerOption[] = [];
  let ownersError: ReturnType<typeof errorStateFromError> | null = null;
  try {
    owners = union
      ? (await listUnionsForTerritory(user)).map((u) => ({ value: u.union_id, label: u.name }))
      : (await listLocalFieldsForTerritory(user)).map((f) => ({
          value: f.local_field_id,
          label: f.name,
        }));
  } catch (error) {
    ownersError = errorStateFromError(error);
  }
  owners = withCurrentOwner(
    owners.filter((o) => Number.isFinite(o.value) && o.value > 0 && o.label.trim()),
    camporee,
  );

  const scope = resolveUserLocalField(user);
  const ownerLocked = !union && !isEdit && scope.scope === "single";
  const defaultOwnerId =
    !union && scope.scope === "single"
      ? scope.localFieldId
      : owners.length === 1
        ? (owners[0]?.value ?? null)
        : null;

  const cancelHref =
    isEdit && camporee?.camporee_id
      ? camporeeBasePath(kind, camporee.camporee_id)
      : LIST_HREF;

  return (
    <div className="space-y-6">
      <PageHeader
        title={camporee ? camporee.name : title}
        description={isEdit ? title : undefined}
        breadcrumbs={[
          { label: tl("title"), href: union ? `${LIST_HREF}?tab=union` : LIST_HREF },
          ...(camporee && camporee.camporee_id
            ? [{ label: camporee.name, href: cancelHref }]
            : []),
          { label: title },
        ]}
      />
      {ownersError ? (
        <ErrorState
          kind={ownersError.kind}
          detail={ownersError.detail}
          title={t("ownersFailedTitle")}
          retry
        />
      ) : (
        <CamporeeFormPage
          kind={kind}
          camporee={camporee}
          owners={owners}
          ownerLocked={ownerLocked}
          defaultOwnerId={defaultOwnerId}
          canConfigureOrders={canCapability(user, screen, "orders.configure_offering")}
          cancelHref={cancelHref}
        />
      )}
    </div>
  );
}
