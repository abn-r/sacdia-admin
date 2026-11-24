import { ListPageSkeleton } from "@/components/shared/list-page-skeleton";

export default function UsersLoading() {
  return <ListPageSkeleton rows={8} filters={3} />;
}
