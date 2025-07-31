"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { 
  createGoal as dbCreateGoal, 
  addGoalComment as dbAddGoalComment, 
  updateGoalStatus as dbUpdateGoalStatus, 
  getGoalById, 
  updateGoalDetails as dbUpdateGoalDetails, 
  deleteGoal as dbDeleteGoal,
  getGoalDeletionImpact,
  uploadGoalAttachment,
  assignGoalAssignees as dbAssignGoalAssignees,
  getGoalAssignees,
  completeAssigneeTask,
  createGoalSupport,
  updateGoalSupport,
  getGoalSupport,
  deleteGoalSupport,
  deleteGoalTeamSupport,
  getUserById,
  createUserFromSession,
  getDepartmentTeamMappings,
  getUserDepartmentPermissions,
  createBulkGoalTasks
} from "@/lib/goal-database"
import { uploadToSupabaseStorage } from "@/lib/storage"
import { uploadGoalAttachment as saveAttachmentToDatabase } from "@/lib/goal-database"
import { requireAuth } from "@/lib/auth"
import { createNotificationsForGoalAction, createNotification } from "@/lib/goal-notifications"
import { supabaseAdmin } from "@/lib/supabase-client"

// Helper function to check if user has department permissions
async function hasDepartmentPermission(userId: string, department: string): Promise<boolean> {
  const permissions = await getUserDepartmentPermissions(userId)
  if (Array.isArray(permissions)) {
    return permissions.includes(department)
  }
  return false
}

