import { cookies } from "next/headers"
import type { UserRecord } from "./goal-database"

export interface UserSession {
  id: string
  email: string
  full_name: string
  role: "Admin" | "Head" | "Employee"
  department?: string
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")
    
    if (!sessionCookie) {
      return null
    }
    
    try {
      const user = JSON.parse(sessionCookie.value)
      return user
    } catch (parseError) {
      console.error("Failed to parse session cookie:", parseError)
      return null
    }
  } catch (error) {
    console.error("🔍 getCurrentUser: Error getting current user:", error)
    return null
  }
}

export async function getCurrentUserProfile(): Promise<UserSession | null> {
  return getCurrentUser()
}

export function isAdmin(userProfile: UserSession | null): boolean {
  return userProfile?.role === "Admin"
}

export function isHead(userProfile: UserSession | null): boolean {
  return userProfile?.role === "Head"
}

export function isEmployee(userProfile: UserSession | null): boolean {
  return userProfile?.role === "Employee"
}

// Deprecated: User role split into Head and Employee
export function isUser(userProfile: UserSession | null): boolean {
  return userProfile?.role === "Head" || userProfile?.role === "Employee"
}

// Deprecated: Manager role removed - use isHead instead
export function isManager(userProfile: UserSession | null): boolean {
  return isHead(userProfile)
}

// Permission helper functions
export function canCreateGoals(userProfile: UserSession | null): boolean {
  return isAdmin(userProfile) || isHead(userProfile)
}

export function canManageAllGoals(userProfile: UserSession | null): boolean {
  return isAdmin(userProfile)
}

export function canManageDepartmentGoals(userProfile: UserSession | null): boolean {
  return isAdmin(userProfile) || isHead(userProfile)
}

export function canOnlyViewAssignedTasks(userProfile: UserSession | null): boolean {
  return isEmployee(userProfile)
}

export async function requireAuth(): Promise<UserSession> {
  const userProfile = await getCurrentUserProfile()
  
  if (!userProfile) {
    throw new Error("Authentication required")
  }
  
  return userProfile
}

export async function signOut() {
  // This will be handled by the logout action
  return { error: null }
}

// Type adapter to convert UserSession to UserRecord compatible format
export function userSessionToRecord(session: UserSession): UserRecord {
  return {
    id: session.id,
    email: session.email,
    full_name: session.full_name,
    role: session.role,
    department: session.department || null,
    team: null, // Not available in session
    // Set default values for database-only fields not available in session
    password: "", // Not stored in session for security
    skills: [],
    is_active: true, // Assume active if they have a session
    created_at: "", // Not available in session
    updated_at: "" // Not available in session
  } as UserRecord
}
