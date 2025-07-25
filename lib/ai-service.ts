import type { AIAnalysisData } from "./supabase"

export interface OllamaConfig {
  apiUrl: string
  model: string
  timeout?: number
  maxRetries?: number
  maxTokens?: number
  apiKey?: string
  isOpenWebUI?: boolean
  isOpenAICompatible?: boolean
}

export interface AIAnalysisRequest {
  systemPrompt: string
  systemPromptEnhancement?: string
  systemPromptNewApplication?: string
  systemPromptHardware?: string
  applicationContext?: string
  requestDescription: string
  requestSubject?: string
  priority?: string
  requestType?: string
}

export interface AIAnalysisResponse {
  success: boolean
  data?: AIAnalysisData
  error?: {
    message: string
    code?: string
    retryable?: boolean
  }
}

export interface OllamaApiResponse {
  response: string
  model: string
  created_at: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AIServiceError'
  }
}

export class OllamaService {
  private config: OllamaConfig
  private defaultTimeout = 120000 // 120 seconds (2 minutes)
  private defaultMaxRetries = 3
  private defaultMaxTokens = 100000 // 100k tokens

  constructor(config: OllamaConfig) {
    this.config = {
      timeout: this.defaultTimeout,
      maxRetries: this.defaultMaxRetries,
      maxTokens: this.defaultMaxTokens,
      ...config
    }
  }

  private async makeRequest(
    endpoint: string, 
    body: any, 
    attempt: number = 1,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<Response> {
    // Clean up the base URL - remove trailing slashes and any existing path prefixes
    let baseUrl = this.config.apiUrl.replace(/\/$/, '')
    
    // Remove common path suffixes that might have been accidentally included
    baseUrl = baseUrl.replace(/\/ollama\/?$/, '').replace(/\/v1\/?$/, '')
    
    // Build the full URL based on connection type
    let url: string
    if (this.config.isOpenWebUI) {
      // Open WebUI uses /ollama prefix
      url = `${baseUrl}/ollama${endpoint}`
    } else if (this.config.isOpenAICompatible) {
      // OpenAI-compatible APIs use /v1 prefix
      url = `${baseUrl}/v1${endpoint}`
    } else {
      // Standard Ollama - use endpoint as-is
      url = `${baseUrl}${endpoint}`
    }
    
    console.log(`🤖 AI Service: Making ${method} request to ${url}`)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      // Add authentication if provided
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
      }

      const requestOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal
      }

      // Only add body for POST requests
      if (method === 'POST') {
        requestOptions.body = JSON.stringify(body)
      }

      const response = await fetch(url, requestOptions)

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        
        // Determine if error is retryable
        const retryable = response.status >= 500 || 
                         response.status === 429 || 
                         response.status === 408

