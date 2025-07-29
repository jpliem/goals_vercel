-- Complete Goal Management Database Initialization Script
-- Run this ONCE in Supabase SQL Editor to set up the entire database schema
-- This script combines all schema components including PDCA phase task management
-- This script includes DROP IF EXISTS statements for clean reinstallation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- DROP EXISTING TABLES (CLEAN SLATE)
-- =============================================================================

-- Drop all goal management tables and related objects
DROP TABLE IF EXISTS public.goal_tasks CASCADE;
DROP TABLE IF EXISTS public.department_teams CASCADE;
DROP TABLE IF EXISTS public.goal_support CASCADE;
DROP TABLE IF EXISTS public.goal_attachments CASCADE;
DROP TABLE IF EXISTS public.goal_comments CASCADE;
DROP TABLE IF EXISTS public.goal_assignees CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.department_permissions CASCADE;
DROP TABLE IF EXISTS public.two_weeks_focus_requests CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop views
DROP VIEW IF EXISTS public.user_department_access CASCADE;
DROP VIEW IF EXISTS public.goal_executor_details CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_old_focus_data(INTEGER);
DROP FUNCTION IF EXISTS get_teams_for_department(TEXT);
DROP FUNCTION IF EXISTS get_department_team_mappings();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_goal_task_stats(UUID);
DROP FUNCTION IF EXISTS get_user_assigned_tasks(UUID, TEXT);
DROP FUNCTION IF EXISTS get_goal_task_stats_by_phase(UUID, TEXT);
DROP FUNCTION IF EXISTS are_phase_tasks_completed(UUID, TEXT);
DROP FUNCTION IF EXISTS get_incomplete_phase_tasks(UUID, TEXT);

-- Drop storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload goal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view goal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners and admins to delete goal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update goal attachments" ON storage.objects;

-- =============================================================================
-- CREATE CORE TABLES
-- =============================================================================

-- Create users table with goal management fields
CREATE TABLE public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Employee' CHECK (role IN ('Admin', 'Head', 'Employee')),
    department TEXT,
    team TEXT,
    skills TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create department_teams table for organizational structure
CREATE TABLE public.department_teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department TEXT NOT NULL,
    team TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department, team)
);

-- Create department_permissions table for cross-department access
CREATE TABLE public.department_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, department)
);

-- Create goals table with comprehensive goal management
CREATE TABLE public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_type TEXT NOT NULL DEFAULT 'Team' CHECK (goal_type IN ('Personal', 'Team', 'Department', 'Company')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT DEFAULT 'Plan' CHECK (status IN ('Plan', 'Do', 'Check', 'Act', 'Completed', 'On Hold', 'Cancelled')),
    previous_status TEXT,
    department TEXT NOT NULL,
    teams TEXT[] DEFAULT '{}',
    start_date TIMESTAMP WITH TIME ZONE,
    target_date TIMESTAMP WITH TIME ZONE,
    adjusted_target_date TIMESTAMP WITH TIME ZONE,
    target_metrics TEXT,
    success_criteria TEXT,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    owner_id UUID NOT NULL REFERENCES public.users(id),
    current_assignee_id UUID REFERENCES public.users(id),
    workflow_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_assignees table for multi-assignee support
CREATE TABLE public.goal_assignees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES public.users(id),
    task_status TEXT DEFAULT 'pending' CHECK (task_status IN ('pending', 'completed')),
    completion_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(goal_id, user_id)
);

