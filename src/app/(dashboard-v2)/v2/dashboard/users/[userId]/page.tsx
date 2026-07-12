import { UserDetailScreen } from "@/components/users/user-detail-screen";
import { toV2Path } from "@/lib/v2/route-map";

type Params = Promise<{ userId: string }>;

export default function V2UserDetailPage({ params }: { params: Params }) {
  return (
    <UserDetailScreen
      params={params}
      usersListHref={toV2Path("/dashboard/users")}
    />
  );
}
