"use server"

import { getCurrentUserProfile } from "@/lib/auth"
import { getRequests, getAllSystemRequests, getUserDepartmentPermissions, type PaginationParams, type PaginatedResult, type RequestWithDetails } from "@/lib/database"
import { redirect } from "next/navigation"

export async function getPaginatedRequests(
  pagination: PaginationParams,
  filters?: {
    searchTerm?: string
    statusFilter?: string
    priorityFilter?: string
  }
): Promise<PaginatedResult<RequestWithDetails>> {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  // Get user's department permissions and include in request filtering
  const userDepartmentPermissions = await getUserDepartmentPermissions(userSession.id)
  
  // For now, we'll ignore client-side filters and implement them server-side in the future
  // The current database functions don't support server-side filtering with pagination yet
  const result = await getRequests({
    userId: userSession.id,
    userRole: userSession.role,
    pagination,
    departmentFilter: userDepartmentPermissions.data && userDepartmentPermissions.data.length > 0 ? userDepartmentPermissions.data : undefined
  })
  
  return result.data || {
    data: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: pagination.page,
    pageSize: pagination.limit,
    hasNextPage: false,
    hasPreviousPage: false
  }
}

export async function getPaginatedSystemRequests(
  pagination: PaginationParams,
  filters?: {
    searchTerm?: string
    statusFilter?: string
    priorityFilter?: string
  }
): Promise<PaginatedResult<RequestWithDetails>> {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  if (userSession.role !== "Admin") {
    throw new Error("Unauthorized: Admin access required")
  }

  const result = await getAllSystemRequests()
  
  // For now, return all data without pagination since getAllSystemRequests doesn't support it yet
  return {
    data: result.data || [],
    totalCount: result.data?.length || 0,
    totalPages: 1,
    currentPage: pagination.page,
    pageSize: pagination.limit,
    hasNextPage: false,
    hasPreviousPage: false
  }
}

export async function getPaginatedMyAssignedRequests(
  pagination: PaginationParams,
  filters?: {
    searchTerm?: string
    statusFilter?: string
    priorityFilter?: string
  }
): Promise<PaginatedResult<RequestWithDetails>> {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  // Get requests assigned to me using existing getRequests function with assignedToMe flag
  const result = await getRequests({
    userId: userSession.id,
    userRole: userSession.role,
    pagination,
    assignedToMe: true
  })
  
  return result.data || {
    data: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: pagination.page,
    pageSize: pagination.limit,
    hasNextPage: false,
    hasPreviousPage: false
  }
}
