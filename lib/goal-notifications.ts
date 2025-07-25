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
  // Placeholder function - notifications can be added later
  console.log(`Notification for user ${userId}: ${title}`, { description, data })
  return { success: true }
}