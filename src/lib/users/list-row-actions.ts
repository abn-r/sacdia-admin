/**
 * Which "⋯" actions a row of the users list offers. Pure: the component feeds
 * it the actor's capabilities, so only what the API supports AND the actor may
 * do is shown.
 */

export type UserRowActionCaps = {
  /** `users.view_detail` */
  canViewDetail: boolean;
  /** `users.create` (also gates POST /admin/users/:id/invitation) */
  canCreate: boolean;
  /** `users.update_admin` (PATCH /admin/users/:id) */
  canUpdateAdmin: boolean;
};

export type UserRowActionSubject = {
  active?: boolean | null;
  isDeleted?: boolean | null;
  /** `post_registration.complete`; `null`/`undefined` when the list did not say. */
  postRegistrationComplete?: boolean | null;
};

export type UserRowActionFlags = {
  view: boolean;
  resendInvitation: boolean;
  deactivate: boolean;
};

export function resolveUserRowActions(
  user: UserRowActionSubject,
  caps: UserRowActionCaps,
): UserRowActionFlags {
  const deleted = user.isDeleted === true;
  const active = user.active !== false;
  return {
    view: caps.canViewDetail,
    // The list does not carry `invitation_pending` (only the detail does). An
    // invitation can only be pending while post-registration is incomplete, so
    // that is the narrowest safe superset; the API answers 409 for the rest.
    resendInvitation:
      caps.canCreate && !deleted && active && user.postRegistrationComplete !== true,
    deactivate: caps.canUpdateAdmin && !deleted && active,
  };
}

export type ResendInvitationFailure =
  | "alreadyAccepted"
  | "cooldown"
  | "unavailable"
  | "forbidden"
  | "notFound"
  | "generic";

/** Maps the resend endpoint's status codes (409, 429, 503, 403, 404) to a message key. */
export function resendInvitationFailure(status: number | null | undefined): ResendInvitationFailure {
  switch (status) {
    case 409:
      return "alreadyAccepted";
    case 429:
      return "cooldown";
    case 503:
      return "unavailable";
    case 403:
      return "forbidden";
    case 404:
      return "notFound";
    default:
      return "generic";
  }
}
