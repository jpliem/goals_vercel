import { Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FocusIndicatorProps {
  isFocused: boolean
  showBadge?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function FocusIndicator({ 
  isFocused, 
  showBadge = false, 
  size = "sm",
  className = "" 
}: FocusIndicatorProps) {
  if (!isFocused) return null

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  }

  const starElement = (
    <Star 
      className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400 ${className}`}
    />
  )

  if (showBadge) {
    return (
      <div className="flex items-center gap-1">
        {starElement}
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
          Focus
        </Badge>
      </div>
    )
  }

  return starElement
}