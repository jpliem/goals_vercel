"use client"

import { useState, useEffect } from "react"
import type { GoalWithDetails, UserRecord } from "@/lib/goal-database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, AlertCircle, Clock, CheckCircle, User, Edit, UserPlus, Filter, Target, TrendingUp } from "lucide-react"
import { EditGoalModal } from "@/components/modals/edit-goal-modal"
import { AssignGoalAssigneeModal } from "@/components/modals/assign-goal-assignee-modal"
import { FocusIndicator } from "@/components/ui/focus-indicator"
import { CreateGoalButton } from "@/components/create-request-button"
import Link from "next/link"

interface DepartmentDashboardProps {
  goals: GoalWithDetails[]
  userProfile: UserRecord
  users: UserRecord[]
  userDepartmentPermissions?: string[]
  departmentTeamMappings: Record<string, string[]>
}

// Helper function to check if user was ever assigned to a goal
const hasHistoricalInvolvement = (goal: GoalWithDetails, userId: string): boolean => {
  if (!goal.assignment_history) return false
  
  return goal.assignment_history.some(assignment => 
    assignment.user_id === userId
  )
}

// Utility function to get user-relevant goals consistently
const getUserRelevantGoals = (goals: GoalWithDetails[], userProfile: UserRecord, userDepartmentPermissions?: string[]) => {
  const userId = userProfile.id
  
  const filteredGoals = goals.filter(g => {
    // Check multi-assignee assignment
    const singleAssigneeMatch = g.current_assignee_id === userId
    const multiAssigneeMatch = g.assignees && g.assignees.some((assignee: any) => assignee.user_id === userId)
    
    // Check current assignments
    const isCurrentlyAssigned = 
      g.current_assignee_id === userId || 
      singleAssigneeMatch ||
      multiAssigneeMatch ||
      g.owner_id === userId
    
    // Check historical assignments
    const wasHistoricallyAssigned = hasHistoricalInvolvement(g, userId)
    
    // Check department permissions
    const hasDepartmentAccess = userDepartmentPermissions && 
      userDepartmentPermissions.length > 0 && 
      g.department &&
      userDepartmentPermissions.includes(g.department)
    
    
    // Role-specific filtering (aligned with pdca-board)
    switch (userProfile.role) {
      case "Admin": 
        // Admins see ALL goals (system-wide oversight)
        return true
      case "User": 
        // Users see: their goals + any assigned roles they might have + department permissions
        return g.owner_id === userId || isCurrentlyAssigned || wasHistoricallyAssigned || hasDepartmentAccess
      default: 
        return false
    }
  })
  
  
  return filteredGoals
}

