"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { supabase as supabaseAdmin } from "@/lib/supabase"
import * as XLSX from 'xlsx'

interface GoalExportFilters {
  dateRange?: { start: string; end: string }
  departments?: string[]
  statuses?: string[]
  priorities?: string[]
  goalTypes?: string[]
  assignees?: string[]
}

interface ExportOptions {
  tasks: boolean
  assignees: boolean
  comments: boolean
  attachments: boolean
  workflow_history: boolean
  support_requests: boolean
}

export async function exportGoalsToExcel(filters?: GoalExportFilters, options?: ExportOptions) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      // Mock data for testing
      return createMockGoalExport()
    }

    // Build query with filters
    let goalsQuery = supabaseAdmin
      .from('goals')
      .select(`
        *,
        owner:users!goals_owner_id_fkey(id, full_name, email),
        current_assignee:users!goals_current_assignee_id_fkey(id, full_name, email),
        assignees:goal_assignees(
          user_id,
          task_status,
          completion_notes,
          completed_at,
          user:users(id, full_name, email, department)
        )
      `)

    // Apply filters
    if (filters?.dateRange?.start && filters?.dateRange?.end) {
      goalsQuery = goalsQuery
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }

    if (filters?.departments && filters.departments.length > 0) {
      goalsQuery = goalsQuery.in('department', filters.departments)
    }

    if (filters?.statuses && filters.statuses.length > 0) {
      goalsQuery = goalsQuery.in('status', filters.statuses)
    }

    if (filters?.priorities && filters.priorities.length > 0) {
      goalsQuery = goalsQuery.in('priority', filters.priorities)
    }

    if (filters?.goalTypes && filters.goalTypes.length > 0) {
      goalsQuery = goalsQuery.in('goal_type', filters.goalTypes)
    }

    const { data: goals, error: goalsError } = await goalsQuery.order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Goals query error:', goalsError)
      return { error: 'Failed to fetch goals' }
    }

    // Fetch related data based on options
    const goalIds = goals?.map(g => g.id) || []
    let tasks: any[] = []
    let comments: any[] = []
    let attachments: any[] = []
    let supportRequests: any[] = []

    if (options?.tasks && goalIds.length > 0) {
      const { data: tasksData } = await supabaseAdmin
        .from('goal_tasks')
        .select(`
          *,
          assigned_user:users!goal_tasks_assigned_to_fkey(id, full_name, email),
          assigned_by_user:users!goal_tasks_assigned_by_fkey(id, full_name, email)
        `)
        .in('goal_id', goalIds)
        .order('created_at', { ascending: false })
      
      tasks = tasksData || []
    }

    if (options?.comments && goalIds.length > 0) {
      const { data: commentsData } = await supabaseAdmin
        .from('goal_comments')
        .select(`
          *,
          user:users(id, full_name, email)
        `)
        .in('goal_id', goalIds)
        .order('created_at', { ascending: false })
      
      comments = commentsData || []
    }

    if (options?.attachments && goalIds.length > 0) {
      const { data: attachmentsData } = await supabaseAdmin
        .from('goal_attachments')
        .select(`
          *,
          uploaded_by_user:users!goal_attachments_uploaded_by_fkey(id, full_name, email)
        `)
        .in('goal_id', goalIds)
        .order('created_at', { ascending: false })
      
      attachments = attachmentsData || []
    }

    if (options?.support_requests && goalIds.length > 0) {
      const { data: supportData } = await supabaseAdmin
        .from('goal_support')
        .select(`
          *,
          requested_by_user:users!goal_support_requested_by_fkey(id, full_name, email)
        `)
        .in('goal_id', goalIds)
        .order('created_at', { ascending: false })
      
      supportRequests = supportData || []
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()

    // Goals sheet
    const goalsSheetData = (goals || []).map(goal => ({
      'Goal ID': goal.id,
      'Type': goal.goal_type,
      'Subject': goal.subject,
      'Description': goal.description,
      'Priority': goal.priority,
      'Status': goal.status,
      'Department': goal.department,
      'Teams': Array.isArray(goal.teams) ? goal.teams.join(', ') : goal.teams,
      'Owner': goal.owner?.full_name || goal.owner?.email || 'Unknown',
      'Owner Email': goal.owner?.email || '',
      'Current Assignee': goal.current_assignee?.full_name || goal.current_assignee?.email || '',
      'Progress %': goal.progress_percentage || 0,
      'Start Date': goal.start_date ? new Date(goal.start_date).toLocaleDateString() : '',
      'Target Date': goal.target_date ? new Date(goal.target_date).toLocaleDateString() : '',
      'Adjusted Target Date': goal.adjusted_target_date ? new Date(goal.adjusted_target_date).toLocaleDateString() : '',
      'Target Metrics': goal.target_metrics || '',
      'Success Criteria': goal.success_criteria || '',
      'Total Assignees': goal.assignees?.length || 0,
      'Completed Assignees': goal.assignees?.filter((a: any) => a.task_status === 'completed').length || 0,
      'Created': new Date(goal.created_at).toLocaleDateString(),
      'Updated': new Date(goal.updated_at).toLocaleDateString()
    }))
    const goalsSheet = XLSX.utils.json_to_sheet(goalsSheetData)
    XLSX.utils.book_append_sheet(workbook, goalsSheet, 'Goals')

    // Tasks sheet
    if (options?.tasks && tasks.length > 0) {
      const tasksSheetData = tasks.map(task => ({
        'Task ID': task.id,
        'Goal ID': task.goal_id,
        'Title': task.title,
        'Description': task.description,
        'Priority': task.priority,
        'Status': task.status,
        'PDCA Phase': task.pdca_phase,
        'Assigned To': task.assigned_user?.full_name || task.assigned_user?.email || 'Unassigned',
        'Assigned By': task.assigned_by_user?.full_name || task.assigned_by_user?.email || '',
        'Department': task.department || '',
        'Start Date': task.start_date ? new Date(task.start_date).toLocaleDateString() : '',
        'Due Date': task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
        'Estimated Hours': task.estimated_hours || 0,
        'Actual Hours': task.actual_hours || 0,
        'Completion Notes': task.completion_notes || '',
        'Completed At': task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '',
        'Completed By': task.completed_by ? 'Yes' : 'No',
        'Created': new Date(task.created_at).toLocaleDateString()
      }))
      const tasksSheet = XLSX.utils.json_to_sheet(tasksSheetData)
      XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks')
    }

    // Assignees sheet
    if (options?.assignees) {
      const assigneesSheetData: any[] = []
      ;(goals || []).forEach(goal => {
        if (goal.assignees && Array.isArray(goal.assignees)) {
          goal.assignees.forEach((assignee: any) => {
            assigneesSheetData.push({
              'Goal ID': goal.id,
              'Goal Subject': goal.subject,
              'Assignee': assignee.user?.full_name || assignee.user?.email || 'Unknown',
              'Assignee Email': assignee.user?.email || '',
              'Department': assignee.user?.department || '',
              'Task Status': assignee.task_status,
              'Completion Notes': assignee.completion_notes || '',
              'Completed At': assignee.completed_at ? new Date(assignee.completed_at).toLocaleDateString() : '',
              'Assigned At': new Date(goal.created_at).toLocaleDateString()
            })
          })
        }
      })
      
      if (assigneesSheetData.length > 0) {
        const assigneesSheet = XLSX.utils.json_to_sheet(assigneesSheetData)
        XLSX.utils.book_append_sheet(workbook, assigneesSheet, 'Assignees')
      }
    }

    // Comments sheet
    if (options?.comments && comments.length > 0) {
      const commentsSheetData = comments.map(comment => ({
        'Comment ID': comment.id,
        'Goal ID': comment.goal_id,
        'Author': comment.user?.full_name || comment.user?.email || 'Unknown',
        'Comment': comment.comment,
        'Is Private': comment.is_private ? 'Yes' : 'No',
        'Created': new Date(comment.created_at).toLocaleDateString()
      }))
      const commentsSheet = XLSX.utils.json_to_sheet(commentsSheetData)
      XLSX.utils.book_append_sheet(workbook, commentsSheet, 'Comments')
    }

    // Attachments sheet
    if (options?.attachments && attachments.length > 0) {
      const attachmentsSheetData = attachments.map(attachment => ({
        'Attachment ID': attachment.id,
        'Goal ID': attachment.goal_id,
        'Filename': attachment.filename,
        'File Size (bytes)': attachment.file_size || 0,
        'Content Type': attachment.content_type || '',
        'Uploaded By': attachment.uploaded_by_user?.full_name || attachment.uploaded_by_user?.email || 'Unknown',
        'File URL': attachment.file_url || '',
        'Created': new Date(attachment.created_at).toLocaleDateString()
      }))
      const attachmentsSheet = XLSX.utils.json_to_sheet(attachmentsSheetData)
      XLSX.utils.book_append_sheet(workbook, attachmentsSheet, 'Attachments')
    }

    // Support requests sheet
    if (options?.support_requests && supportRequests.length > 0) {
      const supportSheetData = supportRequests.map(support => ({
        'Support ID': support.id,
        'Goal ID': support.goal_id,
        'Support Type': support.support_type,
        'Support Name': support.support_name,
        'Support Department': support.support_department || '',
        'Requested By': support.requested_by_user?.full_name || support.requested_by_user?.email || 'Unknown',
        'Notes': support.notes || '',
        'Created': new Date(support.created_at).toLocaleDateString()
      }))
      const supportSheet = XLSX.utils.json_to_sheet(supportSheetData)
      XLSX.utils.book_append_sheet(workbook, supportSheet, 'Support Requests')
    }

    // Generate file
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const filename = `goals-export-${new Date().toISOString().split('T')[0]}.xlsx`

    return {
      success: true,
      data: Array.from(buffer),
      filename
    }

  } catch (error) {
    console.error('Export goals error:', error)
    return { error: 'Failed to export goals' }
  }
}

