import { PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from "@/components/skeletons";

export default function AppLoading() {
  return (
    <div className="content-stack">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <TableSkeleton />
    </div>
  );
}
