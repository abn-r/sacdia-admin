"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoleLabel } from "@/components/service-credentials/service-credential-shared";
import { listAdminCertifications, type AdminCertificationListItem } from "@/lib/api/certifications";
import { ApiError } from "@/lib/api/client";
import {
  ROLE_REQUIREMENT_MODES,
  updateRoleRequirement,
  type RoleRequirement,
  type RoleRequirementMode,
  type UpdateRoleRequirementInput,
} from "@/lib/api/role-requirements";
import { getServiceCredentialErrorCode } from "@/lib/api/service-credentials";
import { unwrapApiData } from "@/lib/api/unwrap";
import { useFormatDate } from "@/lib/format-locale";

export const ROLE_REQUIREMENTS_KEY = ["role-requirements"] as const;
const CERTIFICATIONS_KEY = ["role-requirements", "certification-options"] as const;
const NO_CERTIFICATION = "none";

type CertificationOption = { id: number; name: string };

async function loadCertificationOptions(): Promise<CertificationOption[]> {
  const payload = await listAdminCertifications();
  const list = unwrapApiData<AdminCertificationListItem[] | null>(payload) ?? [];
  return (Array.isArray(list) ? list : [])
    .filter((item) => item.active !== false)
    .map((item) => ({ id: item.certification_id, name: item.name }));
}

type Props = {
  requirement: RoleRequirement;
  onClose: () => void;
};

/**
 * Edit of one requirement (mode, effective date, equivalent certification).
 * Few fields, no lifecycle of their own: a Dialog (DS §8.3), not a routed modal.
 * Moving to Obligatoria asks for confirmation first: it changes who can be assigned.
 */
export function RoleRequirementEditDialog({ requirement, onClose }: Props) {
  const t = useTranslations("role_requirements");
  const tRoles = useRoleLabel();
  const formatDate = useFormatDate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<RoleRequirementMode>(requirement.mode);
  const [effectiveFrom, setEffectiveFrom] = useState(requirement.effective_from ?? "");
  const [certification, setCertification] = useState(
    requirement.equivalent_certification
      ? String(requirement.equivalent_certification.certification_id)
      : NO_CERTIFICATION,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const certificationsQuery = useQuery({
    queryKey: CERTIFICATIONS_KEY,
    queryFn: loadCertificationOptions,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const certificationsReady = certificationsQuery.isSuccess;
  const options: CertificationOption[] = (() => {
    const loaded = certificationsQuery.data ?? [];
    const current = requirement.equivalent_certification;
    if (current && !loaded.some((option) => option.id === current.certification_id)) {
      return [...loaded, { id: current.certification_id, name: current.name }];
    }
    return loaded;
  })();

  const roleName = tRoles(requirement.role.name);
  const requirementName = (() => {
    const key = `requirementType.${requirement.requirement_type}`;
    return t.has(key as Parameters<typeof t.has>[0])
      ? t(key as Parameters<typeof t>[0])
      : requirement.requirement_type;
  })();

  const save = useMutation({
    mutationFn: (input: UpdateRoleRequirementInput) =>
      updateRoleRequirement(requirement.requirement_id, input),
    onSuccess: () => {
      toast.success(t("toasts.saved"));
      void queryClient.invalidateQueries({ queryKey: ROLE_REQUIREMENTS_KEY });
      setConfirmOpen(false);
      onClose();
    },
    onError: (error) => {
      setConfirmOpen(false);
      const code = getServiceCredentialErrorCode(error);
      if (code === "ROLE_REQUIREMENT_NOT_FOUND") {
        toast.error(t("errors.notFound"));
        void queryClient.invalidateQueries({ queryKey: ROLE_REQUIREMENTS_KEY });
        onClose();
        return;
      }
      if (code === "ROLE_REQUIREMENT_CERTIFICATION_INVALID") {
        setFormError(t("errors.certificationInvalid"));
      } else if (code === "ROLE_REQUIREMENT_DATE_INVALID") {
        setFormError(t("errors.dateInvalid"));
      } else if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setFormError(t("errors.forbidden"));
      } else {
        setFormError(t("errors.generic"));
      }
    },
  });

  const nextDate = effectiveFrom || null;
  const nextCertificationId = certification === NO_CERTIFICATION ? null : Number(certification);
  const modeChanged = mode !== requirement.mode;
  const dateChanged = nextDate !== requirement.effective_from;
  const certificationChanged =
    certificationsReady &&
    nextCertificationId !== (requirement.equivalent_certification?.certification_id ?? null);
  const dirty = modeChanged || dateChanged || certificationChanged;
  // Obligatoria only changes who can be assigned when it is new or its date moved.
  const needsConfirmation = mode === "BLOCK" && (modeChanged || dateChanged);

  function buildInput(): UpdateRoleRequirementInput {
    const input: UpdateRoleRequirementInput = {};
    if (modeChanged) input.mode = mode;
    if (dateChanged) input.effective_from = nextDate;
    if (certificationChanged) input.equivalent_certification_id = nextCertificationId;
    return input;
  }

  function submit() {
    setFormError(null);
    if (!dirty) {
      onClose();
      return;
    }
    if (needsConfirmation) {
      setConfirmOpen(true);
      return;
    }
    save.mutate(buildInput());
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>
              {t("edit.description", { role: roleName, requirement: requirementName })}
            </DialogDescription>
          </DialogHeader>

          <form
            id="role-requirement-form"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role-requirement-mode">{t("edit.modeLabel")}</FieldLabel>
                <Select value={mode} onValueChange={(value) => setMode(value as RoleRequirementMode)}>
                  <SelectTrigger id="role-requirement-mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_REQUIREMENT_MODES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`modes.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{t(`modeHints.${mode}`)}</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="role-requirement-effective-from">
                  {t("edit.effectiveLabel")}
                </FieldLabel>
                <Input
                  id="role-requirement-effective-from"
                  type="date"
                  value={effectiveFrom}
                  aria-describedby="role-requirement-effective-hint"
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                />
                <FieldDescription id="role-requirement-effective-hint">
                  {mode === "BLOCK" ? t("edit.effectiveBlockHint") : t("edit.effectiveHint")}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="role-requirement-certification">
                  {t("edit.equivalentLabel")}
                </FieldLabel>
                {certificationsQuery.isError ? (
                  <Alert>
                    <AlertDescription>{t("edit.equivalentUnavailable")}</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Select
                      value={certification}
                      onValueChange={setCertification}
                      disabled={!certificationsReady}
                    >
                      <SelectTrigger id="role-requirement-certification" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CERTIFICATION}>{t("edit.equivalentNone")}</SelectItem>
                        {options.map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>{t("edit.equivalentHint")}</FieldDescription>
                  </>
                )}
              </Field>

              {formError ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}
            </FieldGroup>
          </form>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
              {t("edit.cancel")}
            </Button>
            <Button
              type="submit"
              form="role-requirement-form"
              loading={save.isPending && !confirmOpen}
              disabled={save.isPending}
            >
              {t("edit.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !save.isPending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("blockConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {nextDate
                ? t("blockConfirm.descriptionOnDate", { role: roleName, date: formatDate(nextDate) })
                : t("blockConfirm.descriptionImmediate", { role: roleName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={save.isPending}>{t("blockConfirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              loading={save.isPending}
              onClick={(event) => {
                event.preventDefault();
                save.mutate(buildInput());
              }}
            >
              {t("blockConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
