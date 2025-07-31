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
    const requiredFields = ['email', 'full_name', 'password']
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
      password: row.password,
      role: row.role || 'Employee',
      department: row.department || null,
      team: row.team || null,
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

export async function importGoals(fileBuffer: ArrayBuffer, importForUserId?: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database connection not available' }
    }
    
    // Validate importForUserId if provided
    if (importForUserId) {
      const { data: targetUser, error: targetUserError } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', importForUserId)
        .single()
        
      if (targetUserError || !targetUser) {
        return { error: 'Selected user not found' }
      }
      
      if (targetUser.role !== 'Admin' && targetUser.role !== 'Head') {
        return { error: 'Selected user does not have permission to create goals. Only Head and Admin users can create goals.' }
      }
    }

    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (!data || data.length === 0) {
      return { error: 'No data found in file' }
    }

    // Validate required fields (status removed as we force it to Plan)
    const requiredFields = ['subject', 'description', 'department']
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

    // Prepare goals for import (force Plan status and 0% progress for fresh start)
    const goalsToImport = data.map((row: any) => ({
      subject: row.subject,
      description: row.description,
      status: 'Plan', // Always start with Plan status
      priority: row.priority || 'Medium',
      department: row.department,
      goal_type: row.goal_type || 'Team',
      teams: row.teams ? row.teams.split(',').map((t: string) => t.trim()) : [],
      start_date: row.start_date || null,
      target_date: row.target_date || null,
      target_metrics: row.target_metrics || null,
      success_criteria: row.success_criteria || null,
      progress_percentage: 0, // Always start with 0% progress
      owner_id: importForUserId || user.id, // Use selected user or fallback to current user
      workflow_history: [],
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
          teams: 'Inside Sales, Outside Sales, Sales Operations',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-2',
          name: 'Marketing',
          description: 'Marketing Department',
          teams: 'Digital Marketing, Content Marketing, SEO',
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

    // Get departments from database (using department_teams table)
    const { data: departmentTeams, error } = await supabaseAdmin
      .from('department_teams')
      .select('department, team, description, is_active, created_at')
      .order('department', { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return { error: 'Failed to fetch departments from database' }
    }

    // Get unique departments with their teams and data
    const departmentMap = new Map()
    departmentTeams?.forEach(dt => {
      if (!departmentMap.has(dt.department)) {
        departmentMap.set(dt.department, {
          id: dt.department, // Use department name as ID since no separate table
          name: dt.department,
          description: dt.description || '',
          teams: [],
          is_active: dt.is_active,
          created_at: dt.created_at,
          updated_at: dt.created_at // Use created_at as updated_at fallback
        })
      }
      // Add team to the department's teams array
      const dept = departmentMap.get(dt.department)
      if (dt.team && !dept.teams.includes(dt.team)) {
        dept.teams.push(dt.team)
      }
    })

    // Convert teams arrays to comma-separated strings for Excel export
    departmentMap.forEach(dept => {
      dept.teams = dept.teams.join(', ')
    })

    // Prepare data for export
    const exportData = Array.from(departmentMap.values())

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
      count: exportData?.length || 0
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

    // Check for existing departments in database by name (using department_teams table)
    const { data: existingDepartments } = await supabaseAdmin
      .from('department_teams')
      .select('department')
      .in('department', names)

    if (existingDepartments && existingDepartments.length > 0) {
      const existingNames = [...new Set(existingDepartments.map(d => d.department))]
      return { 
        error: `Departments already exist in database: ${existingNames.join(', ')}` 
      }
    }

    // Prepare department-team combinations for import
    const departmentTeamsToImport: any[] = []
    data.forEach((row: any) => {
      const department = row.name
      const description = row.description || null
      const isActive = row.is_active !== false
      const teams = row.teams ? row.teams.split(',').map((t: string) => t.trim()).filter(Boolean) : ['General']

      // Create a department_teams entry for each team
      teams.forEach((team: string) => {
        departmentTeamsToImport.push({
          department: department,
          team: team,
          description: description,
          is_active: isActive,
          created_at: new Date().toISOString()
        })
      })
    })

    // Insert department-team combinations into database
    const { error: insertError, data: insertedDepartmentTeams } = await supabaseAdmin
      .from('department_teams')
      .insert(departmentTeamsToImport)
      .select()

    if (insertError) {
      console.error("Insert departments error:", insertError)
      return { error: 'Failed to import departments into database' }
    }

    // Calculate number of unique departments imported
    const uniqueDepartments = [...new Set(departmentTeamsToImport.map(dt => dt.department))]

    revalidatePath('/admin')
    revalidatePath('/admin/system-config')

    return {
      success: true,
      data: insertedDepartmentTeams,
      count: uniqueDepartments.length,
      message: `Successfully imported ${uniqueDepartments.length} departments with ${departmentTeamsToImport.length} teams`
    }
  } catch (error) {
    console.error("Import departments error:", error)
    return { error: "Failed to import departments" }
  }
}

// Template Generation Functions
export async function generateUserTemplate() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    // Create template data with proper field headers and example row
    const templateData = [
      {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'defaultpassword123',
        role: 'Employee',
        department: 'Sales',
        team: 'Inside Sales',
        is_active: true
      }
    ]

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Auto-size columns
    const colWidths = Object.keys(templateData[0]).map(() => ({ wch: 20 }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "User Template")
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    return {
      success: true,
      data: Array.from(buffer),
      filename: `user-import-template.xlsx`
    }
  } catch (error) {
    console.error("Generate user template error:", error)
    return { error: "Failed to generate user template" }
  }
}

export async function generateGoalTemplate() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    // Create template data with proper field headers and example row
    const templateData = [
      {
        subject: 'Increase Q4 Sales Revenue',
        description: 'Focus on increasing sales revenue by 15% through new customer acquisition and upselling to existing clients',
        goal_type: 'Team',
        priority: 'High',
        department: 'Sales',
        teams: 'Inside Sales,Outside Sales',
        start_date: '2024-01-01',
        target_date: '2024-03-31',
        target_metrics: '15% revenue increase ($500K additional revenue)',
        success_criteria: 'Achieve $500K additional revenue through 20% new customer acquisition and 10% upselling'
      }
    ]

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Auto-size columns
    const colWidths = Object.keys(templateData[0]).map(() => ({ wch: 25 }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Goal Template")
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    return {
      success: true,
      data: Array.from(buffer),
      filename: `goal-import-template.xlsx`
    }
  } catch (error) {
    console.error("Generate goal template error:", error)
    return { error: "Failed to generate goal template" }
  }
}

export async function generateDepartmentTemplate() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    // Create template data with proper field headers and example row
    const templateData = [
      {
        name: 'Marketing',
        description: 'Marketing and advertising department',
        teams: 'Digital Marketing, Content Marketing, SEO',
        is_active: true
      }
    ]

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Auto-size columns
    const colWidths = Object.keys(templateData[0]).map(() => ({ wch: 20 }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Department Template")
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    return {
      success: true,
      data: Array.from(buffer),
      filename: `department-import-template.xlsx`
    }
  } catch (error) {
    console.error("Generate department template error:", error)
    return { error: "Failed to generate department template" }
  }
}