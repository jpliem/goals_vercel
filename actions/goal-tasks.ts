"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import {
  createGoalTask,
  getGoalTasks,
  getUserAssignedTasks,
  updateGoalTask,
  deleteGoalTask,
  getGoalTaskStats,
  completeGoalTask,
  createBulkGoalTasks,
  getGoalById
} from "@/lib/goal-database"
import { createNotification } from "@/lib/goal-notifications"

// Create a single task for a goal
export async function createTask(formData: FormData) {
  try {
    const user = await requireAuth()
    
    const goalId = formData.get("goal_id") as string
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const priority = formData.get("priority") as 'Low' | 'Medium' | 'High' | 'Critical'
    const assignedTo = formData.get("assigned_to") as string
    const department = formData.get("department") as string
    const dueDate = formData.get("due_date") as string
    const estimatedHours = parseInt(formData.get("estimated_hours") as string) || 0

    if (!goalId || !title) {
      console.error("Missing required fields:", { goalId, title })
      return { error: "Goal ID and task title are required" }
    }

    console.log("Creating task with data:", { goalId, title, assignedTo, priority, dueDate, estimatedHours })

    // Verify user has permission to create tasks for this goal
    const goalResult = await getGoalById(goalId)
    if (goalResult.error || !goalResult.data) {
      return { error: "Goal not found" }
    }

    const goal = goalResult.data
    if (goal.owner_id !== user.id && goal.current_assignee_id !== user.id) {
      return { error: "Only goal owners and assignees can create tasks" }
    }

    const result = await createGoalTask({
      goal_id: goalId,
      title,
      description: description || undefined,
      priority: priority || 'Medium',
      assigned_to: (assignedTo && assignedTo !== "unassigned") ? assignedTo : undefined,
      assigned_by: user.id,
      department: department || undefined,
      due_date: dueDate || undefined,
      estimated_hours: estimatedHours
    })

    if (result.error) {
      console.error("Database error creating task:", result.error)
      return { error: `Failed to create task: ${result.error}` }
    }

    // Create notification for assigned user if task is assigned
    if (assignedTo && assignedTo !== user.id) {
      await createNotification({
        user_id: assignedTo,
        goal_id: goalId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        description: `You have been assigned a new task: "${title}"`,
        action_data: { task_id: result.data?.id, task_title: title }
      })
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    revalidatePath("/dashboard")
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error("Create task error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Create multiple tasks for a goal (bulk creation)
export async function createBulkTasks(goalId: string, tasks: Array<{
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assigned_to?: string;
  department?: string;
  due_date?: string;
  estimated_hours?: number;
}>) {
  try {
    const user = await requireAuth()

    if (!goalId || !tasks || tasks.length === 0) {
      return { error: "Goal ID and tasks are required" }
    }

    // Verify user has permission to create tasks for this goal
    const goalResult = await getGoalById(goalId)
    if (goalResult.error || !goalResult.data) {
      return { error: "Goal not found" }
    }

    const goal = goalResult.data
    if (goal.owner_id !== user.id && goal.current_assignee_id !== user.id) {
      return { error: "Only goal owners and assignees can create tasks" }
    }

    const result = await createBulkGoalTasks(goalId, tasks, user.id)

    if (result.error) {
      return { error: "Failed to create tasks" }
    }

    // Create notifications for all assigned users
    if (result.data) {
      for (const task of result.data) {
        if (task.assigned_to && task.assigned_to !== user.id) {
          await createNotification({
            user_id: task.assigned_to,
            goal_id: goalId,
            type: 'task_assigned',
            title: 'New Task Assigned',
            description: `You have been assigned a new task: "${task.title}"`,
            action_data: { task_id: task.id, task_title: task.title }
          })
        }
      }
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    revalidatePath("/dashboard")
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error("Create bulk tasks error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Update a task
export async function updateTask(taskId: string, updates: {
  title?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  completion_notes?: string;
}) {
  try {
    const user = await requireAuth()

    if (!taskId) {
      return { error: "Task ID is required" }
    }

    // For now, we'll allow task updates - could add more granular permissions later
    const result = await updateGoalTask(taskId, updates)

    if (result.error) {
      return { error: "Failed to update task" }
    }

    // If task was assigned to someone new, create notification
    if (updates.assigned_to && updates.assigned_to !== user.id) {
      // Would need to get goal_id from task first for proper notification
      // This is a simplified version
      await createNotification({
        user_id: updates.assigned_to,
        goal_id: result.data?.goal_id || '',
        type: 'task_assigned',
        title: 'Task Reassigned',
        description: `A task has been reassigned to you: "${updates.title || 'Unnamed Task'}"`,
        action_data: { task_id: taskId }
      })
    }

    revalidatePath("/dashboard")
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error("Update task error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Complete a task (for assigned users)
export async function completeTask(taskId: string, completionNotes?: string) {
  try {
    const user = await requireAuth()

    if (!taskId) {
      return { error: "Task ID is required" }
    }

    const result = await completeGoalTask(taskId, user.id, completionNotes)

    if (result.error) {
      return { error: "Failed to complete task. Make sure you are assigned to this task." }
    }

    revalidatePath("/dashboard")
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error("Complete task error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Delete a task
export async function deleteTask(taskId: string) {
  try {
    const user = await requireAuth()

    if (!taskId) {
      return { error: "Task ID is required" }
    }

    // Only goal owners should be able to delete tasks
    // This would require fetching the task first to check the goal ownership
    const result = await deleteGoalTask(taskId)

    if (result.error) {
      return { error: "Failed to delete task" }
    }

    revalidatePath("/dashboard")
    
    return { success: true }
  } catch (error) {
    console.error("Delete task error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Get tasks for a goal
export async function getTasksForGoal(goalId: string) {
  try {
    const user = await requireAuth()

    if (!goalId) {
      return { error: "Goal ID is required" }
    }

    const result = await getGoalTasks(goalId)

    if (result.error) {
      return { error: "Failed to fetch tasks" }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error("Get tasks for goal error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Get user's assigned tasks
export async function getMyTasks(statusFilter?: string) {
  try {
    const user = await requireAuth()

    const result = await getUserAssignedTasks(user.id, statusFilter)

    if (result.error) {
      return { error: "Failed to fetch your tasks" }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error("Get my tasks error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Get task statistics for a goal
export async function getTaskStats(goalId: string) {
  try {
    const user = await requireAuth()

    if (!goalId) {
      return { error: "Goal ID is required" }
    }

    const result = await getGoalTaskStats(goalId)

    if (result.error) {
      return { error: "Failed to fetch task statistics" }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error("Get task stats error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Mark task as in progress
export async function startTask(taskId: string) {
  try {
    const user = await requireAuth()

    if (!taskId) {
      return { error: "Task ID is required" }
    }

    const result = await updateGoalTask(taskId, { 
      status: 'in_progress'
    })

    if (result.error) {
      return { error: "Failed to start task" }
    }

    revalidatePath("/dashboard")
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error("Start task error:", error)
    return { error: "An unexpected error occurred" }
  }
}