export function PageHeaderSkeleton() {
  return (
    <section className="page-header mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="skeleton-bar h-3 w-24 rounded-full" />
          <div className="skeleton-bar h-8 w-56 max-w-full" />
          <div className="skeleton-bar h-4 w-80 max-w-full" />
        </div>
        <div className="skeleton-bar h-11 w-full lg:w-40" />
      </div>
    </section>
  );
}

export function StatCardsSkeleton({ count = 3, wide = false }: { count?: number; wide?: boolean }) {
  return (
    <section className={`grid gap-3 sm:grid-cols-2 ${wide ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card space-y-2">
          <div className="skeleton-bar h-3 w-28 rounded-full" />
          <div className="skeleton-bar h-7 w-20" />
        </div>
      ))}
    </section>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <section className="table-shell overflow-hidden">
      <div className="border-b border-border bg-muted px-4 py-3">
        <div className="skeleton-bar h-3 w-40 rounded-full bg-border-strong/50" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-bar h-9 w-full" />
        ))}
      </div>
    </section>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <section className={`card-dashboard p-5 sm:p-6 ${className}`}>
      <div className="skeleton-bar h-4 w-36" />
      <div className="skeleton-bar mt-4 h-40 w-full" />
    </section>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <section className="card-dashboard space-y-5 p-5 sm:max-w-2xl sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton-bar h-3 w-24 rounded-full" />
            <div className="skeleton-bar h-11 w-full" />
          </div>
        ))}
      </div>
      <div className="skeleton-bar h-11 w-32" />
    </section>
  );
}
