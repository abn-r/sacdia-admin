"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DetailCols2,
  DetailField,
  DetailSection,
} from "@/components/users/detail/section";
import { ApiError } from "@/lib/api/client";
import {
  getAdminGuardianshipConsentEvidenceFromClient,
  type AdminGuardianshipAsDependent,
  type AdminGuardianshipAsGuardian,
  type AdminGuardianships,
} from "@/lib/api/admin-users";
import { useFormatDate, useFormatDateTime } from "@/lib/format-locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_KEYS = ["pending", "verified", "revoked"] as const;
const METHOD_KEYS = [
  "director_paper_form",
  "coordinator_paper_form",
  "guardian_invite",
  "legacy_import",
  "test_placeholder",
] as const;
const REVOKED_REASON_KEYS = [
  "guardian_left",
  "removed_by_primary",
  "guardian_account_closed",
  "claimed",
  "admin",
  "released",
] as const;

function isOneOf<T extends string>(keys: readonly T[], value: string | null): value is T {
  return value !== null && (keys as readonly string[]).includes(value);
}

/** First segment of a UUID, enough to tell users apart at a glance. */
function shortId(id: string): string {
  return id.slice(0, 8);
}

function statusVariant(status: string) {
  if (status === "verified") return "soft-success" as const;
  if (status === "revoked") return "destructive" as const;
  return "soft-warning" as const;
}

// ─── Evidence link ────────────────────────────────────────────────────────────

type EvidenceState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; url: string; fetchedAt: number; expiresInSeconds: number }
  | { kind: "error"; message: string };

/** Signed URLs live ~15 min; treat them as stale this long before they expire. */
const STALE_MARGIN_SECONDS = 30;
const DEFAULT_TTL_SECONDS = 900;

function isStale(state: { fetchedAt: number; expiresInSeconds: number }): boolean {
  return Date.now() - state.fetchedAt >= (state.expiresInSeconds - STALE_MARGIN_SECONDS) * 1000;
}

