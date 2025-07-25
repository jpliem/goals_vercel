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
  
  // Load goals - for testing, don't filter by department initially
  console.log('🔍 Dashboard: User session:', { 
    id: userSession.id, 
    email: userSession.email, 
    department: userSession.department 
  })
  
  const goalsResult = await getGoals({
    userId: userSession.id
    // Temporarily remove department filtering to see all goals
    // department: userSession.department
  })
  
  console.log('🔍 Dashboard: Goals result:', { 
    count: goalsResult.data?.length || 0, 
    error: goalsResult.error,
    firstGoal: goalsResult.data?.[0]?.subject || 'None'
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