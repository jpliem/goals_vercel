import { 
  getRequestById, 
  saveAIAnalysis, 
  getAIConfiguration,
  updateRequestDetails 
} from "@/lib/database"
import { createOllamaService, type AIAnalysisRequest } from "@/lib/ai-service"

function sanitizeInput(input: string): string {
  return input
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim()
}

// Background processing function - runs without authentication
export async function processBackgroundAIAnalysis(requestId: string, customPrompt?: string, customModel?: string) {
  console.log("🤖 Background AI Analysis: Starting background processing for request:", requestId)
  
  try {
    // Add delay to ensure request is committed to database
    await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay
    
    // Update status to 'analyzing' immediately
    await updateRequestDetails(requestId, { ai_analysis_status: 'analyzing' })
    console.log("🤖 Background AI Analysis: Status updated to 'analyzing'")
    
    // Get AI configuration
    const aiConfig = await getAIConfiguration()
    
    if (!aiConfig || !aiConfig.enabled) {
      console.log("🤖 Background AI Analysis: AI is disabled, marking as failed")
      await updateRequestDetails(requestId, { ai_analysis_status: 'failed' })
      return
    }

    // Get request details with simpler query and retry mechanism
    let request
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        // Use a simpler direct query instead of the complex getRequestById
        const { supabaseAdmin } = await import("@/lib/database")
        
        if (!supabaseAdmin) {
          console.error("🤖 Background AI Analysis: No Supabase client available")
          await updateRequestDetails(requestId, { ai_analysis_status: 'failed' })
          return
        }

        const { data, error } = await supabaseAdmin
          .from("requests")
          .select(`
            id,
            subject,
            description,
            priority,
            request_type,
            proposed_application_name,
            application:applications(id, name, description, context)
          `)
          .eq("id", requestId)
          .single() as any

        if (data && !error) {
          request = data
          break // Successfully found the request
        }

        if (error) {
          console.log(`🤖 Background AI Analysis: Query error (attempt ${retryCount + 1}/${maxRetries}):`, error.message)
        } else {
          console.log(`🤖 Background AI Analysis: Request not found (attempt ${retryCount + 1}/${maxRetries}):`, requestId)
        }
      } catch (error) {
        console.log(`🤖 Background AI Analysis: Exception (attempt ${retryCount + 1}/${maxRetries}):`, error)
      }
      
      retryCount++
      
      if (retryCount < maxRetries) {
        // Wait 3 seconds before retrying (increased from 2s)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    
    if (!request) {
      console.error("🤖 Background AI Analysis: Request not found after", maxRetries, "attempts:", requestId)
      await updateRequestDetails(requestId, { ai_analysis_status: 'failed' })
      return
    }

    console.log("🤖 Background AI Analysis: Loaded request:", request.subject)

    // Build application context
    let applicationContext = ""
    if (request.application) {
      const parts = [request.application.name]
      if (request.application.description) {
        parts.push(request.application.description.trim())
      }
      if (request.application.context) {
        parts.push(request.application.context.trim())
      }
      applicationContext = parts.join(' | ')
    } else if (request.proposed_application_name) {
      applicationContext = request.proposed_application_name
    }

    // Create AI service
    const aiService = await createOllamaService({
      model: customModel || aiConfig.model,
      timeout: aiConfig.timeout || 120000,
      maxRetries: aiConfig.maxRetries || 2,
      maxTokens: aiConfig.maxTokens || 100000
    })

    // Build AI analysis request
    const aiAnalysisRequest: AIAnalysisRequest = {
      systemPrompt: customPrompt ? sanitizeInput(customPrompt) : (aiConfig.systemPrompt ? sanitizeInput(aiConfig.systemPrompt) : ''),
      systemPromptEnhancement: customPrompt ? sanitizeInput(customPrompt) : (aiConfig.systemPromptEnhancement ? sanitizeInput(aiConfig.systemPromptEnhancement) : undefined),
      systemPromptNewApplication: customPrompt ? sanitizeInput(customPrompt) : (aiConfig.systemPromptNewApplication ? sanitizeInput(aiConfig.systemPromptNewApplication) : undefined),
      systemPromptHardware: customPrompt ? sanitizeInput(customPrompt) : (aiConfig.systemPromptHardware ? sanitizeInput(aiConfig.systemPromptHardware) : undefined),
      applicationContext: applicationContext || undefined,
      requestDescription: sanitizeInput(request.description),
      requestSubject: request.subject ? sanitizeInput(request.subject) : undefined,
      priority: request.priority || undefined,
      requestType: request.request_type || undefined
    }

    console.log("🤖 Background AI Analysis: Starting AI analysis...")

    // Generate analysis
    const analysisResult = await aiService.generateAnalysis(aiAnalysisRequest)

    if (analysisResult.success && analysisResult.data) {
      console.log("🤖 Background AI Analysis: Analysis completed successfully")
      
      // Save analysis to database
      const saveResult = await saveAIAnalysis(requestId, analysisResult.data)
      
      if (saveResult.success) {
        // Update status to completed
        await updateRequestDetails(requestId, { ai_analysis_status: 'completed' })
        console.log("🤖 Background AI Analysis: Analysis saved and status updated to completed")
      } else {
        console.error("🤖 Background AI Analysis: Failed to save analysis:", saveResult.error)
        await updateRequestDetails(requestId, { ai_analysis_status: 'failed' })
      }
    } else {
      console.error("🤖 Background AI Analysis: Analysis failed:", analysisResult.error)
      await updateRequestDetails(requestId, { ai_analysis_status: 'failed' })
    }

  } catch (error) {
    console.error("🤖 Background AI Analysis: Processing error:", error)
    await updateRequestDetails(requestId, { ai_analysis_status: 'failed' })
  }
}
