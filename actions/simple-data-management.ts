"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { getUsers } from "@/lib/goal-database"
import { supabaseAdmin } from "@/lib/supabase-client"
import * as XLSX from 'xlsx'

// User Export/Import Functions
export async function exportUsers() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    // Get all users from database
    const usersResult = await getUsers()
    if (usersResult.error) {
      return { error: 'Failed to fetch users' }
    }

    const users = usersResult.data || []
    
    // Prepare data for export
    const exportData = users.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    }))

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Users")
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    return {
      success: true,
      data: Array.from(buffer),
      filename: `users-export-${new Date().toISOString().split('T')[0]}.xlsx`,
      count: users.length
    }
  } catch (error) {
    console.error("Export users error:", error)
    return { error: "Failed to export users" }
  }
}

export async function importUsers(fileBuffer: ArrayBuffer) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database connection not available' }
    }

    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (!data || data.length === 0) {
      return { error: 'No data found in file' }
    }

    // Validate required fields
    const requiredFields = ['email', 'full_name', 'role']
    const firstRow = data[0] as any
    const missingFields = requiredFields.filter(field => !(field in firstRow))
    
    if (missingFields.length > 0) {
      return { error: `Missing required fields: ${missingFields.join(', ')}` }
    }

    // Check for duplicates by email
    const emails = data.map((row: any) => row.email).filter(Boolean)
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
    
    if (duplicateEmails.length > 0) {
      return { 
        error: `Duplicate emails found in file: ${[...new Set(duplicateEmails)].join(', ')}` 
      }
    }

    // Check for existing users in database
    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('email')
      .in('email', emails)

    if (existingUsers && existingUsers.length > 0) {
      const existingEmails = existingUsers.map(u => u.email)
      return { 
        error: `Users already exist in database: ${existingEmails.join(', ')}` 
      }
    }

    // Prepare users for import
    const usersToImport = data.map((row: any) => ({
      email: row.email,
      full_name: row.full_name,
      role: row.role || 'Employee',
      department: row.department || null,
      is_active: row.is_active !== false, // Default to true unless explicitly false
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Insert users into database
    const { error: insertError, data: insertedUsers } = await supabaseAdmin
      .from('users')
      .insert(usersToImport)
      .select()

    if (insertError) {
      console.error("Insert users error:", insertError)
      return { error: 'Failed to import users into database' }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/system-config')

    return {
      success: true,
      data: insertedUsers,
      count: insertedUsers?.length || 0,
      message: `Successfully imported ${insertedUsers?.length || 0} users`
    }
  } catch (error) {
    console.error("Import users error:", error)
    return { error: "Failed to import users" }
  }
}

// Goal Export/Import Functions (placeholder for now)
export async function exportGoals() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    // TODO: Implement goal export
    return { error: 'Goal export not yet implemented' }
  } catch (error) {
    console.error("Export goals error:", error)
    return { error: "Failed to export goals" }
  }
}

export async function importGoals(fileBuffer: ArrayBuffer) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    // TODO: Implement goal import
    return { error: 'Goal import not yet implemented' }
  } catch (error) {
    console.error("Import goals error:", error)
    return { error: "Failed to import goals" }
  }
}

// Department Export/Import Functions (placeholder for now)
export async function exportDepartments() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    // TODO: Implement department export
    return { error: 'Department export not yet implemented' }
  } catch (error) {
    console.error("Export departments error:", error)
    return { error: "Failed to export departments" }
  }
}

export async function importDepartments(fileBuffer: ArrayBuffer) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    // TODO: Implement department import
    return { error: 'Department import not yet implemented' }
  } catch (error) {
    console.error("Import departments error:", error)
    return { error: "Failed to import departments" }
  }
}