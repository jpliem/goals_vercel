-- Complete Goal Management Database Setup Script
-- Run this ONCE in Supabase SQL Editor to set up the entire database schema
-- This script includes DROP IF EXISTS statements for clean reinstallation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- DROP EXISTING TABLES (CLEAN SLATE)
-- =============================================================================

-- Drop all goal management tables and related objects
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
    role TEXT NOT NULL CHECK (role IN ('User', 'Admin')),
    department TEXT,
    team TEXT,
    skills TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create department_teams table for hierarchical department-team relationships
CREATE TABLE public.department_teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department TEXT NOT NULL,
    team TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department, team)
);

-- Create goals table with PDCA-focused fields and teams array
CREATE TABLE public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('Personal', 'Team', 'Department', 'Company')),
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'Plan' CHECK (status IN (
        'Plan', 'Do', 'Check', 'Act', 'Completed', 'On Hold', 'Cancelled'
    )),
    department TEXT NOT NULL,
    teams TEXT[] DEFAULT '{}',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    target_metrics TEXT,
    success_criteria TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id),
    current_assignee_id UUID REFERENCES public.users(id),
    target_date TIMESTAMP WITH TIME ZONE,
    adjusted_target_date TIMESTAMP WITH TIME ZONE,
    assignment_history JSONB DEFAULT '[]'::jsonb,
    assigned_by UUID REFERENCES public.users(id),
    workflow_history JSONB DEFAULT '[]'::jsonb,
    previous_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_assignees table for many-to-many relationship between goals and assignees
CREATE TABLE public.goal_assignees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    task_status TEXT NOT NULL DEFAULT 'pending' CHECK (task_status IN ('pending', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES public.users(id),
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(goal_id, user_id)
);

-- Create goal_comments table
CREATE TABLE public.goal_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    comment TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_attachments table
CREATE TABLE public.goal_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.goal_comments(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_support table for hierarchical support requirements
CREATE TABLE public.goal_support (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    support_type TEXT NOT NULL CHECK (support_type IN ('Department', 'Team')),
    support_name TEXT NOT NULL,
    support_department TEXT, -- Link teams to their departments
    status TEXT DEFAULT 'Requested' CHECK (status IN ('Requested', 'Approved', 'Declined', 'Completed')),
    requested_by UUID NOT NULL REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create department_permissions table for department-based access control
CREATE TABLE public.department_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, department)
);

-- Create two_weeks_focus_requests table for focus tracking
CREATE TABLE public.two_weeks_focus_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    focus_date DATE NOT NULL DEFAULT CURRENT_DATE,
    marked_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, goal_id, focus_date)
);

-- Create notifications table for persistent notification storage
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('clarification', 'clarification_deleted', 'assignment', 'rejection', 'approval', 'rework', 'deadline', 'task_completed', 'comment', 'status_change')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_department ON public.users(department);
CREATE INDEX idx_users_active ON public.users(is_active);

-- Department teams indexes
CREATE INDEX idx_department_teams_department ON public.department_teams(department);
CREATE INDEX idx_department_teams_active ON public.department_teams(is_active) WHERE is_active = true;

