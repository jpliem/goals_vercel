import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DepartmentManagement } from "@/components/department-management"
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
  RotateCcw
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
                    <Upload className="w-5 h-5 text-blue-600" />
                    Bulk User Operations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" disabled>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Users (CSV)
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Export Users (CSV)
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" disabled>
                      <Users className="w-4 h-4 mr-2" />
                      Bulk Assignment
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings Tab */}
            <TabsContent value="system" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-gray-600" />
                      Application Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                      <Activity className="w-5 h-5 text-orange-600" />
                      PDCA Workflow Settings
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
                      Workflow Rules
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Activity className="w-4 h-4 mr-2" />
                      Status Transitions
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                  </CardContent>
                </Card>
              </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </TabsContent>

            {/* Data Management Tab */}
            <TabsContent value="data" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-blue-600" />
                      Export Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Export All Goals
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Export Department Structure
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Export User Assignments
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-green-600" />
                      Import Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Goals (CSV)
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Department Structure
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Upload className="w-4 h-4 mr-2" />
                      Import User Data (CSV)
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    Data Integrity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Monitor and maintain data consistency across the system. Check for orphaned records and relationship integrity.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" disabled>
                      <Activity className="w-4 h-4 mr-2" />
                      Run Integrity Check
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                    <Button variant="outline" disabled>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Fix Data Issues
                      <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                    </Button>
                  </div>
                </CardContent>
              </Card>
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