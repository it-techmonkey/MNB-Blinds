import { CardSkeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/skeletons";

export default function ReportsLoading() {
  return (
    <div className="content-stack">
      <PageHeaderSkeleton />
      <div className="card-dashboard space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-bar h-9 w-24" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-bar h-11 w-full" />
          ))}
        </div>
      </div>
      <StatCardsSkeleton count={4} wide />
      <CardSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <TableSkeleton rows={5} />
        <TableSkeleton rows={5} />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
