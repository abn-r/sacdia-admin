/**
 * Pure helpers of the compose form. Kept outside the `"use client"` module so
 * the server pages can read `parseComposeAudience` without importing client code.
 */

export type ComposeAudience = "person" | "club" | "everyone";

export type ComposeDraft = {
  audience: ComposeAudience;
  /** `user_id` of the picked member (audience `person`). */
  userId: string;
  /** `"<instanceType>:<instanceId>"` of the picked section (audience `club`). */
  instanceTarget: string;
  title: string;
  body: string;
};

type Permissions = { person: boolean; club: boolean; everyone: boolean };

export function availableComposeAudiences(permissions: Permissions): ComposeAudience[] {
  const out: ComposeAudience[] = [];
  if (permissions.person) out.push("person");
  if (permissions.club) out.push("club");
  if (permissions.everyone) out.push("everyone");
  return out;
}

/**
 * Old `?type=` values keep working: direct -> person, broadcast -> everyone,
 * club -> club. The new names are accepted too.
 */
export function parseComposeAudience(value: string | undefined | null): ComposeAudience | undefined {
  switch (value) {
    case "person":
    case "direct":
      return "person";
    case "club":
      return "club";
    case "everyone":
    case "broadcast":
      return "everyone";
    default:
      return undefined;
  }
}

export type ComposeValidationKey =
  | "validation.user_id_required"
  | "validation.instance_id_required"
  | "validation.title_required"
  | "validation.body_required";

/** Field -> message key (`notifications` namespace). Same field names the server actions return. */
export function validateCompose(draft: ComposeDraft): Partial<Record<string, ComposeValidationKey>> {
  const errors: Partial<Record<string, ComposeValidationKey>> = {};
  if (draft.audience === "person" && !draft.userId) errors.user_id = "validation.user_id_required";
  if (draft.audience === "club" && !draft.instanceTarget) {
    errors.instance_id = "validation.instance_id_required";
  }
  if (!draft.title.trim()) errors.title = "validation.title_required";
  if (!draft.body.trim()) errors.body = "validation.body_required";
  return errors;
}

/** The FormData the existing server actions read. */
export function buildComposeFormData(draft: ComposeDraft): FormData {
  const formData = new FormData();
  formData.set("title", draft.title.trim());
  formData.set("body", draft.body.trim());
  if (draft.audience === "person") formData.set("user_id", draft.userId);
  if (draft.audience === "club") formData.set("instance_target", draft.instanceTarget);
  return formData;
}
