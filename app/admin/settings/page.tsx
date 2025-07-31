import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { getUsers, UserRecord } from "@/lib/goal-database"
import { getActiveAIConfiguration } from "@/actions/ollama-integration"
import { DashboardHeader } from "@/components/dashboard-header"
import { DepartmentManagement } from "@/components/department-management"
import { UserManagementTable } from "@/components/user-management-table"
import { AIConfigManager } from "@/components/admin/ai-config-manager"
import { PDCAFlowVisualizer } from "@/components/pdca-flow-visualizer"
import { SimpleUserDataManager } from "@/components/admin/simple-user-data-manager"
import { SimpleGoalDataManager } from "@/components/admin/simple-goal-data-manager"
import { SimpleDepartmentDataManager } from "@/components/admin/simple-department-data-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Database,
  Shield,
  Activity,
  Download,
  Upload,
  Target,
  Bot,
  Settings,
  UserPlus,
  FileText,
  Zap,
  FileSpreadsheet
} from "lucide-react"
import Link from "next/link"

export default async function AdminSettingsPage() {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  // Only admins can access this page
  if (userSession.role !== "Admin") {
    redirect("/dashboard")
  }

  // Fetch additional data for embedded components
  const usersResult = await getUsers()
  const users = (usersResult.data || []) as unknown as UserRecord[]
  
  const aiConfigResult = await getActiveAIConfiguration()
  const currentAIConfig = aiConfigResult.data

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
              <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage all system configurations in one place
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">Admin Only</Badge>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <main className="max-w-7xl mx-auto pb-12 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex gap-6 min-h-0">
            {/* Sticky Sidebar Navigation */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Quick Navigation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <nav className="space-y-1">
                      <a href="#user-management" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                        <Users className="w-4 h-4 text-indigo-600" />
                        User Management
                      </a>
                      <a href="#organization" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        Organization Structure
                      </a>
                      <a href="#ai-configuration" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                        <Bot className="w-4 h-4 text-purple-600" />
                        AI Configuration
                      </a>
                      <a href="#data-management" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                        <Database className="w-4 h-4 text-green-600" />
                        Data Management
                      </a>
                      <a href="#workflow" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                        <Target className="w-4 h-4 text-orange-600" />
                        Workflow Guide
                      </a>
                      <a href="#system-info" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                        <Activity className="w-4 h-4 text-gray-600" />
                        System Information
                      </a>
                    </nav>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 space-y-8 min-w-0">
              {/* User Management Section */}
              <section id="user-management" className="scroll-mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    User Management
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage user accounts, roles, and permissions
                  </p>
                </div>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Users</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {users.length} total users • {users.filter(u => u.role === 'Admin').length} admins • {users.filter(u => u.is_active).length} active
                        </p>
                      </div>
                      <Link href="/register">
                        <Button size="sm">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add New User
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <UserManagementTable users={users} currentUserId={userSession.id} />
                  </CardContent>
                </Card>
              </section>

              {/* Organization Structure Section */}
              <section id="organization" className="scroll-mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Organization Structure
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage departments, teams, and organizational hierarchy
                  </p>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Department & Team Management</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Create and manage organizational departments and teams. Assign users to appropriate departments and teams.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <DepartmentManagement />
                  </CardContent>
                </Card>
              </section>

              {/* Data Management Section */}
              <section id="data-management" className="scroll-mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-green-600" />
                    Data Management
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Export and import system data with validation
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <SimpleUserDataManager />
                  <SimpleGoalDataManager />
                  <SimpleDepartmentDataManager />
                </div>
              </section>

              {/* AI Configuration Section */}
              <section id="ai-configuration" className="scroll-mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-600" />
                    AI Configuration
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure AI-powered features and analysis tools
                  </p>
                </div>
                
                {/* AI Features Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Bot className="w-8 h-8 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-sm text-blue-900">Goal Analysis</h3>
                          <p className="text-xs text-blue-700">Smart goal insights</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Zap className="w-8 h-8 text-green-600" />
                        <div>
                          <h3 className="font-semibold text-sm text-green-900">Task Automation</h3>
                          <p className="text-xs text-green-700">Auto-generate tasks</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Target className="w-8 h-8 text-purple-600" />
                        <div>
                          <h3 className="font-semibold text-sm text-purple-900">Progress Reports</h3>
                          <p className="text-xs text-purple-700">Intelligent summaries</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-red-600" />
                        <div>
                          <h3 className="font-semibold text-sm text-red-900">Risk Assessment</h3>
                          <p className="text-xs text-red-700">Proactive risk detection</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* AI Configuration Manager */}
                <AIConfigManager initialConfig={currentAIConfig} />
                
                {/* AI Analysis Link */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-purple-600" />
                      AI Analysis Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Access advanced AI-powered analytics and insights for goals and organizational performance.
                    </p>
                    <Link href="/admin/ai-analysis">
                      <Button className="w-full justify-start" variant="outline">
                        <Bot className="w-4 h-4 mr-2" />
                        Open AI Analysis Dashboard
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </section>

              {/* Workflow Documentation Section */}
              <section id="workflow" className="scroll-mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    PDCA Workflow Guide
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Understand the Plan-Do-Check-Act methodology and workflow
                  </p>
                </div>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Workflow Visualization</CardTitle>
                      <Link href="/admin/workflow">
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          Full Documentation
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PDCAFlowVisualizer />
                  </CardContent>
                </Card>
              </section>

              {/* System Information Section */}
              <section id="system-info" className="scroll-mt-6 pb-8">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-600" />
                    System Information
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    View system status and configuration details
                  </p>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Application</h3>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">Version:</span>
                            <span className="ml-2 font-medium">1.0.0</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Environment:</span>
                            <span className="ml-2 font-medium">Production</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Database</h3>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <span className="ml-2 font-medium text-green-600">Connected</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Provider:</span>
                            <span className="ml-2 font-medium">Supabase</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Resources</h3>
                        <div className="space-y-1 text-sm">
                          <div>
                            <Link href="/admin/ai-analysis" className="text-blue-600 hover:underline">
                              AI Analysis Dashboard
                            </Link>
                          </div>
                          <div>
                            <Link href="/register" className="text-blue-600 hover:underline">
                              Add New User
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}