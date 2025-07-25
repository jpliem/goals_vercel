"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle, User, Calendar } from "lucide-react"

interface FilterChip {
  id: string
  label: string
  icon?: React.ReactNode
  description?: string
  filters: {
    statusFilter?: string[]
    priorityFilter?: string[]
    hideClosed?: boolean
    dateRange?: { from: string; to: string }
    [key: string]: any
  }
}

interface FilterChipsProps {
  onApplyPreset: (filters: FilterChip['filters']) => void
  currentUserId: string
  className?: string
}

export function FilterChips({ onApplyPreset, currentUserId, className = "" }: FilterChipsProps) {
  const getThisWeekStart = () => {
    const today = new Date()
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()))
    return firstDay.toISOString().split('T')[0]
  }

  const getToday = () => {
    return new Date().toISOString().split('T')[0]
  }

  const presetChips: FilterChip[] = [
    {
      id: "active",
      label: "Active",
      icon: <Clock className="h-3 w-3" />,
      description: "Show active requests only",
      filters: {
        statusFilter: ["Initial Analysis", "In Progress", "Code Review", "Pending UAT", "Pending Deployment"],
        hideClosed: true
      }
    },
    {
      id: "overdue",
      label: "Overdue",
      icon: <AlertCircle className="h-3 w-3" />,
      description: "Show overdue requests",
      filters: {
        hideClosed: true,
        // This would need special handling in the filtering logic
        overdueOnly: true
      }
    },
    {
      id: "my-tasks",
      label: "My Tasks",
      icon: <User className="h-3 w-3" />,
      description: "Show requests assigned to me",
      filters: {
        picFilter: [currentUserId],
        hideClosed: true
      }
    },
    {
      id: "this-week",
      label: "This Week",
      icon: <Calendar className="h-3 w-3" />,
      description: "Show requests created this week",
      filters: {
        dateRange: {
          from: getThisWeekStart(),
          to: getToday()
        },
        hideClosed: true
      }
    },
    {
      id: "high-priority",
      label: "High Priority",
      icon: <AlertCircle className="h-3 w-3" />,
      description: "Show high and critical priority requests",
      filters: {
        priorityFilter: ["High", "Critical"],
        hideClosed: true
      }
    },
    {
      id: "pending-review",
      label: "Pending Review",
      description: "Show requests pending code review or UAT",
      filters: {
        statusFilter: ["Code Review", "Pending UAT"],
        hideClosed: true
      }
    }
  ]

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {presetChips.map((chip) => (
        <Button
          key={chip.id}
          variant="outline"
          size="sm"
          onClick={() => onApplyPreset(chip.filters)}
          className="h-8 text-xs hover:bg-blue-50 hover:border-blue-300"
          title={chip.description}
        >
          {chip.icon && <span className="mr-1">{chip.icon}</span>}
          {chip.label}
        </Button>
      ))}
    </div>
  )
}
