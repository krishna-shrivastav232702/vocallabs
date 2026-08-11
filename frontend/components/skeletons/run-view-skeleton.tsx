export function RunViewSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-6" aria-hidden="true">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-6 w-48 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="skeleton h-7 w-28 rounded-full" />
      </div>

      {/* Timeline nodes */}
      <div className="relative">
        <div
          className="absolute left-5 top-5 bottom-5 w-px"
          style={{ background: 'var(--color-border)' }}
        />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="ml-10 surface rounded-xl p-3 flex items-center gap-3"
            >
              <div className="skeleton w-8 h-8 rounded-xl" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
                <div className="skeleton h-3 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