export async function createGoal(formData: FormData) {
  
  let user
  try {
    user = await requireAuth()
  } catch (error) {
    console.error("Authentication error:", error)
    return { error: "Authentication required" }
  }

  // Server-side security check (defense in depth)
  if (user.role !== "Head" && user.role !== "Admin") {
    return { error: "Access denied. Only department heads and admins can create goals." }
  }

  // Verify user exists in database (fix for foreign key constraint)
  const userCheck = await getUserById(user.id)
  if (!userCheck.data) {
    console.error("User not found in database:", user.id)
    // Create user if doesn't exist (for mock/development mode)
    const createResult = await createUserFromSession(user)
    if (!createResult.success) {
      return { error: "User verification failed. Please log in again." }
    }
  }

  let data
  try {
    const goalType = formData.get("goal_type") as string
    const subject = formData.get("subject") as string
    const description = formData.get("description") as string
    const priority = formData.get("priority") as string
    const department = formData.get("department") as string
    const teams = formData.get("teams") as string
    const startDate = formData.get("start_date") as string
    const targetDate = formData.get("target_date") as string
    const targetMetrics = formData.get("target_metrics") as string
    const successCriteria = formData.get("success_criteria") as string
    const progressPercentage = formData.get("progress_percentage") as string
    const supportRequirements = formData.get("support_requirements") as string
    const tasks = formData.get("tasks") as string

    // Validation
    if (!subject || !description) {
      return { error: "Subject and description are required" }
    }

    if (!department) {
      return { error: "Department is required" }
    }

    // Date validation: start_date <= target_date
    if (startDate && targetDate) {
      const start = new Date(startDate)
      const target = new Date(targetDate)
      if (start > target) {
        return { error: "Start date cannot be later than target date" }
      }
    }

    // Create initial workflow history entry
    const workflowComment = "Goal created and entered Plan phase"
    
    const initialWorkflowHistory = [{
      id: `history-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_name: user.full_name || user.email,
      action: "status_change" as const,
      from_status: undefined,
      to_status: "Plan",
      comment: workflowComment
    }]

    // Add start date history entry if provided
    if (startDate) {
      initialWorkflowHistory.push({
        id: `history-${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_name: user.full_name || user.email,
        action: "start_date_set",
        new_start_date: startDate,
        comment: `Owner set start date to ${new Date(startDate).toLocaleDateString()}`
      } as any)
    }

    // Add target date history entry if provided
    if (targetDate) {
      initialWorkflowHistory.push({
        id: `history-${Date.now() + 2}`,
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_name: user.full_name || user.email,
        action: "target_date_set",
        target_date_type: "initial",
        new_target_date: targetDate,
        comment: `Owner set target date to ${new Date(targetDate).toLocaleDateString()}`
      } as any)
    }

    // Parse teams array
    const teamsArray = teams ? JSON.parse(teams) : []

    const result = await dbCreateGoal({
      goal_type: goalType || "Team",
      subject,
      description,
      priority,
      department,
      teams: teamsArray,
      start_date: startDate || undefined,
      target_date: targetDate || undefined,
      target_metrics: targetMetrics || undefined,
      success_criteria: successCriteria || undefined,
      progress_percentage: parseInt(progressPercentage) || 0,
      owner_id: user.id,
      workflow_history: initialWorkflowHistory,
      status: "Plan",
      current_assignee_id: undefined, // Use goal_assignees table for assignments instead
    })

    if (result.error) {
      console.error("Create goal error:", result.error)
      return { error: "Failed to create goal" }
    }

    data = result.data

    // Automatically assign the goal owner as the primary assignee
    if (data?.id) {
      try {
        await dbAssignGoalAssignees(data.id as string, [user.id], user.id)
      } catch (error) {
        console.error("Error assigning goal owner:", error)
        // Don't fail goal creation for this
      }
    }

    // Handle support requirements with new structure
    if (data?.id && supportRequirements) {
      try {
        // Parse support requirements array
        const supportReqs = JSON.parse(supportRequirements) as { department: string; teams: string[] }[]
        const supportDepartments: string[] = []
        
        for (const requirement of supportReqs) {
          // Create support for the department
          await createGoalSupport({
            goal_id: data.id as string,
            support_type: "Department",
            support_name: requirement.department,
            requested_by: user.id
          })
          
          // Track departments for notification
          supportDepartments.push(requirement.department)

          // Create support for each team within the department
          for (const team of requirement.teams) {
            await createGoalSupport({
              goal_id: data.id as string,
              support_type: "Team",
              support_name: team,
              support_department: requirement.department, // New field to link team to department
              requested_by: user.id
            })
          }
        }
        
        // Notify support department heads
        if (supportDepartments.length > 0) {
          const { notifySupportDepartments } = await import("@/lib/goal-notifications")
          await notifySupportDepartments(data.id as string, subject, supportDepartments, user.id)
        }
      } catch (error) {
        console.error("Error creating support requests:", error)
        // Don't fail the goal creation for support errors
      }

      // Optional notification (fire-and-forget) - disabled for now
      // NotificationEvents.goalCreated({
      //   goalId: data.id as string,
      //   goalData: { subject, description, department, owner: user.full_name, priority }
      // })

      // Create internal database notifications for the initial workflow action
      try {
        const createdGoal = await getGoalById(data.id as string)
        if (createdGoal.data && initialWorkflowHistory.length > 0) {
          await createNotificationsForGoalAction(
            createdGoal.data,
            initialWorkflowHistory[0],
            user.id
          )
        }
      } catch (error) {
        console.error("Error creating initial notifications:", error)
      }
    }

    // Handle task creation
    if (data?.id && tasks) {
      try {
        // Parse tasks array
        const taskList = JSON.parse(tasks) as Array<{
          title: string;
          description: string;
          priority: 'Low' | 'Medium' | 'High' | 'Critical';
          assigned_to: string;
          department: string;
          due_date: string;
          estimated_hours: number;
        }>

        if (taskList.length > 0) {
          // Create tasks in bulk
          const tasksResult = await createBulkGoalTasks(data.id as string, taskList, user.id)
          
          if (tasksResult.error) {
            console.error("Error creating tasks:", tasksResult.error)
            // Don't fail the goal creation for task errors
          } else if (tasksResult.data) {
            // Create notifications for assigned users
            for (const task of tasksResult.data) {
              const assignedUserId = typeof task.assigned_to === 'string' ? task.assigned_to : (task.assigned_to as any)?.id
              if (assignedUserId && assignedUserId !== user.id) {
                try {
                  await createNotification(
                    assignedUserId,
                    'New Task Assigned',
                    `You have been assigned a new task in goal "${subject}": "${task.title}"`,
                    { task_id: task.id, task_title: task.title, goal_id: data.id as string }
                  )
                } catch (notificationError) {
                  console.error("Error creating task notification:", notificationError)
                  // Don't fail for notification errors
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error creating tasks:", error)
        // Don't fail the goal creation for task errors
      }
    }
  } catch (error) {
    console.error("Create goal error:", error)
    return { error: "Failed to create goal" }
  }

  // Revalidate paths and return the goal data for client-side navigation
  revalidatePath("/dashboard")
  return { success: true, data }
}

export async function addGoalComment(goalId: string, comment: string) {
  try {
    const user = await requireAuth()

    if (!comment.trim()) {
      return { error: "Comment cannot be empty" }
    }

    const { data, error } = await dbAddGoalComment(goalId, comment, user.id)

    if (error) {
      console.error("Add goal comment error:", error)
      return { error: "Failed to add comment" }
    }

    // Create notifications for the comment
    try {
      const updatedGoal = await getGoalById(goalId)
      if (updatedGoal.data) {
        const workflowEntry = {
          action: "comment",
          user_id: user.id,
          timestamp: new Date().toISOString(),
          comment: comment
        }
        await createNotificationsForGoalAction(updatedGoal.data, workflowEntry, user.id)
      }
    } catch (error) {
      console.error("Error creating comment notifications:", error)
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    return { success: true, data }
  } catch (error) {
    console.error("Add goal comment error:", error)
    return { error: "Authentication required" }
  }
}

export async function uploadGoalCommentAttachment(formData: FormData) {
  try {
    const user = await requireAuth()
    
    const goalId = formData.get("goalId") as string
    const commentId = formData.get("commentId") as string | null
    const file = formData.get("file") as File
    
    if (!file || !goalId) {
      return { error: "File and goal ID are required" }
    }

    // Validate file type (images and documents)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    if (!allowedTypes.includes(file.type)) {
      return { error: "Only image files (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX, TXT) are allowed" }
    }

    // Validate file size (max 5MB for goal attachments)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return { error: "File size must be less than 5MB" }
    }

    // Upload file to storage
    const uploadResult = await uploadToSupabaseStorage(file, 'goal-attachments', goalId)
    
    if (!uploadResult.success) {
      return { error: uploadResult.error }
    }

    // Save attachment record to database
    const attachmentData = {
      goal_id: goalId,
      comment_id: commentId || undefined,
      filename: file.name,
      file_path: uploadResult.url!,
      file_size: file.size,
      content_type: file.type,
      uploaded_by: user.id
    }

    const { data, error } = await saveAttachmentToDatabase(attachmentData)
    
    if (error) {
      console.error("Upload goal attachment error:", error)
      return { error: "Failed to save attachment record" }
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    return { success: true, data }
  } catch (error) {
    console.error("Upload goal attachment error:", error)
    return { error: "Authentication required" }
  }
}

// Helper function to check if all tasks in a phase are completed
async function arePhaseTasksCompleted(goalId: string, phase: string): Promise<{ completed: boolean; incompleteTasks: any[] }> {
  if (!supabaseAdmin) {
    return { completed: true, incompleteTasks: [] }
  }

  try {
    const { data: incompleteTasks, error } = await supabaseAdmin
      .from("goal_tasks")
      .select(`
        id,
        title,
        status,
        assigned_to,
        users:assigned_to (full_name, email)
      `)
      .eq("goal_id", goalId)
      .eq("pdca_phase", phase)
      .neq("status", "completed")

    if (error) {
      console.error("Error checking phase tasks:", error)
      return { completed: true, incompleteTasks: [] } // Default to allow progression if there's an error
    }

    return {
      completed: incompleteTasks.length === 0,
      incompleteTasks: incompleteTasks || []
    }
  } catch (error) {
    console.error("Error in arePhaseTasksCompleted:", error)
    return { completed: true, incompleteTasks: [] }
  }
}

export async function updateGoalStatus(goalId: string, status: string, currentAssigneeId?: string) {
  try {
    const user = await requireAuth()

    // Get current goal data for validation and notification
    const currentGoalResult = await getGoalById(goalId)
    if (!currentGoalResult.data) {
      return { error: "Goal not found" }
    }
    
    const currentGoal = currentGoalResult.data
    const oldStatus = currentGoal.status as string

    // Validate PDCA status transition
    const validTransitions: Record<string, string[]> = {
      "Plan": ["Do", "On Hold"],
      "Do": ["Check", "On Hold"],
      "Check": ["Act", "Do", "On Hold"], // Can go back to Do if issues found
      "Act": ["Completed", "Plan", "On Hold"], // Can cycle back to Plan for continuous improvement
      "On Hold": ["Plan", "Do", "Check", "Act"], // Can resume from any phase
      "Completed": [], // Completed goals cannot be reopened
      "Cancelled": [] // Cancelled goals cannot be reopened
    }

    if (!validTransitions[oldStatus]?.includes(status)) {
      return { error: `Invalid status transition from ${oldStatus} to ${status}` }
    }

    // Validate user permissions for this status change
    const canPerformTransition = async (fromStatus: string, toStatus: string, userId: string, userRole: string): Promise<boolean> => {
      // Admins can perform any valid transition
      if (userRole === "Admin") return true
      
      // Users with department permissions can oversee department goals
      if (currentGoal.department && await hasDepartmentPermission(userId, String(currentGoal.department))) return true
      
      // Goal owner can always update their goals
      if (currentGoal.owner_id === userId) return true
      
      // Check if user is in assignees list (unified permission system)
      const assignees = await getGoalAssignees(goalId)
      if (assignees.data?.some(a => a.user_id === userId)) return true
      
      return false
    }

    if (!(await canPerformTransition(oldStatus, status, user.id, user.role))) {
      return { error: "You don't have permission to change this goal's status" }
    }

    // Check if all tasks in current phase are completed before allowing progression
    // Only check for forward progression, not for holds or backwards moves
    const forwardProgressions: Record<string, string> = {
      "Plan": "Do",
      "Do": "Check", 
      "Check": "Act",
      "Act": "Completed"
    }
    
    if (forwardProgressions[oldStatus] === status) {
      const phaseCheck = await arePhaseTasksCompleted(goalId, oldStatus)
      if (!phaseCheck.completed) {
        const taskList = phaseCheck.incompleteTasks
          .map(task => `• ${task.title} (${task.users?.full_name || 'Unassigned'})`)
          .join('\n')
        
        return { 
          error: `Cannot progress from ${oldStatus} to ${status}. Complete all ${oldStatus} phase tasks first:\n\n${taskList}` 
        }
      }
    }

    // Store previous status for On Hold functionality
    const previousStatus = status === "On Hold" ? oldStatus : undefined

    // Create workflow history entry
    const workflowEntry = {
      id: `history-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_name: user.full_name || user.email,
      action: "status_change" as const,
      details: {
        from_status: oldStatus,
        to_status: status,
        comment: `Status changed from ${oldStatus} to ${status}`,
        previous_status: previousStatus
      }
    }

    const { data, error } = await dbUpdateGoalStatus(goalId, status, currentAssigneeId, workflowEntry, previousStatus)

    if (error) {
      console.error("Update goal status error:", error)
      return { error: "Failed to update goal status" }
    }

    // Create notifications for the status change
    try {
      const updatedGoal = await getGoalById(goalId)
      if (updatedGoal.data) {
        await createNotificationsForGoalAction(updatedGoal.data, workflowEntry, user.id)
      }
    } catch (error) {
      console.error("Error creating status change notifications:", error)
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    revalidatePath("/dashboard")
    return { success: true, data }
  } catch (error) {
    console.error("Update goal status error:", error)
    return { error: "Authentication required" }
  }
}

export async function updateGoalDetails(goalId: string, updates: {
  subject?: string
  description?: string
  priority?: string
  target_date?: string
  adjusted_target_date?: string
  target_metrics?: string
  success_criteria?: string
  progress_percentage?: number
}) {
  try {
    const user = await requireAuth()

    // Get current goal to check permissions and track changes
    const currentGoalResult = await getGoalById(goalId)
    if (!currentGoalResult.data) {
      return { error: "Goal not found" }
    }

    const currentGoal = currentGoalResult.data

    // Check permissions
    const canEdit = user.role === "Admin" || 
                   (user.role === "Head" && currentGoal.department === user.department) ||
                   currentGoal.owner_id === user.id ||
                   (currentGoal.department && await hasDepartmentPermission(user.id, String(currentGoal.department)))

    if (!canEdit) {
      return { error: "You don't have permission to edit this goal" }
    }

    // Helper function to normalize dates for comparison
    const normalizeDateForComparison = (dateValue: string | null | undefined): string | null => {
      if (!dateValue) return null
      try {
        // Convert to Date object and back to YYYY-MM-DD format
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) return null
        return date.toISOString().split('T')[0]
      } catch {
        return null
      }
    }

    // Track what fields are being changed
    const changes: Array<{field: string, oldValue: any, newValue: any, label: string}> = []
    
    if (updates.subject !== undefined && updates.subject !== currentGoal.subject) {
      changes.push({field: 'subject', oldValue: currentGoal.subject, newValue: updates.subject, label: 'Subject'})
    }
    if (updates.description !== undefined && updates.description !== currentGoal.description) {
      changes.push({field: 'description', oldValue: currentGoal.description, newValue: updates.description, label: 'Description'})
    }
    if (updates.priority !== undefined && updates.priority !== currentGoal.priority) {
      changes.push({field: 'priority', oldValue: currentGoal.priority, newValue: updates.priority, label: 'Priority'})
    }
    
    // Special handling for date fields - normalize before comparison
    if (updates.target_date !== undefined) {
      const normalizedNewDate = normalizeDateForComparison(updates.target_date)
      const normalizedCurrentDate = normalizeDateForComparison(currentGoal.target_date as string | null | undefined)
      if (normalizedNewDate !== normalizedCurrentDate) {
        changes.push({field: 'target_date', oldValue: currentGoal.target_date, newValue: updates.target_date, label: 'Target Date'})
      }
    }
    if (updates.adjusted_target_date !== undefined) {
      const normalizedNewDate = normalizeDateForComparison(updates.adjusted_target_date)
      const normalizedCurrentDate = normalizeDateForComparison(currentGoal.adjusted_target_date as string | null | undefined)
      if (normalizedNewDate !== normalizedCurrentDate) {
        changes.push({field: 'adjusted_target_date', oldValue: currentGoal.adjusted_target_date, newValue: updates.adjusted_target_date, label: 'Adjusted Target Date'})
      }
    }
    if (updates.target_metrics !== undefined && updates.target_metrics !== currentGoal.target_metrics) {
      changes.push({field: 'target_metrics', oldValue: currentGoal.target_metrics, newValue: updates.target_metrics, label: 'Target Metrics'})
    }
    if (updates.success_criteria !== undefined && updates.success_criteria !== currentGoal.success_criteria) {
      changes.push({field: 'success_criteria', oldValue: currentGoal.success_criteria, newValue: updates.success_criteria, label: 'Success Criteria'})
    }
    if (updates.progress_percentage !== undefined && updates.progress_percentage !== currentGoal.progress_percentage) {
      changes.push({field: 'progress_percentage', oldValue: currentGoal.progress_percentage, newValue: updates.progress_percentage, label: 'Progress Percentage'})
    }

    // Create workflow entry before updating if there are changes
    let workflowEntry: any = undefined
    if (changes.length > 0) {
      // Create a single workflow entry summarizing all changes
      let changeDescription = changes.map(change => {
        if (change.field === 'target_date' || change.field === 'adjusted_target_date') {
          const oldDate = change.oldValue ? new Date(change.oldValue).toLocaleDateString() : 'None'
          const newDate = change.newValue ? new Date(change.newValue).toLocaleDateString() : 'None'
          return `${change.label}: ${oldDate} → ${newDate}`
        } else if (change.field === 'progress_percentage') {
          return `${change.label}: ${change.oldValue || 0}% → ${change.newValue}%`
        } else {
          const oldVal = change.oldValue || 'None'
          const newVal = change.newValue || 'None'
          // Truncate long values for readability
          const truncateText = (text: string, maxLen: number = 50) => {
            if (typeof text !== 'string') return String(text)
            return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
          }
          return `${change.label}: ${truncateText(String(oldVal))} → ${truncateText(String(newVal))}`
        }
      }).join('; ')

      workflowEntry = {
        id: `history-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_name: user.full_name || user.email,
        action: "goal_updated",
        comment: `Goal details updated: ${changeDescription}`,
        details: {
          fields_changed: changes.map(c => c.field),
          change_count: changes.length
        }
      }
    }

    const { data, error } = await dbUpdateGoalDetails(goalId, updates, workflowEntry)

    if (error) {
      console.error("Update goal details error:", error)
      return { error: "Failed to update goal details" }
    }

    // Create notifications for the workflow entry if it was added
    if (workflowEntry) {
      try {
        const updatedGoal = await getGoalById(goalId)
        if (updatedGoal.data) {
          await createNotificationsForGoalAction(updatedGoal.data, workflowEntry, user.id)
        }
      } catch (notificationError) {
        console.error("Error creating update notifications:", notificationError)
        // Don't fail the update for notification errors
      }
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    revalidatePath("/dashboard")
    return { success: true, data }
  } catch (error) {
    console.error("Update goal details error:", error)
    return { error: "Authentication required" }
  }
}

export async function assignGoalAssignees(goalId: string, assigneeIds: string[]): Promise<{ error?: string; success?: boolean; data?: any }> {
  try {
    const user = await requireAuth()

    // Check permissions (Admin, Head, or department permission required)
    if (user.role !== "Admin") {
      // Get the goal to check department permissions
      const goalResult = await getGoalById(goalId)
      if (goalResult.error || !goalResult.data) {
        return { error: "Goal not found" }
      }
      
      const canAssign = user.role === "Head" && goalResult.data.department === user.department ||
                       await hasDepartmentPermission(user.id, String(goalResult.data.department))
      
      if (!canAssign) {
        return { error: "Only admins, department heads, and users with department permissions can assign goals" }
      }
    }

    const { data, error } = await dbAssignGoalAssignees(goalId, assigneeIds, user.id)

    if (error) {
      console.error("Assign goal assignees error:", error)
      return { error: "Failed to assign goal assignees" }
    }

    // Create notifications for assignees
    try {
      const updatedGoal = await getGoalById(goalId)
      if (updatedGoal.data) {
        const workflowEntry = {
          action: "assignment",
          user_id: user.id,
          timestamp: new Date().toISOString(),
          assignees: assigneeIds
        }
        await createNotificationsForGoalAction(updatedGoal.data, workflowEntry, user.id)
      }
    } catch (error) {
      console.error("Error creating assignment notifications:", error)
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    revalidatePath("/dashboard")
    return { success: true, data }
  } catch (error) {
    console.error("Assign goal assignees error:", error)
    return { error: "Authentication required" }
  }
}

export async function completeGoalAssigneeTask(goalId: string, assigneeId: string, notes?: string) {
  try {
    const user = await requireAuth()

    // Users can only complete their own tasks, unless Admin or Head managing department tasks
    if (user.id !== assigneeId && user.role !== "Admin") {
      if (user.role !== "Head") {
        return { error: "You can only complete your own tasks" }
      }
      // Head can complete tasks for their department members
      // Additional validation could be added here if needed
    }

    const { data, error } = await completeAssigneeTask(goalId, assigneeId, notes)

    if (error) {
      console.error("Complete assignee task error:", error)
      return { error: "Failed to complete task" }
    }

    // Manual progression only - automatic progression removed as per CLAUDE.md architecture decision

    // Create notification for task completion
    try {
      const updatedGoal = await getGoalById(goalId)
      if (updatedGoal.data) {
        const workflowEntry = {
          action: "task_completed",
          user_id: user.id,
          timestamp: new Date().toISOString(),
          notes: notes
        }
        await createNotificationsForGoalAction(updatedGoal.data, workflowEntry, user.id)
      }
    } catch (error) {
      console.error("Error creating task completion notifications:", error)
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    revalidatePath("/dashboard")
    return { success: true, data }
  } catch (error) {
    console.error("Complete assignee task error:", error)
    return { error: "Authentication required" }
  }
}

// Get goal deletion impact data
export async function getGoalDeletionImpactData(goalId: string) {
  try {
    const user = await requireAuth()

    // Get goal to check permissions
    const goalResult = await getGoalById(goalId)
    if (!goalResult.data) {
      return { error: "Goal not found" }
    }

    const goal = goalResult.data

    // Only admin, department head, or goal owner can view deletion impact
    const canDelete = user.role === "Admin" || 
                     goal.owner_id === user.id ||
                     (user.role === "Head" && goal.department === user.department)
    
    if (!canDelete) {
      return { error: "You don't have permission to delete this goal" }
    }

    const impactResult = await getGoalDeletionImpact(goalId)
    
    if (impactResult.error) {
      return { error: "Failed to get goal deletion impact" }
    }

    return { 
      success: true, 
      data: {
        goal: {
          id: goal.id,
          subject: goal.subject,
          description: goal.description,
          department: goal.department,
          owner: goal.owner
        },
        impact: impactResult.data
      }
    }
  } catch (error) {
    console.error("Get goal deletion impact error:", error)
    return { error: "Authentication required" }
  }
}

export async function deleteGoal(goalId: string) {
  try {
    const user = await requireAuth()

    // Get goal to check permissions
    const goalResult = await getGoalById(goalId)
    if (!goalResult.data) {
      return { error: "Goal not found" }
    }

    const goal = goalResult.data

    // Only admin, department head, or goal owner can delete
    const canDelete = user.role === "Admin" || 
                     goal.owner_id === user.id ||
                     (user.role === "Head" && goal.department === user.department)
    
    if (!canDelete) {
      return { error: "You don't have permission to delete this goal" }
    }

    // Get deletion impact for logging
    const impactResult = await getGoalDeletionImpact(goalId)
    const impact = impactResult.data || {}

    // Perform the deletion (includes file cleanup)
    const { data, error, filesDeleted } = await dbDeleteGoal(goalId)

    if (error) {
      console.error("Delete goal error:", error)
      return { error: "Failed to delete goal" }
    }

    // Log the deletion (optional - can be added later)
    console.log(`Goal ${goalId} deleted by ${user.id}:`, {
      goal: goal.subject,
      impact,
      filesDeleted: filesDeleted || 0
    })

    revalidatePath("/dashboard")
    revalidatePath("/admin/ai-analysis") // Refresh AI analysis page
    
    return { 
      success: true, 
      data,
      impact,
      filesDeleted: filesDeleted || 0,
      message: `Goal "${goal.subject}" and all related data deleted successfully`
    }
  } catch (error) {
    console.error("Delete goal error:", error)
    return { error: "Authentication required" }
  }
}

// Support status management removed - support departments are now automatically available for task assignment

// Additional required functions
export async function updateGoal(goalId: string, updates: any) {
  try {
    const result = await dbUpdateGoalDetails(goalId, updates)
    revalidatePath(`/dashboard/goals/${goalId}`)
    return result
  } catch (error) {
    console.error("Update goal error:", error)
    throw error
  }
}

export async function markGoalAssigneeTaskComplete(goalId: string, userId: string, notes?: string) {
  try {
    const result = await completeAssigneeTask(goalId, userId, notes)
    
    // Manual progression only - automatic progression removed as per CLAUDE.md architecture decision
    
    revalidatePath(`/dashboard/goals/${goalId}`)
    return result
  } catch (error) {
    console.error("Mark assignee task complete error:", error)
    throw error
  }
}

export async function addGoalSupport(goalId: string, supportRequirements: Array<{ department: string; teams: string[] }>) {
  try {
    const user = await requireAuth()

    // Get goal to check permissions
    const goalResult = await getGoalById(goalId)
    if (!goalResult.data) {
      return { error: "Goal not found" }
    }

    const goal = goalResult.data

    // Check permissions
    const canEdit = user.role === "Admin" || 
                   (user.role === "Head" && goal.department === user.department) ||
                   goal.owner_id === user.id ||
                   (goal.department && await hasDepartmentPermission(user.id, String(goal.department)))

    if (!canEdit) {
      return { error: "You don't have permission to edit this goal's support requirements" }
    }

    const supportDepartments: string[] = []
    const addedSupport: any[] = []

    for (const requirement of supportRequirements) {
      // Create support for the department
      const deptResult = await createGoalSupport({
        goal_id: goalId,
        support_type: "Department",
        support_name: requirement.department,
        requested_by: user.id
      })
      
      if (!deptResult.error && deptResult.data) {
        addedSupport.push(deptResult.data)
        supportDepartments.push(requirement.department)
      }

      // Create support for each team within the department
      for (const team of requirement.teams) {
        const teamResult = await createGoalSupport({
          goal_id: goalId,
          support_type: "Team",
          support_name: team,
          support_department: requirement.department,
          requested_by: user.id
        })
        
        if (!teamResult.error && teamResult.data) {
          addedSupport.push(teamResult.data)
        }
      }
    }

    // Create workflow history entry
    if (addedSupport.length > 0) {
      try {
        const updatedGoal = await getGoalById(goalId)
        if (updatedGoal.data) {
          const supportList = supportRequirements.map(req => 
            req.teams.length > 0 
              ? `${req.department} (${req.teams.join(', ')})` 
              : req.department
          ).join('; ')

          const workflowEntry = {
            id: `history-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_name: user.full_name || user.email,
            action: "support_added",
            comment: `Added supporting departments: ${supportList}`,
            details: { support_added: addedSupport.length }
          } as any

          await createNotificationsForGoalAction(updatedGoal.data, workflowEntry, user.id)
        }
      } catch (notificationError) {
        console.error("Error creating support addition notifications:", notificationError)
      }
    }

    // Notify support department heads
    if (supportDepartments.length > 0) {
      try {
        const { notifySupportDepartments } = await import("@/lib/goal-notifications")
        await notifySupportDepartments(goalId, String(goal.subject), supportDepartments, user.id)
      } catch (error) {
        console.error("Error notifying support departments:", error)
      }
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    return { success: true, data: addedSupport }
  } catch (error) {
    console.error("Add goal support error:", error)
    return { error: "Authentication required" }
  }
}

export async function removeGoalSupport(goalId: string, supportId: string) {
  try {
    const user = await requireAuth()

    // Get goal to check permissions
    const goalResult = await getGoalById(goalId)
    if (!goalResult.data) {
      return { error: "Goal not found" }
    }

    const goal = goalResult.data

    // Check permissions
    const canEdit = user.role === "Admin" || 
                   (user.role === "Head" && goal.department === user.department) ||
                   goal.owner_id === user.id ||
                   (goal.department && await hasDepartmentPermission(user.id, String(goal.department)))

    if (!canEdit) {
      return { error: "You don't have permission to edit this goal's support requirements" }
    }

    // Get current support to track what's being removed
    const currentSupport = await getGoalSupport(goalId)
    const supportToRemove = currentSupport.data?.find(s => s.id === supportId)

    const result = await deleteGoalSupport(supportId)

    if (result.error) {
      return { error: "Failed to remove support requirement" }
    }

    // Create workflow history entry
    if (supportToRemove) {
      try {
        const updatedGoal = await getGoalById(goalId)
        if (updatedGoal.data) {
          const workflowEntry = {
            id: `history-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user_id: user.id,
            user_name: user.full_name || user.email,
            action: "support_removed",
            comment: `Removed supporting ${String(supportToRemove.support_type).toLowerCase()}: ${supportToRemove.support_name}`,
            details: { support_type: supportToRemove.support_type, support_name: supportToRemove.support_name }
          } as any

          await createNotificationsForGoalAction(updatedGoal.data, workflowEntry, user.id)
        }
      } catch (notificationError) {
        console.error("Error creating support removal notifications:", notificationError)
      }
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    return { success: true, data: result.data }
  } catch (error) {
    console.error("Remove goal support error:", error)
    return { error: "Authentication required" }
  }
}

export async function removeGoalTeamSupport(goalId: string, department: string, team: string) {
  try {
    const user = await requireAuth()

    // Get goal to check permissions
    const goalResult = await getGoalById(goalId)
    if (!goalResult.data) {
      return { error: "Goal not found" }
    }

    const goal = goalResult.data

    // Check permissions
    const canEdit = user.role === "Admin" || 
                   (user.role === "Head" && goal.department === user.department) ||
                   goal.owner_id === user.id ||
                   (goal.department && await hasDepartmentPermission(user.id, String(goal.department)))

    if (!canEdit) {
      return { error: "You don't have permission to edit this goal's support requirements" }
    }

    const result = await deleteGoalTeamSupport(goalId, department, team)

    if (result.error) {
      return { error: "Failed to remove team support" }
    }

    // Create workflow history entry
    try {
      const updatedGoal = await getGoalById(goalId)
      if (updatedGoal.data) {
        const workflowEntry = {
          id: `history-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_name: user.full_name || user.email,
          action: "support_removed",
          comment: `Removed supporting team: ${team} from ${department}`,
          details: { support_type: "Team", support_name: team, department }
        } as any

        await createNotificationsForGoalAction(updatedGoal.data, workflowEntry, user.id)
      }
    } catch (notificationError) {
      console.error("Error creating team support removal notifications:", notificationError)
    }

    revalidatePath(`/dashboard/goals/${goalId}`)
    return { success: true, data: result.data }
  } catch (error) {
    console.error("Remove goal team support error:", error)
    return { error: "Authentication required" }
  }
}

export async function getGoalSupportData(goalId: string) {
  try {
    const user = await requireAuth()

    const result = await getGoalSupport(goalId)
    
    if (result.error) {
      return { error: "Failed to load support data" }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('getGoalSupportData error:', error)
    return { error: "Authentication required" }
  }
}

export async function getDepartmentTeamMappingsData() {
  try {
    const user = await requireAuth()

    const result = await getDepartmentTeamMappings()
    
    if (result.error) {
      return { error: "Failed to load department data" }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('getDepartmentTeamMappingsData error:', error)
    return { error: "Authentication required" }
  }
}

export async function getGoalAIAnalysis(goalId: string) {
  try {
    const user = await requireAuth()

    // Validate goalId format
    if (!goalId || typeof goalId !== 'string') {
      return { success: false, error: "Invalid goal ID format" }
    }

    // Check if user has permission to view this goal
    const goalResult = await getGoalById(goalId)
    
    if (!goalResult.data) {
      return { success: false, error: "Goal not found" }
    }

    const goal = goalResult.data

    // Check permissions (same logic as other goal operations)
    const isAdmin = user.role === "Admin"
    const isHeadOfDepartment = user.role === "Head" && goal.department === user.department
    const isOwner = goal.owner_id === user.id
    const isAssignee = Array.isArray(goal.assignees) && goal.assignees.some((assignee: any) => assignee.user_id === user.id)
    const hasDeptPermission = goal.department ? await hasDepartmentPermission(user.id, String(goal.department)) : false
    
    const canView = isAdmin || isHeadOfDepartment || isOwner || isAssignee || hasDeptPermission

    if (!canView) {
      return { success: false, error: "You don't have permission to view this goal's AI analysis" }
    }

    // Get AI analysis for this goal
    if (!supabaseAdmin) {
      return { success: false, error: "Database not available" }
    }
    
    const { data: analysis, error } = await supabaseAdmin
      .from('goal_ai_analysis')
      .select(`
        id,
        analysis_type,
        analysis_result,
        created_at,
        tokens_used,
        processing_time_ms,
        confidence_score,
        ai_config:ai_configurations!goal_ai_analysis_ai_config_id_fkey(
          name,
          model_name
        )
      `)
      .eq('goal_id', goalId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching goal AI analysis:", error)
      return { success: false, error: "Failed to fetch AI analysis" }
    }

    if (!analysis) {
      return { success: false, error: "No AI analysis found for this goal" }
    }

    return { 
      success: true, 
      data: {
        goal: {
          id: goal.id,
          subject: goal.subject,
          description: goal.description,
          status: goal.status,
          department: goal.department,
          priority: goal.priority,
          created_at: goal.created_at,
          target_date: goal.target_date,
          owner: goal.owner
        },
        analysis
      }
    }
  } catch (error) {
    console.error('getGoalAIAnalysis error:', error)
    return { success: false, error: "Authentication required" }
  }
}

