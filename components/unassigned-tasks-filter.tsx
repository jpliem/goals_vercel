"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Filter, X } from "lucide-react"

interface UnassignedTasksFilterProps {
  tasks: any[]
  onFilterChange: (filteredTasks: any[]) => void
  showUnassignedOnly: boolean
  onToggleUnassigned: (show: boolean) => void
}

export function UnassignedTasksFilter({ 
  tasks, 
  onFilterChange, 
  showUnassignedOnly, 
  onToggleUnassigned 
}: UnassignedTasksFilterProps) {
  const unassignedCount = tasks.filter(task => !task.assigned_to || task.assigned_to === null).length

  const handleToggleUnassigned = () => {
    const newShowUnassigned = !showUnassignedOnly
    onToggleUnassigned(newShowUnassigned)
    
    if (newShowUnassigned) {
      // Show only unassigned tasks
      const unassignedTasks = tasks.filter(task => !task.assigned_to || task.assigned_to === null)
      onFilterChange(unassignedTasks)
    } else {
      // Show all tasks
      onFilterChange(tasks)
    }
  }

  if (unassignedCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <Button
        variant={showUnassignedOnly ? "default" : "outline"}
        size="sm"
        onClick={handleToggleUnassigned}
        className={`flex items-center gap-2 ${
          showUnassignedOnly 
            ? "bg-amber-600 hover:bg-amber-700 text-white" 
            : "border-amber-300 text-amber-700 hover:bg-amber-50"
        }`}
      >
        {showUnassignedOnly ? (
          <>
            <X className="w-4 h-4" />
            Hide Unassigned
          </>
        ) : (
          <>
            <Filter className="w-4 h-4" />
            Show Unassigned Only
          </>
        )}
      </Button>
      
      <Badge 
        variant="outline" 
        className="bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1"
      >
        <AlertTriangle className="w-3 h-3" />
        {unassignedCount} unassigned task{unassignedCount !== 1 ? 's' : ''}
      </Badge>
      
      {showUnassignedOnly && (
        <span className="text-sm text-amber-700">
          Showing unassigned tasks only
        </span>
      )}
    </div>
  )
}