-- Create goal_comments table for progress updates
CREATE TABLE public.goal_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    comment TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_attachments table for file uploads
CREATE TABLE public.goal_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.goal_comments(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_support table for department support requests
CREATE TABLE public.goal_support (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    support_type TEXT NOT NULL CHECK (support_type IN ('Department', 'Team')),
    support_name TEXT NOT NULL,
    support_department TEXT,
    requested_by UUID NOT NULL REFERENCES public.users(id),
    status TEXT DEFAULT 'Requested' CHECK (status IN ('Requested', 'Accepted', 'Declined', 'Completed')),
    notes TEXT,
    responded_by UUID REFERENCES public.users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for system notifications
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
    request_id UUID,
    type TEXT NOT NULL CHECK (type IN (
        'clarification', 'clarification_deleted', 'assignment', 'rejection', 
        'approval', 'rework', 'deadline', 'task_completed', 'comment', 
        'status_change', 'task_assigned', 'task_due_soon', 'task_overdue'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create two_weeks_focus_requests table for focus planning
CREATE TABLE public.two_weeks_focus_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    focus_date DATE NOT NULL,
    priority_order INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, goal_id, focus_date)
);

-- Create goal_tasks table for detailed task management within goals (WITH PDCA PHASE)
CREATE TABLE public.goal_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    pdca_phase TEXT DEFAULT 'Plan' CHECK (pdca_phase IN ('Plan', 'Do', 'Check', 'Act')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.users(id),
    department TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours INTEGER DEFAULT 0,
    actual_hours INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    completion_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_department ON public.users(department);
CREATE INDEX idx_users_team ON public.users(team);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- Goals table indexes
CREATE INDEX idx_goals_owner ON public.goals(owner_id);
CREATE INDEX idx_goals_current_assignee ON public.goals(current_assignee_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goals_priority ON public.goals(priority);
CREATE INDEX idx_goals_department ON public.goals(department);
CREATE INDEX idx_goals_created_at ON public.goals(created_at);
CREATE INDEX idx_goals_start_date ON public.goals(start_date);
CREATE INDEX idx_goals_target_date ON public.goals(target_date);

-- Goal assignees indexes
CREATE INDEX idx_goal_assignees_goal ON public.goal_assignees(goal_id);
CREATE INDEX idx_goal_assignees_user ON public.goal_assignees(user_id);
CREATE INDEX idx_goal_assignees_status ON public.goal_assignees(task_status);
CREATE INDEX idx_goal_assignees_goal_user ON public.goal_assignees(goal_id, user_id);
CREATE INDEX idx_goal_assignees_goal_status ON public.goal_assignees(goal_id, task_status);

-- Goal tasks indexes (including PDCA phase)
CREATE INDEX idx_goal_tasks_goal_id ON public.goal_tasks(goal_id);
CREATE INDEX idx_goal_tasks_assigned_to ON public.goal_tasks(assigned_to);
CREATE INDEX idx_goal_tasks_status ON public.goal_tasks(status);
CREATE INDEX idx_goal_tasks_priority ON public.goal_tasks(priority);
CREATE INDEX idx_goal_tasks_start_date ON public.goal_tasks(start_date);
CREATE INDEX idx_goal_tasks_due_date ON public.goal_tasks(due_date);
CREATE INDEX idx_goal_tasks_department ON public.goal_tasks(department);
CREATE INDEX idx_goal_tasks_goal_order ON public.goal_tasks(goal_id, order_index);
CREATE INDEX idx_goal_tasks_assigned_status ON public.goal_tasks(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_goal_tasks_pdca_phase ON public.goal_tasks(pdca_phase);
CREATE INDEX idx_goal_tasks_goal_phase ON public.goal_tasks(goal_id, pdca_phase);

-- Other table indexes
CREATE INDEX idx_goal_comments_goal ON public.goal_comments(goal_id);
CREATE INDEX idx_goal_attachments_goal ON public.goal_attachments(goal_id);
CREATE INDEX idx_goal_support_goal ON public.goal_support(goal_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_department_permissions_user ON public.department_permissions(user_id);
CREATE INDEX idx_department_permissions_department ON public.department_permissions(department);
CREATE INDEX idx_two_weeks_focus_user_date ON public.two_weeks_focus_requests(user_id, focus_date);
CREATE INDEX idx_two_weeks_focus_goal ON public.two_weeks_focus_requests(goal_id);

-- =============================================================================
-- CREATE FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get teams for a department
CREATE OR REPLACE FUNCTION get_teams_for_department(dept TEXT)
RETURNS TABLE(team TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT dt.team
    FROM public.department_teams dt
    WHERE dt.department = dept
    AND dt.is_active = true
    ORDER BY dt.team;
END;
$$ LANGUAGE plpgsql;

-- Function to get department team mappings
CREATE OR REPLACE FUNCTION get_department_team_mappings()
RETURNS TABLE(department TEXT, teams TEXT[]) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dt.department,
        ARRAY_AGG(dt.team ORDER BY dt.team) as teams
    FROM public.department_teams dt
    WHERE dt.is_active = true
    GROUP BY dt.department
    ORDER BY dt.department;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old focus data
CREATE OR REPLACE FUNCTION cleanup_old_focus_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.two_weeks_focus_requests
    WHERE focus_date < (CURRENT_DATE - INTERVAL '1 day' * days_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get task statistics for a goal
CREATE OR REPLACE FUNCTION get_goal_task_stats(goal_uuid UUID)
RETURNS TABLE(
    total_tasks INTEGER,
    completed_tasks INTEGER,
    pending_tasks INTEGER,
    in_progress_tasks INTEGER,
    completion_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::INTEGER as in_progress_tasks,
        CASE 
            WHEN COUNT(*) = 0 THEN 0::NUMERIC
            ELSE ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        END as completion_percentage
    FROM public.goal_tasks
    WHERE goal_id = goal_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's assigned tasks
CREATE OR REPLACE FUNCTION get_user_assigned_tasks(user_uuid UUID, task_status_filter TEXT DEFAULT NULL)
RETURNS TABLE(
    task_id UUID,
    goal_id UUID,
    goal_subject TEXT,
    task_title TEXT,
    task_description TEXT,
    priority TEXT,
    status TEXT,
    pdca_phase TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours INTEGER,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gt.id as task_id,
        gt.goal_id,
        g.subject as goal_subject,
        gt.title as task_title,
        gt.description as task_description,
        gt.priority,
        gt.status,
        gt.pdca_phase,
        gt.due_date,
        gt.estimated_hours,
        gt.department,
        gt.created_at
    FROM public.goal_tasks gt
    JOIN public.goals g ON gt.goal_id = g.id
    WHERE gt.assigned_to = user_uuid
    AND (task_status_filter IS NULL OR gt.status = task_status_filter)
    ORDER BY 
        CASE gt.priority 
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
        END,
        gt.due_date ASC NULLS LAST,
        gt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get task statistics by PDCA phase
CREATE OR REPLACE FUNCTION get_goal_task_stats_by_phase(goal_uuid UUID, phase_filter TEXT DEFAULT NULL)
RETURNS TABLE(
    total_tasks INTEGER,
    completed_tasks INTEGER,
    pending_tasks INTEGER,
    in_progress_tasks INTEGER,
    completion_percentage NUMERIC,
    pdca_phase TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::INTEGER as in_progress_tasks,
        CASE 
            WHEN COUNT(*) = 0 THEN 0::NUMERIC
            ELSE ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        END as completion_percentage,
        gt.pdca_phase
    FROM public.goal_tasks gt
    WHERE gt.goal_id = goal_uuid
    AND (phase_filter IS NULL OR gt.pdca_phase = phase_filter)
    GROUP BY gt.pdca_phase
    ORDER BY 
        CASE gt.pdca_phase 
            WHEN 'Plan' THEN 1
            WHEN 'Do' THEN 2
            WHEN 'Check' THEN 3
            WHEN 'Act' THEN 4
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to check if all tasks in a specific phase are completed
CREATE OR REPLACE FUNCTION are_phase_tasks_completed(goal_uuid UUID, phase_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    incomplete_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO incomplete_count
    FROM public.goal_tasks
    WHERE goal_id = goal_uuid 
    AND pdca_phase = phase_name 
    AND status != 'completed';
    
    RETURN incomplete_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get incomplete tasks for a specific phase
CREATE OR REPLACE FUNCTION get_incomplete_phase_tasks(goal_uuid UUID, phase_name TEXT)
RETURNS TABLE(
    task_id UUID,
    title TEXT,
    assigned_to UUID,
    assigned_user_name TEXT,
    status TEXT,
    due_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gt.id as task_id,
        gt.title,
        gt.assigned_to,
        COALESCE(u.full_name, u.email, 'Unassigned') as assigned_user_name,
        gt.status,
        gt.due_date
    FROM public.goal_tasks gt
    LEFT JOIN public.users u ON gt.assigned_to = u.id
    WHERE gt.goal_id = goal_uuid 
    AND gt.pdca_phase = phase_name 
    AND gt.status != 'completed'
    ORDER BY 
        CASE gt.priority 
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
        END,
        gt.due_date ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

-- Add triggers for updated_at timestamp
CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER goals_updated_at_trigger
    BEFORE UPDATE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER goal_support_updated_at_trigger
    BEFORE UPDATE ON public.goal_support
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER goal_tasks_updated_at_trigger
    BEFORE UPDATE ON public.goal_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CREATE VIEWS
-- =============================================================================

-- View for user department access (including permissions)
CREATE VIEW public.user_department_access AS
SELECT DISTINCT
    u.id as user_id,
    u.email,
    u.full_name,
    u.role,
    COALESCE(dp.department, u.department) as accessible_department
FROM public.users u
LEFT JOIN public.department_permissions dp ON u.id = dp.user_id
WHERE u.is_active = true
AND (u.department IS NOT NULL OR dp.department IS NOT NULL);

-- View for goal executor details
CREATE VIEW public.goal_executor_details AS
SELECT 
    g.id as goal_id,
    g.subject,
    g.status,
    g.department,
    g.owner_id,
    owner.full_name as owner_name,
    g.current_assignee_id,
    assignee.full_name as current_assignee_name,
    COALESCE(
        (SELECT COUNT(*) FROM public.goal_assignees ga WHERE ga.goal_id = g.id),
        0
    ) as total_assignees,
    COALESCE(
        (SELECT COUNT(*) FROM public.goal_assignees ga WHERE ga.goal_id = g.id AND ga.task_status = 'completed'),
        0
    ) as completed_assignees
FROM public.goals g
LEFT JOIN public.users owner ON g.owner_id = owner.id
LEFT JOIN public.users assignee ON g.current_assignee_id = assignee.id;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tasks ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all active users" ON public.users
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE
    USING (id = auth.uid());

-- Goals table policies
CREATE POLICY "Users can view goals in their department or assigned to them" ON public.goals
    FOR SELECT
    USING (
        department IN (
            SELECT accessible_department 
            FROM public.user_department_access 
            WHERE user_id = auth.uid()
        ) OR
        owner_id = auth.uid() OR
        current_assignee_id = auth.uid() OR
        id IN (
            SELECT goal_id FROM public.goal_assignees 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create goals in their department" ON public.goals
    FOR INSERT
    WITH CHECK (
        department IN (
            SELECT accessible_department 
            FROM public.user_department_access 
            WHERE user_id = auth.uid()
        ) AND
        owner_id = auth.uid()
    );

CREATE POLICY "Goal owners and assignees can update goals" ON public.goals
    FOR UPDATE
    USING (
        owner_id = auth.uid() OR
        current_assignee_id = auth.uid() OR
        id IN (
            SELECT goal_id FROM public.goal_assignees 
            WHERE user_id = auth.uid()
        )
    );

-- Goal tasks table policies
CREATE POLICY "Users can view relevant tasks" ON public.goal_tasks
    FOR SELECT
    USING (
        assigned_to = auth.uid() OR
        goal_id IN (
            SELECT id FROM public.goals 
            WHERE owner_id = auth.uid() OR current_assignee_id = auth.uid()
        ) OR
        goal_id IN (
            SELECT goal_id FROM public.goal_assignees 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Goal owners and assignees can create tasks" ON public.goal_tasks
    FOR INSERT
    WITH CHECK (
        goal_id IN (
            SELECT id FROM public.goals 
            WHERE owner_id = auth.uid() OR current_assignee_id = auth.uid()
        ) OR
        goal_id IN (
            SELECT goal_id FROM public.goal_assignees 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update relevant tasks" ON public.goal_tasks
    FOR UPDATE
    USING (
        assigned_to = auth.uid() OR
        goal_id IN (
            SELECT id FROM public.goals 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Goal owners can delete tasks" ON public.goal_tasks
    FOR DELETE
    USING (
        goal_id IN (
            SELECT id FROM public.goals 
            WHERE owner_id = auth.uid()
        )
    );

-- Other table policies (simplified for brevity)
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =============================================================================
-- STORAGE BUCKET SETUP
-- =============================================================================

-- Create storage bucket for goal attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('goal-attachments', 'goal-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Allow authenticated users to upload goal attachments" ON storage.objects
    FOR INSERT 
    WITH CHECK (
        bucket_id = 'goal-attachments' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated users to view goal attachments" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'goal-attachments' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow owners and admins to delete goal attachments" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'goal-attachments' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow owners to update goal attachments" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'goal-attachments' AND
        auth.role() = 'authenticated'
    );

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

-- Add comments to document the tables and columns
COMMENT ON TABLE public.goal_tasks IS 'Individual tasks within goals that can be assigned to specific users with PDCA phase tracking';
COMMENT ON COLUMN public.goal_tasks.pdca_phase IS 'PDCA phase this task belongs to (Plan, Do, Check, Act)';
COMMENT ON COLUMN public.goal_tasks.order_index IS 'Used for ordering tasks within a goal (0-based)';
COMMENT ON COLUMN public.goal_tasks.estimated_hours IS 'Estimated time to complete the task in hours';
COMMENT ON COLUMN public.goal_tasks.actual_hours IS 'Actual time spent on the task in hours';

COMMENT ON TABLE public.goals IS 'Main goals table with PDCA workflow management';
COMMENT ON COLUMN public.goals.workflow_history IS 'JSON array of workflow history entries';
COMMENT ON COLUMN public.goals.previous_status IS 'Previous status for On Hold functionality';

COMMENT ON TABLE public.users IS 'System users with role-based permissions';
COMMENT ON TABLE public.goal_assignees IS 'Multi-assignee support for goals';
COMMENT ON TABLE public.notifications IS 'Real-time notification system including task assignments';

-- =============================================================================
-- INITIALIZATION COMPLETE
-- =============================================================================

-- Script execution completed successfully
-- Next: Run the seed-test-data.sql script to populate with sample data