        throw new AIServiceError(
          `Ollama API error (${response.status}): ${errorText}`,
          `HTTP_${response.status}`,
          retryable
        )
      }

      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIServiceError(
          'Request timeout - Ollama service did not respond in time',
          'TIMEOUT',
          true
        )
      }

      if (error instanceof AIServiceError) {
        throw error
      }

      // Network or other fetch errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorCode = (error as any)?.code
      const isNetworkError = errorMessage.includes('fetch') || 
                           errorCode === 'ECONNREFUSED' ||
                           errorCode === 'ENOTFOUND'

      throw new AIServiceError(
        `Network error: ${errorMessage}`,
        'NETWORK_ERROR',
        isNetworkError
      )
    }
  }

  private async retryRequest(
    endpoint: string,
    body: any,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<Response> {
    let lastError: AIServiceError

    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        return await this.makeRequest(endpoint, body, attempt, method)
      } catch (error) {
        lastError = error instanceof AIServiceError 
          ? error 
          : new AIServiceError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)

        console.log(`AI service attempt ${attempt}/${this.config.maxRetries} failed:`, lastError.message)

        // Don't retry if error is not retryable or if this is the last attempt
        if (!lastError.retryable || attempt === this.config.maxRetries) {
          break
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  private validateModel(model: string): void {
    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      throw new AIServiceError('Model name is required and must be a non-empty string', 'INVALID_MODEL')
    }
  }

  private sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input || '')
    }
    
    // Remove or escape potentially problematic characters
    return input
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
      .trim()
  }

  private replaceVariables(template: string, request: AIAnalysisRequest): { result: string; variables: Record<string, string> } {
    // For the new compact format, use the entire applicationContext as the main context
    // The applicationContext now contains: "AppName - Description | Context" format
    const applicationContext = request.applicationContext || ''
    
    // Variable replacement map using the full context
    const variables: Record<string, string> = {
      '{application_name}': '', // Not used in new format
      '{application_description}': '', // Not used in new format  
      '{application_context}': applicationContext,
      '{request_subject}': request.requestSubject || '',
      '{request_priority}': request.priority || '',
      '{request_type}': request.requestType || '',
      '{request_description}': request.requestDescription || ''
    }
    
    // Replace all variables in the template
    let result = template
    for (const [variable, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value)
    }
    
    return { result, variables }
  }

  private buildPrompt(request: AIAnalysisRequest): { prompt: string; debugInfo: any } {
    let selectedPromptType: 'enhancement' | 'new_application' | 'hardware' | 'default' = 'default'
    let variablesUsed: Record<string, string> = {}
    
    // Select appropriate system prompt based on request type
    let selectedPrompt = request.systemPrompt // Default fallback
    
    if (request.requestType === 'new_application' && request.systemPromptNewApplication) {
      selectedPrompt = request.systemPromptNewApplication
      selectedPromptType = 'new_application'
      console.log('🤖 AI Service: Using new application system prompt')
    } else if (request.requestType === 'hardware' && request.systemPromptHardware) {
      selectedPrompt = request.systemPromptHardware
      selectedPromptType = 'hardware'
      console.log('🤖 AI Service: Using hardware system prompt')
    } else if (request.requestType === 'enhancement' && request.systemPromptEnhancement) {
      selectedPrompt = request.systemPromptEnhancement
      selectedPromptType = 'enhancement'
      console.log('🤖 AI Service: Using enhancement system prompt')
    } else {
      console.log('🤖 AI Service: Using default system prompt for request type:', request.requestType)
    }
    
    // Detect if the prompt is self-contained (uses variables) or needs additional structure
    const hasVariables = selectedPrompt && /\{[^}]+\}/.test(selectedPrompt)
    const isTemplateMode = hasVariables
    
    let finalPrompt: string
    
    if (isTemplateMode) {
      // Template Mode: Just process variables, don't add extra sections
      console.log('🤖 AI Service: Using template mode (prompt contains variables)')
      const { result: processedPrompt, variables } = this.replaceVariables(selectedPrompt, request)
      variablesUsed = variables
      finalPrompt = this.sanitizeInput(processedPrompt)
    } else {
      // Structured Mode: Original behavior with additional sections
      console.log('🤖 AI Service: Using structured mode (prompt has no variables)')
      const parts: string[] = []
      
      // Add system prompt as-is
      if (selectedPrompt) {
        parts.push(`SYSTEM: ${this.sanitizeInput(selectedPrompt)}`)
      }
      
      // Application context
      if (request.applicationContext) {
        parts.push(`APPLICATION CONTEXT: ${this.sanitizeInput(request.applicationContext)}`)
      }
      
      // Request details
      parts.push(`REQUEST TO ANALYZE:`)
      
      if (request.requestSubject) {
        parts.push(`Subject: ${this.sanitizeInput(request.requestSubject)}`)
      }
      
      if (request.priority) {
        parts.push(`Priority: ${this.sanitizeInput(request.priority)}`)
      }
      
      if (request.requestType) {
        parts.push(`Type: ${this.sanitizeInput(request.requestType)}`)
      }
      
      parts.push(`Description: ${this.sanitizeInput(request.requestDescription)}`)
      
      finalPrompt = parts.join('\n\n')
    }
    
    const debugInfo = {
      variables_used: variablesUsed,
      prompt_type: selectedPromptType,
      prompt_mode: isTemplateMode ? 'template' : 'structured',
      character_count: finalPrompt.length,
      token_estimate: Math.ceil(finalPrompt.length / 4) // Rough estimate: 1 token per 4 characters
    }
    
    return { prompt: finalPrompt, debugInfo }
  }

  // Public method to preview the complete prompt that would be sent to AI
  public buildPromptPreview(request: AIAnalysisRequest): {
    sections: {
      systemPrompt: string
      applicationContext: string
      requestDetails: string
    }
    fullPrompt: string
    variables: Record<string, string>
    debugInfo: any
  } {
    // Use the full applicationContext as designed for the new compact format
    const variables: Record<string, string> = {
      '{application_name}': '', // Not used in new format
      '{application_description}': '', // Not used in new format
      '{application_context}': request.applicationContext || '',
      '{request_subject}': request.requestSubject || '',
      '{request_priority}': request.priority || '',
      '{request_type}': request.requestType || '',
      '{request_description}': request.requestDescription || ''
    }

    // Select appropriate system prompt based on request type
    let selectedPrompt = request.systemPrompt // Default fallback
    
    if (request.requestType === 'new_application' && request.systemPromptNewApplication) {
      selectedPrompt = request.systemPromptNewApplication
    } else if (request.requestType === 'hardware' && request.systemPromptHardware) {
      selectedPrompt = request.systemPromptHardware
    } else if (request.requestType === 'enhancement' && request.systemPromptEnhancement) {
      selectedPrompt = request.systemPromptEnhancement
    }
    
    // Build sections
    const { result: processedSystemPrompt } = selectedPrompt ? this.replaceVariables(selectedPrompt, request) : { result: '' }
    const systemPromptSection = processedSystemPrompt ? `SYSTEM: ${processedSystemPrompt}` : ''
    
    const applicationContextSection = request.applicationContext ? `APPLICATION CONTEXT: ${request.applicationContext}` : ''
    
    const requestDetailsParts = ['REQUEST TO ANALYZE:']
    if (request.requestSubject) requestDetailsParts.push(`Subject: ${request.requestSubject}`)
    if (request.priority) requestDetailsParts.push(`Priority: ${request.priority}`)
    if (request.requestType) requestDetailsParts.push(`Type: ${request.requestType}`)
    requestDetailsParts.push(`Description: ${request.requestDescription}`)
    const requestDetailsSection = requestDetailsParts.join('\n')

    // Build full prompt with debug info
    const { prompt: fullPrompt, debugInfo } = this.buildPrompt(request)

    return {
      sections: {
        systemPrompt: systemPromptSection,
        applicationContext: applicationContextSection,
        requestDetails: requestDetailsSection
      },
      fullPrompt,
      variables,
      debugInfo
    }
  }

  private parseAnalysisResponse(responseText: string): Partial<AIAnalysisData> {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(responseText)
      return {
        analysis_content: parsed.analysis || parsed.content || responseText,
        complexity_score: parsed.complexity_score,
        estimated_effort: parsed.estimated_effort,
        identified_risks: parsed.risks || parsed.identified_risks,
        recommendations: parsed.recommendations
      }
    } catch {
      // If not JSON, treat as plain text and try to extract structured data
      const analysis = {
        analysis_content: responseText
      }

      // Simplified: Just store the raw content, no complex parsing needed
      // The frontend displays the full analysis_content directly via MarkdownRenderer

      return analysis
    }
  }


  async generateAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Validate inputs
      this.validateModel(this.config.model)
      
      if (!request.requestDescription?.trim()) {
        throw new AIServiceError('Request description is required', 'MISSING_DESCRIPTION')
      }

      // Build the prompt with debug info
      const { prompt, debugInfo } = this.buildPrompt(request)
      
      console.log(`🤖 AI Analysis: Starting analysis with model ${this.config.model}`)
      console.log(`🤖 AI Analysis: Request prompt length: ${prompt.length} characters`)
      console.log(`🤖 AI Analysis: Timeout: ${this.config.timeout}ms, Max tokens: ${this.config.maxTokens}`)
      console.log(`🤖 AI Analysis: Prompt type: ${debugInfo.prompt_type}`)
      
      const startTime = Date.now()

      let responseText: string

      if (this.config.isOpenAICompatible) {
        // OpenAI-compatible format
        const openAIRequest = {
          model: this.config.model,
          messages: [
            {
              role: "system",
              content: request.systemPrompt
            },
            {
              role: "user", 
              content: prompt.replace(request.systemPrompt + '\n\n', '') // Remove system prompt from user message
            }
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: this.config.maxTokens || this.defaultMaxTokens
        }

        // Note: endpoint already includes /v1 prefix from makeRequest
        const response = await this.retryRequest('/chat/completions', openAIRequest)
        const responseData = await response.json()
        
        if (!responseData.choices?.[0]?.message?.content) {
          throw new AIServiceError('Empty response from OpenAI-compatible API', 'EMPTY_RESPONSE')
        }
        
        responseText = responseData.choices[0].message.content
      } else {
        // Standard Ollama format
        const ollamaRequest = {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            num_predict: this.config.maxTokens || this.defaultMaxTokens
          }
        }

        const response = await this.retryRequest('/api/generate', ollamaRequest)
        const responseData: OllamaApiResponse = await response.json()
        
        if (!responseData.response) {
          throw new AIServiceError('Empty response from Ollama', 'EMPTY_RESPONSE')
        }
        
        responseText = responseData.response
      }

      const duration = Date.now() - startTime
      console.log(`🤖 AI Analysis: Completed successfully in ${duration}ms`)
      console.log(`🤖 AI Analysis: Response length: ${responseText.length} characters`)

      // Parse the response
      const parsedAnalysis = this.parseAnalysisResponse(responseText)

      // Build the final analysis data with debug information
      const analysisData: AIAnalysisData = {
        analysis_content: parsedAnalysis.analysis_content || responseText,
        model_used: this.config.model,
        prompt_used: prompt,
        timestamp: new Date().toISOString(),
        debug_info: {
          ...debugInfo,
          processing_time_ms: duration
        }
      }

      return {
        success: true,
        data: analysisData
      }

    } catch (error) {
      console.error('🤖 AI Analysis Error:', error)

      const aiError = error instanceof AIServiceError 
        ? error 
        : new AIServiceError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)

      return {
        success: false,
        error: {
          message: aiError.message,
          code: aiError.code,
          retryable: aiError.retryable
        }
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      console.log(`🤖 AI Service: Testing connection to ${this.config.apiUrl}`)
      
      let response: Response
      let models: string[] = []
      
      if (this.config.isOpenAICompatible) {
        // OpenAI-compatible endpoint - /v1 prefix is added automatically
        response = await this.makeRequest('/models', null, 1, 'GET')
        const data = await response.json()
        models = data.data?.map((m: any) => m.id) || []
      } else {
        // Standard Ollama endpoint
        response = await this.makeRequest('/api/tags', null, 1, 'GET')
        const data = await response.json()
        models = data.models?.map((m: any) => m.name) || []
      }
      
      console.log(`🤖 AI Service: Connection successful. Available models:`, models)
      
      return {
        success: true,
        models
      }
    } catch (error) {
      const errorMessage = error instanceof AIServiceError 
        ? error.message 
        : `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      console.error('🤖 AI Service: Connection test failed:', errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }
}

// Factory function to create service instance
export async function createOllamaService(config?: Partial<OllamaConfig>): Promise<OllamaService> {
  // Try to get configuration from database settings
  let adminConfig: Partial<OllamaConfig> = {}
  
  try {
    // Import here to avoid circular dependency
    const { getAIConfiguration } = await import("@/lib/database")
    const storedConfig = await getAIConfiguration()
    
    if (storedConfig) {
      adminConfig = {
        apiUrl: storedConfig.apiUrl,
        model: storedConfig.model,
        timeout: storedConfig.timeout,
        maxRetries: storedConfig.maxRetries,
        maxTokens: storedConfig.maxTokens,
        apiKey: storedConfig.apiKey,
        isOpenWebUI: storedConfig.isOpenWebUI,
        isOpenAICompatible: storedConfig.isOpenAICompatible
      }
      console.log("🤖 AI Service: Using database-configured settings", {
        timeout: adminConfig.timeout,
        maxTokens: adminConfig.maxTokens,
        maxRetries: adminConfig.maxRetries
      })
    }
  } catch (error) {
    console.log("🤖 AI Service: Could not load database settings, using defaults")
  }

  const defaultConfig: OllamaConfig = {
    apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_DEFAULT_MODEL || 'llama2',
    timeout: 120000, // 2 minutes default
    maxRetries: 3,
    maxTokens: 100000, // 100k tokens default
    ...adminConfig, // Database settings take precedence over env vars
    ...config       // Explicit config takes precedence over everything
  }

  return new OllamaService(defaultConfig)
}

// Helper function to check if AI service is available
export async function isAIServiceAvailable(): Promise<boolean> {
  try {
    // Check if AI is enabled in admin settings first
    const { getAIConfig } = await import("@/actions/ai-settings")
    const storedConfig = await getAIConfig()
    
    if (storedConfig && !storedConfig.enabled) {
      return false
    }
    
    const service = await createOllamaService()
    const result = await service.testConnection()
    return result.success
  } catch {
    return false
  }
}

// Helper function to preview AI prompts with variable replacement
export async function previewAIPrompt(request: AIAnalysisRequest): Promise<{
  sections: {
    systemPrompt: string
    applicationContext: string
    requestDetails: string
  }
  fullPrompt: string
  variables: Record<string, string>
} | null> {
  try {
    const service = await createOllamaService()
    return service.buildPromptPreview(request)
  } catch {
    return null
  }
}
