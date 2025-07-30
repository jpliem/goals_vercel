import { supabaseAdmin } from './supabase-client'

export type NotificationType = 'task_assigned' | 'task_completed' | 'comment' | 'status_change' | 'task_due_soon' | 'task_overdue' | 'support_requested' | 'department_activity'

interface NotificationData {
  userId: string
  goalId: string
  type: NotificationType
  title: string
  description: string
  actionData?: Record<string, any>
}

// Helper function to get department heads
async function getDepartmentHeads(department: string): Promise<string[]> {
  if (!supabaseAdmin || !department) return []
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('department', department)
    .eq('role', 'Head')
    .eq('is_active', true)
  
  if (error) {
    console.error('Error fetching department heads:', error)
    return []
  }
  
  return data?.map(user => user.id) || []
}

// Simple notification system for goal management
export async function createNotificationsForGoalAction(
  goal: any,
  workflowEntry: any,
  currentUserId: string
) {
  if (!goal || !workflowEntry) {
    console.error('Missing goal or workflow entry for notification')
    return { success: false }
  }

  try {
    // Get all goal assignees and relevant users to notify
    const usersToNotify = new Set<string>()
    
    // Add goal owner (unless they are the current user)
    if (goal.owner_id && goal.owner_id !== currentUserId) {
      usersToNotify.add(goal.owner_id)
    }
    
    // Add goal assignees (unless they are the current user)
    if (goal.assignees && Array.isArray(goal.assignees)) {
      goal.assignees.forEach((assignee: any) => {
        if (assignee.user_id && assignee.user_id !== currentUserId) {
          usersToNotify.add(assignee.user_id)
        }
      })
    }
    
    // Add support department heads for support-related actions
    if (workflowEntry.action === 'support_requested' || workflowEntry.action === 'goal_created') {
      if (goal.support && Array.isArray(goal.support)) {
        for (const support of goal.support) {
          if (support.support_type === 'Department' && support.support_name) {
            const deptHeads = await getDepartmentHeads(support.support_name)
            deptHeads.forEach(headId => {
              if (headId !== currentUserId) {
                usersToNotify.add(headId)
              }
            })
          }
        }
      }
    }
    
    // Add department head for department-specific actions
    if (goal.department && ['goal_created', 'status_changed'].includes(workflowEntry.action)) {
      const deptHeads = await getDepartmentHeads(goal.department)
      deptHeads.forEach(headId => {
        if (headId !== currentUserId && headId !== goal.owner_id) {
          usersToNotify.add(headId)
        }
      })
    }

    // Generate notification content based on action
    let title = ''
    let description = ''
    
    switch (workflowEntry.action) {
      case 'goal_created':
        title = 'New Goal Created'
        description = `Goal "${goal.subject}" has been created and assigned to you`
        break
      case 'status_changed':
        title = 'Goal Status Updated'
        description = `Goal "${goal.subject}" status changed to ${goal.status}`
        break
      case 'comment_added':
        title = 'New Comment Added'
        description = `New comment added to goal "${goal.subject}"`
        break
      case 'assignees_updated':
        title = 'Goal Assignment Updated'
        description = `You have been assigned to goal "${goal.subject}"`
        break
      case 'task_completed':
        title = 'Task Completed'
        description = `A task was completed in goal "${goal.subject}"`
        break
      case 'support_status_updated':
        title = 'Support Status Updated'
        description = `Support status updated for goal "${goal.subject}"`
        break
      case 'support_requested':
        title = 'Support Requested'
        description = `Your department has been requested to support goal "${goal.subject}"`
        break
      default:
        title = 'Goal Update'
        description = `Goal "${goal.subject}" has been updated`
    }

    // Create notifications for all relevant users
    const notificationPromises = Array.from(usersToNotify).map(userId =>
      createNotification(userId, title, description, {
        goal_id: goal.id,
        action: workflowEntry.action,
        workflow_data: workflowEntry
      })
    )

    const results = await Promise.allSettled(notificationPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`✅ Created ${successful} goal notifications (${failed} failed) for goal ${goal.id}`)
    return { success: true, notified: successful, failed }
    
  } catch (error) {
    console.error('Error creating goal notifications:', error)
    return { success: false, error }
  }
}

export async function createNotification(
  userId: string,
  title: string,
  description: string,
  data: any
) {
  if (!supabaseAdmin) {
    console.warn('Supabase admin client not available for notifications')
    return { success: false, error: 'Database not available' }
  }

  if (!userId || !title || !description) {
    console.error('Missing required fields for notification')
    return { success: false, error: 'Missing required fields' }
  }

  // Extract goalId from data if available
  const goalId = data?.goal_id || data?.goalId
  
  if (!goalId) {
    console.error('No goal ID provided for notification')
    return { success: false, error: 'No goal ID provided' }
  }

  // Generate UUID explicitly to avoid null ID errors
  const notificationId = crypto.randomUUID()
  
  // Determine notification type based on title
  let type: NotificationType = 'status_change'
  if (title.includes('Task Assigned') || title.includes('New Task')) {
    type = 'task_assigned'
  } else if (title.includes('Task Completed')) {
    type = 'task_completed'
  } else if (title.includes('Comment')) {
    type = 'comment'
  } else if (title.includes('Due Soon')) {
    type = 'task_due_soon'
  } else if (title.includes('Overdue')) {
    type = 'task_overdue'
  } else if (title.includes('Support Requested')) {
    type = 'support_requested'
  } else if (title.includes('Department')) {
    type = 'department_activity'
  }
  
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      id: notificationId,
      user_id: userId,
      goal_id: goalId,
      type: type,
      title: title,
      description: description,
      action_data: data || {}
    })

  if (error) {
    console.error(`Error creating notification for user ${userId}:`, error)
    return { success: false, error: error.message }
  } else {
    console.log(`✅ Notification created for user ${userId}: ${title}`)
    return { success: true }
  }
}

export async function getUserNotifications(userId: string) {
  if (!supabaseAdmin) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data || []
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  if (!supabaseAdmin) {
    return false
  }

  // Delete the notification (as per the requirement - delete when read)
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error marking notification as read:', error)
    return false
  }

  return true
}

export async function markAllNotificationsAsRead(userId: string) {
  if (!supabaseAdmin) {
    return false
  }

  // Delete all notifications for the user
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }

  return true
}

// Notify support departments when they're added to a goal
export async function notifySupportDepartments(
  goalId: string,
  goalSubject: string,
  supportDepartments: string[],
  requestedBy: string
) {
  if (!supabaseAdmin || !supportDepartments.length) {
    return { success: false, notified: 0 }
  }

  try {
    const notificationPromises: Promise<any>[] = []
    
    // For each support department, notify the department heads
    for (const department of supportDepartments) {
      const deptHeads = await getDepartmentHeads(department)
      
      for (const headId of deptHeads) {
        if (headId !== requestedBy) {
          notificationPromises.push(
            createNotification(
              headId,
              'Support Requested',
              `Your department (${department}) has been requested to support goal: "${goalSubject}"`,
              { goal_id: goalId, department, action: 'support_requested' }
            )
          )
        }
      }
    }
    
    const results = await Promise.allSettled(notificationPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    
    console.log(`✅ Notified ${successful} department heads about support request`)
    return { success: true, notified: successful }
  } catch (error) {
    console.error('Error notifying support departments:', error)
    return { success: false, notified: 0, error }
  }
}