export function GoalsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block">
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-11 gap-4 pb-3 border-b border-gray-200">
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          
          {/* Rows */}
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-11 gap-4 py-3">
              {Array.from({ length: 11 }).map((_, colIndex) => (
                <div key={colIndex} className="space-y-1">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  {colIndex === 1 && ( // Goal column has sub-text
                    <div className="h-3 bg-gray-50 rounded animate-pulse w-3/4" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
              <div className="h-6 bg-gray-100 rounded animate-pulse w-16" />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
              <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-12 ml-auto" />
            </div>
            
            <div className="space-y-1">
              <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-100 rounded animate-pulse w-20" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}