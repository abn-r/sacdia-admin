import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function DistrictSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-lg border">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-start justify-between gap-3 p-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvestiturePastorsLoading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
      <DistrictSkeleton />
      <DistrictSkeleton />
    </div>
  );
}
