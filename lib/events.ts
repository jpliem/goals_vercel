/**
 * Simple notification event system for optional n8n integration
 * This module is completely optional and fails gracefully
 */

export interface NotificationEvent {
  event: string
  data: any
  timestamp: string
  source: 'request_management'
}

export interface RequestStatusChangeEvent {
  requestId: string
  oldStatus: string
  newStatus: string
  requestData: {
    subject: string
    application: string
    requestor: string
    priority: string
  }
}

export interface RequestCreatedEvent {
  requestId: string
  requestData: {
    subject: string
    description: string
    application: string
    requestor: string
    priority: string
  }
}

export interface RequestAssignedEvent {
  requestId: string
  executorId: string
  requestData: {
    subject: string
    application: string
    executor: string
  }
}

export class NotificationEvents {
  private static readonly WEBHOOK_ENDPOINT = '/api/webhooks/notifications'
  private static readonly TIMEOUT = 5000 // 5 seconds

  /**
   * Emit a notification event (fire-and-forget)
   * Fails silently to not affect main application flow
   */
  static async emit(event: string, data: any): Promise<void> {
    // Check if notifications are enabled
    if (!this.isEnabled()) {
      return
    }

    try {
      const payload: NotificationEvent = {
        event,
        data,
        timestamp: new Date().toISOString(),
        source: 'request_management'
      }

      // Fire-and-forget HTTP request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)

      fetch(this.WEBHOOK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      .then(() => {
        clearTimeout(timeoutId)
        console.log(`📧 Notification sent: ${event}`)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        // Silent failure - don't log errors to avoid spam
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`📧 Notification failed (ignored): ${event}`, error.message)
        }
      })

    } catch (error) {
      // Silent failure - don't throw errors that could crash the main app
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Notification error (ignored):', error)
      }
    }
  }

  /**
   * Check if notifications are enabled via environment variable
   */
  private static isEnabled(): boolean {
    return process.env.ENABLE_NOTIFICATIONS === 'true'
  }

  /**
   * Convenience methods for common events
   */
  static async requestCreated(data: RequestCreatedEvent): Promise<void> {
    await this.emit('request.created', data)
  }

  static async requestStatusChanged(data: RequestStatusChangeEvent): Promise<void> {
    await this.emit('request.status_changed', data)
  }

  static async requestAssigned(data: RequestAssignedEvent): Promise<void> {
    await this.emit('request.assigned', data)
  }

  static async requestOverdue(data: { requestId: string; daysPastDue: number; requestData: any }): Promise<void> {
    await this.emit('request.overdue', data)
  }

  static async requestCompleted(data: { requestId: string; requestData: any; completionTime: number }): Promise<void> {
    await this.emit('request.completed', data)
  }

  /**
   * Test method to verify notification system is working
   */
  static async testNotification(): Promise<void> {
    await this.emit('system.test', {
      message: 'Test notification from request management system',
      timestamp: new Date().toISOString()
    })
  }
}
