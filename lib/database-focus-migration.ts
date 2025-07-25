// Backwards-compatible focus functions for safe migration
// These functions check for both table names and work during the transition period

import { supabaseAdmin } from "./database"

// Helper function to detect which focus table exists
async function getFocusTableName(): Promise<'two_weeks_focus_requests' | 'daily_focus_requests' | null> {
  if (!supabaseAdmin) return null
  
  try {
    // Try the new table first
    const { error: newTableError } = await supabaseAdmin
      .from('two_weeks_focus_requests')
      .select('id')
      .limit(1)
    
    if (!newTableError) {
      return 'two_weeks_focus_requests'
    }
    
    // Fall back to old table
    const { error: oldTableError } = await supabaseAdmin
      .from('daily_focus_requests')
      .select('id')
      .limit(1)
    
    if (!oldTableError) {
      return 'daily_focus_requests'
    }
    
    return null
  } catch (error) {
    console.error('Error detecting focus table:', error)
    return null
  }
}

// Backwards-compatible add function
export async function addTwoWeeksFocusCompatible(userId: string, requestId: string, markedBy: string, focusDate?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for addTwoWeeksFocus')
      return { success: false, error: 'Database not available' }
    }

    const tableName = await getFocusTableName()
    if (!tableName) {
      return { success: false, error: 'No focus table found' }
    }

    const { error } = await supabaseAdmin
      .from(tableName)
      .insert({
        user_id: userId,
        request_id: requestId,
        marked_by: markedBy,
        focus_date: focusDate || new Date().toISOString().split('T')[0]
      })

    if (error) {
      console.error(`Error adding focus to ${tableName}:`, error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in addTwoWeeksFocusCompatible:', error)
    return { success: false, error: 'Failed to add focus' }
  }
}

// Backwards-compatible remove function
export async function removeTwoWeeksFocusCompatible(userId: string, requestId: string, focusDate?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for removeTwoWeeksFocus')
      return { success: false, error: 'Database not available' }
    }

    const tableName = await getFocusTableName()
    if (!tableName) {
      return { success: false, error: 'No focus table found' }
    }

    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .match({
        user_id: userId,
        request_id: requestId,
        focus_date: focusDate || new Date().toISOString().split('T')[0]
      })

    if (error) {
      console.error(`Error removing focus from ${tableName}:`, error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in removeTwoWeeksFocusCompatible:', error)
    return { success: false, error: 'Failed to remove focus' }
  }
}

// Backwards-compatible get function
export async function getTwoWeeksFocusRequestsCompatible(focusDate?: string): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for getTwoWeeksFocusRequests')
      return { data: [], error: null }
    }

    const tableName = await getFocusTableName()
    if (!tableName) {
      return { data: [], error: new Error('No focus table found') }
    }

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('focus_date', focusDate || new Date().toISOString().split('T')[0])

    if (error) {
      console.error(`Error fetching focus requests from ${tableName}:`, error)
      return { data: null, error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error in getTwoWeeksFocusRequestsCompatible:', error)
    return { data: null, error: error as Error }
  }
}

// Backwards-compatible range function
export async function getFocusRequestsRangeCompatible(startDate: string, endDate: string): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for getFocusRequestsRange')
      return { data: [], error: null }
    }

    const tableName = await getFocusTableName()
    if (!tableName) {
      return { data: [], error: new Error('No focus table found') }
    }

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select(`
        *,
        requests:request_id (
          id,
          subject,
          status,
          priority,
          requested_deadline,
          adjusted_deadline,
          internal_deadline,
          requestor_id,
          tech_lead_id,
          executor_id,
          application_id,
          applications:application_id (name)
        ),
        users:user_id (full_name, role, department),
        marked_by_user:marked_by (full_name)
      `)
      .gte('focus_date', startDate)
      .lte('focus_date', endDate)
      .order('focus_date', { ascending: true })

    if (error) {
      console.error(`Error fetching focus requests range from ${tableName}:`, error)
      return { data: null, error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error in getFocusRequestsRangeCompatible:', error)
    return { data: null, error: error as Error }
  }
}

// Cleanup function for old focus data
export async function cleanupOldFocusDataCompatible(daysToKeep: number = 30): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for cleanupOldFocusData')
      return { success: false, error: 'Database not available' }
    }

    const tableName = await getFocusTableName()
    if (!tableName) {
      return { success: false, error: 'No focus table found' }
    }

    // Try to use the database function if available
    try {
      const { data, error } = await supabaseAdmin
        .rpc('cleanup_old_focus_data', { days_to_keep: daysToKeep })

      if (!error && data) {
        return {
          success: (data as any).success,
          deletedCount: (data as any).deleted_count,
          error: (data as any).error
        }
      }
    } catch (funcError) {
      // Database function doesn't exist, fall back to manual cleanup
      console.log('Database cleanup function not available, using manual cleanup')
    }

    // Manual cleanup if function doesn't exist
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    // Get count of records to be deleted
    const { count: deleteCount } = await supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .lt('focus_date', cutoffDateStr)

    // Delete old records
    const { error: deleteError } = await supabaseAdmin
      .from(tableName)
      .delete()
      .lt('focus_date', cutoffDateStr)

    if (deleteError) {
      console.error(`Error cleaning up old focus data from ${tableName}:`, deleteError)
      return { success: false, error: deleteError.message }
    }

    return { success: true, deletedCount: deleteCount || 0 }
  } catch (error) {
    console.error('Error in cleanupOldFocusDataCompatible:', error)
    return { success: false, error: 'Failed to cleanup old focus data' }
  }
}

// Migration status checker
export async function checkFocusMigrationStatus(): Promise<{
  hasOldTable: boolean;
  hasNewTable: boolean;
  oldTableCount: number;
  newTableCount: number;
  migrationNeeded: boolean;
}> {
  if (!supabaseAdmin) {
    return {
      hasOldTable: false,
      hasNewTable: false,
      oldTableCount: 0,
      newTableCount: 0,
      migrationNeeded: false
    }
  }

  try {
    let hasOldTable = false
    let hasNewTable = false
    let oldTableCount = 0
    let newTableCount = 0

    // Check old table
    try {
      const { data: oldData, error: oldError } = await supabaseAdmin
        .from('daily_focus_requests')
        .select('id', { count: 'exact' })
      
      if (!oldError) {
        hasOldTable = true
        oldTableCount = oldData?.length || 0
      }
    } catch (e) {
      // Old table doesn't exist
    }

    // Check new table
    try {
      const { data: newData, error: newError } = await supabaseAdmin
        .from('two_weeks_focus_requests')
        .select('id', { count: 'exact' })
      
      if (!newError) {
        hasNewTable = true
        newTableCount = newData?.length || 0
      }
    } catch (e) {
      // New table doesn't exist
    }

    const migrationNeeded = hasOldTable && (!hasNewTable || oldTableCount > newTableCount)

    return {
      hasOldTable,
      hasNewTable,
      oldTableCount,
      newTableCount,
      migrationNeeded
    }
  } catch (error) {
    console.error('Error checking migration status:', error)
    return {
      hasOldTable: false,
      hasNewTable: false,
      oldTableCount: 0,
      newTableCount: 0,
      migrationNeeded: false
    }
  }
}