"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { clearAllRequestData, supabaseAdmin, getAllSystemRequests, updateUserRole as dbUpdateUserRole } from "@/lib/database"

export async function clearAllDevelopmentData() {
  try {
    
    // Authenticate and verify admin role
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      console.error("🗑️ clearAllDevelopmentData: Unauthorized - user is not admin")
      return { error: "Unauthorized: Admin access required" }
    }
    
    // Safety check: Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      console.error("🗑️ clearAllDevelopmentData: Blocked - production environment")
      return { error: "Development tools are disabled in production" }
    }
    
    
    // Clear all request-related data
    const result = await clearAllRequestData()
    
    if (result.error) {
      console.error("🗑️ clearAllDevelopmentData: Database error:", result.error)
      return { error: "Failed to clear data: " + result.error }
    }
    
    
    // Revalidate relevant pages
    revalidatePath("/dashboard")
    revalidatePath("/admin")
    revalidatePath("/requests")
    
    return { 
      success: true, 
      message: "All request data has been cleared successfully",
      cleared: result.data
    }
    
  } catch (error) {
    console.error("🗑️ clearAllDevelopmentData: Unexpected error:", error)
    return { error: "An unexpected error occurred while clearing data" }
  }
}

export async function getStorageUsage() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!supabaseAdmin) {
      return {
        success: true,
        usage: { size: 0, count: 0 },
        limit: { size: 1024 * 1024 * 1024, count: 1000 }, // 1GB, 1000 files mock
        message: "Mock data - Supabase not connected"
      }
    }

    // Get all files in the storage bucket (including nested folders)
    const getAllFiles = async (folder = '', allFiles: any[] = []): Promise<any[]> => {
      const { data: files, error } = await supabaseAdmin!.storage
        .from('request-attachments')
        .list(folder, {
          limit: 1000,
          offset: 0
        })

      if (error) {
        console.error('Storage list error:', error)
        throw error
      }

      if (!files) return allFiles

      for (const file of files) {
        if (file.name && !file.name.includes('.emptyFolderPlaceholder')) {
          const filePath = folder ? `${folder}/${file.name}` : file.name
          
          // If it's a folder, recursively get files inside
          if (!file.metadata?.size && file.id === null) {
            const subFiles = await getAllFiles(filePath, [])
            allFiles.push(...subFiles)
          } else {
            // It's a file, add it to our list
            allFiles.push({
              ...file,
              fullPath: filePath,
              size: file.metadata?.size || 0
            })
          }
        }
      }

      return allFiles
    }

    try {
      const allFiles = await getAllFiles()
      const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0)
      const fileCount = allFiles.length

      // Storage limits - adjusted for typical Supabase free tier
      const limits = {
        size: 1024 * 1024 * 1024, // 1GB for free tier
        count: 1000 // 1000 files
      }

      return {
        success: true,
        usage: {
          size: totalSize,
          count: fileCount
        },
        limit: limits
      }
    } catch (storageError: any) {
      // If storage bucket doesn't exist or is empty, return zero usage
      if (storageError?.message?.includes('not found') || 
          storageError?.message?.includes('does not exist')) {
        return {
          success: true,
          usage: { size: 0, count: 0 },
          limit: { size: 1024 * 1024 * 1024, count: 1000 },
          message: "Storage bucket is empty or not configured"
        }
      }
      
      throw storageError
    }
  } catch (error) {
    console.error('Storage usage error:', error)
    return { error: 'Unexpected error fetching storage usage' }
  }
}

export async function deleteAllStorageFiles() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    // Safety check: Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return { error: "Storage cleanup is disabled in production" }
    }

    if (!supabaseAdmin) {
      return {
        success: true,
        deletedCount: 0,
        message: "Mock environment - no files to delete"
      }
    }

    // List all files in the bucket
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('request-attachments')
      .list('', {
        limit: 1000,
        offset: 0
      })

    if (listError) {
      console.error('Failed to list files:', listError)
      return { error: 'Failed to list files for deletion' }
    }

    if (!files || files.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: "No files found to delete"
      }
    }

    // Delete all files
    const filePaths = files.map(file => file.name)
    const { error: deleteError } = await supabaseAdmin.storage
      .from('request-attachments')
      .remove(filePaths)

    if (deleteError) {
      console.error('Failed to delete files:', deleteError)
      return { error: 'Failed to delete files from storage' }
    }

    return {
      success: true,
      deletedCount: filePaths.length,
      message: `Successfully deleted ${filePaths.length} files from storage`
    }
  } catch (error) {
    console.error('Storage deletion error:', error)
    return { error: 'Unexpected error during storage cleanup' }
  }
}

