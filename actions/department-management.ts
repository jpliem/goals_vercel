"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"

// Create admin client for department management
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

// Get all departments with their teams
export async function getDepartmentTeamStructure() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Return mock data for development
      return {
        success: true,
        data: {
          'IT': ['Development', 'Infrastructure', 'Security', 'Support', 'Quality Assurance', 'DevOps'],
          'HR': ['Recruitment', 'Training', 'Compensation & Benefits', 'Employee Relations', 'Performance Management'],
          'Finance': ['Accounting', 'Budget & Planning', 'Payroll', 'Audit', 'Treasury'],
          'Operations': ['Production', 'Supply Chain', 'Logistics', 'Quality Control', 'Procurement'],
          'Marketing': ['Digital Marketing', 'Brand Management', 'Content', 'Social Media', 'Analytics'],
          'Sales': ['Inside Sales', 'Field Sales', 'Account Management', 'Sales Support', 'Business Development'],
          'Customer Service': ['Support', 'Success', 'Escalations', 'Training'],
          'Product Development': ['Product Management', 'Design', 'Research', 'Testing'],
          'Quality Assurance': ['Testing', 'Automation', 'Compliance', 'Documentation'],
          'Legal': ['Corporate', 'Contracts', 'Compliance', 'Intellectual Property'],
          'Administration': ['Facilities', 'Office Management', 'Executive Support', 'Reception']
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from("department_teams")
      .select("department, team, is_active, created_at")
      .eq("is_active", true)
      .order("department", { ascending: true })
      .order("team", { ascending: true })

    if (error) {
      console.error("Get department structure error:", error)
      return { error: "Failed to fetch department structure" }
    }

    // Group teams by department
    const structure: Record<string, string[]> = {}
    data?.forEach(row => {
      if (!structure[row.department]) {
        structure[row.department] = []
      }
      structure[row.department].push(row.team)
    })

    return { success: true, data: structure }
  } catch (error) {
    console.error("Get department structure error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Create a new department
export async function createDepartment(departmentName: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!departmentName.trim()) {
      return { error: "Department name is required" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `Department '${departmentName}' created successfully (mock mode)` }
    }

    // Check if department already exists
    const { data: existing } = await supabaseAdmin
      .from("department_teams")
      .select("department")
      .eq("department", departmentName.trim())
      .limit(1)

    if (existing && existing.length > 0) {
      return { error: "Department already exists" }
    }

    // Create department with a default "General" team
    const { error } = await supabaseAdmin
      .from("department_teams")
      .insert([{
        department: departmentName.trim(),
        team: "General",
        is_active: true
      }])

    if (error) {
      console.error("Create department error:", error)
      return { error: "Failed to create department" }
    }

    revalidatePath("/admin/system-config")
    return { success: true, message: `Department '${departmentName}' created successfully` }
  } catch (error) {
    console.error("Create department error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Create a new team within a department
export async function createTeam(department: string, teamName: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!department.trim() || !teamName.trim()) {
      return { error: "Department and team name are required" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `Team '${teamName}' added to '${department}' successfully (mock mode)` }
    }

    // Check if team already exists in this department
    const { data: existing } = await supabaseAdmin
      .from("department_teams")
      .select("id")
      .eq("department", department.trim())
      .eq("team", teamName.trim())
      .limit(1)

    if (existing && existing.length > 0) {
      return { error: "Team already exists in this department" }
    }

    const { error } = await supabaseAdmin
      .from("department_teams")
      .insert([{
        department: department.trim(),
        team: teamName.trim(),
        is_active: true
      }])

    if (error) {
      console.error("Create team error:", error)
      return { error: "Failed to create team" }
    }

    revalidatePath("/admin/system-config")
    return { success: true, message: `Team '${teamName}' added to '${department}' successfully` }
  } catch (error) {
    console.error("Create team error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Delete a department (only if no users are assigned)
export async function deleteDepartment(department: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `Department '${department}' deleted successfully (mock mode)` }
    }

    // Check if any users are assigned to this department
    const { data: users, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("department", department)
      .limit(1)

    if (userError) {
      console.error("Check users error:", userError)
      return { error: "Failed to check department usage" }
    }

    if (users && users.length > 0) {
      return { error: "Cannot delete department: users are still assigned to it" }
    }

    // Check if any goals are assigned to this department
    const { data: goals, error: goalError } = await supabaseAdmin
      .from("goals")
      .select("id")
      .eq("department", department)
      .limit(1)

    if (goalError) {
      console.error("Check goals error:", goalError)
      return { error: "Failed to check department usage" }
    }

    if (goals && goals.length > 0) {
      return { error: "Cannot delete department: goals are still assigned to it" }
    }

    // Delete all teams in the department
    const { error } = await supabaseAdmin
      .from("department_teams")
      .delete()
      .eq("department", department)

    if (error) {
      console.error("Delete department error:", error)
      return { error: "Failed to delete department" }
    }

    revalidatePath("/admin/system-config")
    return { success: true, message: `Department '${department}' deleted successfully` }
  } catch (error) {
    console.error("Delete department error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Delete a team (only if no users are assigned)
export async function deleteTeam(department: string, team: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `Team '${team}' deleted from '${department}' successfully (mock mode)` }
    }

    // Check if any users are assigned to this team
    const { data: users, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("department", department)
      .eq("team", team)
      .limit(1)

    if (userError) {
      console.error("Check users error:", userError)
      return { error: "Failed to check team usage" }
    }

    if (users && users.length > 0) {
      return { error: "Cannot delete team: users are still assigned to it" }
    }

    // Don't allow deleting the last team in a department
    const { data: allTeams, error: teamError } = await supabaseAdmin
      .from("department_teams")
      .select("id")
      .eq("department", department)

    if (teamError) {
      console.error("Check teams error:", teamError)
      return { error: "Failed to check department teams" }
    }

    if (allTeams && allTeams.length <= 1) {
      return { error: "Cannot delete the last team in a department" }
    }

    const { error } = await supabaseAdmin
      .from("department_teams")
      .delete()
      .eq("department", department)
      .eq("team", team)

    if (error) {
      console.error("Delete team error:", error)
      return { error: "Failed to delete team" }
    }

    revalidatePath("/admin/system-config")
    return { success: true, message: `Team '${team}' deleted from '${department}' successfully` }
  } catch (error) {
    console.error("Delete team error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Update user's department and team assignment
export async function updateUserDepartmentTeam(userId: string, department: string, team?: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!userId || !department) {
      return { error: "User ID and department are required" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `User assignment updated successfully (mock mode)` }
    }

    // Validate department exists
    const { data: deptExists } = await supabaseAdmin
      .from("department_teams")
      .select("department")
      .eq("department", department)
      .limit(1)

    if (!deptExists || deptExists.length === 0) {
      return { error: "Department does not exist" }
    }

    // If team is specified, validate it exists in the department
    if (team) {
      const { data: teamExists } = await supabaseAdmin
        .from("department_teams")
        .select("id")
        .eq("department", department)
        .eq("team", team)
        .limit(1)

      if (!teamExists || teamExists.length === 0) {
        return { error: "Team does not exist in this department" }
      }
    }

    const updateData: any = {
      department,
      updated_at: new Date().toISOString()
    }

    if (team) {
      updateData.team = team
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId)

    if (error) {
      console.error("Update user assignment error:", error)
      return { error: "Failed to update user assignment" }
    }

    revalidatePath("/admin")
    revalidatePath("/admin/system-config")
    return { success: true, message: "User assignment updated successfully" }
  } catch (error) {
    console.error("Update user assignment error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Rename a department
export async function renameDepartment(oldName: string, newName: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!oldName.trim() || !newName.trim()) {
      return { error: "Old and new department names are required" }
    }

    if (oldName.trim() === newName.trim()) {
      return { error: "New department name must be different from the current name" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `Department '${oldName}' renamed to '${newName}' successfully (mock mode)` }
    }

    // Check if new department name already exists
    const { data: existing } = await supabaseAdmin
      .from("department_teams")
      .select("department")
      .eq("department", newName.trim())
      .limit(1)

    if (existing && existing.length > 0) {
      return { error: "A department with this name already exists" }
    }

    // Begin transaction-like operations
    // 1. Update department_teams table
    const { error: teamsError } = await supabaseAdmin
      .from("department_teams")
      .update({ department: newName.trim() })
      .eq("department", oldName.trim())

    if (teamsError) {
      console.error("Update department teams error:", teamsError)
      return { error: "Failed to update department teams" }
    }

    // 2. Update users table
    const { error: usersError } = await supabaseAdmin
      .from("users")
      .update({ department: newName.trim() })
      .eq("department", oldName.trim())

    if (usersError) {
      console.error("Update users department error:", usersError)
      return { error: "Failed to update user departments" }
    }

    // 3. Update goals table
    const { error: goalsError } = await supabaseAdmin
      .from("goals")
      .update({ department: newName.trim() })
      .eq("department", oldName.trim())

    if (goalsError) {
      console.error("Update goals department error:", goalsError)
      return { error: "Failed to update goal departments" }
    }

    // 4. Update goal_tasks table
    const { error: tasksError } = await supabaseAdmin
      .from("goal_tasks")
      .update({ department: newName.trim() })
      .eq("department", oldName.trim())

    if (tasksError) {
      console.error("Update tasks department error:", tasksError)
      return { error: "Failed to update task departments" }
    }

    // 5. Update department_permissions table
    const { error: permissionsError } = await supabaseAdmin
      .from("department_permissions")
      .update({ department: newName.trim() })
      .eq("department", oldName.trim())

    if (permissionsError) {
      console.error("Update department permissions error:", permissionsError)
      return { error: "Failed to update department permissions" }
    }

    revalidatePath("/admin/system-config")
    return { success: true, message: `Department '${oldName}' renamed to '${newName}' successfully` }
  } catch (error) {
    console.error("Rename department error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Rename a team within a department
export async function renameTeam(department: string, oldTeamName: string, newTeamName: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!department.trim() || !oldTeamName.trim() || !newTeamName.trim()) {
      return { error: "Department, old team name, and new team name are required" }
    }

    if (oldTeamName.trim() === newTeamName.trim()) {
      return { error: "New team name must be different from the current name" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `Team '${oldTeamName}' renamed to '${newTeamName}' successfully (mock mode)` }
    }

    // Check if new team name already exists in this department
    const { data: existing } = await supabaseAdmin
      .from("department_teams")
      .select("id")
      .eq("department", department.trim())
      .eq("team", newTeamName.trim())
      .limit(1)

    if (existing && existing.length > 0) {
      return { error: "A team with this name already exists in this department" }
    }

    // Begin transaction-like operations
    // 1. Update department_teams table
    const { error: teamsError } = await supabaseAdmin
      .from("department_teams")
      .update({ team: newTeamName.trim() })
      .eq("department", department.trim())
      .eq("team", oldTeamName.trim())

    if (teamsError) {
      console.error("Update team name error:", teamsError)
      return { error: "Failed to update team name" }
    }

    // 2. Update users table
    const { error: usersError } = await supabaseAdmin
      .from("users")
      .update({ team: newTeamName.trim() })
      .eq("department", department.trim())
      .eq("team", oldTeamName.trim())

    if (usersError) {
      console.error("Update users team error:", usersError)
      return { error: "Failed to update user teams" }
    }

    revalidatePath("/admin/system-config")
    return { success: true, message: `Team '${oldTeamName}' renamed to '${newTeamName}' successfully` }
  } catch (error) {
    console.error("Rename team error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Update department description
export async function updateDepartmentDescription(department: string, description: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!department.trim()) {
      return { error: "Department name is required" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `Department description updated successfully (mock mode)` }
    }

    const { error } = await supabaseAdmin
      .from("department_teams")
      .update({ description: description.trim() || null })
      .eq("department", department.trim())

    if (error) {
      console.error("Update department description error:", error)
      return { error: "Failed to update department description" }
    }

    revalidatePath("/admin/system-config")
    return { success: true, message: "Department description updated successfully" }
  } catch (error) {
    console.error("Update department description error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Bulk delete departments (only those with no users/goals)
export async function bulkDeleteDepartments(departmentNames: string[]) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!departmentNames || departmentNames.length === 0) {
      return { error: "No departments selected for deletion" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `${departmentNames.length} departments deleted successfully (mock mode)` }
    }

    const results = []
    for (const dept of departmentNames) {
      const result = await deleteDepartment(dept)
      results.push({ department: dept, ...result })
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => r.error).length

    if (failed === 0) {
      revalidatePath("/admin/system-config")
      return { success: true, message: `All ${successful} departments deleted successfully` }
    } else if (successful === 0) {
      return { error: `Failed to delete all departments: ${results.find(r => r.error)?.error}` }
    } else {
      revalidatePath("/admin/system-config")
      return { 
        success: true, 
        message: `${successful} departments deleted successfully, ${failed} failed`,
        warnings: results.filter(r => r.error).map(r => `${r.department}: ${r.error}`)
      }
    }
  } catch (error) {
    console.error("Bulk delete departments error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Bulk delete teams (only those with no users)
export async function bulkDeleteTeams(teams: { department: string; team: string }[]) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!teams || teams.length === 0) {
      return { error: "No teams selected for deletion" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { success: true, message: `${teams.length} teams deleted successfully (mock mode)` }
    }

    const results = []
    for (const { department, team } of teams) {
      const result = await deleteTeam(department, team)
      results.push({ department, team, ...result })
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => r.error).length

    if (failed === 0) {
      revalidatePath("/admin/system-config")
      return { success: true, message: `All ${successful} teams deleted successfully` }
    } else if (successful === 0) {
      return { error: `Failed to delete all teams: ${results.find(r => r.error)?.error}` }
    } else {
      revalidatePath("/admin/system-config")
      return { 
        success: true, 
        message: `${successful} teams deleted successfully, ${failed} failed`,
        warnings: results.filter(r => r.error).map(r => `${r.department}/${r.team}: ${r.error}`)
      }
    }
  } catch (error) {
    console.error("Bulk delete teams error:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Get department usage statistics
export async function getDepartmentUsageStats() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return {
        success: true,
        data: {
          totalDepartments: 11,
          totalTeams: 65,
          usersByDepartment: { IT: 3, HR: 2, Marketing: 1 },
          goalsByDepartment: { IT: 5, HR: 2, Marketing: 3 },
          teamsByDepartment: { IT: 6, HR: 5, Marketing: 5, Finance: 5, Operations: 5, Sales: 5, 'Customer Service': 4, 'Product Development': 4, 'Quality Assurance': 4, Legal: 4, Administration: 4 }
        }
      }
    }

    // Get department team counts
    const { data: teams } = await supabaseAdmin
      .from("department_teams")
      .select("department")
      .eq("is_active", true)

    // Get user counts by department
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("department")
      .not("department", "is", null)

    // Get goal counts by department  
    const { data: goals } = await supabaseAdmin
      .from("goals")
      .select("department")

    const usersByDept: Record<string, number> = {}
    users?.forEach(u => {
      if (u.department) {
        usersByDept[u.department] = (usersByDept[u.department] || 0) + 1
      }
    })

    const goalsByDept: Record<string, number> = {}
    goals?.forEach(g => {
      goalsByDept[g.department] = (goalsByDept[g.department] || 0) + 1
    })

    const departmentCounts: Record<string, number> = {}
    teams?.forEach(t => {
      departmentCounts[t.department] = (departmentCounts[t.department] || 0) + 1
    })

    return {
      success: true,
      data: {
        totalDepartments: Object.keys(departmentCounts).length,
        totalTeams: teams?.length || 0,
        usersByDepartment: usersByDept,
        goalsByDepartment: goalsByDept,
        teamsByDepartment: departmentCounts
      }
    }
  } catch (error) {
    console.error("Get department stats error:", error)
    return { error: "An unexpected error occurred" }
  }
}