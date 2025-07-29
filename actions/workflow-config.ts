"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { supabase as supabaseAdmin } from "@/lib/supabase"

export interface WorkflowRule {
  id: string
  rule_type: 'phase_completion_threshold' | 'mandatory_fields' | 'validation_rule' | 'notification_rule' | 'duration_limit'
  phase: 'Plan' | 'Do' | 'Check' | 'Act' | 'All' | null
  configuration: any
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowConfiguration {
  id: string
  name: string
  description: string | null
  transitions: any
  role_permissions: any
  status_colors: any
  status_icons: any
  is_active: boolean
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// Helper function to log admin actions
async function logAuditAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null = null,
  oldData: any = null,
  newData: any = null,
  metadata: any = {}
) {
  if (!supabaseAdmin) return

  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
        metadata
      })
  } catch (error) {
    console.error('Failed to log audit action:', error)
  }
}

// Workflow Rules Management
export async function getWorkflowRules() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { data: [] } // Return empty array in mock mode
    }

    const { data, error } = await supabaseAdmin
      .from('workflow_rules')
      .select('*')
      .order('rule_type', { ascending: true })
      .order('phase', { ascending: true })

    if (error) {
      console.error('Get workflow rules error:', error)
      return { error: 'Failed to fetch workflow rules' }
    }

    return { data: data as WorkflowRule[] }
  } catch (error) {
    console.error('Get workflow rules error:', error)
    return { error: 'Authentication required' }
  }
}

export async function createWorkflowRule(ruleData: {
  rule_type: WorkflowRule['rule_type']
  phase: WorkflowRule['phase']
  configuration: any
  is_active?: boolean
}) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database not available' }
    }

    const { data, error } = await supabaseAdmin
      .from('workflow_rules')
      .insert({
        ...ruleData,
        created_by: user.id,
        is_active: ruleData.is_active ?? true
      })
      .select()
      .single()

    if (error) {
      console.error('Create workflow rule error:', error)
      return { error: 'Failed to create workflow rule' }
    }

    await logAuditAction(
      user.id,
      'create_workflow_rule',
      'workflow_rule',
      data.id,
      null,
      data
    )

    revalidatePath('/admin/system-config')
    return { success: true, data }
  } catch (error) {
    console.error('Create workflow rule error:', error)
    return { error: 'Authentication required' }
  }
}

export async function updateWorkflowRule(ruleId: string, updates: Partial<WorkflowRule>) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database not available' }
    }

    // Get current rule for audit log
    const { data: currentRule } = await supabaseAdmin
      .from('workflow_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    const { data, error } = await supabaseAdmin
      .from('workflow_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single()

    if (error) {
      console.error('Update workflow rule error:', error)
      return { error: 'Failed to update workflow rule' }
    }

    await logAuditAction(
      user.id,
      'update_workflow_rule',
      'workflow_rule',
      ruleId,
      currentRule,
      data
    )

    revalidatePath('/admin/system-config')
    return { success: true, data }
  } catch (error) {
    console.error('Update workflow rule error:', error)
    return { error: 'Authentication required' }
  }
}

export async function deleteWorkflowRule(ruleId: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database not available' }
    }

    // Get current rule for audit log
    const { data: currentRule } = await supabaseAdmin
      .from('workflow_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    const { error } = await supabaseAdmin
      .from('workflow_rules')
      .delete()
      .eq('id', ruleId)

    if (error) {
      console.error('Delete workflow rule error:', error)
      return { error: 'Failed to delete workflow rule' }
    }

    await logAuditAction(
      user.id,
      'delete_workflow_rule',
      'workflow_rule',
      ruleId,
      currentRule,
      null
    )

    revalidatePath('/admin/system-config')
    return { success: true }
  } catch (error) {
    console.error('Delete workflow rule error:', error)
    return { error: 'Authentication required' }
  }
}

