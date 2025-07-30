"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import {
  createGoalTask,
  getGoalTasks,
  getUserAssignedTasks,
  getAllUserAssignedTasks,
  updateGoalTask,
  deleteGoalTask,
  getGoalTaskStats,
  completeGoalTask,
  createBulkGoalTasks,
  getGoalById,
  addTaskWorkflowEntry
} from "@/lib/goal-database"
import { createNotification } from "@/lib/goal-notifications"
import { supabaseAdmin } from "@/lib/supabase-client"

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
    const startDate = formData.get("start_date") as string
    const dueDate = formData.get("due_date") as string
    const estimatedHours = parseInt(formData.get("estimated_hours") as string) || 0
    const pdcaPhase = formData.get("pdca_phase") as 'Plan' | 'Do' | 'Check' | 'Act'

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
    const canCreateTask = goal.owner_id === user.id || 
                         user.role === "Admin" ||
                         (user.role === "Head" && goal.department === user.department)
    
    // Also check if user is in goal assignees (unified permission system)
    if (!canCreateTask) {
      const { getGoalAssignees } = require("@/lib/goal-database")
      const assignees = await getGoalAssignees(goal.id)
      const isAssignee = assignees.data?.some((a: any) => a.user_id === user.id)
      if (!isAssignee) {
        return { error: "Only goal owners, assignees, admins, and department heads can create tasks" }
      }
    }
    
    if (!canCreateTask) {
      return { error: "Only goal owners, assignees, admins, and department heads can create tasks" }
    }

    // Date validation: start_date <= due_date
    if (startDate && dueDate) {
      const start = new Date(startDate)
      const due = new Date(dueDate)
      if (start > due) {
        return { error: "Task start date cannot be later than due date" }
      }
    }

    const result = await createGoalTask({
      goal_id: goalId,
      title,
      description: description || undefined,
      priority: priority || 'Medium',
      assigned_to: (assignedTo && assignedTo !== "unassigned") ? assignedTo : undefined,
      assigned_by: user.id,
      department: department || undefined,
      start_date: startDate || undefined,
      due_date: dueDate || undefined,
      estimated_hours: estimatedHours,
      pdca_phase: pdcaPhase || undefined
    })

    if (result.error) {
      console.error("Database error creating task:", result.error)
      return { error: `Failed to create task: ${result.error}` }
    }

    // Create notification for assigned user if task is assigned
    if (assignedTo && assignedTo !== user.id) {
      await createNotification(
        assignedTo,
        'New Task Assigned',
        `You have been assigned a new task: "${title}"`,
        { task_id: result.data?.id, task_title: title, goal_id: goalId }
      )
      
      // Also notify department head if assigned user has a department
      try {
        const { data: assignedUser } = await supabaseAdmin
          ?.from('users')
          .select('department')
          .eq('id', assignedTo)
          .single()
        
        if (assignedUser?.department) {
          const { data: deptHeads } = await supabaseAdmin
            ?.from('users')
            .select('id')
            .eq('department', assignedUser.department)
            .eq('role', 'Head')
            .neq('id', user.id) // Don't notify the head if they're the one assigning
          
          if (deptHeads && deptHeads.length > 0) {
            for (const head of deptHeads) {
              await createNotification(
                head.id,
                'Department Task Assignment',
                `A task has been assigned to a member of your department: "${title}"`,
                { task_id: result.data?.id, task_title: title, goal_id: goalId, assigned_to: assignedTo }
              )
            }
          }
        }
      } catch (error) {
        console.error("Error notifying department head:", error)
        // Don't fail task creation for notification errors
      }
    }

    // Notify goal owner and assignees about new task (in addition to the assigned user notification above)
    try {
      const goal = goalResult.data
      const usersToNotify = new Set<string>()
      
      // Add goal owner (unless they created the task or are the assigned user)
      if (goal.owner_id && goal.owner_id !== user.id && goal.owner_id !== assignedTo) {
        usersToNotify.add(goal.owner_id)
      }
      
      // Add goal assignees (unless they created the task or are the assigned user)
      if (goal.assignees && Array.isArray(goal.assignees)) {
        goal.assignees.forEach((assignee: any) => {
          if (assignee.user_id && assignee.user_id !== user.id && assignee.user_id !== assignedTo) {
            usersToNotify.add(assignee.user_id)
          }
        })
      }
      
      // Send notifications
      for (const userId of usersToNotify) {
        await createNotification(
          userId,
          'New Task Created',
          `New task "${title}" has been created in goal "${goal.subject}"`,
          { 
            task_id: result.data?.id, 
            task_title: title, 
            goal_id: goalId,
            goal_subject: goal.subject,
            created_by: user.full_name || user.email,
            assigned_to: assignedTo
          }
        )
      }
    } catch (error) {
      console.error("Error notifying about task creation:", error)
      // Don't fail task creation for notification errors
    }

    // Add workflow entry for task creation
    try {
      await addTaskWorkflowEntry(
        goalId,
        user.id,
        user.full_name || user.email,
        'task_created',
        {
          task_id: result.data?.id as string,
          task_title: title
        }
      )
    } catch (error) {
      console.error("Failed to add task creation workflow entry:", error)
      // Don't fail the task creation for this
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
  pdca_phase?: 'Plan' | 'Do' | 'Check' | 'Act';
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
    const canCreateTask = goal.owner_id === user.id || 
                         user.role === "Admin" ||
                         (user.role === "Head" && goal.department === user.department)
    
    // Also check if user is in goal assignees (unified permission system)
    if (!canCreateTask) {
      const { getGoalAssignees } = require("@/lib/goal-database")
      const assignees = await getGoalAssignees(goal.id)
      const isAssignee = assignees.data?.some((a: any) => a.user_id === user.id)
      if (!isAssignee) {
        return { error: "Only goal owners, assignees, admins, and department heads can create tasks" }
      }
    }
    
    if (!canCreateTask) {
      return { error: "Only goal owners, assignees, admins, and department heads can create tasks" }
    }

    const result = await createBulkGoalTasks(goalId, tasks, user.id)

    if (result.error) {
      return { error: "Failed to create tasks" }
    }

    // Create notifications for all assigned users
    if (result.data) {
      for (const task of result.data) {
        const assignedUserId = typeof task.assigned_to === 'string' ? task.assigned_to : (task.assigned_to as any)?.id
        if (assignedUserId && assignedUserId !== user.id) {
          await createNotification(
            assignedUserId,
            'New Task Assigned',
            `You have been assigned a new task: "${task.title}"`,
            { task_id: task.id, task_title: task.title, goal_id: goalId }
          )
        }
      }
    }

    // Add workflow entry for bulk task creation
    if (result.data && result.data.length > 0) {
      try {
        const taskTitles = result.data.map((task: any) => task.title as string)
        await addTaskWorkflowEntry(
          goalId,
          user.id,
          user.full_name || user.email,
          'tasks_bulk_created',
          {
            task_count: result.data.length,
            task_titles: taskTitles
          }
        )
      } catch (error) {
        console.error("Failed to add bulk task creation workflow entry:", error)
        // Don't fail the task creation for this
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

    // Get task details with goal information for permission checking
    const { createClient } = require("@supabase/supabase-js")
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    let taskData: any = null
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data, error: taskError } = await supabase
        .from("goal_tasks")
        .select(`
          *,
          goal:goals(id, owner_id, current_assignee_id, department)
        `)
        .eq("id", taskId)
        .single()

      if (taskError || !data) {
        return { error: "Task not found" }
      }

      taskData = data

      // Permission check: only allow task updates by:
      // 1. Goal owner, 2. Goal assignee, 3. Task assignee, 4. Admin, 5. Department head
      let canUpdate = taskData.goal.owner_id === user.id ||
                     taskData.assigned_to === user.id ||
                     user.role === 'Admin' ||
                     (user.role === 'Head' && taskData.goal.department === user.department)
      
      // Also check if user is in goal assignees (unified permission system)
      if (!canUpdate) {
        const { getGoalAssignees } = require("@/lib/goal-database")
        const assignees = await getGoalAssignees(taskData.goal.id)
        canUpdate = assignees.data?.some((a: any) => a.user_id === user.id) || false
      }

      if (!canUpdate) {
        return { error: "You don't have permission to update this task" }
      }
    }

    const result = await updateGoalTask(taskId, updates)

    if (result.error) {
      return { error: "Failed to update task" }
    }

    // If task was assigned to someone new, create notification
    if (updates.assigned_to && updates.assigned_to !== user.id) {
      // Would need to get goal_id from task first for proper notification
      // This is a simplified version
      await createNotification(
        updates.assigned_to,
        'Task Reassigned',
        `A task has been reassigned to you: "${updates.title || 'Unnamed Task'}"`,
        { task_id: taskId, goal_id: result.data?.goal_id || '' }
      )
    }

    // Add workflow entry for task edit (only if we have task data from the permission check)
    if (taskData) {
      try {
        await addTaskWorkflowEntry(
          taskData.goal.id,
          user.id,
          user.full_name || user.email,
          'task_edited',
          {
            task_id: taskId,
            task_title: updates.title || taskData.title,
            changes: updates
          }
        )
      } catch (error) {
        console.error("Failed to add task edit workflow entry:", error)
        // Don't fail the task update for this
      }
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

    // Get task details for workflow entry before completing
    const { createClient } = require("@supabase/supabase-js")
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    let taskData = null
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data, error: taskError } = await supabase
        .from("goal_tasks")
        .select(`
          *,
          goal:goals(id, owner_id, current_assignee_id, department)
        `)
        .eq("id", taskId)
        .single()

      if (!taskError && data) {
        taskData = data
      }
    }

    const result = await completeGoalTask(taskId, user.id, completionNotes)

    if (result.error) {
      return { error: "Failed to complete task. Make sure you are assigned to this task." }
    }

    // Create task completion notifications
    if (taskData) {
      try {
        const usersToNotify = new Set<string>()
        
        // Add goal owner (if different from task completer)
        if (taskData.goal.owner_id && taskData.goal.owner_id !== user.id) {
          usersToNotify.add(taskData.goal.owner_id)
        }
        
        // Add task creator (if different from task completer)
        if (taskData.assigned_by && taskData.assigned_by !== user.id) {
          usersToNotify.add(taskData.assigned_by)
        }
        
        // Add department head (if different from task completer)
        if (taskData.goal.department) {
          try {
            const { data: deptHeads } = await supabaseAdmin
              ?.from('users')
              .select('id')
              .eq('department', taskData.goal.department)
              .eq('role', 'Head')
              .neq('id', user.id)
            
            if (deptHeads && deptHeads.length > 0) {
              deptHeads.forEach(head => usersToNotify.add(head.id))
            }
          } catch (error) {
            console.error("Error fetching department heads for completion notification:", error)
          }
        }
        
        // Send notifications
        for (const userId of usersToNotify) {
          await createNotification(
            userId,
            'Task Completed',
            `Task "${taskData.title}" has been completed in goal "${taskData.goal.subject || 'Unnamed Goal'}"${completionNotes ? ` with notes: ${completionNotes}` : ''}`,
            { 
              task_id: taskId, 
              task_title: taskData.title, 
              goal_id: taskData.goal.id,
              goal_subject: taskData.goal.subject,
              completed_by: user.full_name || user.email,
              completion_notes: completionNotes
            }
          )
        }
      } catch (error) {
        console.error("Error creating task completion notifications:", error)
        // Don't fail task completion for notification errors
      }
    }

    // Add workflow entry for task completion
    if (taskData) {
      try {
        await addTaskWorkflowEntry(
          taskData.goal.id,
          user.id,
          user.full_name || user.email,
          'task_completed',
          {
            task_id: taskId,
            task_title: taskData.title,
            completion_notes: completionNotes
          }
        )
      } catch (error) {
        console.error("Failed to add task completion workflow entry:", error)
        // Don't fail the task completion for this
      }
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

    // Get task details with goal information for permission checking
    const { createClient } = require("@supabase/supabase-js")
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data: taskData, error: taskError } = await supabase
        .from("goal_tasks")
        .select(`
          *,
          goal:goals(id, owner_id, current_assignee_id, department)
        `)
        .eq("id", taskId)
        .single()

      if (taskError || !taskData) {
        return { error: "Task not found" }
      }

      // Permission check: only allow task deletion by:
      // 1. Goal owner, 2. Goal assignee, 3. Admin, 4. Department head (more restrictive than update)
      let canDelete = taskData.goal.owner_id === user.id ||
                     user.role === 'Admin' ||
                     (user.role === 'Head' && taskData.goal.department === user.department)
      
      // Also check if user is in goal assignees (unified permission system)
      if (!canDelete) {
        const { getGoalAssignees } = require("@/lib/goal-database")
        const assignees = await getGoalAssignees(taskData.goal.id)
        canDelete = assignees.data?.some((a: any) => a.user_id === user.id) || false
      }

      if (!canDelete) {
        return { error: "You don't have permission to delete this task" }
      }

      // Add workflow entry for task deletion before actually deleting
      try {
        await addTaskWorkflowEntry(
          taskData.goal.id,
          user.id,
          user.full_name || user.email,
          'task_deleted',
          {
            task_id: taskId,
            task_title: taskData.title
          }
        )
      } catch (error) {
        console.error("Failed to add task deletion workflow entry:", error)
        // Don't fail the task deletion for this
      }
    }

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

    // For Head users, fetch ALL assigned tasks across departments
    const result = user.role === 'Head' 
      ? await getAllUserAssignedTasks(user.id, statusFilter)
      : await getUserAssignedTasks(user.id, statusFilter)

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

    // Get task details for workflow entry before starting
    const { createClient } = require("@supabase/supabase-js")
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    let taskData = null
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data, error: taskError } = await supabase
        .from("goal_tasks")
        .select(`
          *,
          goal:goals(id, owner_id, current_assignee_id, department)
        `)
        .eq("id", taskId)
        .single()

      if (!taskError && data) {
        taskData = data
      }
    }

    const result = await updateGoalTask(taskId, { 
      status: 'in_progress'
    })

    if (result.error) {
      return { error: "Failed to start task" }
    }

    // Add workflow entry for task start
    if (taskData) {
      try {
        await addTaskWorkflowEntry(
          taskData.goal.id,
          user.id,
          user.full_name || user.email,
          'task_started',
          {
            task_id: taskId,
            task_title: taskData.title,
            previous_status: taskData.status,
            new_status: 'in_progress'
          }
        )
      } catch (error) {
        console.error("Failed to add task start workflow entry:", error)
        // Don't fail the task start for this
      }
    }

    revalidatePath("/dashboard")
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error("Start task error:", error)
    return { error: "An unexpected error occurred" }
  }
}