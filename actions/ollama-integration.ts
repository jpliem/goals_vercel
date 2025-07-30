"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/database"
import { buildAnalysisPrompt, buildPureGoalData, buildMetaAnalysisData } from "@/lib/ai-prompt-utils"

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
  meta_prompt?: string
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
        meta_prompt: config.meta_prompt || null,
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 1000,
        is_active: true,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'name'
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

    // Check if system prompt contains {goal_data} template variable
    let completePrompt
    if (systemPrompt.includes('{goal_data}')) {
      // Use template substitution with pure goal data only
      const pureGoalData = buildPureGoalData(goalData)
      completePrompt = systemPrompt.replace('{goal_data}', pureGoalData)
    } else {
      // Use old format for backward compatibility
      completePrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`
    }

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
        prompt: completePrompt,
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

    // Check if analysis already exists for this goal
    const { data: existingAnalysis } = await supabaseAdmin
      .from('goal_ai_analysis')
      .select('id')
      .eq('goal_id', goalId)
      .maybeSingle()

    // Use upsert to replace existing analysis or create new one
    const analysisPayload = {
      goal_id: goalId,
      ai_config_id: config.id,
      analysis_type: analysisType,
      prompt_used: userPrompt,
      analysis_result: result.response || "No response generated",
      confidence_score: null, // Ollama doesn't provide confidence scores
      tokens_used: (result.prompt_eval_count || 0) + (result.eval_count || 0),
      processing_time_ms: endTime - startTime,
      requested_by: user.id,
      created_at: new Date().toISOString()
    }

    let analysisData, dbError

    if (existingAnalysis && existingAnalysis.id) {
      // Update existing analysis
      const { data, error } = await supabaseAdmin
        .from('goal_ai_analysis')
        .update(analysisPayload)
        .eq('id', existingAnalysis.id as string)
        .select('id')
        .single()
      
      analysisData = data
      dbError = error
    } else {
      // Insert new analysis
      const { data, error } = await supabaseAdmin
        .from('goal_ai_analysis')
        .insert(analysisPayload)
        .select('id')
        .single()
      
      analysisData = data
      dbError = error
    }

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

// Helper function to compile comprehensive goal data (exported for prompt preview)
export async function compileGoalData(goalId: string) {
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


// Delete AI analysis
export async function deleteAIAnalysis(analysisId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    
    if (!supabaseAdmin) {
      return { success: false, error: "Database not available" }
    }

    // Check if the analysis exists and if user has permission to delete it
    const { data: analysis, error: fetchError } = await supabaseAdmin
      .from('goal_ai_analysis')
      .select('id, requested_by, goal_id')
      .eq('id', analysisId)
      .single()

    if (fetchError || !analysis) {
      return { success: false, error: "Analysis not found" }
    }

    // User can delete their own analyses, or admins can delete any
    if (analysis.requested_by !== user.id && user.role !== 'Admin') {
      return { success: false, error: "Permission denied" }
    }

    const { error } = await supabaseAdmin
      .from('goal_ai_analysis')
      .delete()
      .eq('id', analysisId)

    if (error) {
      console.error("Database error deleting AI analysis:", error)
      return { success: false, error: "Failed to delete analysis" }
    }

    revalidatePath("/admin/ai-analysis")
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting AI analysis:", error)
    return { success: false, error: "Failed to delete AI analysis" }
  }
}

// Generate meta-summary of all AI analyses
export async function generateMetaSummary(customPrompt?: string): Promise<{ success: boolean; error?: string; analysisId?: string }> {
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

    // Fetch all analyses that user has access to (excluding meta-summaries)
    const { data: analyses, error: fetchError } = await supabaseAdmin
      .from('goal_ai_analysis')
      .select(`
        id,
        analysis_result,
        analysis_type,
        created_at,
        goal_id,
        goals!goal_ai_analysis_goal_id_fkey(subject, department, status)
      `)
      .not('analysis_type', 'eq', 'meta_summary')
      .not('goal_id', 'is', null)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error("Error fetching analyses:", fetchError)
      return { success: false, error: "Failed to fetch analyses for summary" }
    }

    if (!analyses || analyses.length === 0) {
      return { success: false, error: "No goal analyses found to summarize" }
    }

    // Build analysis data for template substitution
    const analysisData = buildMetaAnalysisData(analyses)
    
    // Use custom prompt if provided, otherwise use configured meta_prompt
    const metaPromptTemplate = customPrompt || config.meta_prompt || `You are an executive AI assistant. Please provide a comprehensive meta-analysis of the following analyses. Identify patterns, trends, common issues, and strategic insights across all analyses.

{analysis_data}

Please provide:
1. Executive Summary - Key insights across all analyses
2. Common Patterns - Recurring themes and issues
3. Departmental Insights - Department-specific observations
4. Risk Assessment - Organization-wide risks identified
5. Strategic Recommendations - High-level action items for leadership
6. Success Factors - What's working well across goals

Focus on strategic, actionable insights for leadership decision-making.`
    
    // Check if meta prompt contains {analysis_data} template variable
    let metaPrompt
    if (metaPromptTemplate.includes('{analysis_data}')) {
      metaPrompt = metaPromptTemplate.replace('{analysis_data}', analysisData)
    } else {
      // Use old format for backward compatibility
      metaPrompt = `${metaPromptTemplate}\n\n${analysisData}`
    }

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
        prompt: metaPrompt,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.max_tokens
        }
      }),
      signal: AbortSignal.timeout(120000) // 2 minute timeout for meta-analysis
    })

    if (!response.ok) {
      return { 
        success: false, 
        error: `Meta-analysis generation failed: ${response.status} ${response.statusText}` 
      }
    }

    const result = await response.json()
    const endTime = Date.now()

    // Save meta-summary to database
    const { data: metaData, error: dbError } = await supabaseAdmin
      .from('goal_ai_analysis')
      .insert({
        goal_id: null, // NULL for meta-summaries
        ai_config_id: config.id,
        analysis_type: 'meta_summary',
        prompt_used: customPrompt ? `Custom meta-prompt: ${customPrompt.substring(0, 100)}...` : `Meta-analysis of ${analyses.length} goal analyses`,
        analysis_result: result.response || "No meta-summary generated",
        confidence_score: null,
        tokens_used: (result.prompt_eval_count || 0) + (result.eval_count || 0),
        processing_time_ms: endTime - startTime,
        requested_by: user.id
      })
      .select('id')
      .single()

    if (dbError) {
      console.error("Error saving meta-summary:", dbError)
      return { success: false, error: "Failed to save meta-summary" }
    }

    revalidatePath("/admin/ai-analysis")
    
    return { success: true, analysisId: (metaData as any)?.id }
  } catch (error) {
    console.error("Error generating meta-summary:", error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: "Meta-analysis timeout - please try again" }
    }
    
    return { success: false, error: "Failed to generate meta-summary" }
  }
}

// Get all saved meta-summaries
export async function getMetaSummaries(): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const user = await requireAuth()
    
    if (!supabaseAdmin) {
      return { data: null, error: "Database not available" }
    }

    const { data, error } = await supabaseAdmin
      .from('goal_ai_analysis')
      .select(`
        id,
        analysis_result,
        prompt_used,
        tokens_used,
        processing_time_ms,
        created_at,
        requested_by,
        ai_config_id,
        users!goal_ai_analysis_requested_by_fkey(full_name, email),
        ai_configurations!goal_ai_analysis_ai_config_id_fkey(name, model_name)
      `)
      .eq('analysis_type', 'meta_summary')
      .is('goal_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Database error fetching meta-summaries:", error)
      return { data: null, error: "Failed to fetch meta-summaries" }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error("Error fetching meta-summaries:", error)
    return { data: null, error: "Failed to fetch meta-summaries" }
  }
}

// Function to build complete prompt for preview (exported for prompt preview)
export async function buildCompletePrompt(goalId: string, analysisType: string = 'custom', customPrompt?: string): Promise<{ 
  systemPrompt: string; 
  userPrompt: string; 
  completePrompt: string; 
  error?: string 
}> {
  try {
    // Get active AI configuration
    const configResult = await getActiveAIConfiguration()
    if (!configResult.data) {
      return { 
        systemPrompt: '', 
        userPrompt: '', 
        completePrompt: '', 
        error: "No active AI configuration found. Please configure AI settings first." 
      }
    }

    const config = configResult.data

    // Get comprehensive goal data
    const goalData = await compileGoalData(goalId)
    if (!goalData) {
      return { 
        systemPrompt: '', 
        userPrompt: '', 
        completePrompt: '', 
        error: "Failed to compile goal data" 
      }
    }

    // Build the prompts
    const systemPrompt = config.system_prompt || "You are an AI assistant helping analyze project goals and tasks."
    const userPrompt = customPrompt || buildAnalysisPrompt(goalData, analysisType)
    
    // Check if system prompt contains {goal_data} template variable
    let completePrompt
    if (systemPrompt.includes('{goal_data}')) {
      // Use template substitution with pure goal data only
      const pureGoalData = buildPureGoalData(goalData)
      completePrompt = systemPrompt.replace('{goal_data}', pureGoalData)
    } else {
      // Use old format for backward compatibility
      completePrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`
    }

    return {
      systemPrompt,
      userPrompt,
      completePrompt
    }
  } catch (error) {
    console.error("Error building complete prompt:", error)
    return { 
      systemPrompt: '', 
      userPrompt: '', 
      completePrompt: '', 
      error: "Failed to build prompt" 
    }
  }
}

