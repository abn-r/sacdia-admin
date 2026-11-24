"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SettingsRow, SettingsSection } from "@/components/shared/settings-rows";
import { Switch } from "@/components/ui/switch";
import { patchUserAccessFlag } from "@/lib/users/detail-access";
import {
  accessChangeId,
  isRiskyAccessChange,
  type AccessField,
} from "@/lib/users/detail-model";

interface UserAccessTogglesProps {
  userId: string;
  initialAccessApp: boolean | undefined;
  initialAccessPanel: boolean | undefined;
  initialActive: boolean | undefined;
  /** Accesos is admin/super-admin only; hide (do not disable) otherwise. */
  canManage: boolean;
}

export function UserAccessToggles(props: UserAccessTogglesProps) {
  if (!props.canManage) {
    return null;
  }

  return <UserAccessTogglesForm {...props} />;
}

function UserAccessTogglesForm({
  userId,
  initialAccessApp,
  initialAccessPanel,
  initialActive,
}: UserAccessTogglesProps) {
  const t = useTranslations("people.userDetail.access");
  const tToasts = useTranslations("users.toasts");
  const router = useRouter();
  const [values, setValues] = useState<Record<AccessField, boolean>>({
    access_app: initialAccessApp ?? false,
    access_panel: initialAccessPanel ?? false,
    active: initialActive ?? true,
  });
  const [proposal, setProposal] = useState<{ field: AccessField; next: boolean } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  async function apply(field: AccessField, next: boolean) {
    setPending(true);
    try {
      await patchUserAccessFlag(userId, { [field]: next });
      setValues((prev) => ({ ...prev, [field]: next }));
      toast.success(tToasts("access_updated"));
      // The aside shows the same flags: re-render the server tree.
      router.refresh();
    } catch {
      // ConfirmDialog keeps itself open and shows this message inline.
      throw new Error(tToasts("access_update_failed"));
    } finally {
      setPending(false);
    }
  }

  const rows: Array<{ field: AccessField; id: string; label: string; description: string }> = [
    {
      field: "access_app",
      id: "toggle-access-app",
      label: t("appLabel"),
      description: t("appDescription"),
    },
    {
      field: "access_panel",
      id: "toggle-access-panel",
      label: t("panelLabel"),
      description: t("panelDescription"),
    },
    {
      field: "active",
      id: "toggle-active",
      label: t("activeLabel"),
      description: t("activeDescription"),
    },
  ];

  const changeId = proposal ? accessChangeId(proposal.field, proposal.next) : null;

  return (
    <>
      <SettingsSection title={t("sectionTitle")} description={t("sectionDescription")}>
        {rows.map((row) => (
          <SettingsRow
            key={row.field}
            label={<label htmlFor={row.id}>{row.label}</label>}
            description={row.description}
            control={
              <Switch
                id={row.id}
                aria-label={row.label}
                checked={values[row.field]}
                disabled={pending}
                onCheckedChange={(next) => setProposal({ field: row.field, next })}
              />
            }
          />
        ))}
      </SettingsSection>

      {proposal && changeId ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setProposal(null);
          }}
          title={t(`confirm.${changeId}.title`)}
          description={t(`confirm.${changeId}.description`)}
          confirmLabel={t(`confirm.${changeId}.confirm`)}
          tone={isRiskyAccessChange(proposal.next) ? "destructive" : "default"}
          pending={pending}
          onConfirm={() => apply(proposal.field, proposal.next)}
        />
      ) : null}
    </>
  );
}
