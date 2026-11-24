/**
 * Maps a failed POST /admin/users to the form field it belongs to, so the
 * message sits next to the control instead of in a generic toast.
 */

export const CREATE_USER_FIELDS = [
  "name",
  "paternal_last_name",
  "maternal_last_name",
  "email",
  "role",
  "country_id",
  "union_id",
  "local_field_id",
] as const;

export type CreateUserField = (typeof CREATE_USER_FIELDS)[number];

/** Keys under `people.users.new.serverErrors`. */
export type CreateUserErrorKey =
  | "emailTaken"
  | "emailInvalid"
  | "roleForbidden"
  | "localFieldRequired"
  | "invalidField";

export type CreateUserErrorMap = {
  fields: Partial<Record<CreateUserField, CreateUserErrorKey>>;
  /** True when nothing could be tied to a field (network, 5xx, unknown 4xx). */
  general: boolean;
};

type ErrorLike = { status: number; payload?: unknown };

function isCreateUserField(value: string): value is CreateUserField {
  return (CREATE_USER_FIELDS as readonly string[]).includes(value);
}

function validationFields(payload: unknown): CreateUserField[] {
  if (!payload || typeof payload !== "object") return [];
  const errors = (payload as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return [];
  const out: CreateUserField[] = [];
  for (const entry of errors) {
    const field = entry && typeof entry === "object" ? (entry as { field?: unknown }).field : null;
    if (typeof field !== "string") continue;
    // Nested paths ("a.b") and array indexes are reduced to their root.
    const root = field.split(/[.[]/)[0] ?? field;
    if (isCreateUserField(root) && !out.includes(root)) out.push(root);
  }
  return out;
}

function payloadCode(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "code" in payload) {
    const code = (payload as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function mapCreateUserError(error: ErrorLike): CreateUserErrorMap {
  const code = payloadCode(error.payload);

  if (error.status === 409) {
    return { fields: { email: "emailTaken" }, general: false };
  }
  if (error.status === 403) {
    return { fields: { role: "roleForbidden" }, general: false };
  }
  if (error.status === 400) {
    if (code === "ADMIN_USER_LOCAL_FIELD_REQUIRED") {
      return { fields: { local_field_id: "localFieldRequired" }, general: false };
    }
    const fields: CreateUserErrorMap["fields"] = {};
    for (const field of validationFields(error.payload)) {
      fields[field] = field === "email" ? "emailInvalid" : "invalidField";
    }
    return { fields, general: Object.keys(fields).length === 0 };
  }
  return { fields: {}, general: true };
}

const STEP_OF: Record<CreateUserField, number> = {
  name: 0,
  paternal_last_name: 0,
  maternal_last_name: 0,
  email: 0,
  role: 1,
  country_id: 1,
  union_id: 1,
  local_field_id: 1,
};

/** Earliest step that holds a field with an error, or `null` when none do. */
export function firstStepWithError(fields: CreateUserErrorMap["fields"]): number | null {
  const steps = (Object.keys(fields) as CreateUserField[]).map((field) => STEP_OF[field]);
  return steps.length > 0 ? Math.min(...steps) : null;
}
