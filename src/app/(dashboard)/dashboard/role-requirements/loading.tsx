import { ListPageSkeleton } from "@/components/shared/list-page-skeleton";

export default function Loading() {
  return <ListPageSkeleton rows={6} filters={0} />;
}
