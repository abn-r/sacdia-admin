import type {
  PaymentOrder,
  PaymentOrderLine,
  PaymentOrderProof,
} from "@/lib/api/field-payment-orders";

type AnyRecord = Record<string, unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const GENERATED_REPORT_RE = /^sacdia_report_/i;
const GENERIC_PROOF_RE = /^proof\.(pdf|jpe?g|png)$/i;

export type PaymentOrderBeneficiaryDisplay = {
  user_id: string;
  full_name: string | null;
  picture_url: string | null;
  email: string | null;
};

export type ProofFileLabels = {
  pdf: string;
  jpeg: string;
  png: string;
  generic: string;
};

export type BeneficiaryMemberHint = {
  user_id: string;
  name?: string | null;
  picture_url?: string | null;
  email?: string | null;
};

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function isUuidLike(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

function buildFullName(parts: Array<string | null | undefined>): string | null {
  const name = parts.filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

function usableName(
  value: string | null,
  userId?: string | null,
): string | null {
  if (!value) return null;
  if (userId && value === userId) return null;
  if (isUuidLike(value)) return null;
  return value;
}

function identityFromRecord(
  raw: unknown,
  fallbackUserId?: string | null,
): PaymentOrderBeneficiaryDisplay {
  const rec = asRecord(raw);
  const userId =
    pickString(rec?.user_id) ??
    pickString(rec?.id) ??
    fallbackUserId ??
    "";

  const fullName = usableName(
    pickString(rec?.full_name) ??
      pickString(rec?.beneficiary_full_name) ??
      buildFullName([
        pickString(rec?.name),
        pickString(rec?.paternal_last_name),
        pickString(rec?.maternal_last_name),
      ]) ??
      buildFullName([pickString(rec?.first_name), pickString(rec?.last_name)]),
    userId,
  );

  return {
    user_id: userId,
    full_name: fullName,
    picture_url:
      pickString(rec?.picture_url) ??
      pickString(rec?.user_image) ??
      pickString(rec?.avatar_url) ??
      null,
    email: pickString(rec?.email),
  };
}

function mergeIdentity(
  base: PaymentOrderBeneficiaryDisplay,
  extra: PaymentOrderBeneficiaryDisplay,
): PaymentOrderBeneficiaryDisplay {
  return {
    user_id: base.user_id || extra.user_id,
    full_name: base.full_name ?? extra.full_name,
    picture_url: base.picture_url ?? extra.picture_url,
    email: base.email ?? extra.email,
  };
}

/** Resolve a beneficiary label from flat or nested Prisma `users` / `member` shapes. */
export function getPaymentOrderLineBeneficiary(
  line: PaymentOrderLine | AnyRecord,
): PaymentOrderBeneficiaryDisplay {
  const rec = asRecord(line) ?? {};
  const userId = pickString(rec.beneficiary_user_id) ?? "";

  const nestedSources = [
    rec.beneficiary,
    rec.users,
    rec.user,
    rec.member,
    rec.beneficiary_user,
  ];

  let identity = identityFromRecord(rec, userId);
  for (const source of nestedSources) {
    identity = mergeIdentity(identity, identityFromRecord(source, userId));
  }

  return {
    ...identity,
    user_id: identity.user_id || userId,
  };
}

export function isMachineProofFileName(
  fileName: string | null | undefined,
): boolean {
  const name = fileName?.trim() ?? "";
  if (!name) return true;
  if (/[/\\]/.test(name)) return true;
  if (GENERATED_REPORT_RE.test(name)) return true;
  if (GENERIC_PROOF_RE.test(name)) return true;
  if (UUID_IN_TEXT_RE.test(name)) return true;
  return false;
}

function preferredProofFileName(
  proof: PaymentOrderProof | AnyRecord,
): string | null {
  const rec = asRecord(proof) ?? {};
  return (
    pickString(rec.original_file_name) ??
    pickString(rec.original_filename) ??
    pickString(rec.display_name) ??
    pickString(rec.file_name)
  );
}

export function getProofDisplayLabel(
  proof: PaymentOrderProof | AnyRecord,
  labels: ProofFileLabels,
): string {
  const fileName = preferredProofFileName(proof);
  if (fileName && !isMachineProofFileName(fileName)) {
    return fileName;
  }

  const rec = asRecord(proof) ?? {};
  const mime = (pickString(rec.mime_type) ?? "").toLowerCase();
  const extension = fileName?.split(".").pop()?.toLowerCase() ?? "";

  if (mime.includes("pdf") || extension === "pdf") return labels.pdf;
  if (
    mime.includes("jpeg") ||
    mime.includes("jpg") ||
    extension === "jpeg" ||
    extension === "jpg"
  ) {
    return labels.jpeg;
  }
  if (mime.includes("png") || extension === "png") return labels.png;
  return labels.generic;
}

export async function attachPaymentOrderBeneficiaries(
  order: PaymentOrder,
  loadMembers: () => Promise<BeneficiaryMemberHint[]>,
): Promise<PaymentOrder> {
  const lines = order.lines ?? [];
  const fromPayload = lines.map((line) => getPaymentOrderLineBeneficiary(line));
  const needsLookup = fromPayload.some((beneficiary) => !beneficiary.full_name);

  const memberById = new Map<string, PaymentOrderBeneficiaryDisplay>();
  if (needsLookup && order.club_id && order.club_section_id) {
    try {
      const members = await loadMembers();
      for (const member of members) {
        const fullName = usableName(member.name ?? null, member.user_id);
        if (!fullName) continue;
        memberById.set(member.user_id, {
          user_id: member.user_id,
          full_name: fullName,
          picture_url: member.picture_url ?? null,
          email: member.email ?? null,
        });
      }
    } catch {
      // Best-effort: keep payload names (or none) if the section roster is unavailable.
    }
  }

  return {
    ...order,
    lines: lines.map((line, index) => {
      const resolved = mergeIdentity(
        fromPayload[index] ?? getPaymentOrderLineBeneficiary(line),
        memberById.get(line.beneficiary_user_id) ?? {
          user_id: line.beneficiary_user_id,
          full_name: null,
          picture_url: null,
          email: null,
        },
      );
      return {
        ...line,
        beneficiary: {
          user_id: resolved.user_id || line.beneficiary_user_id,
          full_name: resolved.full_name,
          picture_url: resolved.picture_url,
          email: resolved.email,
        },
      };
    }),
  };
}
