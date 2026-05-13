import type { ReactNode } from "react";
import { DetailSection, DetailField, DetailCols2 } from "./section";
import { HealthBlock } from "./health-block";
import { ContactsBlock } from "./contacts-block";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { ContactEntry } from "./contacts-block";

export interface ResumenIdentityField {
  k: string;
  v: ReactNode;
  muted?: boolean;
}

export interface ResumenTabProps {
  identityTitle: string;
  identityFieldsLeft: ResumenIdentityField[];
  identityFieldsRight: ResumenIdentityField[];

  // Pastoral / club assignments
  pastoralTitle: string;
  pastoralEmpty: string;
  assignments: Array<{
    id: string;
    clubName: string | null;
    sectionName: string | null;
    roleName: string | null;
  }>;
  clubLabel: string;
  sectionLabel: string;
  roleLabel: string;

  // Health
  showHealth: boolean;
  healthProps: React.ComponentProps<typeof HealthBlock>;

  // Roles & accesses
  rolesAccessTitle: string;
  rolesLabel: string;
  rolesEmpty: string;
  globalRoles: string[];
  accessAppLabel: string;
  accessAppSub: string;
  accessPanelLabel: string;
  accessPanelSub: string;
  activeLabel: string;
  activeSub: string;
  accessApp: boolean;
  accessPanel: boolean;
  active: boolean;

  // Contacts
  showContacts: boolean;
  contactsProps: {
    hasPayload: boolean;
    contacts: ContactEntry[];
    title: string;
    principalLabel: string;
    callLabel: string;
    emptyMessage: string;
    missingPayloadMessage: string;
  };

  // Legal rep
  showLegalRep: boolean;
  legalRepTitle: string;
  legalRepEmpty: string;
  legalRep: { fullName: string; phone: string; relationship: string } | null;
  legalNameLabel: string;
  legalPhoneLabel: string;
  legalRelationshipLabel: string;
}

export function UserDetailResumenTab(props: ResumenTabProps) {
  return (
    <div className="space-y-3.5">
      <DetailSection num="01" title={props.identityTitle}>
        <DetailCols2>
          <div>
            {props.identityFieldsLeft.map((f) => (
              <DetailField key={f.k} k={f.k} v={f.v} muted={f.muted} />
            ))}
          </div>
          <div>
            {props.identityFieldsRight.map((f) => (
              <DetailField key={f.k} k={f.k} v={f.v} muted={f.muted} />
            ))}
          </div>
        </DetailCols2>
      </DetailSection>

      <DetailSection num="02" title={props.pastoralTitle}>
        {props.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{props.pastoralEmpty}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/70">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{props.clubLabel}</th>
                  <th className="px-3 py-2 text-left font-semibold">{props.sectionLabel}</th>
                  <th className="px-3 py-2 text-left font-semibold">{props.roleLabel}</th>
                </tr>
              </thead>
              <tbody>
                {props.assignments.map((a) => (
                  <tr key={a.id} className="border-t border-border/70">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {a.clubName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.sectionName ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {a.roleName ? (
                        <Badge variant="soft">{a.roleName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailSection>

      {props.showHealth ? <HealthBlock {...props.healthProps} /> : null}

      <DetailSection num="04" title={props.rolesAccessTitle}>
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {props.rolesLabel}
          </div>
          {props.globalRoles.length === 0 ? (
            <span className="text-sm italic text-muted-foreground/70">
              {props.rolesEmpty}
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {props.globalRoles.map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ReadOnlyToggle label={props.accessAppLabel} sub={props.accessAppSub} on={props.accessApp} />
          <ReadOnlyToggle label={props.accessPanelLabel} sub={props.accessPanelSub} on={props.accessPanel} />
          <ReadOnlyToggle label={props.activeLabel} sub={props.activeSub} on={props.active} />
        </div>
      </DetailSection>

      {props.showContacts ? (
        <ContactsBlock
          num="05"
          title={props.contactsProps.title}
          hasPayload={props.contactsProps.hasPayload}
          contacts={props.contactsProps.contacts}
          principalLabel={props.contactsProps.principalLabel}
          callLabel={props.contactsProps.callLabel}
          emptyMessage={props.contactsProps.emptyMessage}
          missingPayloadMessage={props.contactsProps.missingPayloadMessage}
        />
      ) : null}

      {props.showLegalRep ? (
        <DetailSection num="06" title={props.legalRepTitle}>
          {!props.legalRep ? (
            <p className="text-sm text-muted-foreground">{props.legalRepEmpty}</p>
          ) : (
            <DetailCols2>
              <DetailField k={props.legalNameLabel} v={props.legalRep.fullName} />
              <DetailField k={props.legalPhoneLabel} v={props.legalRep.phone} />
              <DetailField k={props.legalRelationshipLabel} v={props.legalRep.relationship} />
            </DetailCols2>
          )}
        </DetailSection>
      ) : null}
    </div>
  );
}

function ReadOnlyToggle({ label, sub, on }: { label: string; sub: string; on: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-3.5 ${
        on ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <Switch checked={on} disabled aria-readonly="true" />
    </div>
  );
}
