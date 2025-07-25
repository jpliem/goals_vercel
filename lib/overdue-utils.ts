/**
 * Utility functions for overdue request handling
 */

import type { RequestWithDetails } from "./database"

export interface OverdueInfo {
  isOverdue: boolean
  daysOverdue: number
  deadline: Date | null
  deadlineType: 'adjusted' | 'internal' | 'none'
}

/**
 * Check if a request is overdue based on its deadlines
 */
export function getOverdueInfo(request: RequestWithDetails): OverdueInfo {
  const now = new Date()
  now.setHours(23, 59, 59, 999) // End of today for accurate comparison
  
  // Skip closed/rejected requests - they can't be overdue
  if (request.status === 'Closed' || request.status === 'Rejected') {
    return {
      isOverdue: false,
      daysOverdue: 0,
      deadline: null,
      deadlineType: 'none'
    }
  }

  // Check adjusted_deadline first (higher priority)
  if (request.adjusted_deadline) {
    const adjustedDeadline = new Date(request.adjusted_deadline)
    adjustedDeadline.setHours(23, 59, 59, 999) // End of deadline day for fair comparison
    const timeDiff = now.getTime() - adjustedDeadline.getTime()
    const daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    
    return {
      isOverdue: timeDiff > 0,
      daysOverdue: Math.max(0, daysOverdue),
      deadline: adjustedDeadline,
      deadlineType: 'adjusted'
    }
  }

  // Fall back to internal_deadline
  if (request.internal_deadline) {
    const internalDeadline = new Date(request.internal_deadline)
    internalDeadline.setHours(23, 59, 59, 999) // End of deadline day for fair comparison
    const timeDiff = now.getTime() - internalDeadline.getTime()
    const daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    
    return {
      isOverdue: timeDiff > 0,
      daysOverdue: Math.max(0, daysOverdue),
      deadline: internalDeadline,
      deadlineType: 'internal'
    }
  }

  // No deadlines set
  return {
    isOverdue: false,
    daysOverdue: 0,
    deadline: null,
    deadlineType: 'none'
  }
}

/**
 * Check if a request is overdue (simple boolean check)
 */
export function isRequestOverdue(request: RequestWithDetails): boolean {
  return getOverdueInfo(request).isOverdue
}

/**
 * Get days overdue for a request
 */
export function getDaysOverdue(request: RequestWithDetails): number {
  return getOverdueInfo(request).daysOverdue
}

/**
 * Get overdue requests from a list
 */
export function getOverdueRequests(requests: RequestWithDetails[]): RequestWithDetails[] {
  return requests.filter(request => isRequestOverdue(request))
}

/**
 * Get overdue count from a list of requests
 */
export function getOverdueCount(requests: RequestWithDetails[]): number {
  return getOverdueRequests(requests).length
}

/**
 * Format overdue status for display
 */
export function formatOverdueStatus(request: RequestWithDetails): string {
  const overdueInfo = getOverdueInfo(request)
  
  if (!overdueInfo.isOverdue) {
    return ''
  }

  const days = overdueInfo.daysOverdue
  if (days === 0) {
    return 'Due Today'
  } else if (days === 1) {
    return '1 Day Overdue'
  } else {
    return `${days} Days Overdue`
  }
}

/**
 * Get overdue styling classes
 */
export function getOverdueStyling(request: RequestWithDetails): {
  containerClass: string
  badgeClass: string
  textClass: string
  borderClass: string
} {
  const overdueInfo = getOverdueInfo(request)
  
  if (!overdueInfo.isOverdue) {
    return {
      containerClass: '',
      badgeClass: '',
      textClass: '',
      borderClass: ''
    }
  }

  const days = overdueInfo.daysOverdue
  
  if (days === 0) {
    // Due today - orange/yellow styling
    return {
      containerClass: 'bg-orange-50 border-orange-200',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
      textClass: 'text-orange-700',
      borderClass: 'border-orange-300'
    }
  } else if (days <= 2) {
    // 1-2 days overdue - light red styling
    return {
      containerClass: 'bg-red-50 border-red-200',
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
      textClass: 'text-red-700',
      borderClass: 'border-red-300'
    }
  } else {
    // 3+ days overdue - dark red styling
    return {
      containerClass: 'bg-red-100 border-red-300',
      badgeClass: 'bg-red-200 text-red-900 border-red-400',
      textClass: 'text-red-800',
      borderClass: 'border-red-400'
    }
  }
}

/**
 * Check if a stage has overdue requests
 */
export function stageHasOverdueRequests(requests: RequestWithDetails[]): boolean {
  return requests.some(request => isRequestOverdue(request))
}

/**
 * Get overdue count for a stage
 */
export function getStageOverdueCount(requests: RequestWithDetails[]): number {
  return requests.filter(request => isRequestOverdue(request)).length
}
