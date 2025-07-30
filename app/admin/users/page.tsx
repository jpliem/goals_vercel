import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { getUsers } from "@/lib/goal-database"
import { DashboardHeader } from "@/components/dashboard-header"
import { UserManagementTable } from "@/components/user-management-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, UserPlus } from "lucide-react"
import Link from "next/link"

export default async function UsersPage() {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  // Only admins can access this page
  if (userSession.role !== "Admin") {
    redirect("/dashboard")
  }

  // Fetch users for management
  const usersResult = await getUsers()
  const users = usersResult.data || []

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={userSession} currentTab="admin-settings" />

      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage user accounts, roles, departments, and teams
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">Admin Only</Badge>
            <Link href="/register">
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add New User
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                All Users ({users.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View and manage all user accounts. Update roles, departments, and teams for each user.
              </p>
            </CardHeader>
            <CardContent>
              <UserManagementTable users={users as any} currentUserId={userSession.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}