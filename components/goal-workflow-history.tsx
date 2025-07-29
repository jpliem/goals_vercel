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
      // New task-related actions
      case 'task_created':
        return 'bg-cyan-100 text-cyan-800'
      case 'task_completed':
        return 'bg-green-100 text-green-800'
      case 'task_deleted':
        return 'bg-red-100 text-red-800'
      case 'task_edited':
        return 'bg-yellow-100 text-yellow-800'
      case 'task_started':
        return 'bg-indigo-100 text-indigo-800'
      case 'tasks_bulk_created':
        return 'bg-teal-100 text-teal-800'
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
        const fromStatus = details.from_status || details.fromStatus
        const toStatus = details.to_status || details.toStatus || details.new_status || details.status
        
        if (!toStatus) {
          return 'Status updated'
        }
        
        const fromText = fromStatus ? ` from ${fromStatus}` : ''
        return `Status changed${fromText} to ${toStatus}`
      case 'assigned':
      case 'assignment':
        return 'Team members assigned'
      case 'completed':
      case 'task_completed':
        const taskTitle = details.task_title ? ` "${details.task_title}"` : ''
        return `Task${taskTitle} marked as completed`
      case 'commented':
      case 'comment':
        return 'Progress update added'
      case 'target_date_set':
      case 'target_date_updated':
        return 'Target date updated'
      // New task action types
      case 'task_created':
        const createdTaskTitle = details.task_title ? ` "${details.task_title}"` : ''
        return `Task${createdTaskTitle} created`
      case 'task_deleted':
        const deletedTaskTitle = details.task_title ? ` "${details.task_title}"` : ''
        return `Task${deletedTaskTitle} removed (no longer needed)`
      case 'task_edited':
        const editedTaskTitle = details.task_title ? ` "${details.task_title}"` : ''
        return `Task${editedTaskTitle} updated`
      case 'task_started':
        const startedTaskTitle = details.task_title ? ` "${details.task_title}"` : ''
        return `Task${startedTaskTitle} started`
      case 'tasks_bulk_created':
        const taskCount = details.task_count || 0
        const taskTitles = details.task_titles || []
        if (taskCount <= 3) {
          // Show individual task names for small counts
          return `${taskCount} tasks created: ${taskTitles.join(', ')}`
        } else {
          // Show count and first few for larger counts
          const firstThree = taskTitles.slice(0, 3).join(', ')
          const remaining = taskCount - 3
          return `${taskCount} tasks created: ${firstThree}${remaining > 0 ? ` and ${remaining} more` : ''}`
        }
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
                  <Badge className={getActionColor(item.action || '')}>
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
                {item.details?.completion_notes && (
                  <div className="text-sm mt-2 bg-green-50 border border-green-200 p-2 rounded">
                    <strong className="text-green-800">Completion Notes:</strong>
                    <p className="text-gray-700 mt-1">{item.details.completion_notes}</p>
                  </div>
                )}
                {item.action === 'task_edited' && item.details?.changes && (
                  <div className="text-sm mt-2 bg-yellow-50 border border-yellow-200 p-2 rounded">
                    <strong className="text-yellow-800">Changes:</strong>
                    <div className="text-gray-700 mt-1 space-y-1">
                      {Object.entries(item.details.changes).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium">{key.replace(/_/g, ' ')}:</span> <span className="italic">{String(value) || 'removed'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
      ))}
    </div>
  )
}