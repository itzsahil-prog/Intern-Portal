export function SkeletonLine({ className = '' }) {
  return <div className={`skeleton h-4 rounded ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 space-y-3">
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="w-1/2" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 bg-white rounded-lg border border-gray-100">
          <SkeletonLine className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-1/2" />
          </div>
          <SkeletonLine className="w-20" />
        </div>
      ))}
    </div>
  )
}
