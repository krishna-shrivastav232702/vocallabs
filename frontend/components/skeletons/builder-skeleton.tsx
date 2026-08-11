export function BuilderSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar skeleton */}
      <div
        className="h-14 flex items-center gap-3 px-5 border-b shrink-0"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        aria-hidden="true"
      >
        <div className="skeleton h-5 flex-1 max-w-xs rounded" />
        <div className="skeleton h-8 w-16 rounded-lg" />
        <div className="skeleton h-8 w-16 rounded-lg" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Step list skeleton */}
        <div className="flex-1 p-5">
          <div className="flex flex-col gap-2 max-w-2xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="surface rounded-xl px-3 py-3 flex items-center gap-3"
                aria-hidden="true"
              >
                <div className="skeleton w-4 h-4 rounded" />
                <div className="skeleton w-7 h-7 rounded-lg" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-3 w-12 rounded" />
                </div>
                <div className="skeleton w-4 h-4 rounded" />
              </div>
            ))}
            <div className="skeleton h-12 w-full rounded-xl mt-1" />
          </div>
        </div>

        {/* Trigger panel skeleton */}
        <div
          className="w-72 border-l p-4 shrink-0"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          aria-hidden="true"
        >
          <div className="skeleton h-4 w-16 rounded mb-4" />
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-12 w-full rounded-lg mb-2" />
          ))}
        </div>
      </div>
    </div>
  );
}
