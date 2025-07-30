import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DepartmentManagement } from "@/components/department-management"
import { WorkflowRulesEditor } from "@/components/admin/workflow-rules-editor"
import { StatusTransitionsEditor } from "@/components/admin/status-transitions-editor"
import { SimpleUserDataManager } from "@/components/admin/simple-user-data-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Settings, 
  Database,
  FileText,
  Shield,
  Activity,
  Download,
  Upload,
  RotateCcw,
  Target
} from "lucide-react"
import Link from "next/link"

export default async function SystemConfigPage() {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  // Only admins can access this page
  if (userSession.role !== "Admin") {
    redirect("/dashboard")
  }

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
              <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage departments, teams, users, and system settings
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">Admin Only</Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          
          <Tabs defaultValue="departments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Departments
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                System Settings
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Management
              </TabsTrigger>
            </TabsList>

            {/* Department Management Tab */}
            <TabsContent value="departments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Department & Team Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Create and manage organizational departments and teams. Assign users to appropriate departments and teams.
                  </p>
                </CardHeader>
                <CardContent>
                  <DepartmentManagement />
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-600" />
                      User Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Assign users to departments and teams. Manage department permissions for cross-departmental access.
                    </p>
                    <Link href="/admin">
                      <Button className="w-full">
                        <Users className="w-4 h-4 mr-2" />
                        Go to User Management
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      Department Permissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Grant users access to view and manage goals from multiple departments.
                    </p>
                    <Button variant="outline" className="w-full" disabled>
                      <Shield className="w-4 h-4 mr-2" />
                      Permission Management
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    Bulk Operations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    For bulk user import/export operations, use the Data Management tab.
                  </p>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Switch to the <strong>Data Management</strong> tab above to access user import/export tools.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings Tab */}
            <TabsContent value="system" className="space-y-6">
              {/* Workflow Rules Configuration */}
              <WorkflowRulesEditor />
              
              {/* Status Transitions Management */}
              <StatusTransitionsEditor />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-gray-600" />
                      Application Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/admin/workflow">
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="w-4 h-4 mr-2" />
                        View Workflow Documentation
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Settings className="w-4 h-4 mr-2" />
                      General Configuration
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Shield className="w-4 h-4 mr-2" />
                      Security Settings
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <FileText className="w-4 h-4 mr-2" />
                      Email Templates
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-red-600" />
                      System Maintenance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-800">
                        <strong>Warning:</strong> These operations can affect system data. Use with caution and ensure you have proper backups.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" disabled>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Demo Data
                        <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                      </Button>
                      <Button variant="outline" disabled>
                        <Database className="w-4 h-4 mr-2" />
                        Database Cleanup
                        <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                      </Button>
                      <Button variant="outline" disabled>
                        <Activity className="w-4 h-4 mr-2" />
                        System Health Check
                        <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Data Management Tab */}
            <TabsContent value="data" className="space-y-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Export & Import Data</h2>
                <p className="text-sm text-gray-600">
                  Export data to CSV/Excel format and reimport with duplicate validation.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Export/Import Card */}
                <SimpleUserDataManager />

                {/* Goal Export/Import Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Button className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Export Goals
                      </Button>
                      <p className="text-xs text-gray-500">Download all goals as CSV/Excel</p>
                    </div>
                    
                    <div className="border-t pt-4 space-y-2">
                      <Button variant="outline" className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Import Goals
                      </Button>
                      <p className="text-xs text-gray-500">Upload CSV/Excel with duplicate checking</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Department Export/Import Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-purple-600" />
                      Departments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Button className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Export Departments
                      </Button>
                      <p className="text-xs text-gray-500">Download department structure as CSV/Excel</p>
                    </div>
                    
                    <div className="border-t pt-4 space-y-2">
                      <Button variant="outline" className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Import Departments
                      </Button>
                      <p className="text-xs text-gray-500">Upload CSV/Excel with duplicate checking</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* System Information */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Application Version:</span>
                  <br />
                  <span className="text-gray-600">Goal Management System v1.0</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Database Status:</span>
                  <br />
                  <span className="text-green-600">Connected</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Last Backup:</span>
                  <br />
                  <span className="text-gray-600">Manual backups recommended</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}