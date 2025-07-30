"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/database"

interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parameter_size: string
    quantization_level: string
  }
}

interface AIConfigData {
  name: string
  description?: string
  ollama_url: string
  model_name: string
  system_prompt?: string
  temperature?: number
  max_tokens?: number
}

// Fetch available models from Ollama instance
export async function fetchOllamaModels(ollamaUrl: string): Promise<{ data: OllamaModel[] | null; error: string | null }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { data: null, error: "Admin access required" }
    }

    // Ensure URL ends with /api/tags
    const apiUrl = ollamaUrl.endsWith('/') ? ollamaUrl + 'api/tags' : ollamaUrl + '/api/tags'
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Set timeout to 10 seconds
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      return { 
        data: null, 
        error: `Failed to fetch models: ${response.status} ${response.statusText}` 
      }
    }

    const data = await response.json()
    
    if (!data.models || !Array.isArray(data.models)) {
      return { 
        data: null, 
        error: "Invalid response format from Ollama API" 
      }
    }

    return { data: data.models, error: null }
  } catch (error) {
    console.error("Error fetching Ollama models:", error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return { data: null, error: "Connection timeout - please check Ollama URL" }
    }
    
    return { 
      data: null, 
      error: "Failed to connect to Ollama instance. Please verify the URL is correct." 
    }
  }
}

// Test connection to Ollama with a simple prompt
export async function testOllamaConnection(ollamaUrl: string, modelName: string): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { success: false, error: "Admin access required" }
    }

    const apiUrl = ollamaUrl.endsWith('/') ? ollamaUrl + 'api/generate' : ollamaUrl + '/api/generate'
    
    const testPrompt = "Hello! Please respond with 'Connection successful' to test this integration."
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: testPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 50
        }
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout for generation
    })

    if (!response.ok) {
      return { 
        success: false, 
        error: `Connection test failed: ${response.status} ${response.statusText}` 
      }
    }

    const data = await response.json()
    
    return { 
      success: true, 
      details: {
        model: modelName,
        response: data.response || "Test completed",
        total_duration: data.total_duration,
        load_duration: data.load_duration,
        prompt_eval_count: data.prompt_eval_count,
        eval_count: data.eval_count
      }
    }
  } catch (error) {
    console.error("Error testing Ollama connection:", error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: "Connection timeout - model may be loading" }
    }
    
    return { 
      success: false, 
      error: "Failed to test connection. Please verify URL and model name." 
    }
  }
}

// Save AI configuration to database
export async function saveAIConfiguration(config: AIConfigData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { success: false, error: "Admin access required" }
    }

    if (!supabaseAdmin) {
      return { success: false, error: "Database not available" }
    }

    // Validate required fields
    if (!config.name || !config.ollama_url || !config.model_name) {
      return { success: false, error: "Name, Ollama URL, and model name are required" }
    }

    // Validate temperature range
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      return { success: false, error: "Temperature must be between 0 and 2" }
    }

    // First, set all other configs to inactive
    await supabaseAdmin
      .from('ai_configurations')
      .update({ is_active: false })
      .neq('id', 'placeholder') // Update all rows

    // Insert or update the configuration
    const { data, error } = await supabaseAdmin
      .from('ai_configurations')
      .upsert({
        name: config.name,
        description: config.description || null,
        ollama_url: config.ollama_url,
        model_name: config.model_name,
        system_prompt: config.system_prompt || null,
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 1000,
        is_active: true,
        created_by: user.id,
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error("Database error saving AI config:", error)
      return { success: false, error: "Failed to save configuration to database" }
    }

    revalidatePath("/admin/ai-config")
    revalidatePath("/admin/ai-analysis")
    
    return { success: true, id: (data as any)?.id }
  } catch (error) {
    console.error("Error saving AI configuration:", error)
    return { success: false, error: "Failed to save AI configuration" }
  }
}

// Get active AI configuration
export async function getActiveAIConfiguration(): Promise<{ data: any | null; error: string | null }> {
  try {
    const user = await requireAuth()
    
    if (!supabaseAdmin) {
      return { data: null, error: "Database not available" }
    }

    const { data, error } = await supabaseAdmin
      .from('ai_configurations')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Database error getting AI config:", error)
      return { data: null, error: "Failed to get AI configuration" }
    }

    return { data: data || null, error: null }
  } catch (error) {
    console.error("Error getting AI configuration:", error)
    return { data: null, error: "Failed to get AI configuration" }
  }
}

