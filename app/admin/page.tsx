import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { getUsers } from "@/lib/goal-database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, Settings } from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { UserManagementTable } from "@/components/user-management-table"

export default async function AdminPage() {
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

      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <Badge variant="secondary">Admin Only</Badge>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            
            {/* User Management Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Manage user accounts, roles, and permissions.
                </p>
                <div className="space-y-2">
                  <Link href="/register" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add New User
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-green-600" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Configure system-wide settings and documentation.
                </p>
                <div className="space-y-2">
                  <Link href="/admin/workflow" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      PDCA Workflow Guide
                    </Button>
                  </Link>
                  <Link href="/admin/system-config" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      System Configuration
                    </Button>
                  </Link>
                  <Button className="w-full justify-start" variant="outline" disabled>
                    <Settings className="w-4 h-4 mr-2" />
                    Advanced Settings
                    <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Users</span>
                    <Badge variant="outline">{users.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Admin Users</span>
                    <Badge variant="outline">{users.filter(u => u.role === 'Admin').length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Users</span>
                    <Badge variant="outline">{users.filter(u => u.is_active).length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Management Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                All Users
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage user roles and permissions. Click on the role dropdown to change a user&apos;s role.
              </p>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <UserManagementTable users={users as any} currentUserId={userSession.id} />
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No users found</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by creating your first user account.
                  </p>
                  <Link href="/register">
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First User
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}