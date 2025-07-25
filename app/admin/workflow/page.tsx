import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { PDCAFlowVisualizer } from "@/components/pdca-flow-visualizer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Download } from "lucide-react"
import Link from "next/link"

export default async function WorkflowPage() {
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
              <h1 className="text-2xl font-bold text-gray-900">PDCA Workflow Documentation</h1>
              <p className="text-sm text-gray-600 mt-1">
                Complete visualization and documentation of the goal management workflow
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">Admin Only</Badge>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Guide
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 space-y-8">
          
          {/* Quick Reference Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Workflow Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div><strong>4 PDCA Phases:</strong> Plan → Do → Check → Act</div>
                <div><strong>Multi-Assignee:</strong> Team collaboration support</div>
                <div><strong>Department Support:</strong> Cross-department help</div>
                <div><strong>Status Transitions:</strong> Validated workflow rules</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Key Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div><strong>Real-time:</strong> Live status updates</div>
                <div><strong>Permissions:</strong> Role-based access control</div>
                <div><strong>Notifications:</strong> Automated alerts</div>
                <div><strong>History:</strong> Complete audit trail</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Database Tables
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <Badge variant="outline" className="mr-1 mb-1">goals</Badge>
                <Badge variant="outline" className="mr-1 mb-1">goal_assignees</Badge>
                <Badge variant="outline" className="mr-1 mb-1">goal_support</Badge>
                <Badge variant="outline" className="mr-1 mb-1">goal_comments</Badge>
                <Badge variant="outline" className="mr-1 mb-1">notifications</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Visualizer */}
          <PDCAFlowVisualizer />

          {/* Implementation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Implementation Architecture</CardTitle>
              <p className="text-sm text-muted-foreground">
                Technical details of how the PDCA workflow is implemented in the system
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Frontend Components</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• <code>create-goal-form.tsx</code> - Goal creation UI</li>
                    <li>• <code>pdca-board.tsx</code> - Kanban-style workflow board</li>
                    <li>• <code>goal-details.tsx</code> - Detailed goal management</li>
                    <li>• <code>user-management-table.tsx</code> - Admin user controls</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Backend Services</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• <code>actions/goals.ts</code> - Goal business logic</li>
                    <li>• <code>lib/goal-database.ts</code> - Database operations</li>
                    <li>• <code>lib/goal-notifications.ts</code> - Notification system</li>
                    <li>• <code>actions/admin.ts</code> - Admin management</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-semibold mb-3">Goal Creation Tips</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Define clear, measurable success criteria</li>
                    <li>• Assign specific teams rather than entire departments</li>
                    <li>• Request support early in the planning phase</li>
                    <li>• Set realistic target dates with buffer time</li>
                    <li>• Include all necessary stakeholders as assignees</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">PDCA Execution Tips</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Use comments frequently for status updates</li>
                    <li>• Complete individual tasks before status changes</li>
                    <li>• Review thoroughly in Check phase</li>
                    <li>• Don&apos;t hesitate to loop back if issues found</li>
                    <li>• Document lessons learned in Act phase</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}