export function DepartmentDashboard({ goals, userProfile, users, userDepartmentPermissions = [], departmentTeamMappings }: DepartmentDashboardProps) {
  const [openSections, setOpenSections] = useState<string[]>(["main-section"])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<GoalWithDetails | null>(null)
  
  // Filter state
  const [hideCompleted, setHideCompleted] = useState(false)
  const [hideCompletedGoals, setHideCompletedGoals] = useState(true)
  
  // Load filter preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('departmentDashboardFilters')
    if (saved) {
      try {
        const filters = JSON.parse(saved)
        setHideCompleted(filters.hideCompleted || false)
        setHideCompletedGoals(filters.hideCompletedGoals !== undefined ? filters.hideCompletedGoals : true)
      } catch (e) {
        // Silently ignore localStorage parse errors
      }
    }
  }, [])

  // Save filter preferences to localStorage
  useEffect(() => {
    const filters = {
      hideCompleted,
      hideCompletedGoals
    }
    localStorage.setItem('departmentDashboardFilters', JSON.stringify(filters))
  }, [hideCompleted, hideCompletedGoals])

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Filter goals to user-relevant ones
  const userRelevantGoals = getUserRelevantGoals(goals, userProfile, userDepartmentPermissions)

  // Helper function to check if goal is overdue
  const isGoalOverdue = (goal: GoalWithDetails): boolean => {
    if (!goal.target_date) return false
    const targetDate = new Date(goal.target_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return targetDate < today && goal.status !== "Completed"
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
      case 'Check': return AlertCircle
      case 'Act': return TrendingUp
      case 'Completed': return CheckCircle
      case 'On Hold': return Clock
      default: return Clock
    }
  }

  // Filter and group goals
  const activeGoals = userRelevantGoals.filter(goal => {
    if (hideCompletedGoals && goal.status === "Completed") return false
    return true
  })

  // Group goals by PDCA status
  const goalsByStatus = activeGoals.reduce((acc, goal) => {
    const status = goal.status
    if (!acc[status]) acc[status] = []
    acc[status].push(goal)
    return acc
  }, {} as Record<string, GoalWithDetails[]>)

  // Define PDCA status order
  const statusOrder = ["Plan", "Do", "Check", "Act", "On Hold", "Completed", "Cancelled"]

  // Sort goals within each status by priority and overdue status
  Object.keys(goalsByStatus).forEach(status => {
    goalsByStatus[status].sort((a, b) => {
      // Overdue goals first
      const aOverdue = isGoalOverdue(a)
      const bOverdue = isGoalOverdue(b)
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      
      // Then by priority
      const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4
      if (aPriority !== bPriority) return aPriority - bPriority
      
      // Then by target date
      const aTarget = a.adjusted_target_date || a.target_date
      const bTarget = b.adjusted_target_date || b.target_date
      if (aTarget && bTarget) {
        return new Date(aTarget).getTime() - new Date(bTarget).getTime()
      }
      if (aTarget && !bTarget) return -1
      if (!aTarget && bTarget) return 1
      
      // Finally by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  })

  // Calculate summary statistics
  const totalGoals = userRelevantGoals.length
  const completedGoals = userRelevantGoals.filter(g => g.status === "Completed").length
  const overdueGoals = userRelevantGoals.filter(isGoalOverdue).length
  const myGoals = userRelevantGoals.filter(g => 
    g.owner_id === userProfile.id || 
    g.current_assignee_id === userProfile.id ||
    (g.assignees && g.assignees.some((a: any) => a.user_id === userProfile.id))
  ).length

  const GoalCard = ({ goal }: { goal: GoalWithDetails }) => {
    const isOverdue = isGoalOverdue(goal)
    const isMyGoal = goal.owner_id === userProfile.id || 
                    goal.current_assignee_id === userProfile.id ||
                    (goal.assignees && goal.assignees.some((a: any) => a.user_id === userProfile.id))
    const StatusIcon = getStatusIcon(goal.status)

    return (
      <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link 
                  href={`/dashboard/goals/${goal.id}`}
                  className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {goal.subject}
                </Link>
                <FocusIndicator isFocused={goal.isFocused || false} showBadge />
                {isMyGoal && (
                  <Badge variant="secondary" className="text-xs">
                    My Goal
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{goal.department}</span>
                {goal.teams && goal.teams.length > 0 && <span>• {goal.teams.join(', ')}</span>}
                <span>• PIC: {goal.owner?.full_name}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                <Badge className={`text-xs ${getStatusColor(goal.status)}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {goal.status}
                </Badge>
                <Badge className={`text-xs ${getPriorityColor(goal.priority)}`}>
                  {goal.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {goal.goal_type}
                </Badge>
              </div>

              {goal.target_date && (
                <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  Target: {new Date(goal.adjusted_target_date || goal.target_date).toLocaleDateString()}
                  {isOverdue && ' (Overdue)'}
                </div>
              )}

              {goal.assignees && goal.assignees.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Assignees: {goal.assignees.map((a: any) => a.users?.full_name || a.full_name || 'Unknown').join(', ')}
                </div>
              )}
            </div>

            <div className="flex gap-1 ml-2">
              {userProfile.role === "Admin" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedGoal(goal)
                      setEditModalOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedGoal(goal)
                      setAssignModalOpen(true)
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalGoals}</div>
            <div className="text-sm text-gray-600">Total Goals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completedGoals}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{overdueGoals}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{myGoals}</div>
            <div className="text-sm text-gray-600">My Goals</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideCompletedGoals}
                onChange={(e) => setHideCompletedGoals(e.target.checked)}
                className="rounded"
              />
              Hide completed goals
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Goals by PDCA Status */}
      {statusOrder.map(status => {
        const statusGoals = goalsByStatus[status] || []
        if (statusGoals.length === 0) return null

        const sectionId = `status-${status}`
        const isOpen = openSections.includes(sectionId)
        const StatusIcon = getStatusIcon(status)

        return (
          <Card key={status}>
            <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionId)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <StatusIcon className="h-5 w-5" />
                      {status} Goals
                      <Badge className={`${getStatusColor(status)}`}>
                        {statusGoals.length}
                      </Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {statusGoals.map(goal => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}

      {/* Empty State */}
      {totalGoals === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
            <p className="text-gray-600 mb-4">
              {userProfile.role === "Admin" 
                ? "No goals have been created in the system yet."
                : "You don't have access to any goals yet."}
            </p>
            {(userProfile.role === "User" || userProfile.role === "Admin") && (
              <CreateGoalButton
                users={users}
                userProfile={userProfile}
                departmentTeamMappings={departmentTeamMappings}
                onGoalCreated={() => {}}
              />
            )}
          </CardContent>
        </Card>
      )}

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