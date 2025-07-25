"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { UserRecord } from "@/lib/database"

interface NotificationBellProps {
  user: UserRecord
}

export interface NotificationItem {
  id: string
  type: 'clarification' | 'assignment' | 'rejection' | 'approval' | 'rework' | 'deadline' | 'task_completed' | 'comment' | 'status_change'
  title: string
  description: string
  created_at: string
  request_id: string
  action_data?: Record<string, any>
}

export function NotificationBell({ user }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      } else {
        console.error('Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.length

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'clarification':
        return '❓'
      case 'assignment':
        return '📋'
      case 'rejection':
        return '❌'
      case 'approval':
        return '🎉'
      case 'rework':
        return '🔄'
      case 'deadline':
        return '⏰'
      case 'task_completed':
        return '✅'
      case 'comment':
        return '💬'
      case 'status_change':
        return '📊'
      default:
        return '📄'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      // Mark as read by deleting the notification
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from local state
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
        
        // Open request in new tab
        window.open(`/requests/${notification.request_id}`, '_blank')
        setIsOpen(false)
      } else {
        console.error('Failed to mark notification as read')
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications([])
      } else {
        console.error('Failed to mark all notifications as read')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Get request subject from description for display
  const getRequestSubject = (description: string) => {
    const match = description.match(/"([^"]+)"/)
    return match ? match[1] : 'Request'
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 px-2 text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className="cursor-pointer hover:bg-gray-50 bg-blue-50"
            >
              <div className="flex items-start gap-3 w-full">
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-blue-900">
                      {notification.title}
                    </p>
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {notification.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTimestamp(notification.created_at)}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}