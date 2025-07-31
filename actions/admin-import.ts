'use server'

import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-client'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

interface ImportOptions {
  skipDuplicateCheck: boolean
  autoAssignOwner: boolean
  setDefaultDates: boolean
  validateAssignees: boolean
  createMissingDepartments: boolean
  createMissingTeams: boolean
  notifyAssignees: boolean
  generateTasks: boolean
}

interface ImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  warnings: string[]
  errors: string[]
  sampleData: any[]
}

interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// Helper function to parse CSV content
function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
    if (values.length === headers.length) {
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      rows.push(row)
    }
  }
  
  return rows
}

// Helper function to parse file (CSV or Excel)
async function parseFile(file: File): Promise<any[]> {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.xlsx')) {
    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(worksheet)
  } else {
    // Parse CSV file
    const content = await file.text()
    return parseCSV(content)
  }
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Helper function to validate date format
function isValidDate(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

// Helper function to validate and process goal data
async function validateGoalData(
  row: any, 
  index: number, 
  options: ImportOptions,
  supabase: any,
  existingUsers: Map<string, any>,
  existingDepartments: Set<string>,
  existingTeams: Map<string, string[]>
): Promise<{ valid: boolean; warnings: string[]; errors: string[]; processedData?: any }> {
  const warnings: string[] = []
  const errors: string[] = []
  const rowNum = index + 2 // Account for header row and 0-based index

  // Required fields validation
  if (!row.subject?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field 'subject'`)
  }
  if (!row.description?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field 'description'`)
  }
  if (!row.department?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field 'department'`)
  }
  if (!row.owner_email?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field 'owner_email'`)
  }

  // Email validation
  if (row.owner_email && !isValidEmail(row.owner_email)) {
    errors.push(`Row ${rowNum}: Invalid owner email format`)
  }

  // Check if owner exists
  if (options.validateAssignees && row.owner_email && !existingUsers.has(row.owner_email)) {
    if (options.autoAssignOwner) {
      warnings.push(`Row ${rowNum}: Owner email '${row.owner_email}' not found, will use current user`)
    } else {
      errors.push(`Row ${rowNum}: Owner email '${row.owner_email}' not found`)
    }
  }

  // Validate assignee emails if provided
  if (row.assignee_emails) {
    const assigneeEmails = row.assignee_emails.split(',').map((e: string) => e.trim())
    for (const email of assigneeEmails) {
      if (!isValidEmail(email)) {
        errors.push(`Row ${rowNum}: Invalid assignee email format: ${email}`)
      } else if (options.validateAssignees && !existingUsers.has(email)) {
        warnings.push(`Row ${rowNum}: Assignee email '${email}' not found`)
      }
    }
  }

  // Department validation
  if (row.department && !existingDepartments.has(row.department)) {
    if (options.createMissingDepartments) {
      warnings.push(`Row ${rowNum}: Department '${row.department}' will be created`)
    } else {
      errors.push(`Row ${rowNum}: Department '${row.department}' does not exist`)
    }
  }

  // Teams validation
  if (row.teams) {
    const teams = row.teams.split(',').map((t: string) => t.trim())
    const departmentTeams = existingTeams.get(row.department) || []
    
    for (const team of teams) {
      if (!departmentTeams.includes(team)) {
        if (options.createMissingTeams) {
          warnings.push(`Row ${rowNum}: Team '${team}' will be created in department '${row.department}'`)
        } else {
          errors.push(`Row ${rowNum}: Team '${team}' does not exist in department '${row.department}'`)
        }
      }
    }
  }

  // Date validation
  if (row.start_date && !isValidDate(row.start_date)) {
    errors.push(`Row ${rowNum}: Invalid start_date format. Use YYYY-MM-DD`)
  }
  if (row.target_date && !isValidDate(row.target_date)) {
    errors.push(`Row ${rowNum}: Invalid target_date format. Use YYYY-MM-DD`)
  }

  // Priority validation
  if (row.priority && !['Low', 'Medium', 'High', 'Critical'].includes(row.priority)) {
    warnings.push(`Row ${rowNum}: Invalid priority '${row.priority}', defaulting to 'Medium'`)
    row.priority = 'Medium'
  }

  // Goal type validation
  if (row.goal_type && !['Personal', 'Team', 'Department', 'Company'].includes(row.goal_type)) {
    warnings.push(`Row ${rowNum}: Invalid goal_type '${row.goal_type}', defaulting to 'Team'`)
    row.goal_type = 'Team'
  }

  // Set defaults if missing and option is enabled
  if (options.setDefaultDates) {
    if (!row.start_date) {
      row.start_date = new Date().toISOString().split('T')[0]
      warnings.push(`Row ${rowNum}: Setting default start_date to today`)
    }
    if (!row.target_date) {
      const defaultTarget = new Date()
      defaultTarget.setMonth(defaultTarget.getMonth() + 3) // 3 months from now
      row.target_date = defaultTarget.toISOString().split('T')[0]
      warnings.push(`Row ${rowNum}: Setting default target_date to 3 months from now`)
    }
  }

  const valid = errors.length === 0
  return { 
    valid, 
    warnings, 
    errors, 
    processedData: valid ? row : undefined 
  }
}

