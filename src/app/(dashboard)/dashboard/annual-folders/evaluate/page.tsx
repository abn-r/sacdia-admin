import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";

const EvaluationClientPage = dynamic(
  () =>
    import("@/components/annual-folders/evaluation-client-page").then((m) => ({
      default: m.EvaluationClientPage,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-[220px]" />
          <Skeleton className="h-9 w-[140px]" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-[120px]" />
          </div>
        </div>
        <div className="rounded-md border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b p-4 last:border-b-0"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="ml-auto h-8 w-28 rounded" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
);

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function EvaluateFoldersPage() {
  await requireAdminUser();
  const t = await getTranslations("annual_folders");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageEvaluate.title")}
        description={t("pageEvaluate.description")}
      />

      <EvaluationClientPage />
    </div>
  );
}