export async function updateUserRole(userId: string, newRole: "User" | "Admin") {
  try {
    // Authenticate and verify admin role
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }
    
    // Validate the new role
    if (!["User", "Admin"].includes(newRole)) {
      return { error: "Invalid role specified" }
    }
    
    // Prevent admin from changing their own role to avoid lockout
    if (userId === user.id && newRole !== "Admin") {
      return { error: "Cannot change your own admin role to prevent system lockout" }
    }
    
    // Update the user role using the existing updateUserRole function
    const result = await dbUpdateUserRole(userId, newRole)
    
    if (result.error) {
      console.error("🔧 updateUserRole: Database error:", result.error)
      return { error: "Failed to update user role: " + result.error }
    }
    
    // Revalidate admin page to reflect changes
    revalidatePath("/admin")
    
    console.log(`✅ updateUserRole: Successfully updated user ${userId} role to ${newRole}`)
    return { 
      success: true, 
      message: `User role updated to ${newRole} successfully`,
      data: result.data
    }
    
  } catch (error) {
    console.error("🔧 updateUserRole: Unexpected error:", error)
    return { error: "An unexpected error occurred while updating user role" }
  }
}

export async function getAnalyticsData() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    // Get all requests for analytics (without pagination to get all data)
    const requestsResult = await getAllSystemRequests()
    const requests = requestsResult.data
    
    if (!requests || requests.length === 0) {
      return {
        success: true,
        analytics: {
          totalRequests: 0,
          statusDistribution: {},
          priorityDistribution: {},
          applicationDistribution: {},
          monthlyTrend: [],
          avgResolutionTime: 0,
          overdueRequests: 0
        }
      }
    }

    // Calculate analytics
    const now = new Date()
    const statusDistribution: Record<string, number> = {}
    const priorityDistribution: Record<string, number> = {}
    const applicationDistribution: Record<string, number> = {}
    const monthlyData: Record<string, number> = {}
    
    let totalResolutionTime = 0
    let completedCount = 0
    let overdueCount = 0

    requests.forEach(request => {
      // Status distribution
      statusDistribution[request.status] = (statusDistribution[request.status] || 0) + 1
      
      // Priority distribution
      if (request.priority) {
        priorityDistribution[request.priority] = (priorityDistribution[request.priority] || 0) + 1
      }
      
      // Application distribution
      if (request.application?.name) {
        applicationDistribution[request.application.name] = (applicationDistribution[request.application.name] || 0) + 1
      }
      
      // Monthly trend
      const month = new Date(request.created_at).toISOString().slice(0, 7) // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + 1
      
      // Resolution time (for closed requests)
      if (request.status === 'Closed' && request.updated_at) {
        const resolutionTime = new Date(request.updated_at).getTime() - new Date(request.created_at).getTime()
        totalResolutionTime += resolutionTime
        completedCount++
      }
      
      // Overdue requests
      if (request.internal_deadline && new Date(request.internal_deadline) < now && request.status !== 'Closed') {
        overdueCount++
      }
    })

    // Convert monthly data to array and sort
    const monthlyTrend = Object.entries(monthlyData)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12) // Last 12 months

    const avgResolutionTime = completedCount > 0 ? totalResolutionTime / completedCount : 0
    const avgResolutionDays = Math.round(avgResolutionTime / (1000 * 60 * 60 * 24))

    return {
      success: true,
      analytics: {
        totalRequests: requests?.length || 0,
        statusDistribution,
        priorityDistribution,
        applicationDistribution,
        monthlyTrend,
        avgResolutionTime: avgResolutionDays,
        overdueRequests: overdueCount
      }
    }
  } catch (error) {
    console.error('Analytics error:', error)
    return { error: 'Unexpected error fetching analytics data' }
  }
}
