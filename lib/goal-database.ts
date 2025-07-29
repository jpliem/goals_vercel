import { supabaseAdmin } from "./supabase-client";

// User types - simplified for goal system
export interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  password: string;
  role: "Admin" | "Head" | "Employee";
  department: string | null;
  team: string | null;
  skills: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Re-export for compatibility
export type { UserRecord as User };

// Goal-specific types
export interface Goal {
  id: string;
  subject: string;
  description: string;
  goal_type: string;
  priority: string;
  status: string;
  department: string;
  teams: string[];
  progress_percentage: number | null;
  target_metrics: string | null;
  success_criteria: string | null;
  owner_id: string;
  current_assignee_id: string | null;
  start_date: string | null;
  target_date: string | null;
  adjusted_target_date: string | null;
  assignment_history: any[];
  assigned_by: string | null;
  workflow_history: any[];
  previous_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalComment {
  id: string;
  goal_id: string;
  user_id: string;
  comment: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  };
}

export interface GoalAttachment {
  id: string;
  goal_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface GoalTask {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  pdca_phase: 'Plan' | 'Do' | 'Check' | 'Act';
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_user?: UserRecord | null;
  department: string | null;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number;
  actual_hours: number;
  order_index: number;
  completion_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalTaskStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completion_percentage: number;
}

export interface GoalAssignee {
  id: string;
  goal_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: string;
  task_status: string;
  completion_notes: string | null;
  completed_at: string | null;
}

export interface GoalSupport {
  id: string;
  goal_id: string;
  support_type: string;
  support_target: string;
  created_at: string;
}

// Using shared Supabase client from supabase-client.ts

// Extended goal interface with related data
export interface GoalWithDetails extends Goal {
  owner: UserRecord | null
  current_assignee: UserRecord | null
  assignees?: GoalAssignee[]
  comments?: GoalComment[]
  attachments?: GoalAttachment[]
  support?: GoalSupport[]
  tasks?: GoalTask[]
  taskStats?: {
    total_tasks: number
    completed_tasks: number
    pending_tasks: number
    in_progress_tasks: number
    completion_percentage: number
  }
  isFocused?: boolean
}

// Mock data for development
const mockGoals: GoalWithDetails[] = [
  {
    id: '650e8400-e29b-41d4-a716-446655440001',
    subject: 'Improve Customer Satisfaction Scores',
    description: 'Increase customer satisfaction scores from 7.2 to 8.5 through improved support processes and faster response times.',
    goal_type: 'Department',
    priority: 'High',
    status: 'Do',
    department: 'Customer Service',
    teams: ['Support'],
    progress_percentage: 45,
    target_metrics: 'Increase CSAT from 7.2 to 8.5 (target: >8.0)',
    success_criteria: 'Achieve CSAT score of 8.5+ for 3 consecutive months',
    owner_id: '550e8400-e29b-41d4-a716-446655440002',
    current_assignee_id: '550e8400-e29b-41d4-a716-446655440002',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago (already started)
    target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    adjusted_target_date: null,
    assignment_history: [],
    assigned_by: null,
    workflow_history: [],
    previous_status: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'manager@company.com',
      full_name: 'Department Manager',
      password: 'manager123',
      role: 'Employee' as const,
      department: 'Customer Service',
      team: 'Support',
      skills: ['Leadership', 'Process Improvement'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    current_assignee: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'manager@company.com',
      full_name: 'Department Manager',
      password: 'manager123',
      role: 'Employee' as const,
      department: 'Customer Service',
      team: 'Support',
      skills: ['Leadership', 'Process Improvement'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    assignees: [],
    comments: [
      {
        id: 'comment-001',
        goal_id: '650e8400-e29b-41d4-a716-446655440001',
        user_id: '550e8400-e29b-41d4-a716-446655440002',
        comment: 'Started implementing new support ticket routing system to improve response times.',
        is_private: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          full_name: 'Department Manager',
          email: 'manager@company.com',
          role: 'Employee'
        }
      },
      {
        id: 'comment-002',
        goal_id: '650e8400-e29b-41d4-a716-446655440001',
        user_id: '550e8400-e29b-41d4-a716-446655440002',
        comment: 'Customer satisfaction scores have improved from 7.2 to 7.8. On track to meet our target!',
        is_private: false,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          full_name: 'Department Manager',
          email: 'manager@company.com',
          role: 'Employee'
        }
      }
    ]
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440002',
    subject: 'Reduce Development Cycle Time',
    description: 'Streamline development processes to reduce average cycle time from feature request to deployment by 25%.',
    goal_type: 'Team',
    priority: 'Critical',
    status: 'Check',
    department: 'IT',
    teams: ['Development'],
    progress_percentage: 78,
    target_metrics: 'Reduce cycle time from 14 days to 10.5 days (25% reduction)',
    success_criteria: 'Consistent 10.5 day average for 6 weeks',
    owner_id: '550e8400-e29b-41d4-a716-446655440001',
    current_assignee_id: '550e8400-e29b-41d4-a716-446655440001',
    start_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days ago (already started)
    target_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    adjusted_target_date: null,
    assignment_history: [],
    assigned_by: null,
    workflow_history: [],
    previous_status: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'admin@company.com',
      full_name: 'System Administrator',
      password: 'admin123',
      role: 'Admin',
      department: 'IT',
      team: 'Development',
      skills: ['System Administration', 'Project Management'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    current_assignee: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'admin@company.com',
      full_name: 'System Administrator',
      password: 'admin123',
      role: 'Admin',
      department: 'IT',
      team: 'Development',
      skills: ['System Administration', 'Project Management'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    assignees: [],
    comments: [
      {
        id: 'comment-003',
        goal_id: '650e8400-e29b-41d4-a716-446655440002',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        comment: 'Automated testing pipeline deployed successfully. Seeing significant improvement in cycle time.',
        is_private: false,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          full_name: 'System Administrator',
          email: 'admin@company.com',
          role: 'Admin'
        }
      }
    ]
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440003',
    subject: 'Implement Training Program',
    description: 'Design and launch comprehensive training program for new employees to reduce onboarding time.',
    goal_type: 'Company',
    priority: 'Medium',
    status: 'Plan',
    department: 'HR',
    teams: ['Recruitment', 'Training'],
    progress_percentage: 15,
    target_metrics: 'Reduce onboarding time from 30 to 20 days',
    success_criteria: 'All new hires complete training in 20 days with 90%+ satisfaction',
    owner_id: '550e8400-e29b-41d4-a716-446655440003',
    current_assignee_id: '550e8400-e29b-41d4-a716-446655440003',
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now (scheduled for future)
    target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    adjusted_target_date: null,
    assignment_history: [],
    assigned_by: null,
    workflow_history: [],
    previous_status: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      email: 'user@company.com',
      full_name: 'Regular User',
      password: 'user123',
      role: 'Employee',
      department: 'HR',
      team: null,
      skills: ['Training', 'Communication'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    current_assignee: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      email: 'user@company.com',
      full_name: 'Regular User',
      password: 'user123',
      role: 'Employee',
      department: 'HR',
      team: null,
      skills: ['Training', 'Communication'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    assignees: [],
    comments: []
  }
]

// Goal database functions
export async function createGoal(goalData: {
  goal_type: string
  subject: string
  description: string
  priority: string
  department: string
  teams?: string[]
  start_date?: string
  target_date?: string
  target_metrics?: string
  success_criteria?: string
  progress_percentage?: number
  owner_id: string
  workflow_history: any[]
  status: string
  current_assignee_id?: string
}) {
  try {
    if (!supabaseAdmin) {
      // Return mock data with UUID format
      const mockUuid = `${Math.random().toString(16).substr(2, 8)}-${Math.random().toString(16).substr(2, 4)}-4${Math.random().toString(16).substr(2, 3)}-a${Math.random().toString(16).substr(2, 3)}-${Math.random().toString(16).substr(2, 12)}`
      const newGoal = {
        id: mockUuid,
        ...goalData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      return { data: newGoal, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .insert([goalData])
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Create goal error:", error)
    return { data: null, error: error }
  }
}

export async function getGoals(options: {
  userId?: string
  department?: string
  status?: string
  goal_type?: string
  limit?: number
  offset?: number
} = {}) {
  try {
    if (!supabaseAdmin) {
      // Return filtered mock data
      let filteredGoals = [...mockGoals]
      
      if (options.department) {
        filteredGoals = filteredGoals.filter(g => g.department === options.department)
      }
      if (options.status) {
        filteredGoals = filteredGoals.filter(g => g.status === options.status)
      }
      if (options.goal_type) {
        filteredGoals = filteredGoals.filter(g => g.goal_type === options.goal_type)
      }
      
      return { data: filteredGoals, error: null }
    }

    let query = supabaseAdmin
      .from("goals")
      .select(`
        *,
        owner:users!goals_owner_id_fkey(*),
        current_assignee:users!goals_current_assignee_id_fkey(*),
        comments:goal_comments(*, user:users(*)),
        tasks:goal_tasks(*)
      `)

    if (options.department) {
      query = query.eq("department", options.department)
    }
    if (options.status) {
      query = query.eq("status", options.status)
    }
    if (options.goal_type) {
      query = query.eq("goal_type", options.goal_type)
    }
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    // Get assignees for each goal separately (to avoid complex joins)
    if (data && data.length > 0) {
      const goalIds = data.map(g => g.id)
      const { data: assigneesData } = await supabaseAdmin
        .from("goal_assignees")
        .select("*, users!goal_assignees_user_id_fkey(*)")
        .in("goal_id", goalIds)

      // Group assignees by goal_id
      const assigneesByGoal = assigneesData?.reduce((acc, assignee: any) => {
        if (!acc[assignee.goal_id]) acc[assignee.goal_id] = []
        acc[assignee.goal_id].push(assignee)
        return acc
      }, {} as Record<string, any[]>) || {}

      // Add assignees to each goal and calculate task stats
      data.forEach((goal: any) => {
        goal.assignees = assigneesByGoal[goal.id] || []
        
        // Calculate task stats
        if (goal.tasks && goal.tasks.length > 0) {
          const taskStats = {
            total_tasks: goal.tasks.length,
            completed_tasks: goal.tasks.filter((t: GoalTask) => t.status === 'completed').length,
            pending_tasks: goal.tasks.filter((t: GoalTask) => t.status === 'pending').length,
            in_progress_tasks: goal.tasks.filter((t: GoalTask) => t.status === 'in_progress').length,
            completion_percentage: 0
          }
          taskStats.completion_percentage = taskStats.total_tasks > 0 
            ? Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100)
            : 0
          goal.taskStats = taskStats
        } else {
          goal.taskStats = {
            total_tasks: 0,
            completed_tasks: 0,
            pending_tasks: 0,
            in_progress_tasks: 0,
            completion_percentage: 0
          }
        }
      })
    }

    return { data, error: null }
  } catch (error) {
    console.error("Get goals error:", error)
    return { data: mockGoals, error: error }
  }
}

export async function getGoalById(goalId: string) {
  try {
    if (!supabaseAdmin) {
      const goal = mockGoals.find(g => g.id === goalId)
      return { data: goal || null, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .select(`
        *,
        owner:users!goals_owner_id_fkey(*),
        current_assignee:users!goals_current_assignee_id_fkey(*),
        comments:goal_comments(*, user:users(*)),
        attachments:goal_attachments(*),
        support:goal_support(*),
        tasks:goal_tasks(*, assigned_user:users!goal_tasks_assigned_to_fkey(*), assigned_by_user:users!goal_tasks_assigned_by_fkey(*))
      `)
      .eq("id", goalId)
      .single()

    if (error) throw error

    // Get assignees separately
    const { data: assigneesData } = await supabaseAdmin
      .from("goal_assignees")
      .select("*, users!goal_assignees_user_id_fkey(*)")
      .eq("goal_id", goalId)

    if (data) {
      data.assignees = assigneesData || []
      
      // Ensure tasks is always an array (handle Supabase relation errors)
      if (!Array.isArray(data.tasks)) {
        (data as any).tasks = []
      }
      
      // Calculate task stats
      const tasks = data.tasks as unknown as GoalTask[]
      if (tasks && tasks.length > 0) {
        const taskStats = {
          total_tasks: tasks.length,
          completed_tasks: tasks.filter((t: GoalTask) => t.status === 'completed').length,
          pending_tasks: tasks.filter((t: GoalTask) => t.status === 'pending').length,
          in_progress_tasks: tasks.filter((t: GoalTask) => t.status === 'in_progress').length,
          completion_percentage: 0
        }
        taskStats.completion_percentage = taskStats.total_tasks > 0 
          ? Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100)
          : 0
        data.taskStats = taskStats
      } else {
        data.taskStats = {
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          in_progress_tasks: 0,
          completion_percentage: 0
        }
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Get goal by ID error:", error)
    const goal = mockGoals.find(g => g.id === goalId)
    return { data: goal || null, error: error }
  }
}

export async function updateGoalStatus(
  goalId: string, 
  status: string, 
  currentAssigneeId?: string, 
  workflowEntry?: any, 
  previousStatus?: string
) {
  try {
    if (!supabaseAdmin) {
      return { data: { id: goalId }, error: null }
    }

    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    }
    
    if (currentAssigneeId) {
      updateData.current_assignee_id = currentAssigneeId
    }
    
    if (previousStatus !== undefined) {
      updateData.previous_status = previousStatus
    }

    if (workflowEntry) {
      // Get current workflow history and append new entry
      const { data: currentGoal } = await supabaseAdmin
        .from("goals")
        .select("workflow_history")
        .eq("id", goalId)
        .single()

      const currentHistory = Array.isArray(currentGoal?.workflow_history) ? currentGoal.workflow_history : []
      updateData.workflow_history = [...currentHistory, workflowEntry]
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .update(updateData)
      .eq("id", goalId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Update goal status error:", error)
    return { data: null, error: error }
  }
}

// Helper function to add task-related workflow entries
export async function addTaskWorkflowEntry(
  goalId: string,
  userId: string,
  userName: string,
  action: 'task_created' | 'task_completed' | 'task_deleted' | 'task_edited' | 'task_started' | 'tasks_bulk_created',
  details: {
    task_id?: string
    task_title?: string
    task_titles?: string[]
    task_count?: number
    changes?: any
    completion_notes?: string
    previous_status?: string
    new_status?: string
  }
) {
  try {
    if (!supabaseAdmin) {
      return { data: null, error: null }
    }

    // Get current workflow history
    const { data: currentGoal } = await supabaseAdmin
      .from("goals")
      .select("workflow_history")
      .eq("id", goalId)
      .single()

    if (!currentGoal) {
      return { data: null, error: "Goal not found" }
    }

    const currentHistory = Array.isArray(currentGoal.workflow_history) ? currentGoal.workflow_history : []
    
    // Create new workflow entry
    const workflowEntry = {
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      user_id: userId,
      user_name: userName,
      action,
      details
    }

    // Update goal with new workflow history
    const { data, error } = await supabaseAdmin
      .from("goals")
      .update({
        workflow_history: [...currentHistory, workflowEntry],
        updated_at: new Date().toISOString()
      })
      .eq("id", goalId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Add task workflow entry error:", error)
    return { data: null, error: error }
  }
}

export async function updateGoalDetails(goalId: string, updates: {
  subject?: string
  description?: string
  priority?: string
  start_date?: string
  target_date?: string
  adjusted_target_date?: string
  target_metrics?: string
  success_criteria?: string
  progress_percentage?: number
}) {
  try {
    if (!supabaseAdmin) {
      return { data: { id: goalId }, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", goalId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Update goal details error:", error)
    return { data: null, error: error }
  }
}

export async function addGoalComment(goalId: string, comment: string, userId: string) {
  try {
    if (!supabaseAdmin) {
      return { data: { id: `comment-mock-${Date.now()}` }, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_comments")
      .insert([{
        goal_id: goalId,
        user_id: userId,
        comment: comment
      }])
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Add goal comment error:", error)
    return { data: null, error: error }
  }
}

export async function deleteGoal(goalId: string) {
  try {
    if (!supabaseAdmin) {
      return { data: { id: goalId }, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .delete()
      .eq("id", goalId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Delete goal error:", error)
    return { data: null, error: error }
  }
}

export async function assignGoalAssignees(goalId: string, assigneeIds: string[], assignedBy: string) {
  try {
    if (!supabaseAdmin) {
      return { data: assigneeIds.map(id => ({ id: `assignee-mock-${Date.now()}-${id}` })), error: null }
    }

    // First, clear existing assignments
    await supabaseAdmin
      .from("goal_assignees")
      .delete()
      .eq("goal_id", goalId)

    // Then add new assignments
    const assignments = assigneeIds.map(userId => ({
      goal_id: goalId,
      user_id: userId,
      assigned_by: assignedBy,
      task_status: 'pending'
    }))

    const { data, error } = await supabaseAdmin
      .from("goal_assignees")
      .insert(assignments)
      .select()

    return { data, error }
  } catch (error) {
    console.error("Assign goal assignees error:", error)
    return { data: null, error: error }
  }
}

export async function getGoalAssignees(goalId: string) {
  try {
    if (!supabaseAdmin) {
      return { data: [], error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_assignees")
      .select("*, users!goal_assignees_user_id_fkey(*)")
      .eq("goal_id", goalId)

    return { data, error }
  } catch (error) {
    console.error("Get goal assignees error:", error)
    return { data: [], error: error }
  }
}

export async function completeAssigneeTask(goalId: string, assigneeId: string, notes?: string) {
  try {
    if (!supabaseAdmin) {
      return { data: { id: `task-complete-${Date.now()}` }, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_assignees")
      .update({
        task_status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: assigneeId,
        notes: notes
      })
      .eq("goal_id", goalId)
      .eq("user_id", assigneeId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Complete assignee task error:", error)
    return { data: null, error: error }
  }
}

export async function areAllAssigneesComplete(goalId: string) {
  try {
    if (!supabaseAdmin) {
      return { data: true, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_assignees")
      .select("task_status")
      .eq("goal_id", goalId)

    if (error) throw error

    const allComplete = data?.every(assignee => assignee.task_status === 'completed') ?? true
    return { data: allComplete, error: null }
  } catch (error) {
    console.error("Check all assignees complete error:", error)
    return { data: false, error: error }
  }
}

export async function createGoalSupport(supportData: {
  goal_id: string
  support_type: 'Department' | 'Team'
  support_name: string
  support_department?: string
  requested_by: string
  status?: string
}) {
  try {
    if (!supabaseAdmin) {
      return { data: { id: `support-mock-${Date.now()}` }, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_support")
      .insert([supportData])
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Create goal support error:", error)
    return { data: null, error: error }
  }
}

export async function updateGoalSupport(supportId: string, updates: {
  status?: string
  notes?: string
}) {
  try {
    if (!supabaseAdmin) {
      return { data: { id: supportId }, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_support")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", supportId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Update goal support error:", error)
    return { data: null, error: error }
  }
}

// Support requests feature removed - support departments now automatically provide task assignee access

// Attachment functions
export async function uploadGoalAttachment(attachmentData: {
  goal_id: string
  comment_id?: string
  filename: string
  file_path: string
  file_size: number
  content_type: string
  uploaded_by: string
}) {
  try {
    if (!supabaseAdmin) {
      return { data: { id: `attachment-mock-${Date.now()}` }, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_attachments")
      .insert([attachmentData])
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Upload goal attachment error:", error)
    return { data: null, error: error }
  }
}

export function getGoalAttachmentUrl(filePath: string): string {
  if (!supabaseAdmin) {
    return filePath // Return as-is for mock data
  }

  const { data } = supabaseAdmin.storage
    .from('goal-attachments')
    .getPublicUrl(filePath)

  return data.publicUrl
}

// Export connection status fallback
export function getSupabaseConnectionStatus() {
  return {
    connected: !!supabaseAdmin,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "Not configured"
  }
}

// Get department-team mappings
export async function getDepartmentTeamMappings() {
  try {
    if (!supabaseAdmin) {
      // Return mock mappings for development
      return {
        data: {
          'IT': ['Development', 'Infrastructure', 'Security', 'Support', 'Quality Assurance', 'DevOps'],
          'HR': ['Recruitment', 'Training', 'Compensation & Benefits', 'Employee Relations', 'Performance Management'],
          'Finance': ['Accounting', 'Budget & Planning', 'Payroll', 'Audit', 'Treasury'],
          'Operations': ['Production', 'Supply Chain', 'Logistics', 'Quality Control', 'Procurement'],
          'Marketing': ['Digital Marketing', 'Brand Management', 'Content', 'Social Media', 'Analytics'],
          'Sales': ['Inside Sales', 'Field Sales', 'Account Management', 'Sales Support', 'Business Development'],
          'Customer Service': ['Support', 'Success', 'Escalations', 'Training'],
          'Product Development': ['Product Management', 'Design', 'Research', 'Testing'],
          'Quality Assurance': ['Testing', 'Automation', 'Compliance', 'Documentation'],
          'Legal': ['Corporate', 'Contracts', 'Compliance', 'Intellectual Property'],
          'Administration': ['Facilities', 'Office Management', 'Executive Support', 'Reception']
        },
        error: null
      }
    }

    const { data, error } = await supabaseAdmin
      .from("department_teams")
      .select("department, team")
      .eq("is_active", true)
      .order("department", { ascending: true })
      .order("team", { ascending: true })

    if (error) throw error

    // Transform data into department -> teams mapping
    const mappings: Record<string, string[]> = {}
    data?.forEach((row: any) => {
      if (!mappings[row.department]) {
        mappings[row.department] = []
      }
      mappings[row.department].push(row.team)
    })

    return { data: mappings, error: null }
  } catch (error) {
    console.error("Get department team mappings error:", error)
    // Return mock data as fallback
    return {
      data: {
        'IT': ['Development', 'Infrastructure', 'Security', 'Support', 'Quality Assurance', 'DevOps'],
        'HR': ['Recruitment', 'Training', 'Compensation & Benefits', 'Employee Relations', 'Performance Management'],
        'Finance': ['Accounting', 'Budget & Planning', 'Payroll', 'Audit', 'Treasury'],
        'Operations': ['Production', 'Supply Chain', 'Logistics', 'Quality Control', 'Procurement'],
        'Marketing': ['Digital Marketing', 'Brand Management', 'Content', 'Social Media', 'Analytics'],
        'Sales': ['Inside Sales', 'Field Sales', 'Account Management', 'Sales Support', 'Business Development'],
        'Customer Service': ['Support', 'Success', 'Escalations', 'Training'],
        'Product Development': ['Product Management', 'Design', 'Research', 'Testing'],
        'Quality Assurance': ['Testing', 'Automation', 'Compliance', 'Documentation'],
        'Legal': ['Corporate', 'Contracts', 'Compliance', 'Intellectual Property'],
        'Administration': ['Facilities', 'Office Management', 'Executive Support', 'Reception']
      },
      error: error
    }
  }
}

// Additional required function for user department permissions
export async function getUserDepartmentPermissions(userId: string) {
  try {
    if (!supabaseAdmin) {
      return { data: [], error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("department_permissions")
      .select("department")
      .eq("user_id", userId)

    return { data: data?.map(p => p.department) || [], error }
  } catch (error) {
    console.error("Get user department permissions error:", error)
    return { data: [], error: error }
  }
}

// Get user by ID
export async function getUserById(userId: string) {
  try {
    if (!supabaseAdmin) {
      // Return mock user for development
      const mockUser = {
        id: userId,
        email: 'user@company.com',
        full_name: 'Mock User',
        password: 'password123',
        role: 'Employee',
        department: 'IT',
        team: 'Development',
        skills: [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      return { data: mockUser, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    return { data, error }
  } catch (error) {
    console.error("Get user by ID error:", error)
    return { data: null, error }
  }
}

// Create user from session (for cases where user doesn't exist in DB)
export async function createUserFromSession(sessionUser: any) {
  try {
    if (!supabaseAdmin) {
      // Mock mode - always return success
      return { success: true, data: sessionUser }
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([{
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.full_name || sessionUser.email.split('@')[0],
        password: 'temp-password', // This should be handled properly in production
        role: sessionUser.role || 'Employee',
        department: sessionUser.department || 'General',
        team: null,
        skills: [],
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      console.error("Create user from session error:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Create user from session error:", error)
    return { success: false, error }
  }
}

// Get all users function
export async function getUsers() {
  try {
    if (!supabaseAdmin) {
      // Return mock users for development
      return { 
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'admin@company.com',
            full_name: 'System Administrator',
            password: 'admin123',
            role: 'Admin',
            department: 'IT',
            team: 'Development',
            skills: ['System Administration', 'Project Management'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            email: 'manager@company.com',
            full_name: 'Department Manager',
            password: 'manager123',
            role: 'Employee' as const,
            department: 'Customer Service',
            team: 'Support',
            skills: ['Leadership', 'Process Improvement'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            email: 'user@company.com',
            full_name: 'Regular User',
            password: 'user123',
            role: 'Employee',
            department: 'HR',
            team: null,
            skills: ['Training', 'Communication'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ], 
        error: null 
      }
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("is_active", true)
      .order("full_name")

    return { data, error }
  } catch (error) {
    console.error("Get users error:", error)
    return { data: [], error: error }
  }
}

// =============================================================================
// GOAL TASKS FUNCTIONS
// =============================================================================

// Create a new task for a goal
export async function createGoalTask(taskData: {
  goal_id: string;
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assigned_to?: string;
  assigned_by: string;
  department?: string;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  order_index?: number;
  pdca_phase?: 'Plan' | 'Do' | 'Check' | 'Act';
}) {
  try {
    if (!supabaseAdmin) {
      return { 
        data: { 
          id: Math.random().toString(), 
          ...taskData, 
          status: 'pending' as const,
          actual_hours: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, 
        error: null 
      }
    }

    // Get the current goal status to default the phase if not provided
    const goalResult = await getGoalById(taskData.goal_id)
    const currentGoalStatus = goalResult.data?.status || 'Plan'
    
    const { data, error } = await supabaseAdmin
      .from("goal_tasks")
      .insert([{
        ...taskData,
        priority: taskData.priority || 'Medium',
        estimated_hours: taskData.estimated_hours || 0,
        order_index: taskData.order_index || 0,
        pdca_phase: taskData.pdca_phase || currentGoalStatus
      }])
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Create goal task error:", error)
    return { data: null, error: error }
  }
}

// Get all tasks for a goal
export async function getGoalTasks(goalId: string) {
  try {
    if (!supabaseAdmin) {
      return { 
        data: [], 
        error: null 
      }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_tasks")
      .select(`
        *,
        assigned_user:assigned_to(id, full_name, email, department),
        created_by_user:assigned_by(id, full_name, email)
      `)
      .eq("goal_id", goalId)
      .order("order_index")
      .order("created_at")

    return { data, error }
  } catch (error) {
    console.error("Get goal tasks error:", error)
    return { data: [], error: error }
  }
}

// Get tasks assigned to a specific user
export async function getUserAssignedTasks(userId: string, statusFilter?: string) {
  try {
    if (!supabaseAdmin) {
      return { 
        data: [], 
        error: null 
      }
    }

    let query = supabaseAdmin
      .from("goal_tasks")
      .select(`
        *,
        goal:goals(id, subject, department, status, priority, target_date),
        assigned_by_user:assigned_by(id, full_name, email),
        assigned_user:assigned_to(id, full_name, email, department)
      `)
      .eq("assigned_to", userId)

    if (statusFilter) {
      query = query.eq("status", statusFilter)
    }

    const { data, error } = await query
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })

    return { data, error }
  } catch (error) {
    console.error("Get user assigned tasks error:", error)
    return { data: [], error: error }
  }
}

// Get ALL tasks assigned to a Head user (across all departments)
export async function getAllUserAssignedTasks(userId: string, statusFilter?: string) {
  try {
    if (!supabaseAdmin) {
      return { 
        data: [], 
        error: null 
      }
    }

    let query = supabaseAdmin
      .from("goal_tasks")
      .select(`
        *,
        goal:goals(id, subject, department, status, priority, target_date),
        assigned_by_user:assigned_by(id, full_name, email),
        assigned_user:assigned_to(id, full_name, email, department)
      `)
      .eq("assigned_to", userId)

    if (statusFilter) {
      query = query.eq("status", statusFilter)
    }

    const { data, error } = await query
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })

    return { data, error }
  } catch (error) {
    console.error("Get all user assigned tasks error:", error)
    return { data: [], error: error }
  }
}

// Update a task
export async function updateGoalTask(taskId: string, updates: {
  title?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  order_index?: number;
  completion_notes?: string;
}) {
  try {
    if (!supabaseAdmin) {
      return { 
        data: { id: taskId, ...updates }, 
        error: null 
      }
    }

    const updateData: any = { ...updates }
    
    // If marking as completed, set completion timestamp
    if (updates.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from("goal_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Update goal task error:", error)
    return { data: null, error: error }
  }
}

// Delete a task
export async function deleteGoalTask(taskId: string) {
  try {
    if (!supabaseAdmin) {
      return { error: null }
    }

    const { error } = await supabaseAdmin
      .from("goal_tasks")
      .delete()
      .eq("id", taskId)

    return { error }
  } catch (error) {
    console.error("Delete goal task error:", error)
    return { error: error }
  }
}

// Get task statistics for a goal
export async function getGoalTaskStats(goalId: string): Promise<{ data: GoalTaskStats | null, error: any }> {
  try {
    if (!supabaseAdmin) {
      return { 
        data: {
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          in_progress_tasks: 0,
          completion_percentage: 0
        }, 
        error: null 
      }
    }

    const { data, error } = await supabaseAdmin
      .rpc('get_goal_task_stats', { goal_uuid: goalId })

    return { data: (data as any)?.[0] || null, error }
  } catch (error) {
    console.error("Get goal task stats error:", error)
    return { data: null, error: error }
  }
}

// Complete a task (for the assigned user)
export async function completeGoalTask(taskId: string, userId: string, completionNotes?: string) {
  try {
    if (!supabaseAdmin) {
      return { 
        data: { id: taskId, status: 'completed' }, 
        error: null 
      }
    }

    // First, get the task to check assignment status
    const { data: taskCheck, error: checkError } = await supabaseAdmin
      .from("goal_tasks")
      .select("id, assigned_to, title, goal_id")
      .eq("id", taskId)
      .single()

    if (checkError || !taskCheck) {
      return { data: null, error: "Task not found" }
    }

    // If task is unassigned, automatically assign it to the completing user
    // If task is assigned, ensure it's assigned to the current user
    if (taskCheck.assigned_to && taskCheck.assigned_to !== userId) {
      return { data: null, error: "You can only complete tasks assigned to you" }
    }

    const { data, error } = await supabaseAdmin
      .from("goal_tasks")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: userId,
        completion_notes: completionNotes || null,
        // Auto-assign unassigned tasks when completing them
        assigned_to: taskCheck.assigned_to || userId
      })
      .eq("id", taskId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error("Complete goal task error:", error)
    return { data: null, error: error }
  }
}

// Bulk create tasks for a goal
export async function createBulkGoalTasks(goalId: string, tasks: Array<{
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assigned_to?: string;
  department?: string;
  due_date?: string;
  estimated_hours?: number;
}>, assignedBy: string) {
  try {
    if (!supabaseAdmin) {
      return { 
        data: tasks.map((task, index) => ({
          id: Math.random().toString(),
          goal_id: goalId,
          ...task,
          assigned_by: assignedBy,
          status: 'pending' as const,
          order_index: index,
          actual_hours: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })), 
        error: null 
      }
    }

    const tasksToInsert = tasks.map((task, index) => ({
      goal_id: goalId,
      title: task.title,
      description: task.description || null,
      priority: task.priority || 'Medium',
      assigned_to: (task.assigned_to && task.assigned_to !== "unassigned") ? task.assigned_to : null,
      assigned_by: assignedBy,
      department: task.department || null,
      due_date: task.due_date || null,
      estimated_hours: task.estimated_hours || 0,
      order_index: index
    }))

    const { data, error } = await supabaseAdmin
      .from("goal_tasks")
      .insert(tasksToInsert)
      .select()

    return { data, error }
  } catch (error) {
    console.error("Create bulk goal tasks error:", error)
    return { data: null, error: error }
  }
}