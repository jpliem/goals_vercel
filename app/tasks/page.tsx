import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { MyTasksDashboard } from "@/components/my-tasks-dashboard"

export default async function TasksPage() {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={userSession} currentTab="tasks" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MyTasksDashboard 
          userId={userSession.id} 
          userProfile={{
            id: userSession.id,
            full_name: userSession.full_name,
            department: userSession.department
          }}
        />
      </main>
    </div>
  )
}