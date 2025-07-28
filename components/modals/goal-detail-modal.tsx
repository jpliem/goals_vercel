"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { 
  ExternalLink,
  MessageSquare,
  Target,
  Clock,
  User,
  Users,
  Calendar,
  Edit,
  CheckCircle,
  AlertCircle,
  Pause,
  Building,
  FileText,
  CheckSquare,
  Play,
  MoreVertical
} from "lucide-react"
import type { GoalWithDetails, UserRecord } from "@/lib/goal-database"
import { addGoalComment, updateGoalStatus } from "@/actions/goals"
import { startTask, completeTask } from "@/actions/goal-tasks"
import { getGoalById } from "@/lib/goal-database"
import Link from "next/link"

interface GoalDetailModalProps {
  goal: GoalWithDetails | null
  userProfile: UserRecord
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
  users?: UserRecord[]
}

export function GoalDetailModal({ goal, userProfile, isOpen, onClose, onRefresh, users = [] }: GoalDetailModalProps) {
  if (!goal) return null

  const [localGoal, setLocalGoal] = useState<GoalWithDetails>(goal)
  const [localComments, setLocalComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [taskUpdateLoading, setTaskUpdateLoading] = useState<string | null>(null)
  const [renderKey, setRenderKey] = useState(0)

  // Force re-render when goal status changes to ensure UI updates
  useEffect(() => {
    setRenderKey(prev => prev + 1)
  }, [localGoal.status])

  // Local refresh function
  const refreshLocalGoal = async () => {
    try {
      const result = await getGoalById(goal.id)
      if (result.data) {
        setLocalGoal(result.data as GoalWithDetails)
      }
    } catch (error) {
      console.error("Failed to refresh goal data:", error)
    }
  }

  const isOwner = localGoal.owner_id === userProfile.id
  const isCurrentAssignee = localGoal.current_assignee_id === userProfile.id
  const isMultiAssignee = localGoal.assignees?.some((assignee: any) => assignee.user_id === userProfile.id)
  const canEdit = userProfile.role === "Admin" || 
                 (userProfile.role === "Head" && localGoal.department === userProfile.department) ||
                 isOwner
  const canComment = isOwner || isCurrentAssignee || isMultiAssignee || userProfile.role === "Admin" || userProfile.role === "Head"

  // Compute display comments (goal comments + local additions)
  const displayComments = [...(localGoal.comments || []), ...localComments]

  // Helper functions
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress': return <Play className="w-4 h-4 text-blue-600" />
      case 'pending': return <Clock className="w-4 h-4 text-gray-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return null
    }
  }

  // Calculate task stats for current PDCA phase only
  const getCurrentPhaseTaskStats = () => {
    if (!localGoal.tasks || localGoal.tasks.length === 0) {
      return null
    }

    const currentPhaseTasks = localGoal.tasks.filter(task => 
      task.pdca_phase === localGoal.status || 
      (!task.pdca_phase && localGoal.status === 'Plan')
    )

    if (currentPhaseTasks.length === 0) {
      return null
    }

    const completedTasks = currentPhaseTasks.filter(task => task.status === 'completed').length
    const pendingTasks = currentPhaseTasks.filter(task => task.status === 'pending').length
    const inProgressTasks = currentPhaseTasks.filter(task => task.status === 'in_progress').length
    const totalTasks = currentPhaseTasks.length
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      in_progress_tasks: inProgressTasks,
      completion_percentage: completionPercentage
    }
  }

  // Get all unique task assignees across all phases
  const getAllTaskAssignees = () => {
    if (!localGoal.tasks || localGoal.tasks.length === 0) {
      return []
    }

    // Simple user lookup for fallback when assigned_user is not populated
    const mockUsers = [
      { id: '11111111-1111-1111-1111-111111111111', full_name: 'System Administrator', email: 'admin@company.com' },
      { id: '22222222-2222-2222-2222-222222222222', full_name: 'John Smith', email: 'john.smith@company.com' },
      { id: '33333333-3333-3333-3333-333333333333', full_name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
      { id: '44444444-4444-4444-4444-444444444444', full_name: 'Mike Chen', email: 'mike.chen@company.com' },
      { id: '55555555-5555-5555-5555-555555555555', full_name: 'Lisa Davis', email: 'lisa.davis@company.com' }
    ]

    const assigneeMap = new Map()
    
    localGoal.tasks.forEach((task) => {
      // Check multiple possible ways the assignee data might be structured
      let assigneeData = null
      let assigneeId = null
      
      if (task.assigned_user && task.assigned_user.full_name) {
        // Standard case: assigned_user object with full_name
        assigneeData = task.assigned_user
        assigneeId = task.assigned_to || task.assigned_user.id || `temp-${task.assigned_user.full_name}`
      } else if (task.assigned_to) {
        // Fallback case: only assigned_to ID is available, look up user info
        assigneeId = task.assigned_to
        const mockUser = mockUsers.find(u => u.id === task.assigned_to)
        if (mockUser) {
          assigneeData = mockUser
        } else {
          // Skip if we can't find user info
          return
        }
      }
      
      if (assigneeData && assigneeId) {
        if (!assigneeMap.has(assigneeId)) {
          assigneeMap.set(assigneeId, {
            id: assigneeId,
            full_name: assigneeData.full_name,
            email: assigneeData.email || '',
            phases: new Set()
          })
        }
        assigneeMap.get(assigneeId).phases.add(task.pdca_phase || 'Plan')
      }
    })

    return Array.from(assigneeMap.values()).map(assignee => ({
      ...assignee,
      phases: Array.from(assignee.phases).sort((a, b) => {
        const phaseOrder = { 'Plan': 0, 'Do': 1, 'Check': 2, 'Act': 3 }
        return (phaseOrder[a as keyof typeof phaseOrder] || 0) - (phaseOrder[b as keyof typeof phaseOrder] || 0)
      })
    }))
  }

  useEffect(() => {
    if (isOpen && goal) {
      setActiveTab("overview") // Reset to overview when opening
      setLocalComments([]) // Clear local comments when opening modal
      setLocalGoal(goal) // Update local goal when modal opens or goal changes
    }
  }, [isOpen, goal?.id])

  const handleAddComment = async () => {
    if (!newComment.trim() || !localGoal) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await addGoalComment(localGoal.id, newComment.trim())
      
      if (result.error) {
        setError(result.error as string)
      } else {
        // Add comment locally for immediate display
        const newLocalComment = {
          id: `local-${Date.now()}`,
          goal_id: localGoal.id,
          user_id: userProfile.id,
          comment: newComment.trim(),
          created_at: new Date().toISOString(),
          user: {
            full_name: userProfile.full_name,
            email: userProfile.email
          }
        }
        setLocalComments(prev => [...prev, newLocalComment])
        setNewComment("")
        // Refresh local goal data and notify parent
        await refreshLocalGoal()
        onRefresh?.()
      }
    } catch (error) {
      setError("Failed to add comment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!localGoal) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await updateGoalStatus(localGoal.id, newStatus)
      
      if (result.error) {
        setError(result.error as string)
      } else {
        // Refresh local goal data and notify parent
        await refreshLocalGoal()
        
        // Additional check: wait a moment and refresh again to ensure persistence
        setTimeout(async () => {
          await refreshLocalGoal()
        }, 500)
        
        onRefresh?.()
      }
    } catch (error) {
      setError("Failed to update goal status")
    } finally {
      setIsLoading(false)
    }
  }

  // Task status change functions
  const handleStartTask = async (taskId: string) => {
    setTaskUpdateLoading(taskId)
    try {
      const result = await startTask(taskId)
      if (result.error) {
        setError(result.error as string)
      } else {
        // Only refresh local goal data, don't trigger parent refresh
        await refreshLocalGoal()
      }
    } catch (error) {
      setError("Failed to start task")
    } finally {
      setTaskUpdateLoading(null)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    setTaskUpdateLoading(taskId)
    try {
      const result = await completeTask(taskId)
      if (result.error) {
        setError(result.error as string)
      } else {
        // Refresh to get immediate task update
        await refreshLocalGoal()
      }
    } catch (error) {
      setError("Failed to complete task")
    } finally {
      setTaskUpdateLoading(null)
    }
  }

  const isGoalOverdue = (): boolean => {
    if (!localGoal.target_date || localGoal.status === "Completed") return false
    const targetDate = new Date(localGoal.target_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return targetDate < today
  }

  const overdue = isGoalOverdue()

  // Check if current phase has incomplete tasks for validation
  const getCurrentPhaseTaskValidation = () => {
    if (!localGoal.tasks || localGoal.tasks.length === 0) {
      return { canProgress: true, incompleteTasks: [] }
    }

    const currentPhaseTasks = localGoal.tasks.filter(task => 
      task.pdca_phase === localGoal.status || 
      (!task.pdca_phase && localGoal.status === 'Plan')
    )

    const incompleteTasks = currentPhaseTasks.filter(task => task.status !== 'completed')
    const canProgress = incompleteTasks.length === 0
    
    return {
      canProgress: canProgress,
      incompleteTasks: incompleteTasks
    }
  }

  const phaseValidation = getCurrentPhaseTaskValidation()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] p-0 flex flex-col" key={`goal-modal-${renderKey}`}>
        <DialogHeader className="p-4 pb-3 bg-gray-50 border-b flex-shrink-0">
          <div className="space-y-2">
            <div>
              <DialogTitle className="text-lg font-semibold">{localGoal.subject}</DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {localGoal.goal_type} Goal • {localGoal.department}
              </DialogDescription>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(localGoal.status)} text-xs`}>
                  {localGoal.status}
                </Badge>
                {localGoal.priority && localGoal.priority !== 'Medium' && (
                  <Badge variant="outline" className={`text-xs ${
                    localGoal.priority === 'Critical' ? 'border-red-300 text-red-700' :
                    localGoal.priority === 'High' ? 'border-orange-300 text-orange-700' :
                    'border-gray-300 text-gray-700'
                  }`}>
                    {localGoal.priority}
                  </Badge>
                )}
                {overdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
              
              {localGoal.target_date && (
                <div className={`flex items-center gap-1 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(localGoal.adjusted_target_date || localGoal.target_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            {(() => {
              const currentPhaseStats = getCurrentPhaseTaskStats()
              return currentPhaseStats && currentPhaseStats.total_tasks > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{localGoal.status} Phase Progress</span>
                    <span className="text-gray-700 font-medium">
                      {currentPhaseStats.completed_tasks} of {currentPhaseStats.total_tasks} tasks complete 
                      ({currentPhaseStats.pending_tasks} pending, {currentPhaseStats.in_progress_tasks} in progress)
                    </span>
                  </div>
                  <Progress value={currentPhaseStats.completion_percentage} className="h-2" />
                </div>
              ) : null
            })()}
          </div>
        </DialogHeader>

        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks ({getCurrentPhaseTaskStats()?.total_tasks || 0})
            </TabsTrigger>
            <TabsTrigger value="comments">Comments ({displayComments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              {/* Goal Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5" />
                    Goal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-gray-700 leading-relaxed mt-1">
                      {localGoal.description || 'No description provided'}
                    </p>
                  </div>

                  {localGoal.target_metrics && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Target Metrics</label>
                      <p className="text-gray-700 leading-relaxed mt-1">{localGoal.target_metrics}</p>
                    </div>
                  )}

                  {localGoal.success_criteria && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Success Criteria</label>
                      <p className="text-gray-700 leading-relaxed mt-1">{localGoal.success_criteria}</p>
                    </div>
                  )}

                  <div className="space-y-4 text-sm">
                    {/* PIC Structure */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                        <User className="h-4 w-4" />
                        PIC (Person In Charge) Structure
                      </h4>
                      
                      {/* Goal PICs */}
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-gray-600 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-medium text-sm text-gray-800">Goal PICs</span>
                            <div className="mt-1 space-y-1">
                              <div className="text-gray-700">
                                <span className="font-medium">{localGoal.owner?.full_name || 'Unknown'}</span>
                                <span className="text-gray-500"> (Goal Owner)</span>
                                <span className="text-gray-500"> • {localGoal.department}</span>
                              </div>
                              {localGoal.assignees && localGoal.assignees.length > 0 && (
                                localGoal.assignees
                                  .filter((assignee: any) => {
                                    const assigneeName = assignee.users?.full_name || assignee.user?.full_name
                                    const ownerName = localGoal.owner?.full_name
                                    return assigneeName !== ownerName // Filter out duplicates
                                  })
                                  .map((assignee: any) => (
                                    <div key={assignee.user_id} className="text-gray-700">
                                      <span className="font-medium">{assignee.users?.full_name || assignee.user?.full_name || 'Unknown User'}</span>
                                      <span className="text-gray-500"> (Goal Assignee)</span>
                                    </div>
                                  ))
                              )}
                              {localGoal.teams && localGoal.teams.length > 0 && (
                                <div className="text-gray-600 mt-1">
                                  <span className="text-xs">Supporting teams: {localGoal.teams.join(', ')}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              People responsible for overall goal success
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Task PICs */}
                      {(() => {
                        const taskAssignees = getAllTaskAssignees()
                        console.log('🔍 DEBUG - Goal Tasks:', localGoal.tasks)
                        console.log('🔍 DEBUG - Task Assignees Found:', taskAssignees)
                        console.log('🔍 DEBUG - Number of tasks:', localGoal.tasks?.length || 0)
                        console.log('🔍 DEBUG - Number of assignees found:', taskAssignees.length)
                        if (localGoal.tasks && localGoal.tasks.length > 0) {
                          localGoal.tasks.forEach((task, index) => {
                            console.log(`🔍 DEBUG - Task ${index} FULL OBJECT:`, task)
                            console.log(`🔍 DEBUG - Task ${index} BREAKDOWN:`, {
                              id: task.id,
                              title: task.title,
                              assigned_user: task.assigned_user,
                              assigned_to: task.assigned_to,
                              status: task.status,
                              pdca_phase: task.pdca_phase,
                              has_assigned_user: !!task.assigned_user,
                              has_full_name: !!(task.assigned_user?.full_name),
                              assigned_user_keys: task.assigned_user ? Object.keys(task.assigned_user) : 'null',
                              all_task_keys: Object.keys(task)
                            })
                          })
                        }
                        return taskAssignees.length > 0 ? (
                          <div className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-gray-600 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium text-sm text-gray-800">Task PICs ({taskAssignees.length} people)</span>
                                <div className="mt-2 space-y-1">
                                  {taskAssignees.map(assignee => (
                                    <div key={assignee.id} className="text-sm text-gray-700">
                                      <span className="font-medium">{assignee.full_name}</span>
                                      <span className="text-gray-500"> - {assignee.phases.join(', ')} phase{assignee.phases.length > 1 ? 's' : ''}</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  People assigned to specific tasks
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium text-sm text-gray-700">No Task PICs Found</span>
                                <p className="text-xs text-gray-500 mt-1">
                                  Tasks exist but no assignee information available. Check the Tasks tab for more details.
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckSquare className="h-5 w-5" />
                  Tasks Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">

                  {/* Task List */}
                  {(() => {
                    // Filter tasks by current PDCA phase
                    const currentPhaseTasks = localGoal.tasks?.filter(task => 
                      task.pdca_phase === localGoal.status || 
                      (!task.pdca_phase && localGoal.status === 'Plan') // fallback for tasks without phase
                    ) || []
                    
                    // For Head users, separate tasks by department
                    const isHead = userProfile.role === 'Head'
                    
                    const separateTasksByDepartment = (tasks: any[]) => {
                      if (!isHead) {
                        // For non-Head users, just sort all tasks together
                        return {
                          myDepartmentTasks: tasks.sort((a, b) => {
                            // First sort by assignment (my tasks first)
                            const aIsMine = a.assigned_to === userProfile.id
                            const bIsMine = b.assigned_to === userProfile.id
                            if (aIsMine && !bIsMine) return -1
                            if (!aIsMine && bIsMine) return 1
                            
                            // Then by priority
                            const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 }
                            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
                            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2
                            if (aPriority !== bPriority) return aPriority - bPriority
                            
                            // Then by due date (overdue first, then soonest)
                            if (a.due_date && b.due_date) {
                              return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                            }
                            if (a.due_date && !b.due_date) return -1
                            if (!a.due_date && b.due_date) return 1
                            
                            return 0
                          }),
                          otherDepartmentTasks: []
                        }
                      }
                      
                      // For Head users, separate by department
                      const myDeptTasks = tasks.filter(task => 
                        task.department === userProfile.department || !task.department
                      )
                      const otherDeptTasks = tasks.filter(task => 
                        task.department && task.department !== userProfile.department
                      )
                      
                      // Sort both arrays with same logic
                      const sortTasks = (taskArray: any[]) => taskArray.sort((a, b) => {
                        // First sort by assignment (my tasks first)
                        const aIsMine = a.assigned_to === userProfile.id
                        const bIsMine = b.assigned_to === userProfile.id
                        if (aIsMine && !bIsMine) return -1
                        if (!aIsMine && bIsMine) return 1
                        
                        // Then by priority
                        const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 }
                        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
                        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2
                        if (aPriority !== bPriority) return aPriority - bPriority
                        
                        // Then by due date (overdue first, then soonest)
                        if (a.due_date && b.due_date) {
                          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                        }
                        if (a.due_date && !b.due_date) return -1
                        if (!a.due_date && b.due_date) return 1
                        
                        return 0
                      })
                      
                      return {
                        myDepartmentTasks: sortTasks(myDeptTasks),
                        otherDepartmentTasks: sortTasks(otherDeptTasks)
                      }
                    }
                    
                    const { myDepartmentTasks, otherDepartmentTasks } = separateTasksByDepartment(currentPhaseTasks)
                    
                    return (myDepartmentTasks.length > 0 || otherDepartmentTasks.length > 0) ? (
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">{localGoal.status} Phase Tasks</h4>
                        
                        <div className="max-h-[40vh] overflow-y-auto space-y-4">
                          {/* My Department Tasks Section */}
                          {myDepartmentTasks.length > 0 && (
                            <div className="space-y-2">
                              {isHead && <h5 className="font-medium text-xs text-blue-700 uppercase tracking-wide">My Department Tasks</h5>}
                              <div className="space-y-2">
                                {myDepartmentTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className={`border rounded-lg p-2 ${
                                      isOverdue(task.due_date) && task.status !== 'completed' 
                                        ? 'border-red-200 bg-red-50' 
                                        : 'border-gray-200 bg-white'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          {getStatusIcon(task.status)}
                                          <span className="font-medium text-sm">{task.title}</span>
                                          <Badge className={getPriorityColor(task.priority)}>
                                            {task.priority}
                                          </Badge>
                                          {isOverdue(task.due_date) && task.status !== 'completed' && (
                                            <Badge variant="destructive" className="text-xs">
                                              <AlertCircle className="w-3 h-3 mr-1" />
                                              Overdue
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-1">
                                          {task.description && (
                                            <p className="text-gray-700">{task.description}</p>
                                          )}
                                          <div className="flex items-center gap-4">
                                            {task.assigned_user && (
                                              <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                <span>PIC: {task.assigned_user.full_name}</span>
                                              </div>
                                            )}
                                            {task.assigned_by_user && (
                                              <div className="flex items-center gap-1">
                                                <User className="w-3 h-3 text-gray-400" />
                                                <span className="text-gray-600">Created by: {task.assigned_by_user.full_name}</span>
                                              </div>
                                            )}
                                            {task.due_date && (
                                              <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(task.due_date)}</span>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Completion Information */}
                                          {task.status === 'completed' && (
                                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                              <div className="text-xs text-green-800 font-medium">
                                                ✓ Completed {task.completed_at && formatDate(task.completed_at)}
                                                {task.completed_by && (
                                                  <span className="ml-1">
                                                    by {task.completed_by === userProfile.id ? 'you' : (users.find(u => u.id === task.completed_by)?.full_name || 'Unknown')}
                                                  </span>
                                                )}
                                              </div>
                                              {task.completion_notes && (
                                                <div className="text-xs text-gray-700 mt-1">
                                                  <strong>Notes:</strong> {task.completion_notes}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Task Action Buttons */}
                                      {task.assigned_to === userProfile.id && task.status !== 'completed' && task.status !== 'cancelled' && (
                                        <div className="flex items-center gap-2">
                                          {task.status === 'pending' && (
                                            <Button
                                              size="sm"
                                              onClick={() => handleStartTask(task.id)}
                                              disabled={taskUpdateLoading === task.id}
                                              className="bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                              {taskUpdateLoading === task.id ? (
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                              ) : (
                                                <>
                                                  <Play className="w-3 h-3 mr-1" />
                                                  Start
                                                </>
                                              )}
                                            </Button>
                                          )}
                                          
                                          {task.status === 'in_progress' && (
                                            <Button
                                              size="sm"
                                              onClick={() => handleCompleteTask(task.id)}
                                              disabled={taskUpdateLoading === task.id}
                                              className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                              {taskUpdateLoading === task.id ? (
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                              ) : (
                                                <>
                                                  <CheckCircle className="w-3 h-3 mr-1" />
                                                  Complete
                                                </>
                                              )}
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                      
                                      {task.status === 'completed' && (
                                        <Badge variant="secondary" className="text-green-700 bg-green-100">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Completed
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Other Department Tasks Section */}
                          {otherDepartmentTasks.length > 0 && isHead && (
                            <div className="space-y-2">
                              <h5 className="font-medium text-xs text-gray-600 uppercase tracking-wide">Other Department Tasks</h5>
                              <div className="space-y-2">
                                {otherDepartmentTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`border rounded-lg p-2 ${
                              isOverdue(task.due_date) && task.status !== 'completed' 
                                ? 'border-red-200 bg-red-50' 
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(task.status)}
                                  <span className="font-medium text-sm">{task.title}</span>
                                  <Badge className={getPriorityColor(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                  {task.department && task.department !== userProfile.department && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.department}
                                    </Badge>
                                  )}
                                  {isOverdue(task.due_date) && task.status !== 'completed' && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Overdue
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-sm text-gray-600 space-y-1">
                                  {task.description && (
                                    <p className="text-gray-700">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-4">
                                    {task.assigned_user && (
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        <span>PIC: {task.assigned_user.full_name}</span>
                                      </div>
                                    )}
                                    {task.assigned_by_user && (
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-gray-400" />
                                        <span className="text-gray-600">Created by: {task.assigned_by_user.full_name}</span>
                                      </div>
                                    )}
                                    {task.due_date && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDate(task.due_date)}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Completion Information */}
                                  {task.status === 'completed' && (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                      <div className="text-xs text-green-800 font-medium">
                                        ✓ Completed {task.completed_at && formatDate(task.completed_at)}
                                        {task.completed_by && (
                                          <span className="ml-1">
                                            by {task.completed_by === userProfile.id ? 'you' : (users.find(u => u.id === task.completed_by)?.full_name || 'Unknown')}
                                          </span>
                                        )}
                                      </div>
                                      {task.completion_notes && (
                                        <div className="text-xs text-gray-700 mt-1">
                                          <strong>Notes:</strong> {task.completion_notes}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Task Action Buttons */}
                              {task.assigned_to === userProfile.id && task.status !== 'completed' && task.status !== 'cancelled' && (
                                <div className="flex items-center gap-2">
                                  {task.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleStartTask(task.id)}
                                      disabled={taskUpdateLoading === task.id}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      {taskUpdateLoading === task.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                      ) : (
                                        <>
                                          <Play className="w-3 h-3 mr-1" />
                                          Start
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  
                                  {task.status === 'in_progress' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleCompleteTask(task.id)}
                                      disabled={taskUpdateLoading === task.id}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      {taskUpdateLoading === task.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Complete
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
                              
                              {task.status === 'completed' && (
                                <Badge variant="secondary" className="text-green-700 bg-green-100">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <CheckSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm">No tasks for the {localGoal.status} phase</p>
                        <Link href={`/dashboard/goals/${localGoal.id}?tab=tasks`}>
                          <Button variant="outline" size="sm" className="mt-2">
                            Create Task
                          </Button>
                        </Link>
                      </div>
                    )
                  })()}
                  </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-5 w-5" />
                  Comments & Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recent Comments */}
                <div className="max-h-64 overflow-y-auto">
                  {displayComments && displayComments.length > 0 ? (
                    <div className="space-y-3">
                      {displayComments.slice(-5).reverse().map((comment: any, index: number) => (
                        <div key={comment.id || `comment-${index}`} className="border-l-4 border-blue-200 pl-3 py-2 bg-gray-50 rounded-r">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-blue-700">
                                {(comment.user?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm text-gray-900">
                                  {comment.user?.full_name || 'Unknown User'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'Unknown date'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{comment.comment || 'No content'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm">No comments yet</p>
                    </div>
                  )}
                </div>

                {/* Add Comment */}
                {canComment && (
                  <div className="border-t pt-4">
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleAddComment}
                          disabled={isLoading || !newComment.trim()}
                          size="sm"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {isLoading ? 'Adding...' : 'Add Comment'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          </Tabs>
        </div>
        
        {/* Fixed Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
          <TooltipProvider>
            <div className="flex items-center gap-2" key={`phase-buttons-${localGoal.status}`}>
              {(canEdit || isCurrentAssignee || isMultiAssignee) && localGoal.status !== "Completed" && localGoal.status !== "Cancelled" && (
                <>
                  {localGoal.status === "Plan" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button 
                            onClick={() => handleStatusChange("Do")}
                            disabled={isLoading || !phaseValidation.canProgress}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start Execution
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!phaseValidation.canProgress && (
                        <TooltipContent>
                          <div className="max-w-xs">
                            <div className="font-medium mb-1">Complete all Plan phase tasks first:</div>
                            <ul className="text-sm space-y-1">
                              {phaseValidation.incompleteTasks.slice(0, 3).map((task, idx) => (
                                <li key={idx} className="flex items-center gap-1">
                                  <span className="w-1 h-1 bg-current rounded-full flex-shrink-0" />
                                  {task.title}
                                </li>
                              ))}
                              {phaseValidation.incompleteTasks.length > 3 && (
                                <li className="text-gray-400">...and {phaseValidation.incompleteTasks.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                  {localGoal.status === "Do" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button 
                            onClick={() => handleStatusChange("Check")}
                            disabled={isLoading || !phaseValidation.canProgress}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                          >
                            Begin Review
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!phaseValidation.canProgress && (
                        <TooltipContent>
                          <div className="max-w-xs">
                            <div className="font-medium mb-1">Complete all Do phase tasks first:</div>
                            <ul className="text-sm space-y-1">
                              {phaseValidation.incompleteTasks.slice(0, 3).map((task, idx) => (
                                <li key={idx} className="flex items-center gap-1">
                                  <span className="w-1 h-1 bg-current rounded-full flex-shrink-0" />
                                  {task.title}
                                </li>
                              ))}
                              {phaseValidation.incompleteTasks.length > 3 && (
                                <li className="text-gray-400">...and {phaseValidation.incompleteTasks.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                  {localGoal.status === "Check" && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button 
                              onClick={() => handleStatusChange("Act")}
                              disabled={isLoading || !phaseValidation.canProgress}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                            >
                              Take Action
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!phaseValidation.canProgress && (
                          <TooltipContent>
                            <div className="max-w-xs">
                              <div className="font-medium mb-1">Complete all Check phase tasks first:</div>
                              <ul className="text-sm space-y-1">
                                {phaseValidation.incompleteTasks.slice(0, 3).map((task, idx) => (
                                  <li key={idx} className="flex items-center gap-1">
                                    <span className="w-1 h-1 bg-current rounded-full flex-shrink-0" />
                                    {task.title}
                                  </li>
                                ))}
                                {phaseValidation.incompleteTasks.length > 3 && (
                                  <li className="text-gray-400">...and {phaseValidation.incompleteTasks.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <Button 
                        onClick={() => handleStatusChange("Do")}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                      >
                        Back to Do
                      </Button>
                    </>
                  )}
                  {localGoal.status === "Act" && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button 
                              onClick={() => handleStatusChange("Completed")}
                              disabled={isLoading || !phaseValidation.canProgress}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!phaseValidation.canProgress && (
                          <TooltipContent>
                            <div className="max-w-xs">
                              <div className="font-medium mb-1">Complete all Act phase tasks first:</div>
                              <ul className="text-sm space-y-1">
                                {phaseValidation.incompleteTasks.slice(0, 3).map((task, idx) => (
                                  <li key={idx} className="flex items-center gap-1">
                                    <span className="w-1 h-1 bg-current rounded-full flex-shrink-0" />
                                    {task.title}
                                  </li>
                                ))}
                                {phaseValidation.incompleteTasks.length > 3 && (
                                  <li className="text-gray-400">...and {phaseValidation.incompleteTasks.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <Button 
                        onClick={() => handleStatusChange("Plan")}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                      >
                        New Cycle
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </TooltipProvider>
          
          <div className="flex items-center gap-2">
            {(canEdit || isCurrentAssignee || isMultiAssignee) && localGoal.status !== "Completed" && localGoal.status !== "Cancelled" && localGoal.status !== "On Hold" && (
              <Button 
                onClick={() => handleStatusChange("On Hold")}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
              >
                <Pause className="h-4 w-4 mr-1" />
                Hold
              </Button>
            )}
            
            {localGoal.status === "On Hold" && (
              <Button 
                onClick={() => handleStatusChange(localGoal.previous_status || "Plan")}
                disabled={isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Resume
              </Button>
            )}
            
            <Link href={`/dashboard/goals/${localGoal.id}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Full View
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}