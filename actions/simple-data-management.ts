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

// Goal Export/Import Functions
export async function exportGoals() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      // Mock data for testing
      const mockGoals = [
        {
          id: 'mock-1',
          subject: 'Sample Goal',
          description: 'Sample description',
          status: 'Plan',
          priority: 'High',
          department: 'Sales',
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(mockGoals)
      const colWidths = Object.keys(mockGoals[0]).map(() => ({ wch: 20 }))
      ws['!cols'] = colWidths
      XLSX.utils.book_append_sheet(wb, ws, "Goals")
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      
      return {
        success: true,
        data: Array.from(buffer),
        filename: `goals-export-${new Date().toISOString().split('T')[0]}.xlsx`,
        count: mockGoals.length
      }
    }

    // Get all goals from database with basic relationships
    const { data: goals, error } = await supabaseAdmin
      .from('goals')
      .select(`
        id,
        subject,
        description,
        status,
        priority,
        department,
        goal_type,
        start_date,
        target_date,
        target_metrics,
        success_criteria,
        progress_percentage,
        owner_id,
        created_at,
        updated_at,
        owner:users!goals_owner_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return { error: 'Failed to fetch goals from database' }
    }

    // Prepare data for export
    const exportData = (goals || []).map(goal => ({
      id: goal.id,
      subject: goal.subject,
      description: goal.description,
      status: goal.status,
      priority: goal.priority,
      department: goal.department,
      goal_type: goal.goal_type,
      start_date: goal.start_date,
      target_date: goal.target_date,
      target_metrics: goal.target_metrics,
      success_criteria: goal.success_criteria,
      progress_percentage: goal.progress_percentage,
      owner_id: goal.owner_id,
      owner_name: (goal.owner as any)?.full_name || '',
      owner_email: (goal.owner as any)?.email || '',
      created_at: goal.created_at,
      updated_at: goal.updated_at
    }))

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Goals")
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    return {
      success: true,
      data: Array.from(buffer),
      filename: `goals-export-${new Date().toISOString().split('T')[0]}.xlsx`,
      count: goals?.length || 0
    }
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
    const requiredFields = ['subject', 'description', 'status', 'department']
    const firstRow = data[0] as any
    const missingFields = requiredFields.filter(field => !(field in firstRow))
    
    if (missingFields.length > 0) {
      return { error: `Missing required fields: ${missingFields.join(', ')}` }
    }

    // Check for duplicates by subject within the file
    const subjects = data.map((row: any) => row.subject).filter(Boolean)
    const duplicateSubjects = subjects.filter((subject, index) => subjects.indexOf(subject) !== index)
    
    if (duplicateSubjects.length > 0) {
      return { 
        error: `Duplicate goal subjects found in file: ${[...new Set(duplicateSubjects)].join(', ')}` 
      }
    }

    // Check for existing goals in database by subject
    const { data: existingGoals } = await supabaseAdmin
      .from('goals')
      .select('subject')
      .in('subject', subjects)

    if (existingGoals && existingGoals.length > 0) {
      const existingSubjects = existingGoals.map(g => g.subject)
      return { 
        error: `Goals already exist in database: ${existingSubjects.join(', ')}` 
      }
    }

    // Prepare goals for import
    const goalsToImport = data.map((row: any) => ({
      subject: row.subject,
      description: row.description,
      status: row.status || 'Plan',
      priority: row.priority || 'Medium',
      department: row.department,
      goal_type: row.goal_type || 'Team',
      start_date: row.start_date || null,
      target_date: row.target_date || null,
      target_metrics: row.target_metrics || null,
      success_criteria: row.success_criteria || null,
      progress_percentage: parseInt(row.progress_percentage) || 0,
      owner_id: row.owner_id || user.id, // Default to importing user
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Insert goals into database
    const { error: insertError, data: insertedGoals } = await supabaseAdmin
      .from('goals')
      .insert(goalsToImport)
      .select()

    if (insertError) {
      console.error("Insert goals error:", insertError)
      return { error: 'Failed to import goals into database' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/admin/system-config')

    return {
      success: true,
      data: insertedGoals,
      count: insertedGoals?.length || 0,
      message: `Successfully imported ${insertedGoals?.length || 0} goals`
    }
  } catch (error) {
    console.error("Import goals error:", error)
    return { error: "Failed to import goals" }
  }
}

// Department Export/Import Functions
export async function exportDepartments() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      // Mock data for testing
      const mockDepartments = [
        {
          id: 'mock-1',
          name: 'Sales',
          description: 'Sales Department',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-2',
          name: 'Marketing',
          description: 'Marketing Department',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(mockDepartments)
      const colWidths = Object.keys(mockDepartments[0]).map(() => ({ wch: 20 }))
      ws['!cols'] = colWidths
      XLSX.utils.book_append_sheet(wb, ws, "Departments")
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      
      return {
        success: true,
        data: Array.from(buffer),
        filename: `departments-export-${new Date().toISOString().split('T')[0]}.xlsx`,
        count: mockDepartments.length
      }
    }

    // Get departments from database
    const { data: departments, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return { error: 'Failed to fetch departments from database' }
    }

    // Prepare data for export
    const exportData = (departments || []).map(dept => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      is_active: dept.is_active,
      created_at: dept.created_at,
      updated_at: dept.updated_at
    }))

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Departments")
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    return {
      success: true,
      data: Array.from(buffer),
      filename: `departments-export-${new Date().toISOString().split('T')[0]}.xlsx`,
      count: departments?.length || 0
    }
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
    const requiredFields = ['name']
    const firstRow = data[0] as any
    const missingFields = requiredFields.filter(field => !(field in firstRow))
    
    if (missingFields.length > 0) {
      return { error: `Missing required fields: ${missingFields.join(', ')}` }
    }

    // Check for duplicates by name within the file
    const names = data.map((row: any) => row.name).filter(Boolean)
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index)
    
    if (duplicateNames.length > 0) {
      return { 
        error: `Duplicate department names found in file: ${[...new Set(duplicateNames)].join(', ')}` 
      }
    }

    // Check for existing departments in database by name
    const { data: existingDepartments } = await supabaseAdmin
      .from('departments')
      .select('name')
      .in('name', names)

    if (existingDepartments && existingDepartments.length > 0) {
      const existingNames = existingDepartments.map(d => d.name)
      return { 
        error: `Departments already exist in database: ${existingNames.join(', ')}` 
      }
    }

    // Prepare departments for import
    const departmentsToImport = data.map((row: any) => ({
      name: row.name,
      description: row.description || null,
      is_active: row.is_active !== false, // Default to true unless explicitly false
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Insert departments into database
    const { error: insertError, data: insertedDepartments } = await supabaseAdmin
      .from('departments')
      .insert(departmentsToImport)
      .select()

    if (insertError) {
      console.error("Insert departments error:", insertError)
      return { error: 'Failed to import departments into database' }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/system-config')

    return {
      success: true,
      data: insertedDepartments,
      count: insertedDepartments?.length || 0,
      message: `Successfully imported ${insertedDepartments?.length || 0} departments`
    }
  } catch (error) {
    console.error("Import departments error:", error)
    return { error: "Failed to import departments" }
  }
}