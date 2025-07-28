import { supabaseAdmin } from './supabase-client'
import { RequestWithDetails } from './database'

// Helper function to get user name and role
async function getUserInfo(userId: string): Promise<{ name: string; role: string }> {
  try {
    if (!supabaseAdmin) {
      return { name: 'Unknown User', role: 'Unknown' }
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('full_name, email, role')
      .eq('id', userId)
      .single()

    if (user) {
      return {
        name: (user.full_name as string) || (user.email as string) || 'Unknown User',
        role: (user.role as string) || 'Unknown'
      }
    }
    
    return { name: 'Unknown User', role: 'Unknown' }
  } catch (error) {
    console.error('Error fetching user info for notification:', error)
    return { name: 'Unknown User', role: 'Unknown' }
  }
}

export type NotificationType = 'clarification' | 'clarification_deleted' | 'assignment' | 'rejection' | 'approval' | 'rework' | 'deadline' | 'task_completed' | 'comment' | 'status_change'

interface NotificationData {
  userId: string
  goalId?: string
  requestId?: string
  type: NotificationType
  title: string
  description: string
  actionData?: Record<string, any>
}

interface WorkflowEntry {
  action: string
  user_id: string
  timestamp: string
  from_status?: string
  to_status?: string
  comment?: string
  reason?: string
  notes?: string
  [key: string]: any
}

export async function createNotification(data: NotificationData) {
  if (!supabaseAdmin) {
    console.warn('Supabase admin client not available for notifications')
    return
  }

  // Generate UUID explicitly to avoid null ID errors
  const notificationId = crypto.randomUUID()
  
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      id: notificationId,
      user_id: data.userId,
      goal_id: data.goalId || null,
      request_id: data.requestId || null,
      type: data.type,
      title: data.title,
      description: data.description,
      action_data: data.actionData || {}
    })

  if (error) {
    console.error(`Error creating notification for user ${data.userId}:`, error)
  } else {
    console.log(`✅ Notification created for user ${data.userId}: ${data.title}`)
  }
}

