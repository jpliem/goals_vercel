"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

interface WorkflowHistoryItem {
  id?: string
  action?: string
  user_name?: string
  created_at?: string
  timestamp?: string
  details?: any
}

interface GoalWorkflowHistoryProps {
  workflowHistory: WorkflowHistoryItem[]
}

export function GoalWorkflowHistory({ workflowHistory }: GoalWorkflowHistoryProps) {
  const getActionColor = (action: string) => {
    if (!action || typeof action !== 'string') {
      return 'bg-gray-100 text-gray-800' // Default fallback styling
    }
    
    switch (action.toLowerCase()) {
      case 'created':
        return 'bg-green-100 text-green-800'
      case 'status_changed':
        return 'bg-blue-100 text-blue-800'
      case 'assigned':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-emerald-100 text-emerald-800'
      case 'commented':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatAction = (item: WorkflowHistoryItem) => {
    const details = item.details || {}
    
    if (!item.action || typeof item.action !== 'string') {
      return 'Unknown action'
    }
    
    switch (item.action.toLowerCase()) {
      case 'created':
        return 'Goal created'
      case 'status_changed':
      case 'status_change':
        const fromStatus = details.from_status ? ` from ${details.from_status}` : ''
        const toStatus = details.to_status || details.new_status || 'Unknown'
        return `Status changed${fromStatus} to ${toStatus}`
      case 'assigned':
      case 'assignment':
        return 'Team members assigned'
      case 'completed':
      case 'task_completed':
        return 'Task marked as completed'
      case 'commented':
      case 'comment':
        return 'Progress update added'
      case 'target_date_set':
      case 'target_date_updated':
        return 'Target date updated'
      default:
        return item.action ? item.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown action'
    }
  }

  if (!workflowHistory || workflowHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No workflow history available</p>
        <p className="text-xs text-gray-400 mt-1">Activity will appear here as the goal progresses</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {workflowHistory.map((item, index) => (
            <div key={item.id || `history-${index}`} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Badge className={getActionColor(item.action)}>
                    {formatAction(item)}
                  </Badge>
                  <span className="text-sm font-medium">{item.user_name || 'Unknown user'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const dateStr = item.created_at || item.timestamp
                    if (!dateStr) return 'Time unknown'
                    
                    try {
                      const date = new Date(dateStr)
                      // Check if date is valid
                      if (isNaN(date.getTime())) {
                        return 'Invalid date'
                      }
                      return formatDistanceToNow(date, { addSuffix: true })
                    } catch (error) {
                      return 'Invalid date'
                    }
                  })()}
                </p>
                {item.details?.comment && (
                  <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                    {item.details.comment}
                  </p>
                )}
              </div>
            </div>
      ))}
    </div>
  )
}