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
  Play
} from "lucide-react"
import type { GoalWithDetails, UserRecord } from "@/lib/goal-database"
import { addGoalComment, updateGoalStatus } from "@/actions/goals"
import { getTasksForGoal, getTaskStats, startTask, completeTask, updateTask } from "@/actions/goal-tasks"
import Link from "next/link"

interface GoalTask {
  id: string
  goal_id: string
  title: string
  description: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to: string | null
  due_date: string | null
  estimated_hours: number
  assigned_user?: {
    id: string
    full_name: string
    email: string
    department: string | null
  }
}

interface TaskStats {
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  completion_percentage: number
}

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

  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [taskUpdateLoading, setTaskUpdateLoading] = useState<string | null>(null)

  const isOwner = goal.owner_id === userProfile.id
  const isCurrentAssignee = goal.current_assignee_id === userProfile.id
  const isMultiAssignee = goal.assignees?.some((assignee: any) => assignee.user_id === userProfile.id)
  const canEdit = userProfile.role === "Admin" || isOwner
  const canComment = isOwner || isCurrentAssignee || isMultiAssignee || userProfile.role === "Admin"

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

  // Load tasks and stats
  const loadTaskData = async () => {
    if (!goal) return
    
    setLoadingTasks(true)
    try {
      const [tasksResult, statsResult] = await Promise.all([
        getTasksForGoal(goal.id),
        getTaskStats(goal.id)
      ])

      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data.slice(0, 5)) // Show only first 5 tasks in modal
      }

      if (statsResult.success && statsResult.data) {
        setTaskStats(statsResult.data)
      }
    } catch (error) {
      console.error("Failed to load task data:", error)
    } finally {
      setLoadingTasks(false)
    }
  }

  useEffect(() => {
    if (isOpen && goal) {
      loadTaskData()
      setActiveTab("overview") // Reset to overview when opening
    }
  }, [isOpen, goal?.id])

  const handleAddComment = async () => {
    if (!newComment.trim() || !goal) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await addGoalComment(goal.id, newComment.trim())
      
      if (result.error) {
        setError(result.error as string)
      } else {
        setNewComment("")
        onRefresh?.()
      }
    } catch (error) {
      setError("Failed to add comment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!goal) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await updateGoalStatus(goal.id, newStatus)
      
      if (result.error) {
        setError(result.error as string)
      } else {
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
        // Refresh task data
        await loadTaskData()
        onRefresh?.()
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
        // Refresh task data
        await loadTaskData()
        onRefresh?.()
      }
    } catch (error) {
      setError("Failed to complete task")
    } finally {
      setTaskUpdateLoading(null)
    }
  }

  const isGoalOverdue = (): boolean => {
    if (!goal.target_date || goal.status === "Completed") return false
    const targetDate = new Date(goal.target_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return targetDate < today
  }

  const overdue = isGoalOverdue()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <DialogTitle className="text-xl font-bold mb-2">{goal.subject}</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                View and manage goal details, tasks, progress, and updates
              </DialogDescription>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getStatusColor(goal.status)} text-xs`}>
                  {goal.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {goal.goal_type}
                </Badge>
                {goal.priority && goal.priority !== 'Medium' && (
                  <Badge variant="outline" className="text-xs">
                    {goal.priority}
                  </Badge>
                )}
                {overdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
              {goal.target_date && (
                <div className={`flex items-center gap-1 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                  <Calendar className="h-4 w-4" />
                  <span>Target: {new Date(goal.adjusted_target_date || goal.target_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <Link href={`/dashboard/goals/${goal.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Full View
              </Button>
            </Link>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({taskStats?.total_tasks || 0})</TabsTrigger>
            <TabsTrigger value="comments">Comments ({goal.comments?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              {/* Goal Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Goal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-gray-700 leading-relaxed mt-1">
                      {goal.description || 'No description provided'}
                    </p>
                  </div>

                  {goal.target_metrics && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Target Metrics</label>
                      <p className="text-gray-700 leading-relaxed mt-1">{goal.target_metrics}</p>
                    </div>
                  )}

                  {goal.success_criteria && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Success Criteria</label>
                      <p className="text-gray-700 leading-relaxed mt-1">{goal.success_criteria}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-medium">{goal.owner?.full_name || 'Unknown'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{goal.department}</span>
                    </div>

                    {goal.assignees && goal.assignees.length > 0 && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Assignees:</span>
                        <span className="font-medium">
                          {goal.assignees.length} assignee{goal.assignees.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {goal.teams && goal.teams.length > 0 && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Teams:</span>
                        <span className="font-medium">{goal.teams.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              {(canEdit || isCurrentAssignee || isMultiAssignee) && goal.status !== "Completed" && goal.status !== "Cancelled" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {goal.status === "Plan" && (
                        <Button 
                          onClick={() => handleStatusChange("Do")}
                          disabled={isLoading}
                          size="sm"
                        >
                          Start Execution
                        </Button>
                      )}
                      {goal.status === "Do" && (
                        <Button 
                          onClick={() => handleStatusChange("Check")}
                          disabled={isLoading}
                          size="sm"
                        >
                          Begin Review
                        </Button>
                      )}
                      {goal.status === "Check" && (
                        <>
                          <Button 
                            onClick={() => handleStatusChange("Act")}
                            disabled={isLoading}
                            size="sm"
                          >
                            Take Action
                          </Button>
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
                      {goal.status === "Act" && (
                        <>
                          <Button 
                            onClick={() => handleStatusChange("Completed")}
                            disabled={isLoading}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark Complete
                          </Button>
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
                      
                      {goal.status !== "On Hold" && (
                        <Button 
                          onClick={() => handleStatusChange("On Hold")}
                          disabled={isLoading}
                          variant="outline"
                          size="sm"
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Put On Hold
                        </Button>
                      )}
                      
                      {goal.status === "On Hold" && (
                        <Button 
                          onClick={() => handleStatusChange(goal.previous_status || "Plan")}
                          disabled={isLoading}
                          size="sm"
                        >
                          Resume Goal
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Tasks Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading tasks...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Task Statistics */}
                    {taskStats && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Overall Progress</span>
                          <span className="text-gray-600">
                            {taskStats.completed_tasks} of {taskStats.total_tasks} tasks completed
                          </span>
                        </div>
                        <Progress value={taskStats.completion_percentage} className="h-2" />
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="text-lg font-bold text-gray-600">{taskStats.pending_tasks}</div>
                            <div className="text-xs text-gray-500">Pending</div>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <div className="text-lg font-bold text-blue-600">{taskStats.in_progress_tasks}</div>
                            <div className="text-xs text-blue-500">In Progress</div>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <div className="text-lg font-bold text-green-600">{taskStats.completed_tasks}</div>
                            <div className="text-xs text-green-500">Completed</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Task List */}
                    {tasks.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Recent Tasks</h4>
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`border rounded-lg p-3 ${
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
                                        <span>{task.assigned_user.full_name}</span>
                                      </div>
                                    )}
                                    {task.due_date && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDate(task.due_date)}</span>
                                      </div>
                                    )}
                                    {task.estimated_hours > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{task.estimated_hours}h</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Task Action Buttons - Only show for assigned user */}
                              {task.assigned_to === userProfile.id && (
                                <div className="flex items-center gap-2 ml-3">
                                  {task.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStartTask(task.id)}
                                      disabled={taskUpdateLoading === task.id}
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                    >
                                      {taskUpdateLoading === task.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
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
                                      variant="outline"
                                      onClick={() => handleCompleteTask(task.id)}
                                      disabled={taskUpdateLoading === task.id}
                                      className="text-green-600 border-green-300 hover:bg-green-50"
                                    >
                                      {taskUpdateLoading === task.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Complete
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  
                                  {task.status === 'completed' && (
                                    <Badge variant="secondary" className="text-green-700 bg-green-100">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {taskStats && taskStats.total_tasks > 5 && (
                          <div className="text-center pt-2">
                            <Link href={`/dashboard/goals/${goal.id}?tab=tasks`}>
                              <Button variant="outline" size="sm">
                                View All {taskStats.total_tasks} Tasks
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <CheckSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm">No tasks created yet</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments & Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                    Debug: Comments data - {goal.comments ? `${goal.comments.length} comments` : 'No comments data'}
                  </div>
                )}
                
                {/* Recent Comments */}
                <div className="max-h-64 overflow-y-auto">
                  {goal.comments && goal.comments.length > 0 ? (
                    <div className="space-y-3">
                      {goal.comments.slice(-5).reverse().map((comment: any, index: number) => (
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
      </DialogContent>
    </Dialog>
  )
}