// Workflow Configurations Management
export async function getWorkflowConfigurations() {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      // Return default configuration in mock mode
      return { 
        data: [{
          id: 'default-config',
          name: 'Default PDCA Workflow',
          description: 'Standard Plan-Do-Check-Act workflow',
          transitions: {
            "Plan": ["Do", "On Hold"],
            "Do": ["Check", "On Hold"],
            "Check": ["Act", "Do", "On Hold"],
            "Act": ["Completed", "Plan", "On Hold"],
            "On Hold": ["Plan", "Do", "Check", "Act"],
            "Completed": [],
            "Cancelled": []
          },
          role_permissions: {
            "Admin": ["*"],
            "Head": ["Plan", "Do", "Check", "Act", "On Hold"],
            "Employee": ["Do", "Check"]
          },
          status_colors: {
            "Plan": "#3b82f6",
            "Do": "#f59e0b",
            "Check": "#10b981",
            "Act": "#8b5cf6",
            "On Hold": "#6b7280",
            "Completed": "#22c55e",
            "Cancelled": "#ef4444"
          },
          status_icons: {
            "Plan": "clipboard-list",
            "Do": "play",
            "Check": "search",
            "Act": "check-circle",
            "On Hold": "pause",
            "Completed": "check-circle-2",
            "Cancelled": "x-circle"
          },
          is_active: true,
          is_default: true,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }] as WorkflowConfiguration[]
      }
    }

    const { data, error } = await supabaseAdmin
      .from('workflow_configurations')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Get workflow configurations error:', error)
      return { error: 'Failed to fetch workflow configurations' }
    }

    return { data: data as WorkflowConfiguration[] }
  } catch (error) {
    console.error('Get workflow configurations error:', error)
    return { error: 'Authentication required' }
  }
}

export async function createWorkflowConfiguration(configData: {
  name: string
  description?: string
  transitions: any
  role_permissions?: any
  status_colors?: any
  status_icons?: any
  is_active?: boolean
}) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database not available' }
    }

    const { data, error } = await supabaseAdmin
      .from('workflow_configurations')
      .insert({
        ...configData,
        created_by: user.id,
        is_active: configData.is_active ?? false,
        is_default: false
      })
      .select()
      .single()

    if (error) {
      console.error('Create workflow configuration error:', error)
      return { error: 'Failed to create workflow configuration' }
    }

    await logAuditAction(
      user.id,
      'create_workflow_configuration',
      'workflow_configuration',
      data.id,
      null,
      data
    )

    revalidatePath('/admin/system-config')
    return { success: true, data }
  } catch (error) {
    console.error('Create workflow configuration error:', error)
    return { error: 'Authentication required' }
  }
}

export async function updateWorkflowConfiguration(configId: string, updates: Partial<WorkflowConfiguration>) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database not available' }
    }

    // Get current configuration for audit log
    const { data: currentConfig } = await supabaseAdmin
      .from('workflow_configurations')
      .select('*')
      .eq('id', configId)
      .single()

    const { data, error } = await supabaseAdmin
      .from('workflow_configurations')
      .update(updates)
      .eq('id', configId)
      .select()
      .single()

    if (error) {
      console.error('Update workflow configuration error:', error)
      return { error: 'Failed to update workflow configuration' }
    }

    await logAuditAction(
      user.id,
      'update_workflow_configuration',
      'workflow_configuration',
      configId,
      currentConfig,
      data
    )

    revalidatePath('/admin/system-config')
    return { success: true, data }
  } catch (error) {
    console.error('Update workflow configuration error:', error)
    return { error: 'Authentication required' }
  }
}

export async function activateWorkflowConfiguration(configId: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database not available' }
    }

    // Deactivate all other configurations first
    await supabaseAdmin
      .from('workflow_configurations')
      .update({ is_active: false, is_default: false })
      .neq('id', configId)

    // Activate the selected configuration
    const { data, error } = await supabaseAdmin
      .from('workflow_configurations')
      .update({ is_active: true, is_default: true })
      .eq('id', configId)
      .select()
      .single()

    if (error) {
      console.error('Activate workflow configuration error:', error)
      return { error: 'Failed to activate workflow configuration' }
    }

    await logAuditAction(
      user.id,
      'activate_workflow_configuration',
      'workflow_configuration',
      configId,
      null,
      data
    )

    revalidatePath('/admin/system-config')
    return { success: true, data }
  } catch (error) {
    console.error('Activate workflow configuration error:', error)
    return { error: 'Authentication required' }
  }
}