export async function exportDepartmentStructure(format: string = 'excel', options: any = {}) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      // Mock data for testing
      return createMockDepartmentExport(format)
    }

    // Fetch department teams
    let departmentTeamsQuery = supabaseAdmin
      .from('department_teams')
      .select('*')
      .order('department', { ascending: true })
      .order('team', { ascending: true })

    if (!options.inactiveEntities) {
      departmentTeamsQuery = departmentTeamsQuery.eq('is_active', true)
    }

    const { data: departmentTeams, error: teamsError } = await departmentTeamsQuery

    if (teamsError) {
      console.error('Department teams query error:', teamsError)
      return { error: 'Failed to fetch department teams' }
    }

    // Fetch users with department info
    let usersQuery = supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, department, team, is_active, created_at')
      .order('department', { ascending: true })
      .order('full_name', { ascending: true })

    if (!options.inactiveEntities) {
      usersQuery = usersQuery.eq('is_active', true)
    }

    const { data: users, error: usersError } = await usersQuery

    if (usersError) {
      console.error('Users query error:', usersError)
      return { error: 'Failed to fetch users' }
    }

    // Fetch department permissions if requested
    let departmentPermissions: any[] = []
    if (options.departmentPermissions) {
      const { data: permissionsData } = await supabaseAdmin
        .from('department_permissions')
        .select(`
          user_id,
          department,
          user:users(id, full_name, email, role, department as primary_department)
        `)
      
      departmentPermissions = permissionsData || []
    }

    // Fetch goal statistics if requested
    let goalStats: any[] = []
    if (options.goalCounts) {
      const { data: goalsData } = await supabaseAdmin
        .from('goals')
        .select('id, department, status, priority, created_at')
      
      if (goalsData) {
        // Aggregate goal statistics by department
        const statsMap = new Map()
        goalsData.forEach(goal => {
          if (!statsMap.has(goal.department)) {
            statsMap.set(goal.department, {
              department: goal.department,
              total_goals: 0,
              completed_goals: 0,
              in_progress_goals: 0,
              high_priority_goals: 0,
              critical_priority_goals: 0
            })
          }
          
          const stats = statsMap.get(goal.department)
          stats.total_goals++
          
          if (goal.status === 'Completed') {
            stats.completed_goals++
          } else if (['Plan', 'Do', 'Check', 'Act'].includes(goal.status)) {
            stats.in_progress_goals++
          }
          
          if (goal.priority === 'High') {
            stats.high_priority_goals++
          } else if (goal.priority === 'Critical') {
            stats.critical_priority_goals++
          }
        })
        
        goalStats = Array.from(statsMap.values())
      }
    }

    // Process data based on format
    if (format === 'json') {
      const exportData = {
        departments: organizeDepartmentHierarchy(departmentTeams || [], users || [], options),
        users: options.userDetails ? users : undefined,
        permissions: options.departmentPermissions ? departmentPermissions : undefined,
        goal_statistics: options.goalCounts ? goalStats : undefined,
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user.full_name || user.email,
          options
        }
      }

      const filename = `department-structure-${new Date().toISOString().split('T')[0]}.json`
      return {
        success: true,
        data: exportData,
        filename
      }
    }

    if (format === 'csv') {
      // For CSV, create a flattened structure
      const csvData = createDepartmentCSV(departmentTeams || [], users || [], options)
      const filename = `department-structure-${new Date().toISOString().split('T')[0]}.csv`
      
      return {
        success: true,
        data: csvData,
        filename
      }
    }

    // Excel format (default)
    const workbook = XLSX.utils.book_new()

    // Departments Overview sheet
    const departmentOverview = createDepartmentOverview(departmentTeams || [], users || [])
    const deptSheet = XLSX.utils.json_to_sheet(departmentOverview)
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Departments Overview')

    // Teams Details sheet
    if (options.teamHierarchy) {
      const teamsData = (departmentTeams || []).map(team => ({
        'Department': team.department,
        'Team': team.team,
        'Description': team.description || '',
        'Is Active': team.is_active ? 'Yes' : 'No',
        'User Count': (users || []).filter(u => u.department === team.department && u.team === team.team).length,
        'Created': new Date(team.created_at).toLocaleDateString()
      }))
      const teamsSheet = XLSX.utils.json_to_sheet(teamsData)
      XLSX.utils.book_append_sheet(workbook, teamsSheet, 'Teams Details')
    }

    // User Assignments sheet
    if (options.userDetails) {
      const usersData = (users || []).map(user => ({
        'User ID': user.id,
        'Full Name': user.full_name,
        'Email': user.email,
        'Role': user.role,
        'Primary Department': user.department || '',
        'Team': user.team || '',
        'Is Active': user.is_active ? 'Yes' : 'No',
        'Additional Permissions': departmentPermissions
          .filter(p => p.user_id === user.id)
          .map(p => p.department)
          .join(', '),
        'Joined': new Date(user.created_at).toLocaleDateString()
      }))
      const usersSheet = XLSX.utils.json_to_sheet(usersData)
      XLSX.utils.book_append_sheet(workbook, usersSheet, 'User Assignments')
    }

    // Permissions Matrix sheet
    if (options.departmentPermissions && departmentPermissions.length > 0) {
      const permissionsData = departmentPermissions.map(perm => ({
        'User': perm.user?.full_name || 'Unknown',
        'User Email': perm.user?.email || '',
        'User Role': perm.user?.role || '',
        'Primary Department': perm.user?.primary_department || '',
        'Additional Access To': perm.department
      }))
      const permissionsSheet = XLSX.utils.json_to_sheet(permissionsData)
      XLSX.utils.book_append_sheet(workbook, permissionsSheet, 'Permissions Matrix')
    }

    // Goal Statistics sheet
    if (options.goalCounts && goalStats.length > 0) {
      const goalStatsData = goalStats.map(stats => ({
        'Department': stats.department,
        'Total Goals': stats.total_goals,
        'Completed Goals': stats.completed_goals,
        'In Progress Goals': stats.in_progress_goals,
        'High Priority Goals': stats.high_priority_goals,
        'Critical Priority Goals': stats.critical_priority_goals,
        'Completion Rate %': stats.total_goals > 0 ? Math.round((stats.completed_goals / stats.total_goals) * 100) : 0
      }))
      const goalStatsSheet = XLSX.utils.json_to_sheet(goalStatsData)
      XLSX.utils.book_append_sheet(workbook, goalStatsSheet, 'Goal Statistics')
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const filename = `department-structure-${new Date().toISOString().split('T')[0]}.xlsx`

    return {
      success: true,
      data: Array.from(buffer),
      filename
    }

  } catch (error) {
    console.error('Export department structure error:', error)
    return { error: 'Failed to export department structure' }
  }
}

