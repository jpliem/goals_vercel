import { createClient } from "@supabase/supabase-js";

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check if we have the required environment variables
const hasRequiredEnvVars = supabaseUrl && supabaseServiceKey

if (!hasRequiredEnvVars) {
  console.warn("Missing Supabase environment variables. Using mock data mode.")
}

// Create admin client that bypasses RLS (only if we have env vars)
let supabaseAdmin: ReturnType<typeof createClient> | null = null
let supabaseConnectionStatus: 'connected' | 'disconnected' | 'checking' = 'checking'

if (hasRequiredEnvVars) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    
    // Test the connection asynchronously (non-blocking)
    ;(async () => {
      try {
        const result = await supabaseAdmin
          .from('users')
          .select('count', { count: 'exact', head: true })
        
        if (result.error) {
          console.warn("⚠️ Supabase connection test failed:", result.error.message)
          supabaseConnectionStatus = 'disconnected'
        } else {
          console.log("✅ Supabase connection established")
          supabaseConnectionStatus = 'connected'
        }
      } catch (err: any) {
        console.warn("⚠️ Supabase connection test error:", err.message || err)
        supabaseConnectionStatus = 'disconnected'
      }
    })()
      
  } catch (error) {
    console.error("✗ Failed to initialize Supabase Admin client:", error)
    supabaseAdmin = null
    supabaseConnectionStatus = 'disconnected'
  }
} else {
  supabaseConnectionStatus = 'disconnected'
}

// Export shared client and connection status
export { supabaseAdmin }
export function getSupabaseConnectionStatus(): 'connected' | 'disconnected' | 'checking' {
  return supabaseConnectionStatus
}