// Function to build complete meta-analysis prompt for preview (exported for meta-prompt preview)
export async function buildCompleteMetaPrompt(customPrompt?: string): Promise<{ 
  metaPrompt: string; 
  analysisData: string; 
  completePrompt: string; 
  analysisCount: number;
  error?: string 
}> {
  try {
    // Get active AI configuration
    const configResult = await getActiveAIConfiguration()
    if (!configResult.data) {
      return { 
        metaPrompt: '', 
        analysisData: '', 
        completePrompt: '', 
        analysisCount: 0,
        error: "No active AI configuration found. Please configure AI settings first." 
      }
    }

    const config = configResult.data

    if (!supabaseAdmin) {
      return { 
        metaPrompt: '', 
        analysisData: '', 
        completePrompt: '', 
        analysisCount: 0,
        error: "Database not available" 
      }
    }

    // Fetch all analyses (same logic as generateMetaSummary)
    const { data: analyses, error: fetchError } = await supabaseAdmin
      .from('goal_ai_analysis')
      .select(`
        id,
        analysis_result,
        analysis_type,
        created_at,
        goal_id,
        goals!goal_ai_analysis_goal_id_fkey(subject, department, status)
      `)
      .not('analysis_type', 'eq', 'meta_summary')
      .not('goal_id', 'is', null)
      .order('created_at', { ascending: false })

    if (fetchError) {
      return { 
        metaPrompt: '', 
        analysisData: '', 
        completePrompt: '', 
        analysisCount: 0,
        error: "Failed to fetch analyses for preview" 
      }
    }

    if (!analyses || analyses.length === 0) {
      return { 
        metaPrompt: '', 
        analysisData: '', 
        completePrompt: '', 
        analysisCount: 0,
        error: "No goal analyses found to preview" 
      }
    }

    // Build the analysis data
    const analysisData = buildMetaAnalysisData(analyses)
    
    // Use custom prompt if provided, otherwise use configured meta_prompt
    const metaPrompt = customPrompt || config.meta_prompt || "You are an executive AI assistant. Please provide a comprehensive meta-analysis of the following analyses."
    
    // Check if meta prompt contains {analysis_data} template variable
    let completePrompt
    if (metaPrompt.includes('{analysis_data}')) {
      completePrompt = metaPrompt.replace('{analysis_data}', analysisData)
    } else {
      // Use old format for backward compatibility
      completePrompt = `${metaPrompt}\n\n${analysisData}`
    }

    return {
      metaPrompt,
      analysisData,
      completePrompt,
      analysisCount: analyses.length
    }
  } catch (error) {
    console.error("Error building complete meta prompt:", error)
    return { 
      metaPrompt: '', 
      analysisData: '', 
      completePrompt: '', 
      analysisCount: 0,
      error: "Failed to build meta prompt" 
    }
  }
}