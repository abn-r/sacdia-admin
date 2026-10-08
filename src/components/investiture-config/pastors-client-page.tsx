"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MapPin, Landmark, UserMinus, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PageHeader } from "@/components/shared/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import {
  removeDistrictPastor,
  updatePastorQuota,
  type DistrictPastor,
  type DistrictPastorList,
  type PastorQuota,
} from "@/lib/api/investiture-field-config";
import { AssignPastorDialog } from "./assign-pastor-dialog";

export interface PastorsLoadError {
  status: number | null;
  message: string;
}

/** One district of the Field with the outcome of loading its pastors. */
export interface DistrictPastorsEntry {
  districtId: number;
  name: string;
  list: DistrictPastorList | null;
  error: PastorsLoadError | null;
}

export interface PastorsClientPageProps {
  /** Local field whose districts are listed; null until a picker-capable role chooses one. */
  localFieldId: number | null;
  districts: DistrictPastorsEntry[];
  quota: PastorQuota | null;
  quotaError: PastorsLoadError | null;
  /** The district list itself could not be loaded. */
  loadError: PastorsLoadError | null;
  /** Server-rendered local-field picker for union, division and admin roles. */
  localFieldPicker?: ReactNode;
}

type PendingRemoval = {
  districtId: number;
  districtName: string;
  pastor: DistrictPastor;
};

type AssignTarget = {
  districtId: number;
  districtName: string;
  assignedUserIds: string[];
};