export async function importGoals(formData: FormData) {
  try {
    const user = await requireAuth()
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database connection not available' }
    }
    
    const supabase = supabaseAdmin
    const file = formData.get('file') as File
    const mode = formData.get('mode') as string
    const validationLevel = formData.get('validationLevel') as string
    const options: ImportOptions = JSON.parse(formData.get('options') as string)
    const previewOnly = formData.get('previewOnly') === 'true'
    const importForUserId = formData.get('importForUserId') as string | null

    if (!file) {
      return { error: 'No file provided' }
    }

    // Parse file content (CSV or Excel)
    const rows = await parseFile(file)

    if (rows.length === 0) {
      return { error: 'No valid data found in file' }
    }

    // Get existing data for validation
    const [usersResult, departmentsResult, teamsResult] = await Promise.all([
      supabase.from('users').select('id, email, full_name, department').eq('is_active', true),
      supabase.from('goals').select('department').then(result => 
        result.data ? [...new Set(result.data.map(g => g.department))] : []
      ),
      supabase.from('department_teams').select('department, team').eq('is_active', true)
    ])

    if (usersResult.error) {
      return { error: 'Failed to fetch users data' }
    }

    const existingUsers = new Map(
      usersResult.data.map((u: any) => [u.email as string, u])
    )
    
    // Validate importForUserId if provided
    if (importForUserId) {
      const { data: targetUser, error: targetUserError } = await supabase
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
    
    const existingDepartments = new Set(departmentsResult as string[])
    
    const existingTeams = new Map<string, string[]>()
    if (teamsResult.data) {
      teamsResult.data.forEach((dt: any) => {
        if (!existingTeams.has(dt.department)) {
          existingTeams.set(dt.department, [])
        }
        existingTeams.get(dt.department)!.push(dt.team)
      })
    }

    // Validate all rows
    const validationResults = await Promise.all(
      rows.map((row, index) => 
        validateGoalData(row, index, options, supabase, existingUsers, existingDepartments, existingTeams)
      )
    )

    const validRows = validationResults.filter(r => r.valid)
    const invalidRows = validationResults.filter(r => !r.valid)
    const allWarnings = validationResults.flatMap(r => r.warnings)
    const allErrors = validationResults.flatMap(r => r.errors)

    // If preview only, return preview data
    if (previewOnly) {
      const preview: ImportPreview = {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        warnings: allWarnings,
        errors: allErrors,
        sampleData: validRows.slice(0, 5).map(r => r.processedData).filter(Boolean)
      }
      return { data: preview }
    }

    // If strict validation and there are errors, abort
    if (validationLevel === 'strict' && allErrors.length > 0) {
      return { error: `Validation failed with ${allErrors.length} errors. Fix all errors before importing.` }
    }

    // Process valid rows only
    const validData = validRows.map(r => r.processedData).filter(Boolean)
    
    if (validData.length === 0) {
      return { error: 'No valid rows to import' }
    }

    let created = 0
    let updated = 0
    let skipped = 0
    const importErrors: string[] = []

    // Process each valid row
    for (const [index, row] of validData.entries()) {
      try {
        // Get owner ID
        let ownerId: string
        if (importForUserId) {
          // Use the selected user ID for all imports
          ownerId = importForUserId
        } else {
          // Use the owner from CSV or fallback to current user
          const ownerUser = existingUsers.get(row.owner_email)
          ownerId = ownerUser?.id || user.id
        }

        // Prepare goal data
        const goalData = {
          subject: row.subject,
          description: row.description,
          priority: row.priority || 'Medium',
          department: row.department,
          teams: row.teams ? row.teams.split(',').map((t: string) => t.trim()) : [],
          goal_type: row.goal_type || 'Team',
          owner_id: ownerId,
          start_date: row.start_date ? new Date(row.start_date).toISOString() : null,
          target_date: row.target_date ? new Date(row.target_date).toISOString() : null,
          target_metrics: row.target_metrics || null,
          success_criteria: row.success_criteria || null,
          status: 'Plan'
        }

        // Insert goal
        const { data: goalResult, error: goalError } = await supabase
          .from('goals')
          .insert(goalData)
          .select()
          .single()

        if (goalError) {
          importErrors.push(`Row ${index + 2}: Failed to create goal - ${goalError.message}`)
          skipped++
          continue
        }

        created++

        // Add assignees if provided
        if (row.assignee_emails && goalResult) {
          const assigneeEmails = row.assignee_emails.split(',').map((e: string) => e.trim())
          const assigneePromises = assigneeEmails.map(async (email: string) => {
            const assigneeUser = existingUsers.get(email)
            if (assigneeUser) {
              return supabase.from('goal_assignees').insert({
                goal_id: goalResult.id,
                user_id: assigneeUser.id,
                assigned_by: user.id
              })
            }
          })

          await Promise.all(assigneePromises.filter(Boolean))
        }

        // Generate default PDCA tasks if option is enabled
        if (options.generateTasks && goalResult) {
          const defaultTasks = [
            { title: 'Plan Phase Task', description: 'Define objectives and approach', pdca_phase: 'Plan' },
            { title: 'Do Phase Task', description: 'Execute the planned activities', pdca_phase: 'Do' },
            { title: 'Check Phase Task', description: 'Review and evaluate results', pdca_phase: 'Check' },
            { title: 'Act Phase Task', description: 'Implement improvements', pdca_phase: 'Act' }
          ]

          const taskPromises = defaultTasks.map(task => 
            supabase.from('goal_tasks').insert({
              goal_id: goalResult.id,
              title: task.title,
              description: task.description,
              pdca_phase: task.pdca_phase,
              department: row.department,
              assigned_by: user.id
            })
          )

          await Promise.all(taskPromises)
        }

      } catch (error) {
        console.error('Import error for row:', error)
        importErrors.push(`Row ${index + 2}: Unexpected error during import`)
        skipped++
      }
    }

    // Create missing departments and teams if options are enabled
    if (options.createMissingDepartments || options.createMissingTeams) {
      const newDepartments = new Set<string>()
      const newTeams: Array<{ department: string; team: string }> = []

      for (const row of validData) {
        if (options.createMissingDepartments && !existingDepartments.has(row.department)) {
          newDepartments.add(row.department)
        }

        if (options.createMissingTeams && row.teams) {
          const teams = row.teams.split(',').map((t: string) => t.trim())
          const departmentTeams = existingTeams.get(row.department) || []
          
          teams.forEach((team: string) => {
            if (!departmentTeams.includes(team)) {
              newTeams.push({ department: row.department, team })
            }
          })
        }
      }

      if (newTeams.length > 0) {
        await supabase.from('department_teams').insert(newTeams)
      }
    }

    const result: ImportResult = {
      created,
      updated,
      skipped,
      errors: importErrors
    }

    revalidatePath('/admin/system-config')
    revalidatePath('/goals')

    return { data: result }

  } catch (error) {
    console.error('Import goals error:', error)
    return { error: 'Failed to import goals' }
  }
}

