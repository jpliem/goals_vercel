"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Target,
  Filter,
  Play,
  Pause,
  MoreHorizontal,
  AlertCircle,
  ArrowRight
} from "lucide-react"
import { getMyTasks, completeTask, startTask, updateTask } from "@/actions/goal-tasks"
import { getGoalById, type UserRecord } from "@/lib/goal-database"
import { GoalDetailModal } from "@/components/modals/goal-detail-modal"
import Link from "next/link"

interface TaskData {
  id: string // This is task_id
  goal_id: string
  title: string // This is task_title  
  description: string | null // This is task_description
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date: string | null
  estimated_hours: number
  department: string | null
  created_at: string
  completion_notes: string | null
  completed_at: string | null
  completed_by: string | null
  goal: {
    id: string
    subject: string
    department: string
    status: string
    priority: string
    target_date: string | null
  } | null
  assigned_by_user?: {
    id: string
    full_name: string
    email: string
  }
  assigned_user?: {
    id: string
    full_name: string
    email: string
    department: string
  }
}

interface MyTasksDashboardProps {
  userId: string
  userProfile: UserRecord
}

export function MyTasksDashboard({ userId, userProfile }: MyTasksDashboardProps) {
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [filteredTasks, setFilteredTasks] = useState<TaskData[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null)
  const [completionNotes, setCompletionNotes] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  // Load tasks
  const loadTasks = async () => {
    setLoading(true)
    try {
      const result = await getMyTasks()
      if (result.success && result.data) {
        setTasks(result.data as TaskData[])
        setFilteredTasks(result.data as TaskData[])
      } else {
        toast.error("Failed to load tasks", { description: result.error })
      }
    } catch (error) {
      toast.error("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // Helper function to sort tasks: 1. My tasks, 2. Non-completed tasks, 3. Alphabetically
  const sortTasks = (taskList: TaskData[]) => {
    return taskList.sort((a, b) => {
      // 1. My tasks first (assigned to current user)
      const aIsAssignedToMe = a.assigned_user?.id === userId
      const bIsAssignedToMe = b.assigned_user?.id === userId
      
      if (aIsAssignedToMe && !bIsAssignedToMe) return -1
      if (!aIsAssignedToMe && bIsAssignedToMe) return 1
      
      // 2. Non-completed tasks first
      const aIsCompleted = a.status === 'completed'
      const bIsCompleted = b.status === 'completed'
      
      if (!aIsCompleted && bIsCompleted) return -1
      if (aIsCompleted && !bIsCompleted) return 1
      
      // 3. Alphabetically by task title
      return a.title.localeCompare(b.title)
    })
  }

  // Separate tasks by department for Head users
  const separateTasksByDepartment = (taskList: TaskData[]) => {
    const isHead = userProfile.role === "Head"
    
    if (!isHead) {
      return {
        myDepartmentTasks: sortTasks([...taskList]),
        otherDepartmentTasks: []
      }
    }
    
    const myDeptTasks = taskList.filter(task => 
      task.department === userProfile.department || !task.department
    )
    const otherDeptTasks = taskList.filter(task => 
      task.department && task.department !== userProfile.department
    )
    
    return {
      myDepartmentTasks: sortTasks(myDeptTasks),
      otherDepartmentTasks: sortTasks(otherDeptTasks)
    }
  }

  // Filter tasks whenever filters change
  useEffect(() => {
    let filtered = tasks

    if (statusFilter !== "all") {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }

    // For Head users, we'll handle department separation in the render
    // For other users, just sort normally
    if (userProfile.role !== "Head") {
      filtered = sortTasks(filtered)
    }

    setFilteredTasks(filtered)
  }, [tasks, statusFilter, priorityFilter, userProfile.role, userProfile.department])

  const handleStartTask = async (taskId: string) => {
    setActionLoading(taskId)
    try {
      const result = await startTask(taskId)
      if (result.success) {
        toast.success("Task started")
        loadTasks()
      } else {
        toast.error("Failed to start task", { description: result.error })
      }
    } catch (error) {
      toast.error("Failed to start task")
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteTask = async () => {
    if (!selectedTask) return

    setActionLoading(selectedTask.id)
    try {
      const result = await completeTask(selectedTask.id, completionNotes)
      if (result.success) {
        toast.success("Task completed successfully!")
        setSelectedTask(null)
        setCompletionNotes("")
        loadTasks()
      } else {
        toast.error("Failed to complete task", { description: result.error })
      }
    } catch (error) {
      toast.error("Failed to complete task")
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenGoalModal = async (goalId: string) => {
    try {
      const result = await getGoalById(goalId)
      if (result.data) {
        setSelectedGoal(result.data)
        setGoalModalOpen(true)
      } else {
        toast.error("Failed to load goal details")
      }
    } catch (error) {
      toast.error("Failed to load goal details")
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
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'in_progress': return <Play className="w-4 h-4 text-blue-600" />
      case 'pending': return <Clock className="w-4 h-4 text-gray-500" />
      case 'cancelled': return <Pause className="w-4 h-4 text-red-500" />
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

  // Statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status !== 'completed' && isOverdue(t.due_date)).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
          <p className="text-sm text-gray-600 mt-1">
            Stay on top of your assigned tasks and deadlines
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Play className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.overdue > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {stats.overdue}
                </p>
              </div>
              <AlertCircle className={`w-8 h-8 ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-6">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No tasks found</h3>
              <p className="text-gray-500">
                {statusFilter !== "all" || priorityFilter !== "all" 
                  ? "Try adjusting your filters to see more tasks"
                  : "You don't have any assigned tasks yet"}
              </p>
            </CardContent>
          </Card>
        ) : userProfile.role === "Head" ? (
          // Department-separated view for Head users
          (() => {
            const { myDepartmentTasks, otherDepartmentTasks } = separateTasksByDepartment(filteredTasks)
            
            return (
              <>
                {/* My Department Tasks */}
                {myDepartmentTasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <User className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-lg text-gray-900">
                        My Department Tasks
                      </h3>
                      <Badge variant="secondary" className="ml-2">
                        {myDepartmentTasks.length}
                      </Badge>
                    </div>
                    
                    {myDepartmentTasks.map((task, index) => (
                      <Card key={task.id || `my-dept-task-${index}`} className={`hover:shadow-md transition-shadow ${
                        isOverdue(task.due_date) && task.status !== 'completed' ? 'border-red-200 bg-red-50' : ''
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getStatusIcon(task.status)}
                                <h3 
                                  className="font-semibold text-lg cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => handleOpenGoalModal(task.goal_id)}
                                >
                                  {task.title}
                                </h3>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                {isOverdue(task.due_date) && task.status !== 'completed' && (
                                  <Badge variant="destructive" className="animate-pulse">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                              </div>

                              {task.assigned_user && (
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm font-medium text-gray-700">
                                    PIC: {task.assigned_user.full_name}
                                  </span>
                                </div>
                              )}

                              <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-4 text-sm">
                                  <Link 
                                    href={`/dashboard/goals/${task.goal_id}`}
                                    className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors font-medium underline"
                                  >
                                    <Target className="w-4 h-4" />
                                    <span>From: {task.goal?.subject || 'Goal not found'}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                  {task.assigned_by_user && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <span className="text-gray-600">Created by: {task.assigned_by_user.full_name}</span>
                                    </div>
                                  )}
                                  {task.department && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4" />
                                      <span>{task.department}</span>
                                    </div>
                                  )}
                                  {task.due_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>{formatDate(task.due_date)}</span>
                                    </div>
                                  )}
                                </div>

                                {task.description && (
                                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                    {task.description}
                                  </p>
                                )}
                                
                                {/* Completion Information */}
                                {task.status === 'completed' && (
                                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                    <div className="text-xs text-green-800 font-medium">
                                      ✓ Completed {task.completed_at && formatDate(task.completed_at)}
                                      {task.completed_by && task.completed_by !== userProfile.id && (
                                        <span className="ml-1">
                                          by {userProfile.role === 'Head' && task.assigned_user ? task.assigned_user.full_name : 'team member'}
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

                            <div className="flex items-center gap-2 ml-4">
                              {task.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartTask(task.id)}
                                  disabled={actionLoading === task.id}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {actionLoading === task.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-1" />
                                      Start
                                    </>
                                  )}
                                </Button>
                              )}

                              {task.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedTask(task)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Complete
                                </Button>
                              )}

                              {task.status === 'completed' && (
                                <Badge variant="secondary" className="text-green-700 bg-green-100">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Done
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Other Department Tasks */}
                {otherDepartmentTasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <User className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-lg text-gray-900">
                        Other Department Tasks
                      </h3>
                      <Badge variant="secondary" className="ml-2">
                        {otherDepartmentTasks.length}
                      </Badge>
                    </div>
                    
                    {otherDepartmentTasks.map((task, index) => (
                      <Card key={task.id || `other-dept-task-${index}`} className={`hover:shadow-md transition-shadow ${
                        isOverdue(task.due_date) && task.status !== 'completed' ? 'border-red-200 bg-red-50' : ''
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getStatusIcon(task.status)}
                                <h3 
                                  className="font-semibold text-lg cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => handleOpenGoalModal(task.goal_id)}
                                >
                                  {task.title}
                                </h3>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                {isOverdue(task.due_date) && task.status !== 'completed' && (
                                  <Badge variant="destructive" className="animate-pulse">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                              </div>

                              {task.assigned_user && (
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm font-medium text-gray-700">
                                    PIC: {task.assigned_user.full_name}
                                  </span>
                                </div>
                              )}

                              <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-4 text-sm">
                                  <Link 
                                    href={`/dashboard/goals/${task.goal_id}`}
                                    className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors font-medium underline"
                                  >
                                    <Target className="w-4 h-4" />
                                    <span>From: {task.goal?.subject || 'Goal not found'}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                  {task.assigned_by_user && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <span className="text-gray-600">Created by: {task.assigned_by_user.full_name}</span>
                                    </div>
                                  )}
                                  {task.department && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4" />
                                      <span>{task.department}</span>
                                    </div>
                                  )}
                                  {task.due_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>{formatDate(task.due_date)}</span>
                                    </div>
                                  )}
                                </div>

                                {task.description && (
                                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                    {task.description}
                                  </p>
                                )}
                                
                                {/* Completion Information */}
                                {task.status === 'completed' && (
                                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                    <div className="text-xs text-green-800 font-medium">
                                      ✓ Completed {task.completed_at && formatDate(task.completed_at)}
                                      {task.completed_by && task.completed_by !== userProfile.id && (
                                        <span className="ml-1">
                                          by {userProfile.role === 'Head' && task.assigned_user ? task.assigned_user.full_name : 'team member'}
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

                            <div className="flex items-center gap-2 ml-4">
                              {task.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartTask(task.id)}
                                  disabled={actionLoading === task.id}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {actionLoading === task.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-1" />
                                      Start
                                    </>
                                  )}
                                </Button>
                              )}

                              {task.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedTask(task)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Complete
                                </Button>
                              )}

                              {task.status === 'completed' && (
                                <Badge variant="secondary" className="text-green-700 bg-green-100">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Done
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* No tasks message for Head users */}
                {myDepartmentTasks.length === 0 && otherDepartmentTasks.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No tasks found</h3>
                      <p className="text-gray-500">
                        {statusFilter !== "all" || priorityFilter !== "all" 
                          ? "Try adjusting your filters to see more tasks"
                          : "You don't have any assigned tasks yet"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )
          })()
        ) : (
          // Regular view for non-Head users
          filteredTasks.map((task, index) => (
            <Card key={task.id || `task-${index}`} className={`hover:shadow-md transition-shadow ${
              isOverdue(task.due_date) && task.status !== 'completed' ? 'border-red-200 bg-red-50' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(task.status)}
                      <h3 
                        className="font-semibold text-lg cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleOpenGoalModal(task.goal_id)}
                      >
                        {task.title}
                      </h3>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      {isOverdue(task.due_date) && task.status !== 'completed' && (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {task.assigned_user && (
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
                          PIC: {task.assigned_user.full_name}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-4 text-sm">
                        <Link 
                          href={`/dashboard/goals/${task.goal_id}`}
                          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors font-medium underline"
                        >
                          <Target className="w-4 h-4" />
                          <span>From: {task.goal?.subject || 'Goal not found'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        {task.assigned_by_user && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Created by: {task.assigned_by_user.full_name}</span>
                          </div>
                        )}
                        {task.department && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{task.department}</span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(task.due_date)}</span>
                          </div>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartTask(task.id)}
                        disabled={actionLoading === task.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {actionLoading === task.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                    )}

                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}

                    {task.status === 'completed' && (
                      <Badge variant="secondary" className="text-green-700 bg-green-100">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Complete Task Modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Mark "{selectedTask?.title}" as completed. You can optionally add completion notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Completion Notes (Optional)</label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about how you completed this task..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteTask}
              disabled={actionLoading === selectedTask?.id}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading === selectedTask?.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Detail Modal */}
      <GoalDetailModal
        goal={selectedGoal}
        userProfile={userProfile}
        isOpen={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false)
          setSelectedGoal(null)
        }}
        onRefresh={loadTasks}
      />
    </div>
  )
}