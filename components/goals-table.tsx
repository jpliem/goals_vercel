"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Target, 
  Clock, 
  Eye, 
  TrendingUp, 
  CheckCircle, 
  User, 
  Users,
  Calendar,
  Pause,
  AlertCircle,
  ExternalLink,
  Edit,
  UserPlus
} from "lucide-react"
import type { GoalWithDetails, UserRecord } from "@/lib/goal-database"
import { FocusIndicator } from "@/components/ui/focus-indicator"
import { EditGoalModal } from "@/components/modals/edit-goal-modal"
import { AssignGoalAssigneeModal } from "@/components/modals/assign-goal-assignee-modal"

interface GoalsTableProps {
  goals: GoalWithDetails[]
  userProfile: UserRecord
  users: UserRecord[]
  userDepartmentPermissions?: string[]
}

// Helper function to truncate names
const truncateName = (name: string, maxLength: number = 12): string => {
  if (!name || name === 'TBD') return name
  const firstName = name.split(' ')[0]
  return firstName.length > maxLength ? firstName.substring(0, maxLength) + '...' : firstName
}

export function GoalsTable({ goals, userProfile, users, userDepartmentPermissions = [] }: GoalsTableProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<GoalWithDetails | null>(null)

  // Helper function to check if goal is overdue
  const isGoalOverdue = (goal: GoalWithDetails): boolean => {
    if (!goal.target_date || goal.status === "Completed") return false
    const targetDate = new Date(goal.target_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return targetDate < today
  }

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500 text-white'
      case 'High': return 'bg-orange-500 text-white'
      case 'Medium': return 'bg-yellow-500 text-white'
      case 'Low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Helper function to get PDCA status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Plan': return 'bg-blue-100 text-blue-800'
      case 'Do': return 'bg-purple-100 text-purple-800'
      case 'Check': return 'bg-orange-100 text-orange-800'
      case 'Act': return 'bg-green-100 text-green-800'
      case 'Completed': return 'bg-green-500 text-white'
      case 'On Hold': return 'bg-yellow-100 text-yellow-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Plan': return Target
      case 'Do': return Clock
      case 'Check': return Eye
      case 'Act': return TrendingUp
      case 'Completed': return CheckCircle
      case 'On Hold': return Pause
      default: return Clock
    }
  }

  // Helper function to get assignee display
  const getAssigneeDisplay = (goal: GoalWithDetails) => {
    if (goal.assignees && goal.assignees.length > 0) {
      const completedCount = goal.assignees.filter(a => a.task_status === 'completed').length
      if (goal.assignees.length === 1) {
        const assignee = goal.assignees[0]
        const name = (assignee as any).users?.full_name || (assignee as any).assignee_name || 'Unknown'
        return {
          display: truncateName(name),
          full: name,
          isMultiple: false,
          status: assignee.task_status === 'completed' ? '✅' : '⚙️'
        }
      }
      return {
        display: `${goal.assignees.length} assignees`,
        full: goal.assignees.map(a => (a as any).users?.full_name || (a as any).assignee_name || 'Unknown').join(', '),
        isMultiple: true,
        status: `⚙️ (${completedCount}/${goal.assignees.length})`
      }
    }
    
    if (goal.current_assignee) {
      return {
        display: truncateName(goal.current_assignee.full_name),
        full: goal.current_assignee.full_name,
        isMultiple: false,
        status: ''
      }
    }
    
    return {
      display: 'Unassigned',
      full: 'No assignee',
      isMultiple: false,
      status: ''
    }
  }

  // Helper function to calculate duration
  const calculateDuration = (goal: GoalWithDetails): string => {
    const created = new Date(goal.created_at)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day'
    if (diffDays < 30) return `${diffDays} days`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`
    return `${Math.floor(diffDays / 365)} years`
  }

  // Helper function to format timeline
  const formatTimeline = (goal: GoalWithDetails): string => {
    if (!goal.target_date) return 'No target date'
    
    const targetDate = new Date(goal.adjusted_target_date || goal.target_date)
    const now = new Date()
    const diffMs = targetDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
    if (diffDays === 0) return 'Due today'
    if (diffDays <= 7) return `${diffDays}d left`
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}w left`
    return `${Math.ceil(diffDays / 30)}m left`
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
        <p className="text-gray-600">No goals match your current filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '4%'}}>Type</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '17%'}}>Goal</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '10%'}}>Department</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '12%'}}>PIC</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '15%'}}>Assignees</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '8%'}}>Status</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '6%'}}>Priority</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '6%'}}>Duration</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '10%'}}>Timeline</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '4%'}}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {goals.map((goal) => {
              const isOverdue = isGoalOverdue(goal)
              const assigneeInfo = getAssigneeDisplay(goal)
              const StatusIcon = getStatusIcon(goal.status)
              
              return (
                <tr 
                  key={goal.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.open(`/dashboard/goals/${goal.id}`, '_blank')}
                >
                  {/* Type */}
                  <td className="py-3">
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                        {goal.goal_type.charAt(0)}
                      </Badge>
                    </div>
                  </td>

                  {/* Goal */}
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <FocusIndicator isFocused={goal.isFocused || false} />
                      <div className="overflow-hidden">
                        <div className="font-medium text-sm text-gray-900 truncate" title={goal.subject}>
                          {goal.subject}
                        </div>
                        {goal.target_metrics && (
                          <div className="text-xs text-gray-500 truncate" title={goal.target_metrics}>
                            {goal.target_metrics}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="py-3">
                    <div className="text-sm text-gray-900 truncate" title={goal.department}>
                      {goal.department}
                    </div>
                    {goal.teams && goal.teams.length > 0 && (
                      <div className="text-xs text-gray-500 truncate" title={goal.teams.join(', ')}>
                        {goal.teams.join(', ')}
                      </div>
                    )}
                  </td>

                  {/* PIC */}
                  <td className="py-3">
                    <div className="text-sm text-gray-900 truncate" title={goal.owner?.full_name || 'Unknown'}>
                      {truncateName(goal.owner?.full_name || 'Unknown')}
                    </div>
                  </td>

                  {/* Assignees */}
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-900 truncate" title={assigneeInfo.full}>
                        {assigneeInfo.display}
                      </span>
                      {assigneeInfo.status && (
                        <span className="text-xs">{assigneeInfo.status}</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3">
                    <Badge className={`text-xs ${getStatusColor(goal.status)}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {goal.status}
                    </Badge>
                  </td>

                  {/* Priority */}
                  <td className="py-3">
                    <Badge className={`text-xs ${getPriorityColor(goal.priority)}`}>
                      {goal.priority}
                    </Badge>
                  </td>


                  {/* Duration */}
                  <td className="py-3">
                    <span className="text-sm text-gray-500">
                      {calculateDuration(goal)}
                    </span>
                  </td>

                  {/* Timeline */}
                  <td className="py-3">
                    <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {formatTimeline(goal)}
                      {isOverdue && (
                        <AlertCircle className="h-3 w-3 inline ml-1" />
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {(userProfile.role === "Admin" || goal.owner_id === userProfile.id) && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedGoal(goal)
                              setEditModalOpen(true)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedGoal(goal)
                              setAssignModalOpen(true)
                            }}
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/dashboard/goals/${goal.id}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {goals.map((goal) => {
          const isOverdue = isGoalOverdue(goal)
          const assigneeInfo = getAssigneeDisplay(goal)
          const StatusIcon = getStatusIcon(goal.status)
          
          return (
            <Card 
              key={goal.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => window.open(`/goals/${goal.id}`, '_blank')}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <FocusIndicator isFocused={goal.isFocused || false} />
                      <div className="overflow-hidden">
                        <h3 className="font-medium text-sm text-gray-900 truncate">{goal.subject}</h3>
                        <p className="text-xs text-gray-500">{goal.department}{goal.teams && goal.teams.length > 0 && ` • ${goal.teams.join(', ')}`}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">
                      {goal.goal_type}
                    </Badge>
                  </div>

                  {/* Status and Priority */}
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getStatusColor(goal.status)}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {goal.status}
                    </Badge>
                    <Badge className={`text-xs ${getPriorityColor(goal.priority)}`}>
                      {goal.priority}
                    </Badge>
                  </div>

                  {/* PIC and Assignees */}
                  <div className="text-xs text-gray-600">
                    <div>PIC: {goal.owner?.full_name || 'Unknown'}</div>
                    <div>Assignees: {assigneeInfo.display} {assigneeInfo.status}</div>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{calculateDuration(goal)} old</span>
                    <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {formatTimeline(goal)}
                      {isOverdue && <AlertCircle className="h-3 w-3 inline ml-1" />}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modals */}
      {selectedGoal && (
        <>
          <EditGoalModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            goal={selectedGoal}
            onUpdate={() => {}}
          />
          <AssignGoalAssigneeModal
            isOpen={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            goalId={selectedGoal.id}
            users={users}
            currentAssignees={selectedGoal.assignees?.map(a => a.user_id) || []}
            onUpdate={() => {}}
          />
        </>
      )}
    </div>
  )
}