// Department Structure Import
interface DepartmentImportOptions {
  createMissingParents: boolean
  allowDuplicateTeamNames: boolean
  setDefaultDescriptions: boolean
  activateByDefault: boolean
  preserveHierarchy: boolean
  updateDescriptions: boolean
  syncActiveStatus: boolean
}

interface DepartmentImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  warnings: string[]
  errors: string[]
  sampleData: any[]
  departmentCount: number
  teamCount: number
}

interface DepartmentImportResult {
  departmentsCreated: number
  teamsCreated: number
  departmentsUpdated: number
  teamsUpdated: number
  skipped: number
  errors: string[]
}

// Helper function to validate department structure data
function validateDepartmentData(
  row: any,
  index: number,
  options: DepartmentImportOptions,
  existingDepartments: Set<string>,
  existingTeams: Map<string, string[]>
): { valid: boolean; warnings: string[]; errors: string[]; processedData?: any } {
  const warnings: string[] = []
  const errors: string[] = []
  const rowNum = index + 2 // Account for header row and 0-based index

  // Required fields validation
  if (!row.department?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field 'department'`)
  }

  // Validate boolean values
  if (row.is_active !== undefined && row.is_active !== '') {
    const activeValue = String(row.is_active).toLowerCase()
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(activeValue)) {
      warnings.push(`Row ${rowNum}: Invalid is_active value '${row.is_active}', defaulting to true`)
      row.is_active = 'true'
    } else {
      // Normalize boolean values
      row.is_active = ['true', '1', 'yes'].includes(activeValue) ? 'true' : 'false'
    }
  } else {
    row.is_active = options.activateByDefault ? 'true' : 'false'
  }

  // Check for duplicate team names across departments
  if (row.team && !options.allowDuplicateTeamNames) {
    for (const [dept, teams] of existingTeams.entries()) {
      if (dept !== row.department && teams.includes(row.team)) {
        warnings.push(`Row ${rowNum}: Team '${row.team}' already exists in department '${dept}'`)
      }
    }
  }

  // Set default description if missing and option is enabled
  if (options.setDefaultDescriptions && !row.description?.trim()) {
    if (row.team) {
      row.description = `${row.team} team in ${row.department} department`
      warnings.push(`Row ${rowNum}: Setting default description for team '${row.team}'`)
    } else {
      row.description = `${row.department} department`
      warnings.push(`Row ${rowNum}: Setting default description for department '${row.department}'`)
    }
  }

  // Check for existing items and warn about updates
  if (existingDepartments.has(row.department)) {
    if (options.updateDescriptions) {
      warnings.push(`Row ${rowNum}: Department '${row.department}' already exists, will update if different`)
    } else {
      warnings.push(`Row ${rowNum}: Department '${row.department}' already exists, will skip updates`)
    }
  }

  if (row.team) {
    const departmentTeams = existingTeams.get(row.department) || []
    if (departmentTeams.includes(row.team)) {
      if (options.updateDescriptions) {
        warnings.push(`Row ${rowNum}: Team '${row.team}' already exists, will update if different`)
      } else {
        warnings.push(`Row ${rowNum}: Team '${row.team}' already exists, will skip updates`)
      }
    }
  }

  const valid = errors.length === 0
  return { 
    valid, 
    warnings, 
    errors, 
    processedData: valid ? row : undefined 
  }
}

export async function importDepartmentStructure(formData: FormData) {
  try {
    const user = await requireAuth()
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database connection not available' }
    }
    
    const supabase = supabaseAdmin
    const file = formData.get('file') as File
    const mode = formData.get('mode') as string
    const validationLevel = formData.get('validationLevel') as string
    const options: DepartmentImportOptions = JSON.parse(formData.get('options') as string)
    const previewOnly = formData.get('previewOnly') === 'true'

    if (!file) {
      return { error: 'No file provided' }
    }

    // Read file content
    const content = await file.text()
    const rows = parseCSV(content)

    if (rows.length === 0) {
      return { error: 'No valid data found in CSV file' }
    }

    // Get existing department and team data
    const departmentTeamsResult = await supabase
      .from('department_teams')
      .select('department, team, description, is_active')

    if (departmentTeamsResult.error) {
      return { error: 'Failed to fetch existing department data' }
    }

    const existingDepartments = new Set<string>()
    const existingTeams = new Map<string, string[]>()

    if (departmentTeamsResult.data) {
      departmentTeamsResult.data.forEach((dt: any) => {
        existingDepartments.add(dt.department)
        if (!existingTeams.has(dt.department)) {
          existingTeams.set(dt.department, [])
        }
        if (dt.team) {
          existingTeams.get(dt.department)!.push(dt.team)
        }
      })
    }

    // Validate all rows
    const validationResults = rows.map((row, index) => 
      validateDepartmentData(row, index, options, existingDepartments, existingTeams)
    )

    const validRows = validationResults.filter(r => r.valid)
    const invalidRows = validationResults.filter(r => !r.valid)
    const allWarnings = validationResults.flatMap(r => r.warnings)
    const allErrors = validationResults.flatMap(r => r.errors)

    // Count unique departments and teams
    const validData = validRows.map(r => r.processedData).filter(Boolean)
    const departmentSet = new Set(validData.map(row => row.department))
    const teamSet = new Set(validData.filter(row => row.team).map(row => `${row.department}:${row.team}`))

    // If preview only, return preview data
    if (previewOnly) {
      const preview: DepartmentImportPreview = {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        warnings: allWarnings,
        errors: allErrors,
        sampleData: validData.slice(0, 5),
        departmentCount: departmentSet.size,
        teamCount: teamSet.size
      }
      return { data: preview }
    }

    // If strict validation and there are errors, abort
    if (validationLevel === 'strict' && allErrors.length > 0) {
      return { error: `Validation failed with ${allErrors.length} errors. Fix all errors before importing.` }
    }

    if (validData.length === 0) {
      return { error: 'No valid rows to import' }
    }

    let departmentsCreated = 0
    let teamsCreated = 0
    let departmentsUpdated = 0
    let teamsUpdated = 0
    let skipped = 0
    const importErrors: string[] = []

    // Group data by department for efficient processing
    const departmentData = new Map<string, { description?: string; is_active: boolean; teams: any[] }>()
    
    for (const row of validData) {
      if (!departmentData.has(row.department)) {
        departmentData.set(row.department, {
          description: row.team ? undefined : row.description,
          is_active: row.is_active === 'true',
          teams: []
        })
      }
      
      const deptData = departmentData.get(row.department)!
      
      if (row.team) {
        deptData.teams.push({
          team: row.team,
          description: row.description,
          is_active: row.is_active === 'true'
        })
      } else if (row.description && !deptData.description) {
        deptData.description = row.description
      }
    }

    // Process each department
    for (const [departmentName, deptInfo] of departmentData.entries()) {
      try {
        // Handle department
        const departmentExists = existingDepartments.has(departmentName)
        
        if (!departmentExists || mode !== 'create_only') {
          // Create or update department entry (without team)
          const departmentRow = {
            department: departmentName,
            team: null,
            description: deptInfo.description || null,
            is_active: deptInfo.is_active
          }

          if (departmentExists && mode === 'update_existing') {
            // Update existing department
            if (options.updateDescriptions || options.syncActiveStatus) {
              const updateData: any = {}
              if (options.updateDescriptions && deptInfo.description) {
                updateData.description = deptInfo.description
              }
              if (options.syncActiveStatus) {
                updateData.is_active = deptInfo.is_active
              }

              if (Object.keys(updateData).length > 0) {
                await supabase
                  .from('department_teams')
                  .update(updateData)
                  .eq('department', departmentName)
                  .is('team', null)
                
                departmentsUpdated++
              }
            }
          } else if (!departmentExists) {
            // Create new department
            const { error } = await supabase
              .from('department_teams')
              .insert(departmentRow)

            if (error) {
              importErrors.push(`Failed to create department '${departmentName}': ${error.message}`)
              skipped++
              continue
            }

            departmentsCreated++
          }
        }

        // Handle teams
        for (const teamInfo of deptInfo.teams) {
          const departmentTeams = existingTeams.get(departmentName) || []
          const teamExists = departmentTeams.includes(teamInfo.team)

          if (!teamExists || mode !== 'create_only') {
            const teamRow = {
              department: departmentName,
              team: teamInfo.team,
              description: teamInfo.description || null,
              is_active: teamInfo.is_active
            }

            if (teamExists && mode === 'update_existing') {
              // Update existing team
              if (options.updateDescriptions || options.syncActiveStatus) {
                const updateData: any = {}
                if (options.updateDescriptions && teamInfo.description) {
                  updateData.description = teamInfo.description
                }
                if (options.syncActiveStatus) {
                  updateData.is_active = teamInfo.is_active
                }

                if (Object.keys(updateData).length > 0) {
                  await supabase
                    .from('department_teams')
                    .update(updateData)
                    .eq('department', departmentName)
                    .eq('team', teamInfo.team)
                  
                  teamsUpdated++
                }
              }
            } else if (!teamExists) {
              // Create new team
              const { error } = await supabase
                .from('department_teams')
                .insert(teamRow)

              if (error) {
                importErrors.push(`Failed to create team '${teamInfo.team}' in department '${departmentName}': ${error.message}`)
                skipped++
                continue
              }

              teamsCreated++
            }
          }
        }

      } catch (error) {
        console.error('Import error for department:', departmentName, error)
        importErrors.push(`Unexpected error processing department '${departmentName}'`)
        skipped++
      }
    }

    const result: DepartmentImportResult = {
      departmentsCreated,
      teamsCreated,
      departmentsUpdated,
      teamsUpdated,
      skipped,
      errors: importErrors
    }

    revalidatePath('/admin/system-config')

    return { data: result }

  } catch (error) {
    console.error('Import department structure error:', error)
    return { error: 'Failed to import department structure' }
  }
}

// User Import
interface UserImportOptions {
  validateEmailFormat: boolean
  requireStrongPasswords: boolean
  setDefaultPasswords: boolean
  activateByDefault: boolean
  createMissingDepartments: boolean
  createMissingTeams: boolean
  assignDefaultSkills: boolean
  notifyNewUsers: boolean
  updateExistingProfiles: boolean
  preserveExistingPasswords: boolean
}

interface UserImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  warnings: string[]
  errors: string[]
  sampleData: any[]
  roleDistribution: { [key: string]: number }
  departmentDistribution: { [key: string]: number }
}

interface UserImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// Helper function to validate user data
function validateUserData(
  row: any,
  index: number,
  options: UserImportOptions,
  existingUsers: Set<string>,
  existingDepartments: Set<string>,
  existingTeams: Map<string, string[]>
): { valid: boolean; warnings: string[]; errors: string[]; processedData?: any } {
  const warnings: string[] = []
  const errors: string[] = []
  const rowNum = index + 2 // Account for header row and 0-based index

  // Required fields validation
  if (!row.full_name?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field 'full_name'`)
  }
  if (!row.email?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field 'email'`)
  }
  if (!row.role?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field 'role'`)
  }

  // Email validation
  if (row.email && options.validateEmailFormat) {
    if (!isValidEmail(row.email)) {
      errors.push(`Row ${rowNum}: Invalid email format`)
    }
  }

  // Check for duplicate emails
  if (row.email && existingUsers.has(row.email.toLowerCase())) {
    warnings.push(`Row ${rowNum}: User with email '${row.email}' already exists`)
  }

  // Role validation
  if (row.role && !['Employee', 'Head', 'Admin'].includes(row.role)) {
    errors.push(`Row ${rowNum}: Invalid role '${row.role}'. Must be Employee, Head, or Admin`)
  }

  // Password validation
  if (row.password) {
    if (options.requireStrongPasswords) {
      if (row.password.length < 8) {
        errors.push(`Row ${rowNum}: Password must be at least 8 characters long`)
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(row.password)) {
        warnings.push(`Row ${rowNum}: Password should contain uppercase, lowercase, and numbers`)
      }
    }
  } else if (options.setDefaultPasswords) {
    row.password = 'temp123'
    warnings.push(`Row ${rowNum}: Setting default password 'temp123'`)
  } else {
    errors.push(`Row ${rowNum}: Password is required`)
  }

  // Department validation
  if (row.department) {
    if (!existingDepartments.has(row.department)) {
      if (options.createMissingDepartments) {
        warnings.push(`Row ${rowNum}: Department '${row.department}' will be created`)
      } else {
        errors.push(`Row ${rowNum}: Department '${row.department}' does not exist`)
      }
    }

    // Team validation
    if (row.team) {
      const departmentTeams = existingTeams.get(row.department) || []
      if (!departmentTeams.includes(row.team)) {
        if (options.createMissingTeams) {
          warnings.push(`Row ${rowNum}: Team '${row.team}' will be created in department '${row.department}'`)
        } else {
          errors.push(`Row ${rowNum}: Team '${row.team}' does not exist in department '${row.department}'`)
        }
      }
    }
  }

  // Boolean field validation
  if (row.is_active !== undefined && row.is_active !== '') {
    const activeValue = String(row.is_active).toLowerCase()
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(activeValue)) {
      warnings.push(`Row ${rowNum}: Invalid is_active value '${row.is_active}', defaulting to true`)
      row.is_active = 'true'
    } else {
      row.is_active = ['true', '1', 'yes'].includes(activeValue) ? 'true' : 'false'
    }
  } else {
    row.is_active = options.activateByDefault ? 'true' : 'false'
  }

  // Skills processing
  if (row.skills) {
    try {
      row.skills = row.skills.split(',').map((skill: string) => skill.trim()).filter(Boolean)
    } catch (error) {
      warnings.push(`Row ${rowNum}: Invalid skills format, expected comma-separated values`)
      row.skills = []
    }
  } else if (options.assignDefaultSkills) {
    // Assign default skills based on role
    const defaultSkills: { [key: string]: string[] } = {
      'Admin': ['Administration', 'Project Management'],
      'Head': ['Leadership', 'Team Management'],
      'Employee': ['Task Execution', 'Communication']
    }
    row.skills = defaultSkills[row.role] || []
    warnings.push(`Row ${rowNum}: Assigned default skills for role '${row.role}'`)
  } else {
    row.skills = []
  }

  const valid = errors.length === 0
  return { 
    valid, 
    warnings, 
    errors, 
    processedData: valid ? row : undefined 
  }
}

