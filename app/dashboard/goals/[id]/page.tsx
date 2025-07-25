import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { getGoalById, getUsers } from "@/lib/goal-database"
import { GoalDetails } from "@/components/goal-details"
import { DashboardHeader } from "@/components/dashboard-header"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GoalPage({ params }: PageProps) {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  const { id } = await params
  
  // Handle invalid IDs like "new"
  if (id === "new" || !id) {
    redirect("/dashboard")
  }
  
  const goalResult = await getGoalById(id)

  if (!goalResult.data) {
    redirect("/dashboard")
  }

  // Convert UserSession to UserRecord format
  const userRecord = {
    ...userSession,
    password: "", // Not needed for display
    skills: [],
    team: null,
    department: userSession.department || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Fetch all users for the assignee modal
  const usersResult = await getUsers()
  const users = usersResult.data || []

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={userSession} currentTab="goals" users={users as any} />
      <GoalDetails 
        goal={goalResult.data as any} 
        userProfile={userRecord}
        users={users as any}
      />
    </div>
  )
}