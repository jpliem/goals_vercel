/**
 * Utility functions for parsing and handling threaded comments
 * Uses prefix-based system to enable threading without schema changes
 */

export interface ParsedComment {
  id: string
  goal_id: string
  user_id: string
  comment: string // Original comment with prefix
  text: string    // Clean text without prefix
  parent_id: string | null
  isReply: boolean
  is_private: boolean
  created_at: string
  user?: any
}

/**
 * Parses a single comment to extract threading information
 * Format: "↳ parent_uuid: actual comment text"
 */
export function parseComment(comment: any): ParsedComment {
  const originalText = comment.comment || ''
  
  // Check for reply prefix: "↳ parent_id: comment text"
  if (originalText.startsWith('↳ ')) {
    const colonIndex = originalText.indexOf(': ')
    if (colonIndex > 2) {
      const parentId = originalText.slice(2, colonIndex).trim()
      const cleanText = originalText.slice(colonIndex + 2)
      
      // Validate parent_id format (basic UUID check)
      if (parentId.length > 0 && cleanText.length > 0) {
        return {
          ...comment,
          text: cleanText,
          parent_id: parentId,
          isReply: true
        }
      }
    }
  }
  
  // Regular top-level comment or malformed reply (fallback to plain text)
  return {
    ...comment,
    text: originalText,
    parent_id: null,
    isReply: false
  }
}

/**
 * Parses an array of comments to extract threading information
 */
export function parseComments(comments: any[]): ParsedComment[] {
  if (!comments || !Array.isArray(comments)) {
    return []
  }
  
  return comments.map(parseComment)
}

/**
 * Builds a threaded comment structure from flat array
 * Returns comments organized with replies nested under parents
 */
export interface ThreadedComment extends ParsedComment {
  replies?: ThreadedComment[]
  replyCount?: number
}

export function buildCommentThreads(comments: any[]): ThreadedComment[] {
  const parsedComments = parseComments(comments)
  
  // Create maps for efficient lookup
  const commentMap = new Map<string, ThreadedComment>()
  const topLevelComments: ThreadedComment[] = []
  
  // First pass: create comment map and identify top-level comments
  parsedComments.forEach(comment => {
    const threadedComment: ThreadedComment = {
      ...comment,
      replies: [],
      replyCount: 0
    }
    
    commentMap.set(comment.id, threadedComment)
    
    if (!comment.isReply) {
      topLevelComments.push(threadedComment)
    }
  })
  
  // Second pass: attach replies to their parents
  parsedComments.forEach(comment => {
    if (comment.isReply && comment.parent_id) {
      const parent = commentMap.get(comment.parent_id)
      const threadedComment = commentMap.get(comment.id)
      
      if (parent && threadedComment) {
        parent.replies = parent.replies || []
        parent.replies.push(threadedComment)
        parent.replyCount = (parent.replyCount || 0) + 1
      }
    }
  })
  
  // Sort top-level comments by creation date (newest first for timeline view)
  topLevelComments.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  
  // Sort replies within each thread (oldest first for conversation flow)
  topLevelComments.forEach(comment => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
  })
  
  return topLevelComments
}

/**
 * Formats a comment for storage with threading prefix
 */
export function formatCommentForStorage(text: string, parentId?: string): string {
  if (!parentId) {
    return text.trim()
  }
  
  return `↳ ${parentId}: ${text.trim()}`
}

/**
 * Gets all comment IDs in a thread (for deletion, notification, etc.)
 */
export function getThreadCommentIds(comments: any[], rootCommentId: string): string[] {
  const parsedComments = parseComments(comments)
  const ids = new Set<string>([rootCommentId])
  
  // Find all replies to the root comment and their nested replies
  const findReplies = (parentId: string) => {
    parsedComments.forEach(comment => {
      if (comment.parent_id === parentId) {
        ids.add(comment.id)
        findReplies(comment.id) // Recursively find nested replies
      }
    })
  }
  
  findReplies(rootCommentId)
  return Array.from(ids)
}

/**
 * Validates comment text for threading requirements
 */
export function validateCommentText(text: string): { valid: boolean; error?: string } {
  const trimmed = text.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Comment cannot be empty' }
  }
  
  if (trimmed.length > 10000) {
    return { valid: false, error: 'Comment too long (max 10,000 characters)' }
  }
  
  // Check for potential conflicts with prefix format
  if (trimmed.startsWith('↳ ') && trimmed.includes(': ')) {
    return { valid: false, error: 'Comment cannot start with reply prefix format' }
  }
  
  return { valid: true }
}