-- Goals table indexes
CREATE INDEX idx_goals_owner ON public.goals(owner_id);
CREATE INDEX idx_goals_current_assignee ON public.goals(current_assignee_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goals_priority ON public.goals(priority);
CREATE INDEX idx_goals_department ON public.goals(department);
CREATE INDEX idx_goals_created_at ON public.goals(created_at);
CREATE INDEX idx_goals_target_date ON public.goals(target_date);

-- Goal assignees indexes
CREATE INDEX idx_goal_assignees_goal ON public.goal_assignees(goal_id);
CREATE INDEX idx_goal_assignees_user ON public.goal_assignees(user_id);
CREATE INDEX idx_goal_assignees_status ON public.goal_assignees(task_status);
CREATE INDEX idx_goal_assignees_goal_user ON public.goal_assignees(goal_id, user_id);
CREATE INDEX idx_goal_assignees_goal_status ON public.goal_assignees(goal_id, task_status);

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

-- Function to get all department-team mappings
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

-- Function to clean up old focus data
CREATE OR REPLACE FUNCTION cleanup_old_focus_data(days_to_keep INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    DELETE FROM public.two_weeks_focus_requests
    WHERE focus_date < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'cutoff_date', cutoff_date,
        'cleanup_date', CURRENT_TIMESTAMP
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'cleanup_date', CURRENT_TIMESTAMP
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_teams_updated_at 
    BEFORE UPDATE ON public.department_teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON public.goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_assignees_updated_at 
    BEFORE UPDATE ON public.goal_assignees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_comments_updated_at 
    BEFORE UPDATE ON public.goal_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_support_updated_at 
    BEFORE UPDATE ON public.goal_support 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_permissions_updated_at 
    BEFORE UPDATE ON public.department_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_weeks_focus_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CREATE RLS POLICIES
-- =============================================================================

-- Users table policies
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Department teams policies (everyone can read, only admins can modify)
CREATE POLICY "Department teams are viewable by all" ON public.department_teams
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage department teams" ON public.department_teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Goals table policies
CREATE POLICY "Users can view goals" ON public.goals
    FOR SELECT USING (true);

CREATE POLICY "Users can create goals" ON public.goals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own goals or admins/managers can update any" ON public.goals
    FOR UPDATE USING (
        owner_id = auth.uid() 
        OR current_assignee_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'Admin' OR EXISTS (
                SELECT 1 FROM public.department_permissions dp 
                WHERE dp.user_id = auth.uid() AND dp.department = goals.department
            ))
        )
        OR EXISTS (
            SELECT 1 FROM public.goal_assignees 
            WHERE goal_assignees.goal_id = goals.id 
            AND goal_assignees.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete goals" ON public.goals
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Goal assignees policies
CREATE POLICY "Users can view goal assignees" ON public.goal_assignees
    FOR SELECT USING (true);

CREATE POLICY "Admins and managers can assign users" ON public.goal_assignees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'Admin' OR EXISTS (
                SELECT 1 FROM public.department_permissions dp 
                WHERE dp.user_id = auth.uid() AND dp.department IN (
                    SELECT g.department FROM public.goals g WHERE g.id = goal_assignees.goal_id
                )
            ))
        )
    );

CREATE POLICY "Assignees can update their own tasks, admins/managers can update any" ON public.goal_assignees
    FOR UPDATE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'Admin' OR EXISTS (
                SELECT 1 FROM public.department_permissions dp 
                WHERE dp.user_id = auth.uid() AND dp.department IN (
                    SELECT g.department FROM public.goals g WHERE g.id = goal_assignees.goal_id
                )
            ))
        )
    );

CREATE POLICY "Admins and managers can delete assignments" ON public.goal_assignees
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'Admin' OR EXISTS (
                SELECT 1 FROM public.department_permissions dp 
                WHERE dp.user_id = auth.uid() AND dp.department IN (
                    SELECT g.department FROM public.goals g WHERE g.id = goal_assignees.goal_id
                )
            ))
        )
    );

-- Goal comments policies
CREATE POLICY "Users can view goal comments" ON public.goal_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create goal comments" ON public.goal_comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON public.goal_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments or admins can delete any" ON public.goal_comments
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Goal attachments policies
CREATE POLICY "Users can view goal attachments" ON public.goal_attachments
    FOR SELECT USING (true);

CREATE POLICY "Users can create goal attachments" ON public.goal_attachments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own attachments or admins can delete any" ON public.goal_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Goal support policies
CREATE POLICY "Users can view goal support" ON public.goal_support
    FOR SELECT USING (true);

CREATE POLICY "Users can create goal support requests" ON public.goal_support
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update goal support" ON public.goal_support
    FOR UPDATE USING (true);

-- Department permissions policies (admin-only)
CREATE POLICY "Admins can view all department permissions" ON public.department_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

