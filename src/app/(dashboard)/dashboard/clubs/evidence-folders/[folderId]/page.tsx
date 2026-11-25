import { EvidenceFolderReview } from "@/components/annual-folders/evidence-folder-review";
import { hasCapability } from "@/lib/auth/permission-utils";
import { requireAdminUser } from "@/lib/auth/session";

type PageParams = Promise<{ folderId: string }>;

export default async function ClubsEvidenceFolderDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { folderId } = await params;
  // Redirects to login/logout by itself when there is no admin session.
  const currentUser = await requireAdminUser();

  return (
    <EvidenceFolderReview
      folderId={folderId}
      canConfirmUnion={hasCapability(currentUser, "folders.confirm_union")}
    />
  );
}
