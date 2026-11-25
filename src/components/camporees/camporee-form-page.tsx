"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/shared/location-picker";
import { SectionFormPage, FormSection } from "@/components/shared/section-form-page";
import { useToastError } from "@/lib/feedback/toast-retry";
import { CamporeeOrdersSection } from "@/components/camporees/camporee-orders-section";
import { useCamporeeOrdersDraft } from "@/components/camporees/camporee-orders-draft";
import {
  createCamporee,
  createUnionCamporee,
  updateCamporee,
  updateUnionCamporee,
} from "@/lib/api/camporees";
import {
  buildCamporeeUpdate,
  buildLocalCreatePayload,
  buildUnionCreatePayload,
  emptyFormValues,
  formValuesFromCamporee,
  isFormDirty,
  validateCamporeeForm,
  type CamporeeFormErrors,
  type CamporeeFormValues,
} from "@/lib/camporees/form";
import { camporeeBasePath } from "@/lib/camporees/groups";
import {
  extractCamporeeRecord,
  toPositiveNumber,
  type CamporeeKind,
  type NormalizedCamporee,
} from "@/lib/camporees/normalize";
import { cn } from "@/lib/utils";

export type CamporeeOwnerOption = { value: number; label: string };

export interface CamporeeFormPageProps {
  kind: CamporeeKind;
  /** Present when editing: the stored camporee, with every field. */
  camporee: NormalizedCamporee | null;
  /** Local fields (local) or unions (union) the actor may pick. */
  owners: CamporeeOwnerOption[];
  /** True when the actor is bound to a single owner: shown, not editable. */
  ownerLocked: boolean;
  /** Owner preselected on create (the only one, or the actor's own). */
  defaultOwnerId: number | null;
  canConfigureOrders: boolean;
  /** Where Cancel goes (the list, or the detail when editing). */
  cancelHref: string;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

export function CamporeeFormPage({
  kind,
  camporee,
  owners,
  ownerLocked,
  defaultOwnerId,
  canConfigureOrders,
  cancelHref,
}: CamporeeFormPageProps) {
  const t = useTranslations("evaluation.camporees.form");
  const tf = useTranslations("camporees.form");
  const tUnion = useTranslations("camporees.unionForm");
  const tVal = useTranslations("camporees.validation");
  const tt = useTranslations("camporees");
  const toastError = useToastError();
  const router = useRouter();
  const isEdit = camporee !== null;
  const isUnion = kind === "union";
  const camporeeId = camporee?.camporee_id ?? null;

  const initial = useMemo<CamporeeFormValues>(
    () => (camporee ? formValuesFromCamporee(camporee) : emptyFormValues(defaultOwnerId)),
    [camporee, defaultOwnerId],
  );
  const [values, setValues] = useState<CamporeeFormValues>(initial);
  const [errors, setErrors] = useState<CamporeeFormErrors>({});
  const [pending, setPending] = useState(false);

  const orders = useCamporeeOrdersDraft({
    camporeeId,
    kind,
    initial: {
      enabled: camporee?.orders_enabled ?? false,
      opensAt: camporee?.orders_opens_at,
      deadline: camporee?.orders_deadline,
    },
    canConfigure: canConfigureOrders,
  });

  const dirty = isFormDirty(initial, values) || orders.dirty;

  function set<K extends keyof CamporeeFormValues>(key: K, value: CamporeeFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const sections = [
    { id: "datos", title: t("sections.data") },
    { id: "fechas", title: t("sections.dates") },
    { id: "lugar", title: t("sections.place") },
    { id: "alcance", title: t("sections.scope") },
    ...(canConfigureOrders ? [{ id: "pedidos", title: t("sections.orders") }] : []),
  ];

  async function handleSave() {
    const found = validateCamporeeForm(values, kind);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = (Object.keys(found)[0] ?? "name") as keyof CamporeeFormValues;
      document.getElementById(`camporee-${first}`)?.focus();
      return;
    }
    if (!dirty) {
      toast(tVal("no_changes"));
      return;
    }

    setPending(true);
    let savedId = camporeeId;
    try {
      if (isEdit && savedId) {
        const body = buildCamporeeUpdate(initial, values, kind);
        if (Object.keys(body).length > 0) {
          if (isUnion) await updateUnionCamporee(savedId, body);
          else await updateCamporee(savedId, body);
        }
      } else {
        const response = isUnion
          ? await createUnionCamporee(buildUnionCreatePayload(values))
          : await createCamporee(buildLocalCreatePayload(values));
        const record = extractCamporeeRecord(response, kind);
        savedId = toPositiveNumber(
          record?.[isUnion ? "union_camporee_id" : "local_camporee_id"] ?? record?.camporee_id,
        );
      }
    } catch (error) {
      toastError({
        title: tt("errors.save_camporee"),
        description: error instanceof Error ? error.message : undefined,
        onRetry: () => void handleSave(),
      });
      setPending(false);
      return;
    }

    if (!savedId) {
      // Created, but the response did not say where: the list shows it.
      toast.success(isUnion ? tt("toasts.union_camporee_created") : tt("toasts.camporee_created"));
      router.push("/dashboard/campamentos");
      router.refresh();
      return;
    }

    if (canConfigureOrders && (orders.dirty || !isEdit)) {
      const wantsOrders =
        orders.dirty ||
        orders.draft.enabled ||
        orders.draft.rows.some((row) => row.active);
      if (wantsOrders) {
        try {
          await orders.save(savedId);
        } catch (error) {
          // The camporee is stored; send the user to edit to retry the orders.
          toastError({
            title: t("ordersSaveFailed"),
            description: error instanceof Error ? error.message : undefined,
          });
          router.push(`${camporeeBasePath(kind, savedId)}/edit`);
          router.refresh();
          return;
        }
      }
    }

    toast.success(
      isEdit
        ? isUnion
          ? tt("toasts.union_camporee_updated")
          : tt("toasts.camporee_updated")
        : isUnion
          ? tt("toasts.union_camporee_created")
          : tt("toasts.camporee_created"),
    );
    router.push(camporeeBasePath(kind, savedId));
    router.refresh();
  }

  function fieldError(key: keyof CamporeeFormValues) {
    const code = errors[key];
    return code ? (
      <p id={`camporee-${key}-error`} role="alert" className="text-xs text-destructive">
        {tVal(code)}
      </p>
    ) : null;
  }

  const invalid = (key: keyof CamporeeFormValues) =>
    errors[key] ? { "aria-invalid": true, "aria-describedby": `camporee-${key}-error` } : {};

  const ownerLabel = isUnion ? tUnion("labelUnion") : tf("labelLocalFieldId");
  const ownerPlaceholder = isUnion ? tUnion("placeholderUnion") : tf("placeholderLocalField");
  const ownerEmpty = isUnion ? t("noUnions") : tf("emptyLocalFields");

  const lat = values.lat.trim() !== "" ? Number(values.lat) : undefined;
  const long = values.long.trim() !== "" ? Number(values.long) : undefined;

  return (
    <SectionFormPage
      sections={sections}
      dirty={dirty}
      pending={pending}
      onSave={() => void handleSave()}
      onCancel={() => router.push(cancelHref)}
      saveLabel={isEdit ? tf("saveChanges") : tf("createCamporee")}
      footerNote={canConfigureOrders ? t("footerNote") : undefined}
    >
      <FormSection id="datos" title={t("sections.data")}>
        <div className="space-y-1.5">
          <Label htmlFor="camporee-name">
            {tf("labelName")} <span aria-hidden className="text-destructive">*</span>
          </Label>
          <Input
            id="camporee-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={isUnion ? tUnion("placeholderName") : tf("placeholderName")}
            aria-required="true"
            {...invalid("name")}
          />
          {fieldError("name")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="camporee-description">{tf("labelDescription")}</Label>
          <Textarea
            id="camporee-description"
            rows={3}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={tf("placeholderDescription")}
          />
        </div>
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="camporee-owner_id">
            {ownerLabel} <span aria-hidden className="text-destructive">*</span>
          </Label>
          <Select
            value={values.owner_id}
            onValueChange={(v) => set("owner_id", v)}
            disabled={ownerLocked || owners.length === 0}
          >
            <SelectTrigger
              id="camporee-owner_id"
              className="w-full"
              aria-required="true"
              {...invalid("owner_id")}
            >
              <SelectValue placeholder={owners.length === 0 ? ownerEmpty : ownerPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {owners.map((owner) => (
                <SelectItem key={owner.value} value={String(owner.value)}>
                  {owner.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("owner_id")}
        </div>
      </FormSection>

      <FormSection id="fechas" title={t("sections.dates")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="camporee-start_date">
              {tf("labelStartDate")} <span aria-hidden className="text-destructive">*</span>
            </Label>
            <Input
              id="camporee-start_date"
              type="date"
              value={values.start_date}
              onChange={(e) => set("start_date", e.target.value)}
              aria-required="true"
              {...invalid("start_date")}
            />
            {fieldError("start_date")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camporee-end_date">
              {tf("labelEndDate")} <span aria-hidden className="text-destructive">*</span>
            </Label>
            <Input
              id="camporee-end_date"
              type="date"
              value={values.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              aria-required="true"
              {...invalid("end_date")}
            />
            {fieldError("end_date")}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="camporee-club_registration_deadline">
              {tf("labelClubRegistrationDeadline")}
            </Label>
            <Input
              id="camporee-club_registration_deadline"
              type="datetime-local"
              value={values.club_registration_deadline}
              onChange={(e) => set("club_registration_deadline", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camporee-member_registration_deadline">
              {tf("labelMemberRegistrationDeadline")}
            </Label>
            <Input
              id="camporee-member_registration_deadline"
              type="datetime-local"
              value={values.member_registration_deadline}
              onChange={(e) => set("member_registration_deadline", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camporee-payment_deadline">{tf("labelPaymentDeadline")}</Label>
            <Input
              id="camporee-payment_deadline"
              type="datetime-local"
              value={values.payment_deadline}
              onChange={(e) => set("payment_deadline", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camporee-agenda_visible_from">{tf("labelAgendaVisibleFrom")}</Label>
            <Input
              id="camporee-agenda_visible_from"
              type="datetime-local"
              value={values.agenda_visible_from}
              onChange={(e) => set("agenda_visible_from", e.target.value)}
              aria-describedby="camporee-agenda-help"
            />
            <p id="camporee-agenda-help" className="text-xs text-muted-foreground">
              {tf("helpAgendaVisibleFrom")}
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection id="lugar" title={t("sections.place")}>
        <div className="space-y-1.5">
          <Label htmlFor="camporee-place">
            {tf("labelPlace")} <span aria-hidden className="text-destructive">*</span>
          </Label>
          <Input
            id="camporee-place"
            value={values.place}
            onChange={(e) => set("place", e.target.value)}
            placeholder={isUnion ? tUnion("placeholderPlace") : tf("placeholderPlace")}
            aria-required="true"
            {...invalid("place")}
          />
          {fieldError("place")}
        </div>
        <div className="space-y-1.5">
          <Label>{tf("labelMap")}</Label>
          <p className="text-xs text-muted-foreground">{tf("helpMap")}</p>
          <LocationPicker
            key={camporeeId ?? "new"}
            apiKey={MAPS_KEY}
            mapsMapId={MAPS_MAP_ID}
            latFieldName="lat"
            lngFieldName="long"
            initialLat={Number.isFinite(lat) ? lat : undefined}
            initialLng={Number.isFinite(long) ? long : undefined}
            initialAddress={values.place}
            onLocationChange={(value) => {
              setValues((prev) => ({
                ...prev,
                lat: value ? String(value.lat) : "",
                long: value ? String(value.lng) : "",
                place: !prev.place.trim() && value?.address.trim() ? value.address : prev.place,
              }));
              setErrors((prev) => ({ ...prev, lat: undefined, long: undefined }));
            }}
          />
          {fieldError("lat")}
          {fieldError("long")}
        </div>
      </FormSection>

      <FormSection id="alcance" title={t("sections.scope")}>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{tf("labelIncludes")}</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {(
              [
                ["includes_adventurers", tf("adventurers")],
                ["includes_pathfinders", tf("pathfinders")],
                ["includes_master_guides", tf("masterGuides")],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`camporee-${key}`}
                  checked={values[key]}
                  onCheckedChange={(checked) => set(key, checked === true)}
                />
                <Label htmlFor={`camporee-${key}`} className="font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="camporee-registration_cost">{tf("labelRegistrationCost")}</Label>
          <Input
            id="camporee-registration_cost"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={values.registration_cost}
            onChange={(e) => set("registration_cost", e.target.value)}
            placeholder="0.00"
            className={cn("tabular-nums")}
            aria-describedby="camporee-cost-help"
          />
          <p id="camporee-cost-help" className="text-xs text-muted-foreground">
            {t("perMember")}
          </p>
        </div>
      </FormSection>

      {canConfigureOrders && (
        <FormSection
          id="pedidos"
          title={t("sections.orders")}
          description={t("ordersDescription")}
        >
          <CamporeeOrdersSection
            draft={orders.draft}
            onChange={orders.setDraft}
            loading={orders.loading}
            loadError={orders.loadError}
            onRetry={() => void orders.reload()}
          />
        </FormSection>
      )}
    </SectionFormPage>
  );
}