export function PastorsClientPage({
  localFieldId,
  districts,
  quota,
  quotaError,
  loadError,
  localFieldPicker,
}: PastorsClientPageProps) {
  const t = useTranslations("investiture_config.pastors");
  const tRoot = useTranslations("investiture_requests");
  const router = useRouter();

  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Super-admin can edit the quota but the backend only lets the Field or union
  // assign and remove, so those actions are hidden for the quota editor.
  const canManagePastors = quota?.can_edit !== true;

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    setIsRemoving(true);
    try {
      await removeDistrictPastor(pendingRemoval.districtId, pendingRemoval.pastor.user_id);
      toast.success(t("removeDialog.removed"));
      setPendingRemoval(null);
      router.refresh();
    } catch (error) {
      toast.error(getInvestitureRequestErrorMessage(error, tRoot));
      setPendingRemoval(null);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbHome"), href: "/dashboard" },
          { label: t("breadcrumbGroup") },
          { label: t("title") },
        ]}
      />

      {quotaError ? (
        <EndpointErrorBanner
          state={quotaError.status === 403 ? "forbidden" : "missing"}
          detail={quotaError.message}
        />
      ) : (
        quota && <QuotaCard quota={quota} />
      )}

      {localFieldPicker}

      {localFieldId === null && (
        <EmptyState
          icon={MapPin}
          title={t("selectLocalFieldTitle")}
          description={t("selectLocalFieldDescription")}
        />
      )}

      {localFieldId !== null && loadError && (
        <EndpointErrorBanner
          state={loadError.status === 403 ? "forbidden" : "missing"}
          detail={loadError.message}
        />
      )}

      {localFieldId !== null && !loadError && districts.length === 0 && (
        <EmptyState
          icon={Landmark}
          title={t("noDistrictsTitle")}
          description={t("noDistrictsDescription")}
        />
      )}

      {localFieldId !== null && !loadError && districts.length > 0 && (
        <div className="flex flex-col gap-4">
          {districts.map((district) => (
            <DistrictCard
              key={district.districtId}
              district={district}
              canManage={canManagePastors}
              onAssign={() =>
                setAssignTarget({
                  districtId: district.districtId,
                  districtName: district.name,
                  assignedUserIds: district.list?.pastors.map((pastor) => pastor.user_id) ?? [],
                })
              }
              onRemove={(pastor) =>
                setPendingRemoval({
                  districtId: district.districtId,
                  districtName: district.name,
                  pastor,
                })
              }
            />
          ))}
        </div>
      )}

      {assignTarget && (
        <AssignPastorDialog
          open
          onOpenChange={(next) => {
            if (!next) setAssignTarget(null);
          }}
          districtId={assignTarget.districtId}
          districtName={assignTarget.districtName}
          excludeUserIds={assignTarget.assignedUserIds}
          onAssigned={() => router.refresh()}
        />
      )}

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(next) => {
          if (!next && !isRemoving) setPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeDialog.description", {
                name: pendingRemoval ? pastorLabel(pendingRemoval.pastor, t("pastor.noName")) : "",
                district: pendingRemoval?.districtName ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>{t("removeDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRemoving}
              onClick={(event) => {
                // Keep the dialog open until the request settles.
                event.preventDefault();
                void confirmRemoval();
              }}
            >
              {isRemoving && <Loader2 className="animate-spin" aria-hidden="true" />}
              {isRemoving ? t("removeDialog.removing") : t("removeDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function pastorLabel(pastor: DistrictPastor, fallback: string): string {
  return pastor.user_name?.trim() || pastor.email || fallback;
}

// ─── District ────────────────────────────────────────────────────────────────

interface DistrictCardProps {
  district: DistrictPastorsEntry;
  canManage: boolean;
  onAssign: () => void;
  onRemove: (pastor: DistrictPastor) => void;
}

function DistrictCard({ district, canManage, onAssign, onRemove }: DistrictCardProps) {
  const t = useTranslations("investiture_config.pastors");
  const titleId = useId();
  const { list, error } = district;

  const isFull = list !== null && list.pastors.length >= list.slots;

  return (
    <Card role="region" aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId}>{district.name}</CardTitle>
        {list && (
          <CardDescription>
            <Badge variant="outline">
              {t("district.count", { count: list.pastors.length, slots: list.slots })}
            </Badge>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <EndpointErrorBanner
            state={error.status === 403 ? "forbidden" : "missing"}
            detail={error.message}
          />
        )}

        {list && list.pastors.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("district.empty")}</p>
        )}

        {list && list.pastors.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {list.pastors.map((pastor) => (
              <PastorRow
                key={pastor.user_id}
                pastor={pastor}
                canManage={canManage}
                onRemove={() => onRemove(pastor)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {list && canManage && (list.can_assign || isFull) && (
        <CardFooter className="justify-between gap-3">
          {isFull ? (
            <p className="text-sm text-muted-foreground">{t("district.full")}</p>
          ) : (
            <span />
          )}
          {list.can_assign && (
            <Button type="button" size="sm" onClick={onAssign}>
              <UserPlus aria-hidden="true" />
              {t("district.assign")}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

// ─── Pastor ──────────────────────────────────────────────────────────────────

interface PastorRowProps {
  pastor: DistrictPastor;
  canManage: boolean;
  onRemove: () => void;
}

function PastorRow({ pastor, canManage, onRemove }: PastorRowProps) {
  const t = useTranslations("investiture_config.pastors.pastor");
  const name = pastor.user_name?.trim() || t("noName");
  const flagged = pastor.role_missing === true || pastor.account_inactive === true;

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 p-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          {pastor.can_authorize && <StatusBadge intent="success" label={t("canAuthorize")} size="sm" />}
          {pastor.role_missing && <StatusBadge intent="warning" label={t("roleMissing")} size="sm" />}
          {pastor.account_inactive && (
            <StatusBadge intent="destructive" label={t("accountInactive")} size="sm" />
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{pastor.email ?? t("noEmail")}</p>
        {flagged && <p className="text-xs text-muted-foreground">{t("inactiveHelp")}</p>}
      </div>

      {canManage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t("removeAria", { name })}
          onClick={onRemove}
        >
          <UserMinus aria-hidden="true" />
          {t("remove")}
        </Button>
      )}
    </li>
  );
}

// ─── Quota ───────────────────────────────────────────────────────────────────

type QuotaFormValues = { slots: string };

function QuotaCard({ quota: initial }: { quota: PastorQuota }) {
  const t = useTranslations("investiture_config.pastors.quota");
  const tRoot = useTranslations("investiture_requests");
  const router = useRouter();

  const [saved, setSaved] = useState<PastorQuota | null>(null);
  const view = saved ?? initial;

  const schema = useMemo(
    () => z.object({ slots: z.string().trim().regex(/^\d{1,4}$/, t("invalid")) }),
    [t],
  );

  const form = useForm<QuotaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { slots: String(view.slots) },
  });
  const isSubmitting = form.formState.isSubmitting;

  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await updatePastorQuota(Number(values.slots));
      setSaved(result);
      form.reset({ slots: String(result.slots) });
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      toast.error(getInvestitureRequestErrorMessage(error, tRoot));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={submit} noValidate>
          <CardContent>
            {view.can_edit ? (
              <FormField
                control={form.control}
                name="slots"
                render={({ field }) => (
                  <FormItem className="max-w-40">
                    <FormLabel>{t("label")}</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" min={0} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-foreground">{t("current", { slots: view.slots })}</p>
                <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
              </div>
            )}
          </CardContent>
          {view.can_edit && (
            <CardFooter className="justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {isSubmitting ? t("saving") : t("save")}
              </Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}
