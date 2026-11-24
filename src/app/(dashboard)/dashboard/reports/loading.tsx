import { ListPageSkeleton } from "@/components/shared/list-page-skeleton";

export default function ReportsLoading() {
  return <ListPageSkeleton rows={8} filters={4} />;
}
