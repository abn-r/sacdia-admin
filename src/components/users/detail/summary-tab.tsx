import type { ReactNode } from "react";
import { ContactsBlock, type ContactsBlockProps } from "./contacts-block";

export interface UserDetailSummaryTabProps {
  /** Clubs and cargos (UserRolesOverview). */
  clubs: ReactNode;
  /** Guardianships / family-access cards, already gated; each may be null. */
  guardianships?: ReactNode;
  familyAccess?: ReactNode;
  /** `null` when the actor lacks `emergency_contacts.read`. */
  contacts: ContactsBlockProps | null;
}

/**
 * Resumen keeps only what no other tab holds: clubs and cargos, guardianships
 * and contact. Identity, location, health and access live in the page header,
 * the aside and their own tabs.
 */
export function UserDetailSummaryTab({
  clubs,
  guardianships,
  familyAccess,
  contacts,
}: UserDetailSummaryTabProps) {
  return (
    <div className="space-y-6">
      {clubs}
      {guardianships}
      {familyAccess}
      {contacts ? <ContactsBlock {...contacts} num="" /> : null}
    </div>
  );
}
