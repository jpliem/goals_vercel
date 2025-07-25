"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function getUserDepartmentPermissions(userId: string) {
  try {
    const user = await requireAuth()
    
    // Verify user is admin
    if (user.role !== 'Admin') {
      return { error: 'Unauthorized - Admin access required' }
    }

    // Get department permissions for the user
    const { data, error } = await supabaseAdmin
      .from('department_permissions')
      .select('department')
      .eq('user_id', userId)
      .order('department')

    if (error) {
      console.error('Error fetching department permissions:', error)
      return { error: 'Failed to fetch department permissions' }
    }

    return { 
      departments: data?.map(d => d.department) || []
    }
  } catch (error) {
    console.error('Error in getUserDepartmentPermissions:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateUserDepartmentPermissions(userId: string, departments: string[]) {
  try {
    const user = await requireAuth()
    
    // Verify user is admin
    if (user.role !== 'Admin') {
      return { error: 'Unauthorized - Admin access required' }
    }

    // Start a transaction by deleting existing permissions and inserting new ones
    // First, delete all existing permissions for this user
    const { error: deleteError } = await supabaseAdmin
      .from('department_permissions')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting department permissions:', deleteError)
      return { error: 'Failed to update department permissions' }
    }

    // Then insert new permissions if any departments are selected
    if (departments.length > 0) {
      const permissionsToInsert = departments.map(dept => ({
        user_id: userId,
        department: dept,
        created_by: user.id
      }))

      const { error: insertError } = await supabaseAdmin
        .from('department_permissions')
        .insert(permissionsToInsert)

      if (insertError) {
        console.error('Error inserting department permissions:', insertError)
        return { error: 'Failed to update department permissions' }
      }
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/admin/users')

    return { success: true }
  } catch (error) {
    console.error('Error in updateUserDepartmentPermissions:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function getAllDepartments() {
  try {
    const user = await requireAuth()

    // Get all unique departments from users table
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('department')
      .not('department', 'is', null)
      .order('department')

    if (error) {
      console.error('Error fetching departments:', error)
      return { error: 'Failed to fetch departments' }
    }

    // Extract unique departments
    const uniqueDepartments = [...new Set(data?.map(u => u.department).filter(Boolean))]

    return { 
      departments: uniqueDepartments.sort()
    }
  } catch (error) {
    console.error('Error in getAllDepartments:', error)
    return { error: 'An unexpected error occurred' }
  }
}

// Helper function to check if a user has access to view a department's requests
export async function userHasDepartmentAccess(userId: string, department: string): Promise<boolean> {
  try {
    // Check if user has explicit permission for this department
    const { data } = await supabaseAdmin
      .from('department_permissions')
      .select('id')
      .eq('user_id', userId)
      .eq('department', department)
      .single()

    return !!data
  } catch (error) {
    return false
  }
}

// Get all users with department permissions (for admin overview)
export async function getUsersWithDepartmentPermissions() {
  try {
    const user = await requireAuth()
    
    // Verify user is admin
    if (user.role !== 'Admin') {
      return { error: 'Unauthorized - Admin access required' }
    }

    // Use the view for easier querying
    const { data, error } = await supabaseAdmin
      .from('user_department_access')
      .select('*')
      .not('accessible_departments', 'eq', '{}')
      .order('full_name')

    if (error) {
      console.error('Error fetching users with department permissions:', error)
      return { error: 'Failed to fetch users with department permissions' }
    }

    return { users: data || [] }
  } catch (error) {
    console.error('Error in getUsersWithDepartmentPermissions:', error)
    return { error: 'An unexpected error occurred' }
  }
}