// Get all AI configurations
export async function getAllAIConfigurations(): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { data: null, error: "Admin access required" }
    }

    if (!supabaseAdmin) {
      return { data: null, error: "Database not available" }
    }

    const { data, error } = await supabaseAdmin
      .from('ai_configurations')
      .select(`
        *,
        created_by_user:users!ai_configurations_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Database error getting AI configs:", error)
      return { data: null, error: "Failed to get AI configurations" }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error("Error getting AI configurations:", error)
    return { data: null, error: "Failed to get AI configurations" }
  }
}

// Delete AI configuration
export async function deleteAIConfiguration(configId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return { success: false, error: "Admin access required" }
    }

    if (!supabaseAdmin) {
      return { success: false, error: "Database not available" }
    }

    // Check if there are any analyses using this config
    const { data: analyses } = await supabaseAdmin
      .from('goal_ai_analysis')
      .select('id')
      .eq('ai_config_id', configId)
      .limit(1)

    if (analyses && analyses.length > 0) {
      return { 
        success: false, 
        error: "Cannot delete configuration that has been used for AI analyses" 
      }
    }

    const { error } = await supabaseAdmin
      .from('ai_configurations')
      .delete()
      .eq('id', configId)

    if (error) {
      console.error("Database error deleting AI config:", error)
      return { success: false, error: "Failed to delete configuration" }
    }

    revalidatePath("/admin/ai-config")
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting AI configuration:", error)
    return { success: false, error: "Failed to delete AI configuration" }
  }
}

// Generate AI analysis using Ollama
export async function generateAIAnalysis(
  goalId: string, 
  analysisType: string = 'custom',
  customPrompt?: string
): Promise<{ success: boolean; error?: string; analysisId?: string }> {
  try {
    const user = await requireAuth()
    
    if (!supabaseAdmin) {
      return { success: false, error: "Database not available" }
    }

    // Get active AI configuration
    const configResult = await getActiveAIConfiguration()
    if (!configResult.data) {
      return { success: false, error: "No active AI configuration found. Please configure AI settings first." }
    }

    const config = configResult.data

    // Get comprehensive goal data (we'll implement this next)
    const goalData = await compileGoalData(goalId)
    if (!goalData) {
      return { success: false, error: "Failed to compile goal data" }
    }

    // Build the prompt
    const systemPrompt = config.system_prompt || "You are an AI assistant helping analyze project goals and tasks."
    const userPrompt = customPrompt || buildAnalysisPrompt(goalData, analysisType)

    // Call Ollama API
    const apiUrl = config.ollama_url.endsWith('/') ? config.ollama_url + 'api/generate' : config.ollama_url + '/api/generate'
    const startTime = Date.now()

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model_name,
        prompt: `${systemPrompt}\n\nUser Request: ${userPrompt}`,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.max_tokens
        }
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    })

    if (!response.ok) {
      return { 
        success: false, 
        error: `AI generation failed: ${response.status} ${response.statusText}` 
      }
    }

    const result = await response.json()
    const endTime = Date.now()

    // Save analysis to database
    const { data: analysisData, error: dbError } = await supabaseAdmin
      .from('goal_ai_analysis')
      .insert({
        goal_id: goalId,
        ai_config_id: config.id,
        analysis_type: analysisType,
        prompt_used: userPrompt,
        analysis_result: result.response || "No response generated",
        confidence_score: null, // Ollama doesn't provide confidence scores
        tokens_used: (result.prompt_eval_count || 0) + (result.eval_count || 0),
        processing_time_ms: endTime - startTime,
        requested_by: user.id
      })
      .select('id')
      .single()

    if (dbError) {
      console.error("Error saving AI analysis:", dbError)
      return { success: false, error: "Failed to save analysis results" }
    }

    revalidatePath("/admin/ai-analysis")
    
    return { success: true, analysisId: (analysisData as any)?.id }
  } catch (error) {
    console.error("Error generating AI analysis:", error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: "AI generation timeout - please try again" }
    }
    
    return { success: false, error: "Failed to generate AI analysis" }
  }
}

// Helper function to compile comprehensive goal data
async function compileGoalData(goalId: string) {
  if (!supabaseAdmin) return null

  try {
    // Get goal with all related data
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select(`
        *,
        owner:users!goals_owner_id_fkey(full_name, email),
        assignees:goal_assignees(
          *,
          user:users!goal_assignees_user_id_fkey(full_name, email)
        ),
        tasks:goal_tasks(
          *,
          assigned_user:users!goal_tasks_assigned_to_fkey(full_name, email),
          assigned_by_user:users!goal_tasks_assigned_by_fkey(full_name, email)
        ),
        comments:goal_comments(
          *,
          user:users!goal_comments_user_id_fkey(full_name, email)
        ),
        support:goal_support(*)
      `)
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      console.error("Error fetching goal data:", goalError)
      return null
    }

    return goal
  } catch (error) {
    console.error("Error compiling goal data:", error)
    return null
  }
}

// Helper function to build analysis prompt based on type
function buildAnalysisPrompt(goalData: any, analysisType: string): string {
  const currentDate = new Date().toISOString().split('T')[0]
  const isOverdue = goalData.target_date && new Date(goalData.target_date) < new Date()
  
  const baseInfo = `
GOAL ANALYSIS REQUEST

Goal: ${goalData.subject}
Department: ${goalData.department}
Status: ${goalData.status}
Priority: ${goalData.priority}
Start Date: ${goalData.start_date || 'Not set'}
Target Date: ${goalData.target_date || 'Not set'}
Current Date: ${currentDate}
${isOverdue ? '⚠️ OVERDUE' : ''}

Description: ${goalData.description}

${goalData.target_metrics ? `Target Metrics: ${goalData.target_metrics}` : ''}
${goalData.success_criteria ? `Success Criteria: ${goalData.success_criteria}` : ''}

Tasks (${goalData.tasks?.length || 0}):
${goalData.tasks?.map((task: any, index: number) => 
  `${index + 1}. [${task.status.toUpperCase()}] ${task.title} (${task.pdca_phase} phase)${task.completion_notes ? ` - ${task.completion_notes}` : ''}`
).join('\n') || 'No tasks defined'}

Comments & Updates (${goalData.comments?.length || 0}):
${goalData.comments?.map((comment: any, index: number) => 
  `${index + 1}. ${comment.user?.full_name || 'Unknown'} (${new Date(comment.created_at).toLocaleDateString()}): ${comment.comment}`
).join('\n') || 'No comments'}

Team:
- Owner: ${goalData.owner?.full_name || 'Unknown'}
- Assignees: ${goalData.assignees?.map((a: any) => a.user?.full_name).join(', ') || 'None'}
- Supporting Departments: ${goalData.support?.map((s: any) => s.support_name).join(', ') || 'None'}
`

  switch (analysisType) {
    case 'risk_assessment':
      return baseInfo + `
Please provide a comprehensive risk assessment for this goal, including:
1. Identified risks and potential blockers
2. Risk severity and likelihood
3. Mitigation strategies
4. Early warning indicators to monitor`

    case 'optimization_suggestions':
      return baseInfo + `
Please analyze this goal and provide optimization suggestions:
1. Areas for improvement in goal structure or approach
2. Task organization and sequencing recommendations
3. Resource allocation suggestions
4. Timeline optimization opportunities`

    case 'progress_review':
      return baseInfo + `
Please provide a detailed progress review:
1. Current progress assessment against timeline
2. Task completion analysis by PDCA phase
3. Identification of bottlenecks or delays
4. Recommendations for acceleration`

    case 'task_breakdown':
      return baseInfo + `
Please suggest additional tasks or task improvements:
1. Missing tasks for successful goal completion
2. Task dependencies and sequencing
3. PDCA phase alignment recommendations
4. Resource and timeline estimates for new tasks`

    default: // 'custom'
      return baseInfo + `
Please provide a comprehensive analysis of this goal including:
1. Overall assessment of goal structure and progress
2. Risk identification and mitigation strategies
3. Optimization opportunities and recommendations
4. Next steps and action items for improved success`
  }
}