export async function importUsers(formData: FormData) {
  try {
    const user = await requireAuth()
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database connection not available' }
    }
    
    const supabase = supabaseAdmin
    const file = formData.get('file') as File
    const mode = formData.get('mode') as string
    const validationLevel = formData.get('validationLevel') as string
    const options: UserImportOptions = JSON.parse(formData.get('options') as string)
    const previewOnly = formData.get('previewOnly') === 'true'

    if (!file) {
      return { error: 'No file provided' }
    }

    // Read file content
    const content = await file.text()
    const rows = parseCSV(content)

    if (rows.length === 0) {
      return { error: 'No valid data found in CSV file' }
    }

    // Get existing data for validation
    const [usersResult, departmentTeamsResult] = await Promise.all([
      supabase.from('users').select('email').eq('is_active', true),
      supabase.from('department_teams').select('department, team').eq('is_active', true)
    ])

    if (usersResult.error) {
      return { error: 'Failed to fetch existing users' }
    }

    const existingUsers = new Set(
      usersResult.data.map((u: any) => u.email.toLowerCase())
    )

    const existingDepartments = new Set<string>()
    const existingTeams = new Map<string, string[]>()

    if (departmentTeamsResult.data) {
      departmentTeamsResult.data.forEach((dt: any) => {
        existingDepartments.add(dt.department)
        if (!existingTeams.has(dt.department)) {
          existingTeams.set(dt.department, [])
        }
        if (dt.team) {
          existingTeams.get(dt.department)!.push(dt.team)
        }
      })
    }

    // Validate all rows
    const validationResults = rows.map((row, index) => 
      validateUserData(row, index, options, existingUsers, existingDepartments, existingTeams)
    )

    const validRows = validationResults.filter(r => r.valid)
    const invalidRows = validationResults.filter(r => !r.valid)
    const allWarnings = validationResults.flatMap(r => r.warnings)
    const allErrors = validationResults.flatMap(r => r.errors)

    // Calculate distributions
    const validData = validRows.map(r => r.processedData).filter(Boolean)
    const roleDistribution: { [key: string]: number } = {}
    const departmentDistribution: { [key: string]: number } = {}

    validData.forEach(row => {
      roleDistribution[row.role] = (roleDistribution[row.role] || 0) + 1
      if (row.department) {
        departmentDistribution[row.department] = (departmentDistribution[row.department] || 0) + 1
      }
    })

    // If preview only, return preview data
    if (previewOnly) {
      const preview: UserImportPreview = {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        warnings: allWarnings,
        errors: allErrors,
        sampleData: validData.slice(0, 5),
        roleDistribution,
        departmentDistribution
      }
      return { data: preview }
    }

    // If strict validation and there are errors, abort
    if (validationLevel === 'strict' && allErrors.length > 0) {
      return { error: `Validation failed with ${allErrors.length} errors. Fix all errors before importing.` }
    }

    if (validData.length === 0) {
      return { error: 'No valid rows to import' }
    }

    let created = 0
    let updated = 0
    let skipped = 0
    const importErrors: string[] = []

    // Create missing departments and teams first
    if (options.createMissingDepartments || options.createMissingTeams) {
      const newDepartments = new Set<string>()
      const newTeams: Array<{ department: string; team: string }> = []

      for (const row of validData) {
        if (options.createMissingDepartments && row.department && !existingDepartments.has(row.department)) {
          newDepartments.add(row.department)
        }

        if (options.createMissingTeams && row.team && row.department) {
          const departmentTeams = existingTeams.get(row.department) || []
          if (!departmentTeams.includes(row.team)) {
            newTeams.push({ department: row.department, team: row.team })
          }
        }
      }

      // Insert new departments (as department-only entries)
      for (const dept of newDepartments) {
        await supabase.from('department_teams').insert({
          department: dept,
          team: null,
          description: `${dept} department`,
          is_active: true
        })
      }

      // Insert new teams
      if (newTeams.length > 0) {
        await supabase.from('department_teams').insert(
          newTeams.map(nt => ({
            department: nt.department,
            team: nt.team,
            description: `${nt.team} team in ${nt.department} department`,
            is_active: true
          }))
        )
      }
    }

    // Process each user
    for (const [index, row] of validData.entries()) {
      try {
        const userExists = existingUsers.has(row.email.toLowerCase())

        if (userExists && mode === 'create_only') {
          skipped++
          continue
        }

        const userData = {
          full_name: row.full_name,
          email: row.email.toLowerCase(),
          password: (userExists && options.preserveExistingPasswords) ? undefined : row.password,
          role: row.role,
          department: row.department || null,
          team: row.team || null,
          skills: row.skills || [],
          is_active: row.is_active === 'true'
        }

        if (userExists && (mode === 'update_existing' || mode === 'create_and_update')) {
          // Update existing user
          if (options.updateExistingProfiles) {
            const updateData = { ...userData }
            if (options.preserveExistingPasswords) {
              delete updateData.password
            }

            const { error } = await supabase
              .from('users')
              .update(updateData)
              .eq('email', row.email.toLowerCase())

            if (error) {
              importErrors.push(`Row ${index + 2}: Failed to update user - ${error.message}`)
              skipped++
              continue
            }

            updated++
          } else {
            skipped++
          }
        } else if (!userExists) {
          // Create new user
          const { error } = await supabase
            .from('users')
            .insert(userData)

          if (error) {
            importErrors.push(`Row ${index + 2}: Failed to create user - ${error.message}`)
            skipped++
            continue
          }

          created++
        }

      } catch (error) {
        console.error('Import error for user:', error)
        importErrors.push(`Row ${index + 2}: Unexpected error during import`)
        skipped++
      }
    }

    const result: UserImportResult = {
      created,
      updated,
      skipped,
      errors: importErrors
    }

    revalidatePath('/admin/system-config')
    revalidatePath('/admin')

    return { data: result }

  } catch (error) {
    console.error('Import users error:', error)
    return { error: 'Failed to import users' }
  }
}