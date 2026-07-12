import { UserDetailScreen } from "@/components/users/user-detail-screen";

type Params = Promise<{ userId: string }>;

export default function UserDetailPage({ params }: { params: Params }) {
  return <UserDetailScreen params={params} />;
}
