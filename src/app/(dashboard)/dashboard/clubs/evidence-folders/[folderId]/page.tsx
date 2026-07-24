import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { extractRoles } from "@/lib/auth/roles";
import { requireAdminUser } from "@/lib/auth/session";

const EvaluationClientPage = dynamic(
  () =>
    import("@/components/annual-folders/evaluation-client-page").then((m) => ({
      default: m.EvaluationClientPage,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    ),
  },
);

type PageParams = Promise<{ folderId: string }>;

export default async function ClubsEvidenceFolderDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { folderId } = await params;
  const t = await getTranslations("annual_folders.pageFolders");

  let currentUser;
  try {
    currentUser = await requireAdminUser();
  } catch {
    return (
      <EndpointErrorBanner state="missing" detail={t("loadError")} />
    );
  }

  return (
    <EvaluationClientPage
      mode="detail"
      initialFolderId={folderId}
      currentUserRoles={extractRoles(currentUser)}
    />
  );
}
