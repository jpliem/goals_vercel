"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Loader2, User, Calendar, Clock, Target, AlertTriangle, Edit } from "lucide-react"
import { updateTask } from "@/actions/goal-tasks"
import type { UserRecord } from "@/lib/goal-database"

interface EditableTask {
  id: string
  goal_id: string
  title: string
  description: string | null
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to: string | null
  assigned_user?: any // Flexible type to handle different user objects
  assigned_by: string | null
  assigned_by_user?: any
  department: string | null
  start_date: string | null
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number | null
  completion_notes: string | null
  completed_at: string | null
  completed_by: string | null
  pdca_phase: 'Plan' | 'Do' | 'Check' | 'Act' | null
  created_at: string
  updated_at: string
}

interface TaskEditModalProps {
  task: EditableTask | null
  isOpen: boolean
  onClose: () => void
  onTaskUpdated: () => void
  availableUsers: UserRecord[]
}

export function TaskEditModal({ task, isOpen, onClose, onTaskUpdated, availableUsers }: TaskEditModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium" as 'Low' | 'Medium' | 'High' | 'Critical',
    assigned_to: "",
    start_date: "",
    due_date: "",
    estimated_hours: "",
    pdca_phase: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "Medium",
        assigned_to: task.assigned_to || "unassigned",
        start_date: task.start_date ? task.start_date.split('T')[0] : "",
        due_date: task.due_date ? task.due_date.split('T')[0] : "",
        estimated_hours: task.estimated_hours?.toString() || "",
        pdca_phase: task.pdca_phase || "none"
      })
      setErrors({})
    }
  }, [task])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Task title is required"
    }

    // Date validation
    if (formData.start_date && formData.due_date) {
      const startDate = new Date(formData.start_date)
      const dueDate = new Date(formData.due_date)
      if (startDate > dueDate) {
        newErrors.due_date = "Due date cannot be earlier than start date"
      }
    }

    // Hours validation
    if (formData.estimated_hours && isNaN(Number(formData.estimated_hours))) {
      newErrors.estimated_hours = "Estimated hours must be a number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!task || !validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const updates: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        assigned_to: formData.assigned_to === "unassigned" ? undefined : formData.assigned_to || undefined,
        due_date: formData.due_date || undefined,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : undefined,
        pdca_phase: formData.pdca_phase === "none" ? null : formData.pdca_phase
      }

      // Only include start_date if it's provided
      if (formData.start_date) {
        updates.start_date = formData.start_date
      }

      const result = await updateTask(task.id, updates)

      if (result.error) {
        toast.error("Failed to update task", {
          description: result.error
        })
      } else {
        toast.success("Task updated successfully")
        onTaskUpdated()
        onClose()
      }
    } catch (error) {
      console.error("Update task error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  if (!task) return null

  const currentAssignee = task.assigned_user
  const isUnassigned = !task.assigned_to

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Task
          </DialogTitle>
          <DialogDescription>
            Modify task details, reassign to different users, or update priority and deadlines.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Assignment Status */}
          <div className="p-3 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-slate-600" />
              <span className="font-medium">Current Assignment:</span>
              {isUnassigned ? (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Unassigned</span>
                </div>
              ) : (
                <span className="text-slate-700">
                  {currentAssignee?.full_name || "Unknown User"}
                </span>
              )}
            </div>
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Task Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter task title"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter task description (optional)"
              rows={3}
            />
          </div>

          {/* Priority and Assignment Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: any) => handleInputChange("priority", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">🟢 Low</SelectItem>
                  <SelectItem value="Medium">🟡 Medium</SelectItem>
                  <SelectItem value="High">🟠 High</SelectItem>
                  <SelectItem value="Critical">🔴 Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select value={formData.assigned_to} onValueChange={(value) => handleInputChange("assigned_to", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Unassigned
                    </div>
                  </SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {user.full_name}
                        {user.department && (
                          <span className="text-xs text-slate-500">({user.department})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates and Hours Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange("start_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Due Date
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange("due_date", e.target.value)}
                className={errors.due_date ? "border-red-500" : ""}
              />
              {errors.due_date && (
                <p className="text-sm text-red-600">{errors.due_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_hours" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Est. Hours
              </Label>
              <Input
                id="estimated_hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => handleInputChange("estimated_hours", e.target.value)}
                placeholder="0"
                className={errors.estimated_hours ? "border-red-500" : ""}
              />
              {errors.estimated_hours && (
                <p className="text-sm text-red-600">{errors.estimated_hours}</p>
              )}
            </div>
          </div>

          {/* PDCA Phase */}
          <div className="space-y-2">
            <Label htmlFor="pdca_phase">PDCA Phase</Label>
            <Select value={formData.pdca_phase} onValueChange={(value) => handleInputChange("pdca_phase", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select PDCA phase (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific phase</SelectItem>
                <SelectItem value="Plan">📋 Plan</SelectItem>
                <SelectItem value="Do">🚀 Do</SelectItem>
                <SelectItem value="Check">✅ Check</SelectItem>
                <SelectItem value="Act">🔄 Act</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}