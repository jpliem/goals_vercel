import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { AIAnalysisTable } from "@/components/admin/ai-analysis-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bot, Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default async function AIAnalysisPage() {
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
      <DashboardHeader user={userSession} currentTab="ai-analysis" />

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
              <h1 className="text-2xl font-bold text-gray-900">AI Goal Analysis</h1>
              <p className="text-sm text-gray-600 mt-1">
                Analyze goals using AI-powered insights and recommendations
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">Admin Only</Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Bot className="w-3 h-3 mr-1" />
              AI Analysis
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-sm text-blue-900">Total Goals</h3>
                  <p className="text-xs text-blue-700">All active goals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-sm text-green-900">Analyzed</h3>
                  <p className="text-xs text-green-700">AI analyzed goals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-sm text-orange-900">Pending</h3>
                  <p className="text-xs text-orange-700">Not yet analyzed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-sm text-purple-900">Insights</h3>
                  <p className="text-xs text-purple-700">Total analyses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                Goals Analysis Dashboard
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Select goals to analyze with AI or view existing analysis results. 
                Click "AI Analyze" to generate comprehensive insights or "View Analysis" to see previous results.
              </p>
            </CardHeader>
            <CardContent>
              <AIAnalysisTable />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}