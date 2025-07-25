"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { OllamaService } from "@/lib/ai-service"
import { getSystemSetting, setSystemSetting, getAIConfiguration, supabaseAdmin } from "@/lib/database"

export interface AIConfig {
  enabled: boolean
  apiUrl: string
  defaultModel: string
  systemPromptEnhancement: string
  systemPromptNewApplication: string
  systemPromptHardware: string
  systemPromptManagementApplications: string
  systemPromptManagementNewRequests: string
  systemPromptManagementFocus: string
  timeout: number
  maxRetries: number
  maxTokens: number
  apiKey?: string
  isOpenWebUI?: boolean
  isOpenAICompatible?: boolean
}

export interface ConnectionTestParams {
  apiUrl: string
  timeout?: number
  apiKey?: string
  isOpenWebUI?: boolean
  isOpenAICompatible?: boolean
}

// Note: All AI settings are now managed through the database
// The prompts below are used as defaults when creating new configurations

export async function testOllamaConnection(params: ConnectionTestParams) {
  try {
    console.log("🤖 AI Settings: Testing Ollama connection to", params.apiUrl)
    
    // Authenticate and verify admin role
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      console.error("🤖 AI Settings: Unauthorized - user is not admin")
      return { 
        success: false, 
        error: "Unauthorized: Admin access required" 
      }
    }

    // Validate URL format
    try {
      new URL(params.apiUrl)
    } catch {
      return {
        success: false,
        error: "Invalid API URL format"
      }
    }

    // Create a temporary service instance for testing
    const testService = new OllamaService({
      apiUrl: params.apiUrl,
      model: "test", // Model doesn't matter for connection test
      timeout: params.timeout || 10000, // Shorter timeout for connection test
      maxRetries: 1, // Don't retry for connection tests
      apiKey: params.apiKey,
      isOpenWebUI: params.isOpenWebUI,
      isOpenAICompatible: params.isOpenAICompatible
    })

    // Test the connection
    const result = await testService.testConnection()
    
    console.log("🤖 AI Settings: Connection test result:", result)
    
    return result
    
  } catch (error) {
    console.error("🤖 AI Settings: Connection test error:", error)
    return { 
      success: false, 
      error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function fetchOllamaModels(params: ConnectionTestParams) {
  try {
    console.log("🤖 AI Settings: Fetching models from", params.apiUrl)
    
    // Authenticate and verify admin role
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      console.error("🤖 AI Settings: Unauthorized - user is not admin")
      return { 
        success: false, 
        error: "Unauthorized: Admin access required" 
      }
    }

    // Validate URL format
    try {
      new URL(params.apiUrl)
    } catch {
      return {
        success: false,
        error: "Invalid API URL format"
      }
    }

    // Create a temporary service instance
    const testService = new OllamaService({
      apiUrl: params.apiUrl,
      model: "test",
      timeout: 10000,
      maxRetries: 1,
      apiKey: params.apiKey,
      isOpenWebUI: params.isOpenWebUI,
      isOpenAICompatible: params.isOpenAICompatible
    })

    // Fetch available models
    const result = await testService.testConnection()
    
    if (result.success && result.models) {
      console.log("🤖 AI Settings: Found models:", result.models)
      return {
        success: true,
        models: result.models
      }
    } else {
      return {
        success: false,
        error: result.error || "Failed to fetch models"
      }
    }
    
  } catch (error) {
    console.error("🤖 AI Settings: Fetch models error:", error)
    return { 
      success: false, 
      error: `Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function saveAISettings(settings: AIConfig): Promise<{ success: boolean; error?: string; message?: string; usingMockData?: boolean }> {
  try {
    console.log("🤖 AI Settings: Saving AI configuration")
    
    // Authenticate and verify admin role
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      console.error("🤖 AI Settings: Unauthorized - user is not admin")
      return { 
        success: false, 
        error: "Unauthorized: Admin access required" 
      }
    }

    // Validate settings
    if (!settings.apiUrl || !settings.defaultModel) {
      return {
        success: false,
        error: "API URL and default model are required"
      }
    }

    // Validate URL format
    try {
      new URL(settings.apiUrl)
    } catch {
      return {
        success: false,
        error: "Invalid API URL format"
      }
    }

    // Validate numeric values
    if (settings.timeout < 5000 || settings.timeout > 600000) {
      return {
        success: false,
        error: "Timeout must be between 5 and 600 seconds"
      }
    }

    if (settings.maxRetries < 0 || settings.maxRetries > 10) {
      return {
        success: false,
        error: "Max retries must be between 0 and 10"
      }
    }

    if (settings.maxTokens < 1000 || settings.maxTokens > 200000) {
      return {
        success: false,
        error: "Max tokens must be between 1000 and 200000"
      }
    }

    // Check if we're in mock mode
    if (!supabaseAdmin) {
      console.warn("⚠️ AI Settings: Operating in mock data mode - settings will be saved temporarily")
      console.log("🤖 AI Settings: Saving to mock storage...")
      
      // Update in-memory settings for mock mode
      settings = {
        ...settings,
        timeout: Number(settings.timeout),
        maxRetries: Number(settings.maxRetries),
        maxTokens: Number(settings.maxTokens)
      }
      
      return {
        success: true,
        message: "Settings saved temporarily (mock mode). To persist settings, configure database connection.",
        usingMockData: true
      }
    }

    console.log("🤖 AI Settings: Saving to database...")
    console.log("🤖 AI Settings: - Enabled:", settings.enabled)
    console.log("🤖 AI Settings: - API URL:", settings.apiUrl)
    console.log("🤖 AI Settings: - Model:", settings.defaultModel)
    console.log("🤖 AI Settings: - Timeout:", settings.timeout)
    console.log("🤖 AI Settings: - Max Retries:", settings.maxRetries)
    console.log("🤖 AI Settings: - Max Tokens:", settings.maxTokens)
    console.log("🤖 AI Settings: - Is Open WebUI:", settings.isOpenWebUI)
    console.log("🤖 AI Settings: - Is OpenAI Compatible:", settings.isOpenAICompatible)

    // Save settings to database with error handling
    const saveResults = await Promise.allSettled([
      setSystemSetting('ai_enabled', settings.enabled.toString(), 'Enable/disable AI analysis features'),
      setSystemSetting('ollama_api_url', settings.apiUrl, 'Ollama API endpoint URL'),
      setSystemSetting('default_ollama_model', settings.defaultModel, 'Default Ollama model for AI analysis'),
      setSystemSetting('ai_system_prompt_enhancement', settings.systemPromptEnhancement, 'System prompt for enhancement request AI analysis'),
      setSystemSetting('ai_system_prompt_new_application', settings.systemPromptNewApplication, 'System prompt for new application request AI analysis'),
      setSystemSetting('ai_system_prompt_hardware', settings.systemPromptHardware, 'System prompt for hardware request AI analysis'),
      setSystemSetting('ai_system_prompt_management_applications', settings.systemPromptManagementApplications, 'System prompt for management applications analysis'),
      setSystemSetting('ai_system_prompt_management_new_requests', settings.systemPromptManagementNewRequests, 'System prompt for management new requests analysis'),
      setSystemSetting('ai_system_prompt_management_focus', settings.systemPromptManagementFocus, 'System prompt for management focus analysis'),
      setSystemSetting('ai_timeout', settings.timeout.toString(), 'AI request timeout in milliseconds'),
      setSystemSetting('ai_max_retries', settings.maxRetries.toString(), 'Maximum retry attempts for AI requests'),
      setSystemSetting('ai_max_tokens', settings.maxTokens.toString(), 'Maximum tokens for AI response'),
      setSystemSetting('ollama_api_key', settings.apiKey || '', 'API key for Ollama authentication', true),
      setSystemSetting('is_open_webui', (settings.isOpenWebUI || false).toString(), 'Whether the Ollama endpoint is Open WebUI'),
      setSystemSetting('is_openai_compatible', (settings.isOpenAICompatible || false).toString(), 'Whether the endpoint is OpenAI-compatible')
    ])
    
    // Check results
    const settingKeys = ['ai_enabled', 'ollama_api_url', 'default_ollama_model', 'ai_system_prompt_enhancement', 'ai_system_prompt_new_application', 'ai_system_prompt_hardware', 'ai_system_prompt_management_applications', 'ai_system_prompt_management_new_requests', 'ai_system_prompt_management_focus', 'ai_timeout', 'ai_max_retries', 'ai_max_tokens', 'ollama_api_key', 'is_open_webui', 'is_openai_compatible']
    const failedSettings: string[] = []
    let hasNetworkError = false
    
    saveResults.forEach((result, index) => {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
        const error = result.status === 'rejected' ? result.reason : result.value.error
        if (error?.includes('fetch failed') || error?.includes('ECONNREFUSED')) {
          hasNetworkError = true
        }
        failedSettings.push(settingKeys[index])
      }
    })
    
    if (hasNetworkError) {
      console.error("🤖 AI Settings: Database connection failed")
      return {
        success: false,
        error: "Database connection failed. Please check your internet connection and Supabase configuration.",
        usingMockData: true
      }
    }
    
    if (failedSettings.length > 0) {
      console.error("🤖 AI Settings: Failed to save settings:", failedSettings)
      return {
        success: false,
        error: `Failed to save some settings: ${failedSettings.join(', ')}. Please try again.`
      }
    }
    
    console.log("🤖 AI Settings: All settings saved to database successfully")
    
    console.log("🤖 AI Settings: Configuration saved successfully")
    console.log("🤖 AI Settings: Enabled:", settings.enabled)
    console.log("🤖 AI Settings: API URL:", settings.apiUrl)
    console.log("🤖 AI Settings: Default Model:", settings.defaultModel)
    console.log("🤖 AI Settings: Is Open WebUI:", settings.isOpenWebUI)
    
    // Revalidate admin page
    revalidatePath("/admin")
    
    return { 
      success: true, 
      message: "AI settings saved successfully" 
    }
    
  } catch (error: any) {
    console.error("🤖 AI Settings: Save error:", error)
    
    // Provide more user-friendly error messages
    let errorMessage = "Failed to save settings"
    
    if (error?.message?.includes('fetch failed') || error?.message?.includes('ECONNREFUSED')) {
      errorMessage = "Database connection failed. Settings could not be saved. Please check your Supabase configuration."
    } else if (error?.message?.includes('timeout')) {
      errorMessage = "Save operation timed out. Please check your internet connection and try again."
    } else if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return { 
      success: false, 
      error: errorMessage
    }
  }
}

export async function getAISettings(): Promise<{ success: boolean; error?: string; settings?: AIConfig; usingMockData?: boolean }> {
  try {
    console.log("🤖 AI Settings: Retrieving AI configuration from database")
    
    // Authenticate and verify admin role
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      console.error("🤖 AI Settings: Unauthorized - user is not admin")
      return { 
        success: false, 
        error: "Unauthorized: Admin access required" 
      }
    }

    // Load settings from database
    const dbConfig = await getAIConfiguration()
    console.log("🤖 AI Settings: Raw database config loaded")
    console.log("🤖 AI Settings: - Enabled from DB:", dbConfig.enabled)
    console.log("🤖 AI Settings: - API URL from DB:", dbConfig.apiUrl)
    console.log("🤖 AI Settings: - Model from DB:", dbConfig.model)
    
    // Convert database format to AIConfig format
    const settings: AIConfig = {
      enabled: dbConfig.enabled,
      apiUrl: dbConfig.apiUrl,
      defaultModel: dbConfig.model,
      systemPromptEnhancement: dbConfig.systemPromptEnhancement || '',
      systemPromptNewApplication: dbConfig.systemPromptNewApplication || '',
      systemPromptHardware: dbConfig.systemPromptHardware || '',
      systemPromptManagementApplications: dbConfig.systemPromptManagementApplications || '',
      systemPromptManagementNewRequests: dbConfig.systemPromptManagementNewRequests || '',
      systemPromptManagementFocus: dbConfig.systemPromptManagementFocus || '',
      timeout: 30000, // Default timeout
      maxRetries: 3,  // Default retries
      maxTokens: 2000, // Default max tokens
      apiKey: dbConfig.apiKey,
      isOpenWebUI: dbConfig.isOpenWebUI,
      isOpenAICompatible: dbConfig.isOpenAICompatible
    }
    
    // Try to get additional settings from database with error handling
    try {
      const [timeout, maxRetries, maxTokens] = await Promise.allSettled([
        getSystemSetting('ai_timeout'),
        getSystemSetting('ai_max_retries'),
        getSystemSetting('ai_max_tokens')
      ])
      
      if (timeout.status === 'fulfilled' && timeout.value) {
        settings.timeout = parseInt(timeout.value)
        console.log("🤖 AI Settings: - Timeout from DB:", settings.timeout)
      }
      if (maxRetries.status === 'fulfilled' && maxRetries.value) {
        settings.maxRetries = parseInt(maxRetries.value)
        console.log("🤖 AI Settings: - Max retries from DB:", settings.maxRetries)
      }
      if (maxTokens.status === 'fulfilled' && maxTokens.value) {
        settings.maxTokens = parseInt(maxTokens.value)
        console.log("🤖 AI Settings: - Max tokens from DB:", settings.maxTokens)
      }
    } catch (err) {
      console.warn("🤖 AI Settings: Could not load additional settings, using defaults:", err)
    }
    
    console.log("🤖 AI Settings: Configuration retrieved successfully")
    console.log("🤖 AI Settings: Final settings - Enabled:", settings.enabled)
    console.log("🤖 AI Settings: Final settings - API URL:", settings.apiUrl)
    console.log("🤖 AI Settings: Final settings - Model:", settings.defaultModel)
    
    // Check if we're using mock data and add a warning
    if (!supabaseAdmin) {
      console.log("⚠️ AI Settings: Using mock data mode - settings will not persist")
    }
    
    return { 
      success: true, 
      settings,
      usingMockData: !supabaseAdmin
    }
    
  } catch (error: any) {
    console.error("🤖 AI Settings: Get settings error:", error)
    
    // Provide more user-friendly error messages
    let errorMessage = "Failed to retrieve settings"
    
    if (error?.message?.includes('fetch failed') || error?.message?.includes('ECONNREFUSED')) {
      errorMessage = "Database connection failed. The system is operating in mock data mode. Settings shown are defaults and will not persist."
    } else if (error?.message?.includes('timeout')) {
      errorMessage = "Database connection timed out. Please check your internet connection."
    } else if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return { 
      success: false, 
      error: errorMessage,
      usingMockData: true
    }
  }
}

export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    console.log("🤖 AI Settings: getAIConfig - Loading configuration from database")
    
    // This function can be called without admin auth check
    // since it might be needed by the AI service itself
    
    // Load from database first
    const dbConfig = await getAIConfiguration()
    console.log("🤖 AI Settings: getAIConfig - Database config enabled:", dbConfig.enabled)
    
    if (dbConfig.enabled) {
      console.log("🤖 AI Settings: getAIConfig - AI is enabled, building config")
      console.log("🤖 AI Settings: getAIConfig - API URL:", dbConfig.apiUrl)
      console.log("🤖 AI Settings: getAIConfig - Model:", dbConfig.model)
      
      // Convert database format to AIConfig format
      const config: AIConfig = {
        enabled: dbConfig.enabled,
        apiUrl: dbConfig.apiUrl,
        defaultModel: dbConfig.model,
        systemPromptEnhancement: dbConfig.systemPromptEnhancement || '',
        systemPromptNewApplication: dbConfig.systemPromptNewApplication || '',
        systemPromptHardware: dbConfig.systemPromptHardware || '',
        systemPromptManagementApplications: dbConfig.systemPromptManagementApplications || '',
        systemPromptManagementNewRequests: dbConfig.systemPromptManagementNewRequests || '',
        systemPromptManagementFocus: dbConfig.systemPromptManagementFocus || '',
        timeout: 30000, // Default timeout
        maxRetries: 3,  // Default retries
        maxTokens: 2000, // Default max tokens
        apiKey: dbConfig.apiKey,
        isOpenWebUI: dbConfig.isOpenWebUI,
        isOpenAICompatible: dbConfig.isOpenAICompatible
      }
      
      // Try to get additional settings from database
      const [timeout, maxRetries, maxTokens] = await Promise.all([
        getSystemSetting('ai_timeout'),
        getSystemSetting('ai_max_retries'),
        getSystemSetting('ai_max_tokens')
      ])
      
      if (timeout) {
        config.timeout = parseInt(timeout)
        console.log("🤖 AI Settings: getAIConfig - Timeout from DB:", config.timeout)
      }
      if (maxRetries) {
        config.maxRetries = parseInt(maxRetries)
        console.log("🤖 AI Settings: getAIConfig - Max retries from DB:", config.maxRetries)
      }
      if (maxTokens) {
        config.maxTokens = parseInt(maxTokens)
        console.log("🤖 AI Settings: getAIConfig - Max tokens from DB:", config.maxTokens)
      }
      
      console.log("🤖 AI Settings: getAIConfig - Returning complete config")
      return config
    }
    
    console.log("🤖 AI Settings: getAIConfig - AI is disabled, returning null")
    return null
  } catch (error) {
    console.error("🤖 AI Settings: Get config error:", error)
    return null
  }
}

export interface TestAnalysisParams {
  testPrompt: string
  useCurrentSettings?: AIConfig // Optional: use specific settings for testing
}

export async function testAIAnalysis(testPrompt: string, useCurrentSettings?: AIConfig) {
  try {
    console.log("🤖 AI Settings: Testing AI analysis with prompt:", testPrompt?.substring(0, 100) + '...')
    
    // Authenticate and verify admin role
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      console.error("🤖 AI Settings: Unauthorized - user is not admin")
      return { 
        success: false, 
        error: "Unauthorized: Admin access required" 
      }
    }

    // Validate test prompt
    if (!testPrompt || testPrompt.trim().length === 0) {
      console.error("🤖 AI Settings: Empty test prompt provided")
      return {
        success: false,
        error: "Test prompt is required and cannot be empty"
      }
    }

    // Use provided settings or load from database
    let configToUse: AIConfig
    
    if (useCurrentSettings) {
      console.log("🤖 AI Settings: Using provided settings for test")
      configToUse = useCurrentSettings
    } else {
      console.log("🤖 AI Settings: Loading configuration from database")
      const currentConfig = await getAIConfig()
      
      if (!currentConfig) {
        console.error("🤖 AI Settings: No AI configuration found in database")
        // Try to provide helpful mock data response
        if (!supabaseAdmin) {
          console.log("🤖 AI Settings: Supabase not available, providing mock AI analysis result")
          return {
            success: true,
            data: {
              analysis_content: `MOCK AI ANALYSIS for test prompt: "${testPrompt}"
              
              ANALYSIS:
              - This is a mock analysis response since Supabase is not available
              - In a real environment, this would be processed by the configured AI model
              - The test functionality is working correctly in mock mode
              
              COMPLEXITY SCORE: 5
              
              ESTIMATED EFFORT: Mock analysis - no real estimation
              
              IDENTIFIED RISKS:
              - Mock data environment
              - No real AI service connected
              
              RECOMMENDATIONS:
              - Configure Supabase environment variables for full functionality
              - Set up Ollama service for real AI analysis
              - Test with real configuration once environment is ready`,
              model_used: "mock-model",
              prompt_used: testPrompt,
              timestamp: new Date().toISOString(),
              complexity_score: 5,
              estimated_effort: "Mock analysis",
              identified_risks: ["Mock data environment", "No real AI service connected"],
              recommendations: ["Configure Supabase", "Set up Ollama service", "Test with real configuration"]
            }
          }
        }
        return {
          success: false,
          error: "AI configuration not found. Please configure AI settings first."
        }
      }
      configToUse = currentConfig
    }

    // Check if AI is enabled
    if (!configToUse.enabled) {
      console.log("🤖 AI Settings: AI features are disabled")
      return {
        success: false,
        error: "AI features are disabled. Please enable AI in settings first."
      }
    }

    // Validate configuration
    if (!configToUse.apiUrl || !configToUse.defaultModel) {
      console.error("🤖 AI Settings: Invalid configuration - missing API URL or model")
      return {
        success: false,
        error: "Invalid AI configuration. API URL and model are required."
      }
    }

    console.log("🤖 AI Settings: Test Analysis - Configuration summary:")
    console.log("🤖 AI Settings: - API URL:", configToUse.apiUrl)
    console.log("🤖 AI Settings: - Model:", configToUse.defaultModel)
    console.log("🤖 AI Settings: - Enabled:", configToUse.enabled)
    console.log("🤖 AI Settings: - Timeout:", configToUse.timeout)
    console.log("🤖 AI Settings: - IsOpenWebUI:", configToUse.isOpenWebUI)
    console.log("🤖 AI Settings: - IsOpenAICompatible:", configToUse.isOpenAICompatible)

    // Create service instance with configuration
    const aiService = new OllamaService({
      apiUrl: configToUse.apiUrl,
      model: configToUse.defaultModel,
      timeout: configToUse.timeout || 30000,
      maxRetries: configToUse.maxRetries || 1, // Use fewer retries for testing
      maxTokens: configToUse.maxTokens || 2000,
      apiKey: configToUse.apiKey,
      isOpenWebUI: configToUse.isOpenWebUI,
      isOpenAICompatible: configToUse.isOpenAICompatible
    })

    console.log("🤖 AI Settings: Starting AI analysis test...")
    
    // Test connection first
    console.log("🤖 AI Settings: Testing connection to AI service...")
    const connectionTest = await aiService.testConnection()
    
    if (!connectionTest.success) {
      console.error("🤖 AI Settings: Connection test failed:", connectionTest.error)
      return {
        success: false,
        error: `Connection failed: ${connectionTest.error}. Please verify your AI service is running and accessible.`
      }
    }
    
    console.log("🤖 AI Settings: Connection successful, proceeding with analysis...")

    // Perform analysis using enhancement prompt as default for testing
    const result = await aiService.generateAnalysis({
      systemPrompt: configToUse.systemPromptEnhancement,
      systemPromptEnhancement: configToUse.systemPromptEnhancement,
      systemPromptNewApplication: configToUse.systemPromptNewApplication,
      requestDescription: testPrompt,
      requestSubject: "Test Analysis Request",
      priority: "Medium",
      requestType: "enhancement"
    })
    
    console.log("🤖 AI Settings: Test analysis completed. Success:", result.success)
    
    if (result.success) {
      console.log("🤖 AI Settings: Analysis content length:", result.data?.analysis_content?.length || 0)
      console.log("🤖 AI Settings: Model used:", result.data?.model_used)
      console.log("🤖 AI Settings: Complexity score:", result.data?.complexity_score)
    } else {
      console.error("🤖 AI Settings: Analysis failed:", result.error)
    }
    
    return result
    
  } catch (error) {
    console.error("🤖 AI Settings: Test analysis error:", error)
    
    // Provide more detailed error information
    let errorMessage = "Test analysis failed";
    
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`
      
      // Add specific guidance for common errors
      if (error.message.includes('fetch')) {
        errorMessage += " (Network error - check if AI service is running and accessible)"
      } else if (error.message.includes('timeout')) {
        errorMessage += " (Request timeout - try increasing timeout setting or check service performance)"
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage += " (Connection refused - AI service may not be running)"
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    }
  }
}
