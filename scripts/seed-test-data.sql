-- Clean Seed Data Script
-- This script populates the database with basic organizational structure
-- Run this AFTER complete-database-init.sql

-- =============================================================================
-- INSERT SINGLE ADMIN USER
-- =============================================================================

INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@company.com', 'System Administrator', 'admin123', 'Admin', 'IT', 'Infrastructure', ARRAY['System Administration', 'Project Management'], true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INSERT DEPARTMENT-TEAM MAPPINGS
-- =============================================================================

INSERT INTO public.department_teams (department, team) VALUES
-- HR Department teams
('HR', 'Recruitment'),
('HR', 'Training & Development'),

-- IT Department teams
('IT', 'IoT'),
('IT', 'GSPE'),

-- Finance Department teams
('Finance', 'Finance'),
('Finance', 'Tax'),

-- Operation Department teams
('Operation', 'Project'),
('Operation', 'PPC'),
('Operation', 'QC & QA'),
('Operation', 'Logistic'),
('Operation', 'Production'),

-- Engineer Department teams
('Engineer', 'Mechanical Engineering'),
('Engineer', 'Electrical Engineering'),
('Engineer', 'Site Engineering'),

-- Sales Department teams
('Sales', 'ABB'),
('Sales', 'Siemens'),
('Sales', 'Rockwell'),
('Sales', 'Hitachi'),

-- Marketing Department teams
('Marketing', 'Marketing'),

-- Government Relations Department teams
('Government Relations', 'Government Relations'),

-- Product Development Department teams
('Product Development', 'Product Development')
ON CONFLICT (department, team) DO NOTHING;


-- =============================================================================
-- INSERT ADMIN DEPARTMENT PERMISSIONS
-- =============================================================================

INSERT INTO public.department_permissions (user_id, department, created_by) VALUES
    ('11111111-1111-1111-1111-111111111111', 'HR', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'IT', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Finance', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Project', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Engineer', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Sales', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Marketing', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Government Relations', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (user_id, department) DO NOTHING;

-- =============================================================================
-- WORKFLOW ADMIN SEED DATA
-- =============================================================================

-- Insert default workflow configuration that matches current system
INSERT INTO public.workflow_configurations (
    name, 
    description, 
    transitions, 
    role_permissions, 
    status_colors, 
    status_icons, 
    is_active, 
    is_default
) VALUES (
    'Default PDCA Workflow',
    'Standard Plan-Do-Check-Act workflow with predefined transitions',
    '{
        "Plan": ["Do", "On Hold"],
        "Do": ["Check", "On Hold"],
        "Check": ["Act", "Do", "On Hold"],
        "Act": ["Completed", "Plan", "On Hold"],
        "On Hold": ["Plan", "Do", "Check", "Act"],
        "Completed": [],
        "Cancelled": []
    }'::jsonb,
    '{
        "Admin": ["*"],
        "Head": ["Plan", "Do", "Check", "Act", "On Hold"],
        "Employee": ["Do", "Check"]
    }'::jsonb,
    '{
        "Plan": "#3b82f6",
        "Do": "#f59e0b",
        "Check": "#10b981",
        "Act": "#8b5cf6",
        "On Hold": "#6b7280",
        "Completed": "#22c55e",
        "Cancelled": "#ef4444"
    }'::jsonb,
    '{
        "Plan": "clipboard-list",
        "Do": "play",
        "Check": "search",
        "Act": "check-circle",
        "On Hold": "pause",
        "Completed": "check-circle-2",
        "Cancelled": "x-circle"
    }'::jsonb,
    true,
    true
) ON CONFLICT DO NOTHING;

-- Insert some default workflow rules
INSERT INTO public.workflow_rules (rule_type, phase, configuration, is_active) VALUES
('phase_completion_threshold', 'Plan', '{"threshold": 100, "enforce": true, "message": "All Plan phase tasks must be completed before progressing to Do phase"}', true),
('phase_completion_threshold', 'Do', '{"threshold": 100, "enforce": true, "message": "All Do phase tasks must be completed before progressing to Check phase"}', true),
('phase_completion_threshold', 'Check', '{"threshold": 100, "enforce": true, "message": "All Check phase tasks must be completed before progressing to Act phase"}', true),
('phase_completion_threshold', 'Act', '{"threshold": 100, "enforce": true, "message": "All Act phase tasks must be completed before marking goal as Completed"}', true),
('notification_rule', 'All', '{"notify_on_status_change": true, "notify_assignees": true, "notify_owner": true}', true),
('duration_limit', 'Plan', '{"max_days": 30, "warning_days": 25, "enforce": false}', false),
('duration_limit', 'Do', '{"max_days": 60, "warning_days": 50, "enforce": false}', false),
('duration_limit', 'Check', '{"max_days": 14, "warning_days": 10, "enforce": false}', false),
('duration_limit', 'Act', '{"max_days": 30, "warning_days": 25, "enforce": false}', false)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- CLEAN SEED DATA COMPLETE
-- =============================================================================
