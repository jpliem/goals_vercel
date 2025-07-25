"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  CheckSquare,
  Plus,
  MoreHorizontal,
  Calendar,
  Clock,
  User,
  Trash2,
  Edit,
  Play,
  CheckCircle2,
  AlertCircle,
  Target
} from "lucide-react"
import { createTask, getTasksForGoal, updateTask, deleteTask, getTaskStats } from "@/actions/goal-tasks"
import type { UserRecord } from "@/lib/goal-database"

interface GoalTask {
  id: string
  goal_id: string
  title: string
  description: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to: string | null
  assigned_by: string | null
  department: string | null
  due_date: string | null
  estimated_hours: number
  actual_hours: number
  order_index: number
  completion_notes: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
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

interface GoalTasksCardProps {
  goalId: string
  currentUser: UserRecord
  users: UserRecord[]
  isOwner: boolean
  isAssignee: boolean
}

export function GoalTasksCard({ goalId, currentUser, users, isOwner, isAssignee }: GoalTasksCardProps) {
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<GoalTask | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Create task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: 'Medium' as const,
    assigned_to: "unassigned",
    due_date: "",
    estimated_hours: ""
  })

  // Load tasks and stats
  const loadTasks = async () => {
    setLoading(true)
    try {
      const [tasksResult, statsResult] = await Promise.all([
        getTasksForGoal(goalId),
        getTaskStats(goalId)
      ])

      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data)
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }
    } catch (error) {
      toast.error("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [goalId])

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Task title is required")
      return
    }

    setActionLoading("create")
    try {
      const formData = new FormData()
      formData.append("goal_id", goalId)
      formData.append("title", newTask.title)
      formData.append("description", newTask.description)
      formData.append("priority", newTask.priority)
      formData.append("assigned_to", newTask.assigned_to === "unassigned" ? "" : newTask.assigned_to)
      formData.append("due_date", newTask.due_date)
      formData.append("estimated_hours", newTask.estimated_hours || "0")

      const result = await createTask(formData)
      
      if (result.success) {
        toast.success("Task created successfully")
        setShowCreateModal(false)
        setNewTask({
          title: "",
          description: "",
          priority: 'Medium',
          assigned_to: "unassigned",
          due_date: "",
          estimated_hours: ""
        })
        loadTasks()
      } else {
        toast.error("Failed to create task", { description: result.error })
      }
    } catch (error) {
      toast.error("Failed to create task")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    setActionLoading(taskId)
    try {
      const result = await updateTask(taskId, { status: status as any })
      
      if (result.success) {
        toast.success(`Task ${status === 'completed' ? 'completed' : 'started'}`)
        loadTasks()
      } else {
        toast.error("Failed to update task", { description: result.error })
      }
    } catch (error) {
      toast.error("Failed to update task")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    setActionLoading(taskId)
    try {
      const result = await deleteTask(taskId)
      
      if (result.success) {
        toast.success("Task deleted successfully")
        loadTasks()
      } else {
        toast.error("Failed to delete task", { description: result.error })
      }
    } catch (error) {
      toast.error("Failed to delete task")
    } finally {
      setActionLoading(null)
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
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return null
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const canManageTasks = isOwner || isAssignee || currentUser.role === 'Admin'

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CheckSquare className="h-5 w-5 text-purple-600" />
            Tasks & Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-600">Loading tasks...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <CheckSquare className="h-5 w-5 text-purple-600" />
              Tasks & Progress
            </CardTitle>
            {canManageTasks && (
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Task Statistics */}
          {stats && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-gray-600">
                  {stats.completed_tasks} of {stats.total_tasks} tasks completed
                </span>
              </div>
              <Progress value={stats.completion_percentage} className="h-2" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-lg font-bold text-gray-600">{stats.pending_tasks}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-lg font-bold text-blue-600">{stats.in_progress_tasks}</div>
                  <div className="text-xs text-blue-500">In Progress</div>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-lg font-bold text-green-600">{stats.completed_tasks}</div>
                  <div className="text-xs text-green-500">Completed</div>
                </div>
              </div>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Task List</h4>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <div className="text-sm">No tasks created yet</div>
                <div className="text-xs mt-1">Break down this goal into specific tasks</div>
              </div>
            ) : (
              <div className="space-y-2">
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
                          <span className="font-medium">{task.title}</span>
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

                      {canManageTasks && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {task.status === 'pending' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                disabled={actionLoading === task.id}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Start Task
                              </DropdownMenuItem>
                            )}
                            {task.status === 'in_progress' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                disabled={actionLoading === task.id}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Complete Task
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={actionLoading === task.id}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a specific task for this goal and optionally assign it to a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="task-description">Description (Optional)</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what needs to be done..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="task-assignee">Assign to</Label>
                <Select 
                  value={newTask.assigned_to} 
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, assigned_to: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.department || 'No Dept'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="task-due-date">Due Date (Optional)</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="task-hours">Estimated Hours</Label>
                <Input
                  id="task-hours"
                  type="number"
                  min="0"
                  value={newTask.estimated_hours}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: e.target.value }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask}
              disabled={actionLoading === "create"}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {actionLoading === "create" ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}