export async function deleteWorkflowConfiguration(configId: string) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: 'Admin access required' }
    }

    if (!supabaseAdmin) {
      return { error: 'Database not available' }
    }

    // Get current configuration for audit log
    const { data: currentConfig } = await supabaseAdmin
      .from('workflow_configurations')
      .select('*')
      .eq('id', configId)
      .single()

    // Don't allow deletion of default configuration
    if (currentConfig?.is_default) {
      return { error: 'Cannot delete the default workflow configuration' }
    }

    const { error } = await supabaseAdmin
      .from('workflow_configurations')
      .delete()
      .eq('id', configId)

    if (error) {
      console.error('Delete workflow configuration error:', error)
      return { error: 'Failed to delete workflow configuration' }
    }

    await logAuditAction(
      user.id,
      'delete_workflow_configuration',
      'workflow_configuration',
      configId,
      currentConfig,
      null
    )

    revalidatePath('/admin/system-config')
    return { success: true }
  } catch (error) {
    console.error('Delete workflow configuration error:', error)
    return { error: 'Authentication required' }
  }
}

// Get active workflow configuration for use in goal status transitions
export async function getActiveWorkflowConfiguration(): Promise<{ data?: WorkflowConfiguration; error?: string }> {
  try {
    if (!supabaseAdmin) {
      // Return default configuration in mock mode
      return { 
        data: {
          id: 'default-config',
          name: 'Default PDCA Workflow',
          description: 'Standard Plan-Do-Check-Act workflow',
          transitions: {
            "Plan": ["Do", "On Hold"],
            "Do": ["Check", "On Hold"],
            "Check": ["Act", "Do", "On Hold"],
            "Act": ["Completed", "Plan", "On Hold"],
            "On Hold": ["Plan", "Do", "Check", "Act"],
            "Completed": [],
            "Cancelled": []
          },
          role_permissions: {
            "Admin": ["*"],
            "Head": ["Plan", "Do", "Check", "Act", "On Hold"],
            "Employee": ["Do", "Check"]
          },
          status_colors: {
            "Plan": "#3b82f6",
            "Do": "#f59e0b",
            "Check": "#10b981",
            "Act": "#8b5cf6",
            "On Hold": "#6b7280",
            "Completed": "#22c55e",
            "Cancelled": "#ef4444"
          },
          status_icons: {
            "Plan": "clipboard-list",
            "Do": "play",
            "Check": "search",
            "Act": "check-circle",
            "On Hold": "pause",
            "Completed": "check-circle-2",
            "Cancelled": "x-circle"
          },
          is_active: true,
          is_default: true,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as WorkflowConfiguration
      }
    }

    const { data, error } = await supabaseAdmin
      .from('workflow_configurations')
      .select('*')
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    if (error || !data) {
      // Fallback to any active configuration
      const { data: fallbackData } = await supabaseAdmin
        .from('workflow_configurations')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (fallbackData) {
        return { data: fallbackData as WorkflowConfiguration }
      }

      return { error: 'No active workflow configuration found' }
    }

    return { data: data as WorkflowConfiguration }
  } catch (error) {
    console.error('Get active workflow configuration error:', error)
    return { error: 'Failed to fetch active workflow configuration' }
  }
}

// Get workflow rules for validation
export async function getActiveWorkflowRules(phase?: string): Promise<{ data?: WorkflowRule[]; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { data: [] } // Return empty array in mock mode
    }

    let query = supabaseAdmin
      .from('workflow_rules')
      .select('*')
      .eq('is_active', true)

    if (phase) {
      query = query.or(`phase.eq.${phase},phase.eq.All`)
    }

    const { data, error } = await query.order('rule_type', { ascending: true })

    if (error) {
      console.error('Get active workflow rules error:', error)
      return { error: 'Failed to fetch workflow rules' }
    }

    return { data: data as WorkflowRule[] }
  } catch (error) {
    console.error('Get active workflow rules error:', error)
    return { error: 'Failed to fetch workflow rules' }
  }
}