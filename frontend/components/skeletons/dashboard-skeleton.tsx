// Dashboard skeleton — shape matches the real workflow cards exactly
// to prevent layout shift and CLS when real data arrives.

export function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header area skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-7 w-40 rounded-lg" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>

      {/* Cards grid */}
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <WorkflowCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function WorkflowCardSkeleton() {
  return (
    <div
      className="surface p-4 flex items-center gap-4"
      aria-hidden="true"
    >
      {/* Icon placeholder */}
      <div className="skeleton w-9 h-9 rounded-lg shrink-0" />

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-3">
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>

      {/* Action area */}
      <div className="skeleton h-8 w-8 rounded-lg shrink-0" />
    </div>
  );
}
