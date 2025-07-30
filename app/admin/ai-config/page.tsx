import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { AIConfigManager } from "@/components/admin/ai-config-manager"
import { getActiveAIConfiguration } from "@/actions/ollama-integration"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bot, Zap, Shield, TrendingUp } from "lucide-react"
import Link from "next/link"

export default async function AIConfigPage() {
  const userSession = await getCurrentUserProfile()

  if (!userSession) {
    redirect("/login")
  }

  // Only admins can access this page
  if (userSession.role !== "Admin") {
    redirect("/dashboard")
  }

  // Get current AI configuration
  const aiConfigResult = await getActiveAIConfiguration()
  const currentConfig = aiConfigResult.data

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
              <h1 className="text-2xl font-bold text-gray-900">AI Configuration</h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure AI-powered features and settings for enhanced goal management
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">Admin Only</Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Bot className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </div>
        </div>
      </div>

      {/* Feature Overview Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <TrendingUp className="w-8 h-8 text-purple-600" />
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
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <AIConfigManager initialConfig={currentConfig} />
        </div>
      </main>
    </div>
  )
}