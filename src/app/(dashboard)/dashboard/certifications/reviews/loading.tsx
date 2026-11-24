import { ListPageSkeleton } from "@/components/shared/list-page-skeleton";

export default function Loading() {
  return <ListPageSkeleton filters={1} rows={5} />;
}