export async function createNotificationsForWorkflowAction(
  request: RequestWithDetails,
  workflowEntry: WorkflowEntry,
  performedByUserId: string
) {
  const notifications: NotificationData[] = []
  
  // Get user info for the person who performed the action
  const actorInfo = await getUserInfo(performedByUserId)

  switch (workflowEntry.action) {
    case 'approval':
      // Notify requestor about approval
      if (request.requestor_id && request.requestor_id !== performedByUserId) {
        notifications.push({
          userId: request.requestor_id,
          requestId: request.id,
          type: 'approval',
          title: 'Request Approved',
          description: `${actorInfo.name} (${actorInfo.role}) approved your request "${request.subject}"`,
          actionData: { from_status: workflowEntry.from_status, to_status: workflowEntry.to_status }
        })
      }
      
      // Also notify tech lead if they were assigned during approval (new application flow)
      if (request.tech_lead_id && request.tech_lead_id !== performedByUserId && request.tech_lead_id !== request.requestor_id) {
        notifications.push({
          userId: request.tech_lead_id,
          requestId: request.id,
          type: 'assignment',
          title: 'New Assignment - Tech Lead',
          description: `${actorInfo.name} (${actorInfo.role}) assigned you as tech lead for "${request.subject}"`,
          actionData: { role: 'tech_lead' }
        })
      }
      break

    case 'rejection':
      // Special handling for UAT rejections - notify tech lead and executors
      if (workflowEntry.from_status === 'Pending UAT') {
        // UAT rejection - notify tech lead
        if (request.tech_lead_id && request.tech_lead_id !== performedByUserId) {
          const reason = workflowEntry.reason ? ` (Reason: ${workflowEntry.reason})` : ''
          notifications.push({
            userId: request.tech_lead_id,
            requestId: request.id,
            type: 'rejection',
            title: 'UAT Rejected',
            description: `${actorInfo.name} (${actorInfo.role}) rejected UAT for "${request.subject}"${reason}`,
            actionData: { 
              from_status: workflowEntry.from_status, 
              reason: workflowEntry.reason 
            }
          })
        }
        
        // UAT rejection - notify executors
        if (request.executors && Array.isArray(request.executors)) {
          for (const executor of request.executors) {
            if (executor.user_id && executor.user_id !== performedByUserId) {
              const reason = workflowEntry.reason ? ` (Reason: ${workflowEntry.reason})` : ''
              notifications.push({
                userId: executor.user_id,
                requestId: request.id,
                type: 'rejection',
                title: 'UAT Rejected',
                description: `${actorInfo.name} (${actorInfo.role}) rejected UAT for "${request.subject}"${reason}`,
                actionData: { 
                  from_status: workflowEntry.from_status, 
                  reason: workflowEntry.reason 
                }
              })
            }
          }
        } else if (request.executor_id && request.executor_id !== performedByUserId) {
          const reason = workflowEntry.reason ? ` (Reason: ${workflowEntry.reason})` : ''
          notifications.push({
            userId: request.executor_id,
            requestId: request.id,
            type: 'rejection',
            title: 'UAT Rejected',
            description: `${actorInfo.name} (${actorInfo.role}) rejected UAT for "${request.subject}"${reason}`,
            actionData: { 
              from_status: workflowEntry.from_status, 
              reason: workflowEntry.reason 
            }
          })
        }
      } else {
        // Standard rejection - notify requestor about rejection
        if (request.requestor_id && request.requestor_id !== performedByUserId) {
          const reason = workflowEntry.reason ? ` (Reason: ${workflowEntry.reason})` : ''
          notifications.push({
            userId: request.requestor_id,
            requestId: request.id,
            type: 'rejection',
            title: 'Request Rejected',
            description: `${actorInfo.name} (${actorInfo.role}) rejected your request "${request.subject}"${reason}`,
            actionData: { 
              from_status: workflowEntry.from_status, 
              reason: workflowEntry.reason 
            }
          })
        }
      }
      break

    case 'assignment':
      // Notify newly assigned tech lead
      if (request.tech_lead_id && request.tech_lead_id !== performedByUserId) {
        notifications.push({
          userId: request.tech_lead_id,
          requestId: request.id,
          type: 'assignment',
          title: 'New Assignment - Tech Lead',
          description: `${actorInfo.name} (${actorInfo.role}) assigned you as tech lead for "${request.subject}"`,
          actionData: { role: 'tech_lead' }
        })
      }
      break

    case 'executors_assigned':
      // Notify all assigned executors
      if (request.executors && Array.isArray(request.executors)) {
        for (const executor of request.executors) {
          if (executor.user_id && executor.user_id !== performedByUserId) {
            notifications.push({
              userId: executor.user_id,
              requestId: request.id,
              type: 'assignment',
              title: 'New Assignment - Executor',
              description: `${actorInfo.name} (${actorInfo.role}) assigned you to execute "${request.subject}"`,
              actionData: { role: 'executor' }
            })
          }
        }
      }
      // Legacy single executor support
      if (request.executor_id && request.executor_id !== performedByUserId) {
        notifications.push({
          userId: request.executor_id,
          requestId: request.id,
          type: 'assignment',
          title: 'New Assignment - Executor',
          description: `${actorInfo.name} (${actorInfo.role}) assigned you to execute "${request.subject}"`,
          actionData: { role: 'executor' }
        })
      }
      break

    case 'clarification':
      // Use explicit target from workflow entry if available, otherwise fall back to inference
      let clarificationTargetId: string | null = null
      
      // First, try to use the explicit requested_from field
      if (workflowEntry.requested_from) {
        clarificationTargetId = workflowEntry.requested_from
      } else {
        // Fallback: determine who should be notified based on the workflow stage
        if (request.status === 'Pending Clarification' && request.previous_status) {
          if (['Initial Analysis', 'Code Review'].includes(request.previous_status) && request.tech_lead_id) {
            clarificationTargetId = request.tech_lead_id
          } else if (['In Progress', 'Rework'].includes(request.previous_status)) {
            // For multi-executor, we might need to handle this differently
            // For now, notify the first executor who hasn't completed
            if (request.executors && Array.isArray(request.executors)) {
              const pendingExecutor = request.executors.find(e => e.task_status === 'pending')
              if (pendingExecutor) {
                clarificationTargetId = pendingExecutor.user_id
              }
            } else if (request.executor_id) {
              clarificationTargetId = request.executor_id
            }
          }
        }
      }

      if (clarificationTargetId && clarificationTargetId !== performedByUserId) {
        notifications.push({
          userId: clarificationTargetId,
          requestId: request.id,
          type: 'clarification',
          title: 'Clarification Requested',
          description: `${actorInfo.name} (${actorInfo.role}) needs clarification from you on "${request.subject}"`,
          actionData: { 
            from_status: request.previous_status,
            asked_by: performedByUserId 
          }
        })
      }
      break

    case 'clarification_response':
      // Notify the person who asked for clarification
      // Look for the clarification request to find who originally asked
      if (workflowEntry.clarification_requested_by) {
        notifications.push({
          userId: workflowEntry.clarification_requested_by,
          requestId: request.id,
          type: 'clarification',
          title: 'Clarification Response Received',
          description: `${actorInfo.name} (${actorInfo.role}) responded to your clarification request on "${request.subject}"`,
          actionData: { 
            responded_by: performedByUserId,
            response_provided: true
          }
        })
      }
      break

    case 'clarification_deleted':
      // Notify the person who was asked for clarification that it's no longer needed
      if (workflowEntry.target_user_id && workflowEntry.target_user_id !== performedByUserId) {
        notifications.push({
          userId: workflowEntry.target_user_id,
          requestId: request.id,
          type: 'clarification_deleted',
          title: 'Clarification Request Cancelled',
          description: `${actorInfo.name} (${actorInfo.role}) cancelled a clarification request for "${request.subject}"`,
          actionData: { 
            cancelled_by: performedByUserId 
          }
        })
      }
      break

    case 'rework':
    case 'status_change':
      // Handle backward navigation from UAT to any status
      if (workflowEntry.from_status === 'Pending UAT' && 
          workflowEntry.to_status &&
          ['Rework', 'In Progress', 'Initial Analysis'].includes(workflowEntry.to_status)) {
        // Notify executors about UAT backward navigation
        if (request.executors && Array.isArray(request.executors)) {
          for (const executor of request.executors) {
            if (executor.user_id && executor.user_id !== performedByUserId) {
              notifications.push({
                userId: executor.user_id,
                requestId: request.id,
                type: 'rework',
                title: 'UAT Feedback - Action Required',
                description: `UAT feedback received for "${request.subject}" - sent back to ${workflowEntry.to_status}`,
                actionData: { 
                  from_status: workflowEntry.from_status,
                  to_status: workflowEntry.to_status,
                  reason: workflowEntry.reason || workflowEntry.comment
                }
              })
            }
          }
        } else if (request.executor_id && request.executor_id !== performedByUserId) {
          notifications.push({
            userId: request.executor_id,
            requestId: request.id,
            type: 'rework',
            title: 'UAT Feedback - Action Required',
            description: `UAT feedback received for "${request.subject}" - sent back to ${workflowEntry.to_status}`,
            actionData: { 
              from_status: workflowEntry.from_status,
              to_status: workflowEntry.to_status,
              reason: workflowEntry.reason || workflowEntry.comment
            }
          })
        }
        
        // Also notify tech lead about UAT backward navigation
        if (request.tech_lead_id && request.tech_lead_id !== performedByUserId) {
          notifications.push({
            userId: request.tech_lead_id,
            requestId: request.id,
            type: 'rework',
            title: 'UAT Feedback - Review Required',
            description: `UAT feedback received for "${request.subject}" - sent back to ${workflowEntry.to_status}`,
            actionData: { 
              from_status: workflowEntry.from_status,
              to_status: workflowEntry.to_status,
              reason: workflowEntry.reason || workflowEntry.comment
            }
          })
        }
      } else if (workflowEntry.to_status === 'Rework') {
        // Notify executors about standard rework
        if (request.executors && Array.isArray(request.executors)) {
          for (const executor of request.executors) {
            if (executor.user_id && executor.user_id !== performedByUserId) {
              notifications.push({
                userId: executor.user_id,
                requestId: request.id,
                type: 'rework',
                title: 'Rework Required',
                description: `${actorInfo.name} (${actorInfo.role}) sent "${request.subject}" back for rework`,
                actionData: { 
                  from_status: workflowEntry.from_status,
                  reason: workflowEntry.reason || workflowEntry.comment
                }
              })
            }
          }
        } else if (request.executor_id && request.executor_id !== performedByUserId) {
          notifications.push({
            userId: request.executor_id,
            requestId: request.id,
            type: 'rework',
            title: 'Rework Required',
            description: `${actorInfo.name} (${actorInfo.role}) sent "${request.subject}" back for rework`,
            actionData: { 
              from_status: workflowEntry.from_status,
              reason: workflowEntry.reason || workflowEntry.comment
            }
          })
        }
      } else if (workflowEntry.from_status === 'Initial Analysis' && workflowEntry.to_status === 'Pending Assignment') {
        // Special case: Tech lead finished initial analysis, notify all admins
        try {
          // Import the getUsers function to fetch admin users
          const { getUsers } = await import('@/lib/database')
          const usersResult = await getUsers()
          
          if (usersResult.data) {
            // Filter for admin users
            const adminUsers = usersResult.data.filter(user => user.role === 'Admin')
            
            // Notify each admin
            for (const admin of adminUsers) {
              if (admin.id !== performedByUserId) {
                notifications.push({
                  userId: admin.id,
                  requestId: request.id,
                  type: 'status_change',
                  title: 'Analysis Complete - Ready for Assignment',
                  description: `"${request.subject}" analysis is complete and ready for executor assignment`,
                  actionData: { 
                    from_status: workflowEntry.from_status, 
                    to_status: workflowEntry.to_status,
                    tech_lead: request.tech_lead?.full_name || 'Unknown'
                  }
                })
              }
            }
          }
        } catch (error) {
          console.error('Error fetching admin users for notification:', error)
        }
        
      } else if (workflowEntry.to_status === 'Initial Analysis' && !workflowEntry.from_status) {
        // Special case: New enhancement requests going to Initial Analysis
        // Notify the auto-assigned tech lead about their new assignment
        if (request.tech_lead_id && request.tech_lead_id !== performedByUserId) {
          notifications.push({
            userId: request.tech_lead_id,
            requestId: request.id,
            type: 'assignment',
            title: 'New Enhancement Request - Tech Lead',
            description: `You were assigned as tech lead for new enhancement request: "${request.subject}"`,
            actionData: { role: 'tech_lead', request_type: 'enhancement' }
          })
        }
        
        // Optionally notify admins about new enhancement requests
        try {
          const { getUsers } = await import('@/lib/database')
          const usersResult = await getUsers()
          
          if (usersResult.data) {
            const adminUsers = usersResult.data.filter(user => user.role === 'Admin')
            
            for (const admin of adminUsers) {
              if (admin.id !== performedByUserId) {
                notifications.push({
                  userId: admin.id,
                  requestId: request.id,
                  type: 'status_change',
                  title: 'New Enhancement Request',
                  description: `New enhancement request created: "${request.subject}"`,
                  actionData: { 
                    request_type: 'enhancement',
                    to_status: workflowEntry.to_status,
                    application: request.application?.name || 'Unknown'
                  }
                })
              }
            }
          }
        } catch (error) {
          console.error('Error notifying admins about new enhancement request:', error)
        }
        
      } else if (workflowEntry.to_status && !['Rejected', 'Initial Analysis', 'Rework'].includes(workflowEntry.to_status)) {
        // General status change notifications
        const interestedParties = new Set<string>()
        
        // Always notify requestor
        if (request.requestor_id) interestedParties.add(request.requestor_id)
        
        // Notify tech lead
        if (request.tech_lead_id) interestedParties.add(request.tech_lead_id)
        
        // Notify executors
        if (request.executors && Array.isArray(request.executors)) {
          request.executors.forEach(e => {
            if (e.user_id) interestedParties.add(e.user_id)
          })
        } else if (request.executor_id) {
          interestedParties.add(request.executor_id)
        }

        // Remove the person who made the change
        interestedParties.delete(performedByUserId)

        for (const userId of interestedParties) {
          notifications.push({
            userId,
            requestId: request.id,
            type: 'status_change',
            title: 'Status Updated',
            description: `"${request.subject}" status changed to ${workflowEntry.to_status}`,
            actionData: { 
              from_status: workflowEntry.from_status,
              to_status: workflowEntry.to_status
            }
          })
        }
      }
      break

    case 'deadline_set':
    case 'deadline_changed':
    case 'deadline_override':
      // Notify requestor and all assigned parties about deadline changes
      const deadlineParties = new Set<string>()
      
      if (request.requestor_id) deadlineParties.add(request.requestor_id)
      if (request.tech_lead_id) deadlineParties.add(request.tech_lead_id)
      
      if (request.executors && Array.isArray(request.executors)) {
        request.executors.forEach(e => {
          if (e.user_id) deadlineParties.add(e.user_id)
        })
      } else if (request.executor_id) {
        deadlineParties.add(request.executor_id)
      }

      deadlineParties.delete(performedByUserId)

      for (const userId of deadlineParties) {
        notifications.push({
          userId,
          requestId: request.id,
          type: 'deadline',
          title: 'Deadline Updated',
          description: `Deadline changed for "${request.subject}"`,
          actionData: workflowEntry
        })
      }
      break

    case 'executor_task_completed':
    case 'single_executor_completed':
      // Notify tech lead about task completion
      if (request.tech_lead_id && request.tech_lead_id !== performedByUserId) {
        notifications.push({
          userId: request.tech_lead_id,
          requestId: request.id,
          type: 'task_completed',
          title: 'Task Completed',
          description: `Task completed for "${request.subject}"`,
          actionData: { 
            completed_by: performedByUserId,
            notes: workflowEntry.notes
          }
        })
      }
      
      // Also notify requestor about task completion progress
      if (request.requestor_id && request.requestor_id !== performedByUserId) {
        notifications.push({
          userId: request.requestor_id,
          requestId: request.id,
          type: 'status_change',
          title: 'Task Progress Update',
          description: `Progress update on "${request.subject}" - task completed`,
          actionData: { 
            completed_by: performedByUserId,
            notes: workflowEntry.notes
          }
        })
      }
      break

    case 'comment':
      // Notify all parties except the commenter
      const commentParties = new Set<string>()
      
      if (request.requestor_id) commentParties.add(request.requestor_id)
      if (request.tech_lead_id) commentParties.add(request.tech_lead_id)
      
      if (request.executors && Array.isArray(request.executors)) {
        request.executors.forEach(e => {
          if (e.user_id) commentParties.add(e.user_id)
        })
      } else if (request.executor_id) {
        commentParties.add(request.executor_id)
      }

      commentParties.delete(performedByUserId)

      for (const userId of commentParties) {
        notifications.push({
          userId,
          requestId: request.id,
          type: 'comment',
          title: 'New Comment',
          description: `New comment on "${request.subject}"`,
          actionData: { 
            comment_preview: workflowEntry.comment?.substring(0, 100)
          }
        })
      }
      break
      
    case 'tech_lead_change':
      // Notify the new tech lead about assignment
      if (request.tech_lead_id && request.tech_lead_id !== performedByUserId) {
        notifications.push({
          userId: request.tech_lead_id,
          requestId: request.id,
          type: 'assignment',
          title: 'Tech Lead Assignment',
          description: `You were assigned as tech lead for "${request.subject}"`,
          actionData: { role: 'tech_lead' }
        })
      }
      break
      
    case 'application_change':
      // Notify all involved parties about application change
      const appChangeParties = new Set<string>()
      if (request.requestor_id) appChangeParties.add(request.requestor_id)
      if (request.tech_lead_id) appChangeParties.add(request.tech_lead_id)
      
      if (request.executors && Array.isArray(request.executors)) {
        request.executors.forEach(e => {
          if (e.user_id) appChangeParties.add(e.user_id)
        })
      } else if (request.executor_id) {
        appChangeParties.add(request.executor_id)
      }
      
      appChangeParties.delete(performedByUserId)
      
      for (const userId of appChangeParties) {
        notifications.push({
          userId,
          requestId: request.id,
          type: 'status_change',
          title: 'Application Changed',
          description: `Application updated for "${request.subject}"`,
          actionData: { 
            application_name: request.application?.name || 'Unknown'
          }
        })
      }
      break
      
    case 'executor_assignments_edited':
      // Notify affected executors about assignment changes
      if (request.executors && Array.isArray(request.executors)) {
        for (const executor of request.executors) {
          if (executor.user_id && executor.user_id !== performedByUserId) {
            notifications.push({
              userId: executor.user_id,
              requestId: request.id,
              type: 'assignment',
              title: 'Assignment Updated',
              description: `Your assignment for "${request.subject}" was updated`,
              actionData: { role: 'executor' }
            })
          }
        }
      }
      break
  }

  // Create all notifications
  if (notifications.length > 0) {
    console.log(`🔔 Creating ${notifications.length} notifications for action: ${workflowEntry.action}`)
    for (const notification of notifications) {
      console.log(`🔔 → ${notification.type}: ${notification.title} for user ${notification.userId}`)
      await createNotification(notification)
    }
  } else {
    console.log(`🔔 No notifications to create for action: ${workflowEntry.action}`)
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