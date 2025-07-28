import { supabaseAdmin } from './supabase-client'

export type NotificationType = 'task_assigned' | 'task_completed' | 'comment' | 'status_change' | 'task_due_soon' | 'task_overdue'

interface NotificationData {
  userId: string
  goalId: string
  type: NotificationType
  title: string
  description: string
  actionData?: Record<string, any>
}

// Simple notification system for goal management
export async function createNotificationsForGoalAction(
  goalId: string,
  action: string,
  data: any
) {
  // Placeholder function - notifications can be added later
  console.log(`Goal notification: ${action} for goal ${goalId}`, data)
  return { success: true }
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