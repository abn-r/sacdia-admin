import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DetailHeader, type DetailHeaderFact } from "@/components/shared/detail-header";
import { ErrorState } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { UrlTabs } from "@/components/shared/url-tabs";
import { CertificationModulesTree } from "@/components/certifications/certification-modules-tree";
import { EnrolledUsersPanel } from "@/components/certifications/enrolled-users-panel";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  getCertificationById,
  listCertificationEnrollments,
  type CertificationEnrollmentsPage,
} from "@/lib/api/certifications";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ id: string }>;

type AnyRecord = Record<string, unknown>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCertification(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;

  // Handle { data: { ... } } and { data: { data: { ... } } } wrappers
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.certification_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }

  if (root.certification_id != null || root.name != null) return root;
  return null;
}

type NormalizedSection = {
  section_id: number;
  title: string;
  description: string | null;
  order: number | null;
  is_required: boolean;
};

type NormalizedModule = {
  module_id: number;
  title: string;
  description: string | null;
  order: number | null;
  sections: NormalizedSection[];
};

function normalizeModules(raw: unknown): NormalizedModule[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((mod: unknown) => {
    const m = (mod && typeof mod === "object" ? mod : {}) as AnyRecord;
    const sections = Array.isArray(m.sections)
      ? m.sections.map((sec: unknown) => {
          const s = (sec && typeof sec === "object" ? sec : {}) as AnyRecord;
          return {
            section_id: toPositiveNumber(s.section_id) ?? 0,
            title: toText(s.title) ?? toText(s.name) ?? `Sección ${s.section_id ?? "?"}`,
            description: toText(s.description),
            order: toPositiveNumber(s.order),
            is_required: s.is_required === true,
          };
        })
      : [];

    return {
      module_id: toPositiveNumber(m.module_id) ?? 0,
      title: toText(m.title) ?? toText(m.name) ?? `Módulo ${m.module_id ?? "?"}`,
      description: toText(m.description),
      order: toPositiveNumber(m.order),
      sections,
    };
  });
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ENROLLED_LIMIT = 20;

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function positiveInt(value: string, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export default async function CertificationDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const t = await getTranslations("certifications.pages.detail");
  const tList = await getTranslations("certifications.pages.list");
  const tCert = await getTranslations("evaluation.certYear.certifications.detail");
  const tEnrolled = await getTranslations("evaluation.certYear.certifications.enrolled");

  const { id } = await params;
  const query = await searchParams;
  const certificationId = toPositiveNumber(id);
  if (!certificationId) notFound();

  const tab = firstParam(query.tab) === "enrolled" ? "enrolled" : "modules";

  let cert: AnyRecord;
  let modules: NormalizedModule[] = [];

  try {
    const payload = await getCertificationById(certificationId);
    const normalized = normalizeCertification(payload);
    if (!normalized) notFound();
    cert = normalized;
    modules = normalizeModules(cert.modules ?? []);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  // Enrollments (backend contract B2). Only requested on the tab that shows them.
  // A failure (404 until the endpoint is deployed) is shown as an error, never as an empty list.
  const search = firstParam(query.search).trim();
  const status = firstParam(query.status);
  let enrollments: CertificationEnrollmentsPage | null = null;
  let enrollmentsFailure: ReturnType<typeof errorStateFromError> | null = null;

  if (tab === "enrolled") {
    try {
      enrollments = await listCertificationEnrollments(certificationId, {
        page: positiveInt(firstParam(query.page), 1, 10_000),
        limit: positiveInt(firstParam(query.limit), ENROLLED_LIMIT, 100),
        search,
        status,
      });
    } catch (error) {
      enrollmentsFailure = errorStateFromError(error);
    }
  }

  const name = toText(cert.name) ?? `#${certificationId}`;
  const description = toText(cert.description);
  const durationWeeks = toPositiveNumber(cert.duration_weeks ?? cert.durationWeeks);
  const isActive = cert.active !== false;
  const modulesCount = modules.length > 0 ? modules.length : toPositiveNumber(cert.modules_count);
  const totalSections = modules.reduce((acc, m) => acc + m.sections.length, 0);

  const facts: (DetailHeaderFact | null)[] = [
    durationWeeks != null
      ? { label: tCert("factDuration"), value: tCert("durationWeeks", { count: durationWeeks }) }
      : null,
    modulesCount != null ? { label: tCert("factModules"), value: modulesCount } : null,
    totalSections > 0 ? { label: tCert("factSections"), value: totalSections } : null,
  ];
  const shownFacts = facts.filter((fact): fact is DetailHeaderFact => fact !== null);

  return (
    <div className="space-y-6">
      <DetailHeader
        title={name}
        subtitle={description}
        facts={shownFacts}
        breadcrumbs={[
          { label: tList("title"), href: "/dashboard/certifications" },
          { label: name },
        ]}
        actions={
          <ExceptionStatus
            value={isActive ? "active" : "inactive"}
            normal={["active"]}
            labels={{ active: t("statusActive"), inactive: t("statusInactive") }}
            intents={{ inactive: "neutral" }}
          />
        }
      />

      <UrlTabs
        ariaLabel={name}
        defaultValue="modules"
        tabs={[
          { value: "modules", label: tCert("tabModules"), count: modulesCount ?? undefined },
          {
            value: "enrolled",
            label: tCert("tabEnrolled"),
            count: enrollments && !search && !status ? enrollments.total : undefined,
          },
        ]}
      />

      {tab === "modules" ? (
        <CertificationModulesTree modules={modules} />
      ) : enrollmentsFailure ? (
        <ErrorState
          kind={enrollmentsFailure.kind}
          detail={enrollmentsFailure.detail}
          title={
            enrollmentsFailure.kind === "notFound" ? tEnrolled("unavailableTitle") : undefined
          }
          description={
            enrollmentsFailure.kind === "notFound"
              ? tEnrolled("unavailableDescription")
              : undefined
          }
          retry
        />
      ) : enrollments ? (
        <EnrolledUsersPanel
          data={enrollments}
          certificationId={certificationId}
          search={search}
          status={status}
        />
      ) : null}
    </div>
  );
}