function EvidenceAccess({
  userId,
  guardianshipId,
}: {
  userId: string;
  guardianshipId: string;
}) {
  const t = useTranslations("guardianships.evidence");
  const [state, setState] = useState<EvidenceState>({ kind: "idle" });

  async function load(openAfter = false) {
    setState({ kind: "loading" });
    try {
      const evidence = await getAdminGuardianshipConsentEvidenceFromClient(
        userId,
        guardianshipId,
      );
      setState({
        kind: "ready",
        url: evidence.url,
        fetchedAt: Date.now(),
        expiresInSeconds:
          typeof evidence.expires_in === "number" && evidence.expires_in > 0
            ? evidence.expires_in
            : DEFAULT_TTL_SECONDS,
      });
      // After an await the browser may block the popup; the refreshed link is
      // rendered anyway, so a second click always works.
      if (openAfter) window.open(evidence.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      // Only the machine `code` / HTTP status are read; `details` never is.
      const code =
        error instanceof ApiError &&
        error.payload &&
        typeof error.payload === "object" &&
        typeof (error.payload as { code?: unknown }).code === "string"
          ? (error.payload as { code: string }).code
          : null;
      let message = t("error");
      if (code === "GUARDIANSHIP_EVIDENCE_NOT_FOUND") message = t("notFound");
      else if (code === "GUARDIANSHIP_EVIDENCE_UNAVAILABLE") message = t("unavailable");
      else if (error instanceof ApiError && error.status === 403) message = t("denied");
      setState({ kind: "error", message });
    }
  }

  return (
    <div className="space-y-1.5">
      {state.kind === "ready" ? (
        <Button asChild variant="outline" size="sm">
          <a
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              // Never open an expired signed URL: refetch it first, then open.
              if (isStale(state)) {
                event.preventDefault();
                void load(true);
              }
            }}
          >
            <ExternalLink className="size-4" />
            {t("open")}
          </a>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={state.kind === "loading"}
        >
          {state.kind === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          {state.kind === "loading" ? t("loading") : t("view")}
        </Button>
      )}
      {state.kind === "ready" && (
        <p className="text-xs text-muted-foreground">{t("expiryNote")}</p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      )}
    </div>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

function AsDependentRow({
  row,
  userId,
}: {
  row: AdminGuardianshipAsDependent;
  userId: string;
}) {
  const t = useTranslations("guardianships");
  const formatDateTime = useFormatDateTime();
  const dash = "—";

  const holder = row.is_custodian
    ? (row.custodian_club?.name ?? dash)
    : (row.guardian?.display_name || row.external_name || dash);
  const revoked = row.consent_status === "revoked";
  const method = isOneOf(METHOD_KEYS, row.verification_method)
    ? t(`method.${row.verification_method}`)
    : (row.verification_method ?? dash);
  const reason = isOneOf(REVOKED_REASON_KEYS, row.revoked_reason)
    ? t(`revokedReason.${row.revoked_reason}`)
    : (row.revoked_reason ?? dash);

  return (
    <li
      className={`rounded-lg border border-border/60 p-4 ${revoked ? "bg-muted/30" : "bg-card"}`}
      data-testid="guardianship-as-dependent"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{holder}</span>
        {row.is_primary && <Badge variant="soft">{t("badges.primary")}</Badge>}
        {row.is_custodian && <Badge variant="soft-info">{t("badges.custodian")}</Badge>}
        <Badge variant={statusVariant(row.consent_status)}>
          {isOneOf(STATUS_KEYS, row.consent_status)
            ? t(`status.${row.consent_status}`)
            : row.consent_status}
        </Badge>
        {row.is_test_data && <Badge variant="outline">{t("badges.testData")}</Badge>}
      </div>

      <DetailCols2>
        <div>
          {row.is_custodian ? (
            <DetailField k={t("fields.custodianClub")} v={row.custodian_club?.name ?? dash} />
          ) : row.guardian ? (
            <DetailField k={t("fields.email")} v={row.guardian.email ?? dash} />
          ) : (
            <DetailField k={t("fields.externalName")} v={row.external_name ?? dash} />
          )}
          <DetailField k={t("fields.relationship")} v={row.relationship_type_name ?? dash} />
          <DetailField k={t("fields.method")} v={method} />
          <DetailField
            k={t("fields.createdAt")}
            v={row.created_at ? formatDateTime(row.created_at) : dash}
          />
        </div>
        <div>
          <DetailField
            k={t("fields.verifiedAt")}
            v={row.verified_at ? formatDateTime(row.verified_at) : dash}
          />
          <DetailField k={t("fields.verifiedBy")} v={row.verified_by?.display_name || dash} />
          <DetailField
            k={t("fields.evidence")}
            v={
              row.evidence_uploaded ? (
                <EvidenceAccess userId={userId} guardianshipId={row.guardianship_id} />
              ) : (
                t("evidence.missing")
              )
            }
          />
          {revoked && (
            <>
              <DetailField
                k={t("fields.revokedAt")}
                v={row.revoked_at ? formatDateTime(row.revoked_at) : dash}
              />
              <DetailField k={t("fields.revokedReason")} v={reason} />
            </>
          )}
        </div>
      </DetailCols2>
    </li>
  );
}

function AsGuardianRow({ row }: { row: AdminGuardianshipAsGuardian }) {
  const t = useTranslations("guardianships");
  const formatDate = useFormatDate();
  const dash = "—";

  return (
    <li
      className="rounded-lg border border-border/60 bg-card p-4"
      data-testid="guardianship-as-guardian"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{row.dependent.display_name || dash}</span>
        {row.is_primary && <Badge variant="soft">{t("badges.primary")}</Badge>}
        <Badge variant={statusVariant(row.consent_status)}>
          {isOneOf(STATUS_KEYS, row.consent_status)
            ? t(`status.${row.consent_status}`)
            : row.consent_status}
        </Badge>
      </div>
      <DetailCols2>
        <DetailField k={t("fields.relationship")} v={row.relationship_type_name ?? dash} />
        <DetailField
          k={t("fields.birthday")}
          v={row.dependent.birthday ? formatDate(row.dependent.birthday) : dash}
        />
      </DetailCols2>
    </li>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface UserGuardianshipsCardProps {
  userId: string;
  guardianships: AdminGuardianships;
}

export function UserGuardianshipsCard({
  userId,
  guardianships,
}: UserGuardianshipsCardProps) {
  const t = useTranslations("guardianships");
  const formatDateTime = useFormatDateTime();
  const dash = "—";
  const { as_dependent, as_guardian, dependent_profile } = guardianships;

  return (
    <DetailSection title={t("title")}>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">{t("description")}</p>

        {dependent_profile && (
          <div className="space-y-1" data-testid="guardianship-dependent-profile">
            <h4 className="text-xs font-semibold text-muted-foreground">
              {t("profile.title")}
            </h4>
            <DetailCols2>
              <div>
                <DetailField
                  k={t("profile.createdAt")}
                  v={dependent_profile.created_at ? formatDateTime(dependent_profile.created_at) : dash}
                />
                <DetailField
                  k={t("profile.createdBy")}
                  v={
                    dependent_profile.created_by_user_id ? (
                      // The API only returns the creator's id (no name): show a
                      // short id that links to that user's detail.
                      <Link
                        href={`/dashboard/users/${encodeURIComponent(dependent_profile.created_by_user_id)}`}
                        title={dependent_profile.created_by_user_id}
                        className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                      >
                        {shortId(dependent_profile.created_by_user_id)}
                      </Link>
                    ) : (
                      dash
                    )
                  }
                />
              </div>
              <div>
                <DetailField
                  k={t("profile.frozenAt")}
                  v={
                    dependent_profile.frozen_at
                      ? formatDateTime(dependent_profile.frozen_at)
                      : t("profile.active")
                  }
                />
                <DetailField
                  k={t("profile.purgeAfter")}
                  v={dependent_profile.purge_after ? formatDateTime(dependent_profile.purge_after) : dash}
                />
              </div>
            </DetailCols2>
          </div>
        )}

        {(as_dependent.length > 0 || dependent_profile) && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">
              {t("asDependent.title")}
            </h4>
            {as_dependent.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("asDependent.empty")}</p>
            ) : (
              <ul className="space-y-3">
                {as_dependent.map((row) => (
                  <AsDependentRow key={row.guardianship_id} row={row} userId={userId} />
                ))}
              </ul>
            )}
          </div>
        )}

        {as_guardian.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">
              {t("asGuardian.title")}
            </h4>
            <ul className="space-y-3">
              {as_guardian.map((row) => (
                <AsGuardianRow key={row.guardianship_id} row={row} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </DetailSection>
  );
}
