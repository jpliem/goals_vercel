"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"

interface AIConfig {
  provider: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  goalAnalysisEnabled: boolean
  taskAutoCreationEnabled: boolean
  progressReportsEnabled: boolean
  riskAssessmentEnabled: boolean
  goalAnalysisPrompt: string
  taskCreationPrompt: string
  progressReportPrompt: string
  riskAssessmentPrompt: string
  dailyRequestLimit: number
  monthlyRequestLimit: number
  responseLength: string
  includeSources: boolean
  formatOutput: boolean
}

// In a real implementation, this would be stored in the database
// For now, we'll use a simple in-memory store (this would reset on server restart)
let aiConfig: Partial<AIConfig> = {
  provider: "openai",
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 1000,
  goalAnalysisEnabled: true,
  taskAutoCreationEnabled: false,
  progressReportsEnabled: true,
  riskAssessmentEnabled: false,
  goalAnalysisPrompt: "Analyze this goal and provide suggestions for improvement, potential risks, and recommended tasks to achieve it.",
  taskCreationPrompt: "Break down this goal into specific, actionable tasks following the PDCA methodology.",
  progressReportPrompt: "Generate a progress report based on the current goal status and completed tasks.",
  riskAssessmentPrompt: "Assess potential risks and challenges for this goal and recommend mitigation strategies.",
  dailyRequestLimit: 100,
  monthlyRequestLimit: 3000,
  responseLength: "medium",
  includeSources: true,
  formatOutput: true
}

export async function getAIConfig(): Promise<{ data: Partial<AIConfig> | null; error: string | null }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { data: null, error: "Admin access required" }
    }

    // Return config without API key for security
    const safeConfig = { ...aiConfig }
    if (safeConfig.apiKey) {
      safeConfig.apiKey = "****" + safeConfig.apiKey.slice(-4)
    }

    return { data: safeConfig, error: null }
  } catch (error) {
    console.error("Error getting AI config:", error)
    return { data: null, error: "Failed to get AI configuration" }
  }
}

export async function saveAIConfig(config: Partial<AIConfig>): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { success: false, error: "Admin access required" }
    }

    // Validate config
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      return { success: false, error: "Temperature must be between 0 and 2" }
    }

    if (config.maxTokens !== undefined && (config.maxTokens < 100 || config.maxTokens > 4000)) {
      return { success: false, error: "Max tokens must be between 100 and 4000" }
    }

    if (config.dailyRequestLimit !== undefined && config.dailyRequestLimit < 10) {
      return { success: false, error: "Daily request limit must be at least 10" }
    }

    // In a real implementation, this would save to the database
    // For now, update the in-memory store
    aiConfig = { ...aiConfig, ...config }

    revalidatePath("/admin/ai-config")
    
    return { success: true }
  } catch (error) {
    console.error("Error saving AI config:", error)
    return { success: false, error: "Failed to save AI configuration" }
  }
}

export async function testAIConnection(provider: string, apiKey: string, model: string): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { success: false, error: "Admin access required" }
    }

    if (!apiKey || apiKey.length < 10) {
      return { success: false, error: "Invalid API key" }
    }

    // In a real implementation, this would make an actual API call to test the connection
    // For now, simulate a test based on the provider and key format
    if (provider === "openai" && apiKey.startsWith("sk-")) {
      // Simulate successful connection
      return { 
        success: true, 
        details: { 
          model: model,
          provider: provider,
          status: "connected",
          latency: "150ms"
        } 
      }
    } else {
      return { success: false, error: "Invalid API key format or unsupported provider" }
    }
  } catch (error) {
    console.error("Error testing AI connection:", error)
    return { success: false, error: "Failed to test AI connection" }
  }
}

export async function getAIUsageStats(): Promise<{ data: any | null; error: string | null }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { data: null, error: "Admin access required" }
    }

    // In a real implementation, this would fetch actual usage data from the database
    // For now, return mock data
    const mockStats = {
      today: {
        requests: 0,
        limit: aiConfig.dailyRequestLimit || 100,
        cost: 0.00
      },
      thisMonth: {
        requests: 0,
        limit: aiConfig.monthlyRequestLimit || 3000,
        cost: 0.00
      },
      features: {
        goalAnalysis: { enabled: aiConfig.goalAnalysisEnabled, usage: 0 },
        taskAutoCreation: { enabled: aiConfig.taskAutoCreationEnabled, usage: 0 },
        progressReports: { enabled: aiConfig.progressReportsEnabled, usage: 0 },
        riskAssessment: { enabled: aiConfig.riskAssessmentEnabled, usage: 0 }
      }
    }

    return { data: mockStats, error: null }
  } catch (error) {
    console.error("Error getting AI usage stats:", error)
    return { data: null, error: "Failed to get usage statistics" }
  }
}

// Utility function to check if a specific AI feature is enabled
export async function isAIFeatureEnabled(feature: string): Promise<boolean> {
  try {
    const config = await getAIConfig()
    if (!config.data) return false

    switch (feature) {
      case "goalAnalysis":
        return config.data.goalAnalysisEnabled ?? false
      case "taskAutoCreation":
        return config.data.taskAutoCreationEnabled ?? false
      case "progressReports":
        return config.data.progressReportsEnabled ?? false
      case "riskAssessment":
        return config.data.riskAssessmentEnabled ?? false
      default:
        return false
    }
  } catch (error) {
    console.error("Error checking AI feature status:", error)
    return false
  }
}

// Function to generate AI-powered goal analysis (placeholder)
export async function generateGoalAnalysis(goalId: string, goalData: any): Promise<{ success: boolean; analysis?: string; error?: string }> {
  try {
    const user = await requireAuth()
    
    const isEnabled = await isAIFeatureEnabled("goalAnalysis")
    if (!isEnabled) {
      return { success: false, error: "Goal analysis feature is not enabled" }
    }

    // In a real implementation, this would call the AI API
    // For now, return a mock analysis
    const mockAnalysis = `
## Goal Analysis: ${goalData.subject}

### Strengths
- Clear objective and timeline
- Measurable success criteria defined
- Appropriate department assignment

### Recommendations
- Consider breaking down into smaller milestones
- Add risk mitigation strategies
- Define specific KPIs for progress tracking

### Potential Risks
- Resource availability may impact timeline
- Stakeholder alignment needs verification
- Technical dependencies should be identified

### Suggested Next Steps
1. Conduct stakeholder review meeting
2. Create detailed project timeline
3. Identify resource requirements
4. Set up progress review checkpoints
    `

    return { success: true, analysis: mockAnalysis.trim() }
  } catch (error) {
    console.error("Error generating goal analysis:", error)
    return { success: false, error: "Failed to generate goal analysis" }
  }
}