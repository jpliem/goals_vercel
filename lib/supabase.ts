import { createClient } from "@supabase/supabase-js"

// Create a client with fallback values for preview environments
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "fallback-key-for-preview",
)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          password: string
          role: "Admin" | "Head" | "Employee"
          department: string | null
          skills: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          password: string
          role?: "Admin" | "Head" | "Employee"
          department?: string | null
          skills?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          password?: string
          role?: "Admin" | "Head" | "Employee"
          department?: string | null
          skills?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          name: string
          description: string | null
          context: string | null
          tech_lead_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          context?: string | null
          tech_lead_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          context?: string | null
          tech_lead_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          application_id: string | null
          requestor_id: string
          current_pic_id: string | null
          tech_lead_id: string | null
          executor_id: string | null
          subject: string
          description: string
          tech_lead_notes: string | null
          status:
            | "New"
            | "Initial Analysis"
            | "Pending Assignment"
            | "In Progress"
            | "Pending Clarification"
            | "Code Review"
            | "Rework"
            | "Pending UAT"
            | "Pending Deployment"
            | "Rejected"
            | "Closed"
          priority: "Low" | "Medium" | "High" | "Critical"
          request_type: "enhancement" | "new_application" | "hardware"
          proposed_application_name: string | null
          pic_assignment_history: Array<{
            user_id: string
            assigned_by: string
            role: "current_pic" | "tech_lead" | "executor"
            assigned_at: string
            unassigned_at: string | null
            assignment_reason?: string
          }> | null
          created_at: string
          updated_at: string
          requested_deadline: string | null
          adjusted_deadline: string | null
          assigned_by: string | null
          rejection_reason: string | null
          rejection_type: "Minor Fix" | "Major Change" | "Requirements Issue" | null
          clarification_requests: Array<{
            id: string
            requested_by: string
            requested_from: string
            question: string
            response?: string
            status: "pending" | "responded" | "resolved"
            created_at: string
            responded_at?: string
          }> | null
          previous_status: string | null
          internal_deadline: string | null
          workflow_history: Array<{
            id: string
            timestamp: string
            user_id: string
            user_name: string
            action: "status_change" | "assignment" | "comment" | "clarification" | "approval" | "rejection" | "rework"
            from_status?: string
            to_status?: string
            reason?: string
            comment?: string
          }> | null
          ai_analysis: AIAnalysisData | null
          ai_analysis_status: "pending" | "analyzing" | "completed" | "failed"
        }
        Insert: {
          id?: string
          application_id?: string | null
          requestor_id: string
          current_pic_id?: string | null
          tech_lead_id?: string | null
          executor_id?: string | null
          subject: string
          description: string
          tech_lead_notes?: string | null
          status?:
            | "New"
            | "Initial Analysis"
            | "Pending Assignment"
            | "In Progress"
            | "Pending Clarification"
            | "Code Review"
            | "Rework"
            | "Pending UAT"
            | "Pending Deployment"
            | "Rejected"
            | "Closed"
          priority?: "Low" | "Medium" | "High" | "Critical"
          request_type?: "enhancement" | "new_application" | "hardware"
          proposed_application_name?: string | null
          pic_assignment_history?: Array<{
            user_id: string
            assigned_by: string
            role: "current_pic" | "tech_lead" | "executor"
            assigned_at: string
            unassigned_at: string | null
            assignment_reason?: string
          }> | null
          created_at?: string
          updated_at?: string
          requested_deadline?: string | null
          adjusted_deadline?: string | null
          assigned_by?: string | null
          rejection_reason?: string | null
          rejection_type?: "Minor Fix" | "Major Change" | "Requirements Issue" | null
          clarification_requests?: Array<{
            id: string
            requested_by: string
            requested_from: string
            question: string
            response?: string
            status: "pending" | "responded" | "resolved"
            created_at: string
            responded_at?: string
          }> | null
          previous_status?: string | null
          internal_deadline?: string | null
          workflow_history?: Array<{
            id: string
            timestamp: string
            user_id: string
            user_name: string
            action: "status_change" | "assignment" | "comment" | "clarification" | "approval" | "rejection" | "rework"
            from_status?: string
            to_status?: string
            reason?: string
            comment?: string
          }> | null
          ai_analysis?: AIAnalysisData | null
          ai_analysis_status?: "pending" | "analyzing" | "completed" | "failed"
        }
        Update: {
          id?: string
          application_id?: string | null
          requestor_id?: string
          current_pic_id?: string | null
          tech_lead_id?: string | null
          executor_id?: string | null
          subject?: string
          description?: string
          tech_lead_notes?: string | null
          status?:
            | "New"
            | "Initial Analysis"
            | "Pending Assignment"
            | "In Progress"
            | "Pending Clarification"
            | "Code Review"
            | "Rework"
            | "Pending UAT"
            | "Pending Deployment"
            | "Rejected"
            | "Closed"
          priority?: "Low" | "Medium" | "High" | "Critical"
          request_type?: "enhancement" | "new_application" | "hardware"
          proposed_application_name?: string | null
          pic_assignment_history?: Array<{
            user_id: string
            assigned_by: string
            role: "current_pic" | "tech_lead" | "executor"
            assigned_at: string
            unassigned_at: string | null
            assignment_reason?: string
          }> | null
          created_at?: string
          updated_at?: string
          requested_deadline?: string | null
          adjusted_deadline?: string | null
          assigned_by?: string | null
          rejection_reason?: string | null
          rejection_type?: "Minor Fix" | "Major Change" | "Requirements Issue" | null
          clarification_requests?: Array<{
            id: string
            requested_by: string
            requested_from: string
            question: string
            response?: string
            status: "pending" | "responded" | "resolved"
            created_at: string
            responded_at?: string
          }> | null
          previous_status?: string | null
          internal_deadline?: string | null
          workflow_history?: Array<{
            id: string
            timestamp: string
            user_id: string
            user_name: string
            action: "status_change" | "assignment" | "comment" | "clarification" | "approval" | "rejection" | "rework"
            from_status?: string
            to_status?: string
            reason?: string
            comment?: string
          }> | null
          ai_analysis?: AIAnalysisData | null
          ai_analysis_status?: "pending" | "analyzing" | "completed" | "failed"
        }
      }
      request_attachments: {
        Row: {
          id: string
          request_id: string
          filename: string
          file_path: string
          file_size: number | null
          content_type: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          filename: string
          file_path: string
          file_size?: number | null
          content_type?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          filename?: string
          file_path?: string
          file_size?: number | null
          content_type?: string | null
          uploaded_by?: string
          created_at?: string
        }
      }
      request_comments: {
        Row: {
          id: string
          request_id: string
          user_id: string
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          user_id: string
          comment: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          user_id?: string
          comment?: string
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: string
          description: string | null
          is_sensitive: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          description?: string | null
          is_sensitive?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          description?: string | null
          is_sensitive?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      department_permissions: {
        Row: {
          id: string
          user_id: string
          department: string
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          department: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          department?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
    }
  }
}

// AI Analysis Data Types
export interface AIAnalysisData {
  analysis_content: string
  tech_lead_comments?: string
  model_used: string
  prompt_used: string
  timestamp: string
  complexity_score?: number
  estimated_effort?: string
  identified_risks?: string[]
  recommendations?: string[]
  // Debug information for prompt visibility
  debug_info?: {
    variables_used: Record<string, string>
    prompt_type: 'enhancement' | 'new_application' | 'hardware' | 'default'
    prompt_mode?: 'template' | 'structured'
    character_count: number
    token_estimate?: number
    processing_time_ms?: number
  }
  structured_sections?: {
    enhancement?: {
      technicalAnalysis: string[]
      databaseChanges: string[]
      apiChanges: string[]
      fileModifications: string[]
      implementationSteps: string[]
      complexityAssessment: string[]
    }
    newApp?: {
      systemArchitecture: string[]
      databaseDesign: string[]
      apiDesign: string[]
      applicationStructure: string[]
      mvpFeatures: string[]
      implementationRoadmap: string[]
      complexityAssessment: string[]
    }
    hardware?: {
      hardwareSpecifications: string[]
      procurementAssessment: string[]
      integrationPlanning: string[]
      implementationRoadmap: string[]
      riskAssessment: string[]
    }
  }
  error_info?: {
    error_message: string
    error_code?: string
    retry_count?: number
  }
}

// System Settings Keys
export type SystemSettingKey = 
  | 'ollama_api_url'
  | 'default_ollama_model'
  | 'ai_system_prompt'
  | 'ai_enabled'

// AI Analysis Status
export type AIAnalysisStatus = 'pending' | 'completed' | 'failed' | 'disabled'