CREATE POLICY "Admins can manage department permissions" ON public.department_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Two weeks focus policies (admin-only)
CREATE POLICY "Admins can manage two weeks focus" ON public.two_weeks_focus_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- CREATE VIEWS
-- =============================================================================

-- View for easier querying of users with their department permissions
CREATE VIEW public.user_department_access AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.role,
    u.department as user_department,
    COALESCE(
        array_agg(
            DISTINCT dp.department 
            ORDER BY dp.department
        ) FILTER (WHERE dp.department IS NOT NULL), 
        '{}'::text[]
    ) as accessible_departments
FROM public.users u
LEFT JOIN public.department_permissions dp ON u.id = dp.user_id
GROUP BY u.id, u.email, u.full_name, u.role, u.department;

-- View for easier querying of goals with assignee details
CREATE VIEW public.goal_assignee_details AS
SELECT 
    ga.goal_id,
    ga.id as assignment_id,
    ga.user_id,
    u.full_name as assignee_name,
    u.email as assignee_email,
    u.department as assignee_department,
    u.skills as assignee_skills,
    ga.task_status,
    ga.assigned_at,
    ga.completed_at,
    ga.completion_notes,
    assigner.full_name as assigned_by_name,
    completer.full_name as completed_by_name
FROM public.goal_assignees ga
JOIN public.users u ON ga.user_id = u.id
LEFT JOIN public.users assigner ON ga.assigned_by = assigner.id
LEFT JOIN public.users completer ON ga.completed_by = completer.id
ORDER BY ga.assigned_at ASC;

-- Grant access to views
GRANT SELECT ON public.user_department_access TO authenticated;
GRANT SELECT ON public.goal_assignee_details TO authenticated;

-- =============================================================================
-- STORAGE SETUP
-- =============================================================================

-- Create the goal-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('goal-attachments', 'goal-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for goal-attachments bucket
CREATE POLICY "Allow authenticated users to upload goal attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'goal-attachments' 
    AND auth.role() = 'authenticated'
    AND (
        name LIKE '%.jpg' OR 
        name LIKE '%.jpeg' OR 
        name LIKE '%.png' OR 
        name LIKE '%.gif' OR 
        name LIKE '%.webp' OR
        name LIKE '%.pdf' OR
        name LIKE '%.doc' OR
        name LIKE '%.docx' OR
        name LIKE '%.txt'
    )
);

CREATE POLICY "Allow authenticated users to view goal attachments"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'goal-attachments' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow owners to update goal attachments"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'goal-attachments' 
    AND (
        auth.uid() = owner 
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    )
);

CREATE POLICY "Allow owners and admins to delete goal attachments"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'goal-attachments' 
    AND (
        auth.uid() = owner 
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    )
);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION cleanup_old_focus_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teams_for_department(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_team_mappings() TO authenticated;

-- =============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.users IS 'System users with roles and department assignments';
COMMENT ON TABLE public.department_teams IS 'Hierarchical mapping of departments to their teams';
COMMENT ON TABLE public.goals IS 'Main goals table following PDCA methodology with multi-team support';
COMMENT ON TABLE public.goal_assignees IS 'Many-to-many relationship for goal assignments with task completion tracking';
COMMENT ON TABLE public.goal_comments IS 'Comments and discussions on goals';
COMMENT ON TABLE public.goal_attachments IS 'File attachments for goals and comments';
COMMENT ON TABLE public.goal_support IS 'Support requirements from other departments/teams';
COMMENT ON TABLE public.department_permissions IS 'Department-level view permissions for users';
COMMENT ON TABLE public.two_weeks_focus_requests IS 'Two-week focus tracking for planning meetings';
COMMENT ON TABLE public.notifications IS 'User notifications for goal workflow events';

-- Final verification
SELECT 
    'Goal Management Database schema created successfully!' as status,
    'Storage bucket and policies configured!' as storage_status,
    'All tables, indexes, and functions created!' as tables_status,
    'RLS policies and permissions set!' as security_status,
    CURRENT_TIMESTAMP as created_at;