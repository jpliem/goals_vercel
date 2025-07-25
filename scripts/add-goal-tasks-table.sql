-- Goal Tasks Table Migration
-- This script adds task management capabilities to the goal system
-- Run this AFTER the complete-goal-database-setup.sql script

-- Drop existing goal_tasks table if it exists (for clean reinstallation)
DROP TABLE IF EXISTS public.goal_tasks CASCADE;

-- Create goal_tasks table for detailed task management within goals
CREATE TABLE public.goal_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.users(id),
    department TEXT, -- For filtering and organization
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours INTEGER DEFAULT 0,
    actual_hours INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0, -- For task ordering within a goal
    completion_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_goal_tasks_goal_id ON public.goal_tasks(goal_id);
CREATE INDEX idx_goal_tasks_assigned_to ON public.goal_tasks(assigned_to);
CREATE INDEX idx_goal_tasks_status ON public.goal_tasks(status);
CREATE INDEX idx_goal_tasks_priority ON public.goal_tasks(priority);
CREATE INDEX idx_goal_tasks_due_date ON public.goal_tasks(due_date);
CREATE INDEX idx_goal_tasks_department ON public.goal_tasks(department);
CREATE INDEX idx_goal_tasks_goal_order ON public.goal_tasks(goal_id, order_index);
CREATE INDEX idx_goal_tasks_assigned_status ON public.goal_tasks(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- Add trigger for updated_at timestamp
CREATE TRIGGER goal_tasks_updated_at_trigger
    BEFORE UPDATE ON public.goal_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the table purpose
COMMENT ON TABLE public.goal_tasks IS 'Individual tasks within goals that can be assigned to specific users';
COMMENT ON COLUMN public.goal_tasks.order_index IS 'Used for ordering tasks within a goal (0-based)';
COMMENT ON COLUMN public.goal_tasks.estimated_hours IS 'Estimated time to complete the task in hours';
COMMENT ON COLUMN public.goal_tasks.actual_hours IS 'Actual time spent on the task in hours';

-- Create function to get task statistics for a goal
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

-- Create function to get user's assigned tasks
CREATE OR REPLACE FUNCTION get_user_assigned_tasks(user_uuid UUID, task_status_filter TEXT DEFAULT NULL)
RETURNS TABLE(
    task_id UUID,
    goal_id UUID,
    goal_subject TEXT,
    task_title TEXT,
    task_description TEXT,
    priority TEXT,
    status TEXT,
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

-- Update notifications table to include task-related notification types
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'clarification', 'clarification_deleted', 'assignment', 'rejection', 
    'approval', 'rework', 'deadline', 'task_completed', 'comment', 
    'status_change', 'task_assigned', 'task_due_soon', 'task_overdue'
));

-- Add RLS (Row Level Security) policies for goal_tasks
ALTER TABLE public.goal_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tasks assigned to them or tasks in goals they own/are assigned to
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

-- Policy: Goal owners and assignees can create tasks
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

-- Policy: Task assignees can update their own tasks, goal owners can update all tasks
CREATE POLICY "Users can update relevant tasks" ON public.goal_tasks
    FOR UPDATE
    USING (
        assigned_to = auth.uid() OR
        goal_id IN (
            SELECT id FROM public.goals 
            WHERE owner_id = auth.uid()
        )
    );

-- Policy: Only goal owners can delete tasks
CREATE POLICY "Goal owners can delete tasks" ON public.goal_tasks
    FOR DELETE
    USING (
        goal_id IN (
            SELECT id FROM public.goals 
            WHERE owner_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.goal_tasks TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;