import { redirect } from "next/navigation"
import { getCurrentUserProfile, userSessionToRecord } from "@/lib/auth"
import { getGoals, getUserDepartmentPermissions, getDepartmentTeamMappings, getUsers } from "@/lib/goal-database"
import { GoalDashboardContent } from "@/components/goal-dashboard-content"

interface PageProps {
  searchParams: Promise<{ timeFilter?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }
  
  
  // Get user's department permissions (only for non-admin users)
  const userDepartmentPermissionsResult = userSession.role === 'Admin' 
    ? { data: [] } 
    : await getUserDepartmentPermissions(userSession.id)
  const userDepartmentPermissions = userDepartmentPermissionsResult.data || []
  
  // Get department-team mappings for the create goal form
  const departmentTeamMappingsResult = await getDepartmentTeamMappings()
  const departmentTeamMappings = departmentTeamMappingsResult.data || {}
  
  // Load goals with AI analysis data for PDCA board
  const goalsResult = await getGoals({
    userId: userSession.id,
    includeAIAnalysis: true
  })
  
  const userProfileRecord = userSessionToRecord(userSession)
  
  // Fetch all users for the assignee modal
  const usersResult = await getUsers()
  const users = usersResult.data || []

  return (
    <GoalDashboardContent 
      userProfile={userProfileRecord} 
      goals={(goalsResult as any)?.data || goalsResult || []} 
      userDepartmentPermissions={userDepartmentPermissions as string[]}
      departmentTeamMappings={departmentTeamMappings}
      users={users as any}
    />
  )
}