export async function exportUserAssignments(format: string = 'excel', options: any = {}) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      // Mock data for testing
      return createMockUserAssignmentsExport(format, options)
    }

    // Fetch comprehensive user assignment data
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id, full_name, email, role, department, team, is_active, created_at,
        assigned_goals:goal_assignees(
          goal_id, task_status, completion_notes, completed_at,
          goal:goals(id, subject, status, priority, department, target_date, progress_percentage)
        ),
        assigned_tasks:goal_tasks(
          id, title, status, priority, pdca_phase, due_date, estimated_hours, actual_hours,
          completion_notes, completed_at,
          goal:goals(id, subject, department)
        )
      `)
      .order('department', { ascending: true })
      .order('full_name', { ascending: true })

    if (usersError) {
      console.error('Users assignment query error:', usersError)
      return { error: 'Failed to fetch user assignment data' }
    }

    // Filter users based on options
    let filteredUsers = users || []
    if (!options.includeInactiveUsers) {
      filteredUsers = filteredUsers.filter(u => u.is_active)
    }

    // Process data based on format and selected report types
    if (format === 'csv') {
      const csvData = createUserAssignmentsCSV(filteredUsers, options)
      const filename = `user-assignments-${new Date().toISOString().split('T')[0]}.csv`
      
      return {
        success: true,
        data: csvData,
        filename
      }
    }

    // Excel format (default)
    const workbook = XLSX.utils.book_new()

    // Summary Dashboard
    const summaryData = createUserAssignmentSummary(filteredUsers)
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary Dashboard')

    // Workload Summary Report
    if (options.reportTypes?.includes('workload_summary')) {
      const workloadData = createWorkloadSummary(filteredUsers, options)
      const workloadSheet = XLSX.utils.json_to_sheet(workloadData)
      XLSX.utils.book_append_sheet(workbook, workloadSheet, 'Workload Summary')
    }

    // Performance Analysis Report
    if (options.reportTypes?.includes('performance_analysis')) {
      const performanceData = createPerformanceAnalysis(filteredUsers, options)
      const performanceSheet = XLSX.utils.json_to_sheet(performanceData)
      XLSX.utils.book_append_sheet(workbook, performanceSheet, 'Performance Analysis')
    }

    // Assignment Distribution Report
    if (options.reportTypes?.includes('assignment_distribution')) {
      const distributionData = createAssignmentDistribution(filteredUsers, options)
      const distributionSheet = XLSX.utils.json_to_sheet(distributionData)
      XLSX.utils.book_append_sheet(workbook, distributionSheet, 'Assignment Distribution')
    }

    // Overdue Analysis Report
    if (options.reportTypes?.includes('overdue_analysis')) {
      const overdueData = createOverdueAnalysis(filteredUsers, options)
      const overdueSheet = XLSX.utils.json_to_sheet(overdueData)
      XLSX.utils.book_append_sheet(workbook, overdueSheet, 'Overdue Analysis')
    }

    // Detailed Tasks (if requested)
    if (options.includeTaskDetails) {
      const tasksData = createDetailedTasksReport(filteredUsers, options)
      const tasksSheet = XLSX.utils.json_to_sheet(tasksData)
      XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Detailed Tasks')
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const filename = `user-assignments-${new Date().toISOString().split('T')[0]}.xlsx`

    return {
      success: true,
      data: Array.from(buffer),
      filename
    }

  } catch (error) {
    console.error('Export user assignments error:', error)
    return { error: 'Failed to export user assignments' }
  }
}

// Helper functions for user assignment reports
function createUserAssignmentSummary(users: any[]) {
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.is_active).length
  const totalGoalAssignments = users.reduce((sum, user) => sum + (user.assigned_goals?.length || 0), 0)
  const totalTaskAssignments = users.reduce((sum, user) => sum + (user.assigned_tasks?.length || 0), 0)
  
  const departmentStats = new Map()
  users.forEach(user => {
    if (!departmentStats.has(user.department)) {
      departmentStats.set(user.department, { users: 0, goals: 0, tasks: 0 })
    }
    const stats = departmentStats.get(user.department)
    stats.users++
    stats.goals += user.assigned_goals?.length || 0
    stats.tasks += user.assigned_tasks?.length || 0
  })

  return [
    { Metric: 'Total Users', Value: totalUsers },
    { Metric: 'Active Users', Value: activeUsers },
    { Metric: 'Total Goal Assignments', Value: totalGoalAssignments },
    { Metric: 'Total Task Assignments', Value: totalTaskAssignments },
    { Metric: 'Average Goals per User', Value: Math.round((totalGoalAssignments / activeUsers) * 100) / 100 },
    { Metric: 'Average Tasks per User', Value: Math.round((totalTaskAssignments / activeUsers) * 100) / 100 },
    ...Array.from(departmentStats.entries()).map(([dept, stats]) => ({
      Metric: `${dept} Department Users`,
      Value: (stats as any).users
    }))
  ]
}

function createWorkloadSummary(users: any[], options: any) {
  return users.map(user => {
    const goals = user.assigned_goals || []
    const tasks = user.assigned_tasks || []
    const completedGoals = goals.filter((g: any) => g.task_status === 'completed').length
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
    
    const result: any = {
      'User': user.full_name,
      'Email': user.email,
      'Department': user.department || '',
      'Team': user.team || '',
      'Role': user.role,
      'Active': user.is_active ? 'Yes' : 'No',
      'Total Goals': goals.length,
      'Completed Goals': completedGoals,
      'Total Tasks': tasks.length,
      'Completed Tasks': completedTasks,
      'Goal Completion Rate %': goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0,
      'Task Completion Rate %': tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
    }

    if (options.includePDCABreakdown) {
      const pdcaBreakdown = ['Plan', 'Do', 'Check', 'Act'].reduce((acc, phase) => {
        acc[`${phase} Tasks`] = tasks.filter((t: any) => t.pdca_phase === phase).length
        return acc
      }, {} as any)
      Object.assign(result, pdcaBreakdown)
    }

    if (options.includeTimeTracking) {
      const totalEstimated = tasks.reduce((sum: number, t: any) => sum + (t.estimated_hours || 0), 0)
      const totalActual = tasks.reduce((sum: number, t: any) => sum + (t.actual_hours || 0), 0)
      result['Estimated Hours'] = totalEstimated
      result['Actual Hours'] = totalActual
      result['Time Variance %'] = totalEstimated > 0 ? Math.round(((totalActual - totalEstimated) / totalEstimated) * 100) : 0
    }

    return result
  })
}

function createPerformanceAnalysis(users: any[], options: any) {
  return users.map(user => {
    const tasks = user.assigned_tasks || []
    const completedTasks = tasks.filter((t: any) => t.status === 'completed')
    const overdueTasks = tasks.filter((t: any) => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    )
    
    return {
      'User': user.full_name,
      'Department': user.department || '',
      'Total Assignments': tasks.length,
      'Completed': completedTasks.length,
      'In Progress': tasks.filter((t: any) => t.status === 'in_progress').length,
      'Overdue': overdueTasks.length,
      'On Time Completion %': completedTasks.length > 0 ? 
        Math.round((completedTasks.filter((t: any) => 
          !t.due_date || new Date(t.completed_at || '') <= new Date(t.due_date)
        ).length / completedTasks.length) * 100) : 0,
      'Average Days to Complete': completedTasks.length > 0 ?
        Math.round(completedTasks.reduce((sum: number, t: any) => {
          const created = new Date(t.created_at || '')
          const completed = new Date(t.completed_at || '')
          return sum + Math.max(0, (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        }, 0) / completedTasks.length) : 0,
      'Productivity Score': Math.round(
        (completedTasks.length * 0.4 + 
         (overdueTasks.length === 0 ? 100 : Math.max(0, 100 - (overdueTasks.length * 10))) * 0.6)
      )
    }
  })
}

function createAssignmentDistribution(users: any[], options: any) {
  const departmentMap = new Map()
  const roleMap = new Map()
  
  users.forEach(user => {
    const goals = user.assigned_goals?.length || 0
    const tasks = user.assigned_tasks?.length || 0
    
    // Department distribution
    if (!departmentMap.has(user.department)) {
      departmentMap.set(user.department, { users: 0, goals: 0, tasks: 0 })
    }
    const deptStats = departmentMap.get(user.department)
    deptStats.users++
    deptStats.goals += goals
    deptStats.tasks += tasks
    
    // Role distribution
    if (!roleMap.has(user.role)) {
      roleMap.set(user.role, { users: 0, goals: 0, tasks: 0 })
    }
    const roleStats = roleMap.get(user.role)
    roleStats.users++
    roleStats.goals += goals
    roleStats.tasks += tasks
  })
  
  const result: any[] = []
  
  // Department distribution
  Array.from(departmentMap.entries()).forEach(([dept, stats]) => {
    result.push({
      'Category': 'Department',
      'Name': dept || 'Unassigned',
      'Users': (stats as any).users,
      'Total Goals': (stats as any).goals,
      'Total Tasks': (stats as any).tasks,
      'Avg Goals per User': Math.round(((stats as any).goals / (stats as any).users) * 100) / 100,
      'Avg Tasks per User': Math.round(((stats as any).tasks / (stats as any).users) * 100) / 100
    })
  })
  
  // Role distribution
  Array.from(roleMap.entries()).forEach(([role, stats]) => {
    result.push({
      'Category': 'Role',
      'Name': role,
      'Users': (stats as any).users,
      'Total Goals': (stats as any).goals,
      'Total Tasks': (stats as any).tasks,
      'Avg Goals per User': Math.round(((stats as any).goals / (stats as any).users) * 100) / 100,
      'Avg Tasks per User': Math.round(((stats as any).tasks / (stats as any).users) * 100) / 100
    })
  })
  
  return result
}

function createOverdueAnalysis(users: any[], options: any) {
  const result: any[] = []
  
  users.forEach(user => {
    const tasks = user.assigned_tasks || []
    const overdueTasks = tasks.filter((t: any) => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    )
    
    if (overdueTasks.length > 0 || options.includeInactiveUsers) {
      overdueTasks.forEach((task: any) => {
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24)
        )
        
        result.push({
          'User': user.full_name,
          'Department': user.department || '',
          'Goal': task.goal?.subject || 'Unknown Goal',
          'Task': task.title,
          'Priority': task.priority,
          'PDCA Phase': task.pdca_phase,
          'Due Date': new Date(task.due_date).toLocaleDateString(),
          'Days Overdue': daysOverdue,
          'Severity': daysOverdue > 30 ? 'Critical' : daysOverdue > 14 ? 'High' : daysOverdue > 7 ? 'Medium' : 'Low'
        })
      })
    }
  })
  
  return result
}

function createDetailedTasksReport(users: any[], options: any) {
  const result: any[] = []
  
  users.forEach(user => {
    const tasks = user.assigned_tasks || []
    tasks.forEach((task: any) => {
      const taskData: any = {
        'User': user.full_name,
        'User Email': user.email,
        'Department': user.department || '',
        'Role': user.role,
        'Goal': task.goal?.subject || '',
        'Task Title': task.title,
        'Status': task.status,
        'Priority': task.priority,
        'PDCA Phase': task.pdca_phase,
        'Due Date': task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
        'Completed Date': task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '',
        'Estimated Hours': task.estimated_hours || 0,
        'Actual Hours': task.actual_hours || 0
      }
      
      if (options.includeCompletionNotes && task.completion_notes) {
        taskData['Completion Notes'] = task.completion_notes
      }
      
      result.push(taskData)
    })
  })
  
  return result
}

function createUserAssignmentsCSV(users: any[], options: any) {
  const rows = []
  rows.push(['User', 'Email', 'Department', 'Team', 'Role', 'Total Goals', 'Completed Goals', 'Total Tasks', 'Completed Tasks', 'Completion Rate %'])
  
  users.forEach(user => {
    const goals = user.assigned_goals || []
    const tasks = user.assigned_tasks || []
    const completedGoals = goals.filter((g: any) => g.task_status === 'completed').length
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
    const completionRate = (goals.length + tasks.length) > 0 ? 
      Math.round(((completedGoals + completedTasks) / (goals.length + tasks.length)) * 100) : 0
    
    rows.push([
      user.full_name,
      user.email,
      user.department || '',
      user.team || '',
      user.role,
      goals.length.toString(),
      completedGoals.toString(),
      tasks.length.toString(),
      completedTasks.toString(),
      completionRate.toString()
    ])
  })
  
  return rows.map(row => row.join(',')).join('\n')
}

// Mock data for testing
function createMockUserAssignmentsExport(format: string, options: any) {
  const mockData = [
    { 
      User: 'John Doe', 
      Department: 'Sales', 
      'Total Goals': 5, 
      'Completed Goals': 3, 
      'Total Tasks': 12, 
      'Completed Tasks': 8,
      'Completion Rate %': 73
    },
    { 
      User: 'Jane Smith', 
      Department: 'Marketing', 
      'Total Goals': 3, 
      'Completed Goals': 2, 
      'Total Tasks': 8, 
      'Completed Tasks': 7,
      'Completion Rate %': 82
    }
  ]

  if (format === 'csv') {
    const csvContent = [
      'User,Department,Total Goals,Completed Goals,Total Tasks,Completed Tasks,Completion Rate %',
      ...mockData.map(d => `${d.User},${d.Department},${d['Total Goals']},${d['Completed Goals']},${d['Total Tasks']},${d['Completed Tasks']},${d['Completion Rate %']}`)
    ].join('\n')

    return {
      success: true,
      data: csvContent,
      filename: `user-assignments-mock-${new Date().toISOString().split('T')[0]}.csv`
    }
  }

  // Excel format
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(mockData)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'User Assignments')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const filename = `user-assignments-mock-${new Date().toISOString().split('T')[0]}.xlsx`

  return {
    success: true,
    data: Array.from(buffer),
    filename
  }
}

// Helper functions
function organizeDepartmentHierarchy(teams: any[], users: any[], options: any) {
  const departments = new Map()
  
  teams.forEach(team => {
    if (!departments.has(team.department)) {
      departments.set(team.department, {
        name: team.department,
        teams: [],
        user_count: 0,
        users: options.userDetails ? [] : undefined
      })
    }
    
    const dept = departments.get(team.department)
    const teamUsers = users.filter(u => u.department === team.department && u.team === team.team)
    
    dept.teams.push({
      name: team.team,
      description: team.description,
      is_active: team.is_active,
      user_count: teamUsers.length,
      users: options.userDetails ? teamUsers : undefined
    })
    
    dept.user_count += teamUsers.length
    if (options.userDetails) {
      dept.users.push(...teamUsers)
    }
  })
  
  return Array.from(departments.values())
}

function createDepartmentOverview(teams: any[], users: any[]) {
  const departments = new Map()
  
  teams.forEach(team => {
    if (!departments.has(team.department)) {
      departments.set(team.department, {
        Department: team.department,
        'Total Teams': 0,
        'Active Teams': 0,
        'Total Users': 0,
        'Active Users': 0
      })
    }
    
    const dept = departments.get(team.department)
    dept['Total Teams']++
    if (team.is_active) {
      dept['Active Teams']++
    }
  })
  
  users.forEach(user => {
    if (user.department && departments.has(user.department)) {
      const dept = departments.get(user.department)
      dept['Total Users']++
      if (user.is_active) {
        dept['Active Users']++
      }
    }
  })
  
  return Array.from(departments.values())
}

function createDepartmentCSV(teams: any[], users: any[], options: any) {
  const rows = []
  rows.push(['Department', 'Team', 'Team Description', 'Team Active', 'User Count', 'Active User Count'])
  
  const teamStats = new Map()
  
  teams.forEach(team => {
    const teamUsers = users.filter(u => u.department === team.department && u.team === team.team)
    const activeUsers = teamUsers.filter(u => u.is_active)
    
    rows.push([
      team.department,
      team.team,
      team.description || '',
      team.is_active ? 'Yes' : 'No',
      teamUsers.length.toString(),
      activeUsers.length.toString()
    ])
  })
  
  return rows.map(row => row.join(',')).join('\n')
}

// Mock data for testing when database is not available
function createMockDepartmentExport(format: string) {
  const mockDepartments = [
    { Department: 'Sales', 'Total Teams': 3, 'Active Teams': 3, 'Total Users': 12, 'Active Users': 11 },
    { Department: 'Marketing', 'Total Teams': 2, 'Active Teams': 2, 'Total Users': 8, 'Active Users': 8 },
    { Department: 'Engineering', 'Total Teams': 4, 'Active Teams': 4, 'Total Users': 25, 'Active Users': 23 }
  ]

  if (format === 'json') {
    return {
      success: true,
      data: {
        departments: mockDepartments,
        export_metadata: {
          exported_at: new Date().toISOString(),
          note: 'Mock data for testing'
        }
      },
      filename: `department-structure-mock-${new Date().toISOString().split('T')[0]}.json`
    }
  }

  if (format === 'csv') {
    const csvContent = [
      'Department,Total Teams,Active Teams,Total Users,Active Users',
      ...mockDepartments.map(d => `${d.Department},${d['Total Teams']},${d['Active Teams']},${d['Total Users']},${d['Active Users']}`)
    ].join('\n')

    return {
      success: true,
      data: csvContent,
      filename: `department-structure-mock-${new Date().toISOString().split('T')[0]}.csv`
    }
  }

  // Excel format
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(mockDepartments)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Departments')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const filename = `department-structure-mock-${new Date().toISOString().split('T')[0]}.xlsx`

  return {
    success: true,
    data: Array.from(buffer),
    filename
  }
}

// Mock data for testing when database is not available
function createMockGoalExport() {
  const mockData = [
    {
      'Goal ID': 'mock-goal-1',
      'Type': 'Team',
      'Subject': 'Improve Customer Satisfaction',
      'Description': 'Increase customer satisfaction scores by implementing feedback system',
      'Priority': 'High',
      'Status': 'Do',
      'Department': 'Sales',
      'Teams': 'Inside Sales, Customer Success',
      'Owner': 'John Doe',
      'Owner Email': 'john@example.com',
      'Progress %': 65,
      'Start Date': '2024-01-01',
      'Target Date': '2024-03-31',
      'Created': '2024-01-01'
    },
    {
      'Goal ID': 'mock-goal-2',
      'Type': 'Department',
      'Subject': 'Implement New CRM System',
      'Description': 'Deploy and train team on new CRM platform',
      'Priority': 'Critical',
      'Status': 'Check',
      'Department': 'Sales',
      'Teams': 'All Teams',
      'Owner': 'Jane Smith',
      'Owner Email': 'jane@example.com',
      'Progress %': 85,
      'Start Date': '2024-02-01',
      'Target Date': '2024-04-30',
      'Created': '2024-02-01'
    }
  ]

  // Create workbook with mock data
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(mockData)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Goals')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const filename = `goals-export-mock-${new Date().toISOString().split('T')[0]}.xlsx`

  return {
    success: true,
    data: Array.from(buffer),
    filename
  }
}