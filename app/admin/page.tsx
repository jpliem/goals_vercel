import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { getUsers } from "@/lib/goal-database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, Bot, Building2, Database, Download, Upload, Target, Settings, FileText } from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"

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
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          <Badge variant="secondary">Admin Only</Badge>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            
            {/* Admin Settings Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Admin Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Access all system configurations and management tools in one place.
                </p>
                
                {/* Quick Stats */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">System Overview</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{users.length}</div>
                      <div className="text-gray-600">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-600">{users.filter(u => u.role === 'Admin').length}</div>
                      <div className="text-gray-600">Admins</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{users.filter(u => u.is_active).length}</div>
                      <div className="text-gray-600">Active</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Link href="/admin/settings" className="block">
                    <Button className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Open Admin Settings
                    </Button>
                  </Link>
                  <Link href="/admin/settings#user-management" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      User Management
                    </Button>
                  </Link>
                  <Link href="/admin/settings#organization" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Building2 className="w-4 h-4 mr-2" />
                      Departments & Teams
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* AI Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  AI Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Configure AI-powered features for enhanced goal management.
                </p>
                <div className="space-y-2">
                  <Link href="/admin/settings#ai-configuration" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Bot className="w-4 h-4 mr-2" />
                      Configure AI
                    </Button>
                  </Link>
                  <Link href="/admin/ai-analysis" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Bot className="w-4 h-4 mr-2" />
                      AI Analysis
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* PDCA Workflow Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  Workflow & Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Access workflow guides and system documentation.
                </p>
                <div className="space-y-2">
                  <Link href="/admin/settings#workflow" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Target className="w-4 h-4 mr-2" />
                      PDCA Workflow Guide
                    </Button>
                  </Link>
                  <Link href="/admin/workflow" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Full Documentation
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-600" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Export and import data with CSV/Excel support and validation.
                </p>
                <div className="space-y-2">
                  <Link href="/admin/settings#data-management" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </Link>
                  <Link href="/admin/settings#data-management" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </main>
    </div>
  )
}