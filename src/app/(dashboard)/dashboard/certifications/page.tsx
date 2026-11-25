import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CertificationsBrowser } from "@/components/certifications/certifications-browser";
import { errorStateFromError } from "@/lib/api/error-state";
import { listCertifications } from "@/lib/api/certifications";
import { normalizeCertificationListPage } from "@/lib/certifications/list";
import { requireAdminUser } from "@/lib/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DEFAULT_LIMIT = 20;

function readPositiveInt(value: string | string[] | undefined, fallback: number, max = 100): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("certifications.pages.list");
  return { title: t("title") };
}

export default async function CertificationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminUser();
  const t = await getTranslations("certifications.pages.list");
  const tList = await getTranslations("certifications.list");
  const tCert = await getTranslations("evaluation.certYear.certifications.list");

  const params = await searchParams;
  const page = readPositiveInt(params.page, 1, 10_000);
  const limit = readPositiveInt(params.limit, DEFAULT_LIMIT);

  let result: ReturnType<typeof normalizeCertificationListPage> | null = null;
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    result = normalizeCertificationListPage(await listCertifications({ page, limit }));
  } catch (error) {
    failure = errorStateFromError(error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={result ? tCert("summary", { count: result.total }) : t("description")}
      />

      {failure ? (
        <ErrorState
          kind={failure.kind}
          detail={failure.detail}
          icon={ShieldCheck}
          title={t("loadFailed")}
          retry
        />
      ) : result && result.items.length === 0 && page === 1 ? (
        <EmptyState
          icon={ShieldCheck}
          title={tList("empty_title")}
          description={tList("empty_description")}
        />
      ) : result ? (
        <CertificationsBrowser
          items={result.items}
          total={result.total}
          page={page}
          limit={limit}
        />
      ) : null}
    </div>
  );
}
