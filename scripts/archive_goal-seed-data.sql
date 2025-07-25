-- Goal Management System Seed Data
-- Run this AFTER complete-goal-database-setup.sql to populate sample data

-- =============================================================================
-- INSERT SAMPLE USERS
-- =============================================================================

INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@company.com', 'System Administrator', 'admin123', 'Admin', 'IT', 'Development', ARRAY['System Administration', 'Project Management'], true),
    ('550e8400-e29b-41d4-a716-446655440002', 'manager@company.com', 'Department Manager', 'manager123', 'User', 'Customer Service', 'Support', ARRAY['Leadership', 'Process Improvement'], true),
    ('550e8400-e29b-41d4-a716-446655440003', 'user@company.com', 'Regular User', 'user123', 'User', 'HR', null, ARRAY['Training', 'Communication'], true),
    ('550e8400-e29b-41d4-a716-446655440004', 'dev1@company.com', 'John Developer', 'dev123', 'User', 'IT', 'Development', ARRAY['React', 'Node.js', 'PostgreSQL'], true),
    ('550e8400-e29b-41d4-a716-446655440005', 'dev2@company.com', 'Mary Designer', 'dev123', 'User', 'IT', 'Design', ARRAY['UI/UX', 'Figma', 'Adobe Creative Suite'], true),
    ('550e8400-e29b-41d4-a716-446655440006', 'qa1@company.com', 'Bob Tester', 'qa123', 'User', 'IT', 'Quality Assurance', ARRAY['Testing', 'Automation', 'Cypress'], true),
    ('550e8400-e29b-41d4-a716-446655440007', 'sales1@company.com', 'Alice Salesperson', 'sales123', 'User', 'Sales', 'Inside Sales', ARRAY['CRM', 'Lead Generation', 'Customer Relations'], true),
    ('550e8400-e29b-41d4-a716-446655440008', 'hr1@company.com', 'Carol HR Manager', 'hr123', 'User', 'HR', 'Recruitment', ARRAY['Recruitment', 'Employee Relations', 'Training'], true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INSERT DEPARTMENT-TEAM MAPPINGS
-- =============================================================================

INSERT INTO public.department_teams (department, team) VALUES
-- IT Department teams
('IT', 'Development'),
('IT', 'Infrastructure'),
('IT', 'Security'),
('IT', 'Support'),
('IT', 'Quality Assurance'),
('IT', 'DevOps'),
('IT', 'Design'),

-- HR Department teams
('HR', 'Recruitment'),
('HR', 'Training'),
('HR', 'Compensation & Benefits'),
('HR', 'Employee Relations'),
('HR', 'Performance Management'),

-- Finance Department teams
('Finance', 'Accounting'),
('Finance', 'Budget & Planning'),
('Finance', 'Payroll'),
('Finance', 'Audit'),
('Finance', 'Treasury'),

-- Operations Department teams
('Operations', 'Production'),
('Operations', 'Supply Chain'),
('Operations', 'Logistics'),
('Operations', 'Quality Control'),
('Operations', 'Procurement'),

-- Marketing Department teams
('Marketing', 'Digital Marketing'),
('Marketing', 'Brand Management'),
('Marketing', 'Content'),
('Marketing', 'Social Media'),
('Marketing', 'Analytics'),

-- Sales Department teams
('Sales', 'Inside Sales'),
('Sales', 'Field Sales'),
('Sales', 'Account Management'),
('Sales', 'Sales Support'),
('Sales', 'Business Development'),

-- Customer Service teams
('Customer Service', 'Support'),
('Customer Service', 'Success'),
('Customer Service', 'Escalations'),
('Customer Service', 'Training'),

-- Product Development teams
('Product Development', 'Product Management'),
('Product Development', 'Design'),
('Product Development', 'Research'),
('Product Development', 'Testing'),

-- Quality Assurance teams
('Quality Assurance', 'Testing'),
('Quality Assurance', 'Automation'),
('Quality Assurance', 'Compliance'),
('Quality Assurance', 'Documentation'),

-- Legal teams
('Legal', 'Corporate'),
('Legal', 'Contracts'),
('Legal', 'Compliance'),
('Legal', 'Intellectual Property'),

-- Administration teams
('Administration', 'Facilities'),
('Administration', 'Office Management'),
('Administration', 'Executive Support'),
('Administration', 'Reception')
ON CONFLICT (department, team) DO NOTHING;

-- =============================================================================
-- INSERT DEPARTMENT PERMISSIONS FOR FORMER MANAGERS
-- =============================================================================

-- Give department permissions to former manager users so they can oversee their departments
INSERT INTO public.department_permissions (user_id, department) VALUES 
    ('550e8400-e29b-41d4-a716-446655440002', 'Customer Service'), -- Department Manager
    ('550e8400-e29b-41d4-a716-446655440008', 'HR') -- Carol HR Manager
ON CONFLICT (user_id, department) DO NOTHING;

-- =============================================================================
-- INSERT SAMPLE GOALS
-- =============================================================================

INSERT INTO public.goals (
    id, subject, description, goal_type, priority, status, department, teams,
    progress_percentage, target_metrics, success_criteria, owner_id, current_assignee_id,
    target_date, workflow_history
) VALUES
(
    '650e8400-e29b-41d4-a716-446655440001',
    'Improve Customer Satisfaction Scores',
    'Increase customer satisfaction scores from 7.2 to 8.5 through improved support processes and faster response times.',
    'Department',
    'High',
    'Do',
    'Customer Service',
    ARRAY['Support', 'Training'],
    45,
    'Increase CSAT from 7.2 to 8.5 (target: >8.0)',
    'Achieve CSAT score of 8.5+ for 3 consecutive months',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    NOW() + INTERVAL '30 days',
    '[{"id": "history-1", "timestamp": "2024-01-15T10:00:00Z", "user_id": "550e8400-e29b-41d4-a716-446655440002", "user_name": "Department Manager", "action": "status_change", "from_status": "Plan", "to_status": "Do", "comment": "Moving to implementation phase"}]'::jsonb
),
(
    '650e8400-e29b-41d4-a716-446655440002',
    'Reduce Development Cycle Time',
    'Streamline development processes to reduce average cycle time from feature request to deployment by 25%.',
    'Team',
    'Critical',
    'Check',
    'IT',
    ARRAY['Development', 'DevOps'],
    78,
    'Reduce cycle time from 14 days to 10.5 days (25% reduction)',
    'Consistent 10.5 day average for 6 weeks',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    NOW() + INTERVAL '14 days',
    '[{"id": "history-2", "timestamp": "2024-01-10T09:00:00Z", "user_id": "550e8400-e29b-41d4-a716-446655440001", "user_name": "System Administrator", "action": "status_change", "from_status": "Do", "to_status": "Check", "comment": "Implementation complete, reviewing results"}]'::jsonb
),
(
    '650e8400-e29b-41d4-a716-446655440003',
    'Enhance Employee Onboarding Process',
    'Redesign and improve the employee onboarding experience to reduce time-to-productivity and increase new hire satisfaction.',
    'Department',
    'Medium',
    'Plan',
    'HR',
    ARRAY['Recruitment', 'Training'],
    15,
    'Reduce onboarding time from 30 to 20 days',
    'All new hires complete training in 20 days with 90%+ satisfaction',
    '550e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440008',
    NOW() + INTERVAL '60 days',
    '[{"id": "history-3", "timestamp": "2024-01-20T14:00:00Z", "user_id": "550e8400-e29b-41d4-a716-446655440008", "user_name": "Carol HR Manager", "action": "status_change", "from_status": null, "to_status": "Plan", "comment": "Goal created and entered Plan phase"}]'::jsonb
),
(
    '650e8400-e29b-41d4-a716-446655440004',
    'Implement Automated Testing Framework',
    'Set up comprehensive automated testing framework to improve code quality and reduce manual testing effort by 70%.',
    'Team',
    'High',
    'Do',
    'IT',
    ARRAY['Development', 'Quality Assurance'],
    35,
    'Achieve 80% test coverage and 70% reduction in manual testing',
    'All critical paths covered by automated tests with <2 minute execution time',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440004',
    NOW() + INTERVAL '45 days',
    '[{"id": "history-4", "timestamp": "2024-01-18T11:00:00Z", "user_id": "550e8400-e29b-41d4-a716-446655440004", "user_name": "John Developer", "action": "status_change", "from_status": "Plan", "to_status": "Do", "comment": "Starting framework implementation"}]'::jsonb
),
(
    '650e8400-e29b-41d4-a716-446655440005',
    'Increase Sales Team Productivity',
    'Implement new CRM processes and tools to increase sales team productivity and improve lead conversion rates.',
    'Department',
    'High',
    'Act',
    'Sales',
    ARRAY['Inside Sales', 'Sales Support'],
    92,
    'Increase lead conversion rate from 12% to 18%',
    'Maintain 18%+ conversion rate for 2 consecutive quarters',
    '550e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440007',
    NOW() + INTERVAL '7 days',
    '[{"id": "history-5", "timestamp": "2024-01-22T16:00:00Z", "user_id": "550e8400-e29b-41d4-a716-446655440007", "user_name": "Alice Salesperson", "action": "status_change", "from_status": "Check", "to_status": "Act", "comment": "Results validated, implementing improvements"}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INSERT SAMPLE GOAL ASSIGNEES
-- =============================================================================

INSERT INTO public.goal_assignees (goal_id, user_id, assigned_by, task_status, completion_notes) VALUES
    ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'completed', 'Completed support process analysis'),
    ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'completed', 'Development optimizations implemented'),
    ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'pending', null),
    ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'pending', null),
    ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'pending', null),
    ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'pending', null),
    ('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'completed', 'CRM configuration completed successfully')
ON CONFLICT (goal_id, user_id) DO NOTHING;

-- =============================================================================
-- INSERT SAMPLE COMMENTS
-- =============================================================================

INSERT INTO public.goal_comments (goal_id, user_id, comment, is_private) VALUES
    ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Initial analysis shows current response time average is 4.2 hours. Target is 2.5 hours.', false),
    ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Consider implementing automated routing for common issues to reduce response time.', false),
    ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'Identified bottlenecks in code review process. Working on streamlining with automated checks.', false),
    ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'UI/UX improvements for deployment dashboard are ready for review.', false),
    ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440008', 'Surveyed recent hires - main pain points are paperwork complexity and unclear expectations.', false),
    ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 'Researching best frameworks - Cypress and Playwright look most promising for our stack.', false),
    ('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', 'New CRM training completed. Team reports 40% faster lead qualification process.', false)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- INSERT SAMPLE SUPPORT REQUIREMENTS
-- =============================================================================

INSERT INTO public.goal_support (goal_id, support_type, support_name, support_department, requested_by, status, notes) VALUES
    ('650e8400-e29b-41d4-a716-446655440001', 'Department', 'IT', null, '550e8400-e29b-41d4-a716-446655440002', 'Approved', 'Need help with automated reporting system'),
    ('650e8400-e29b-41d4-a716-446655440001', 'Team', 'Development', 'IT', '550e8400-e29b-41d4-a716-446655440002', 'Requested', 'Custom dashboard for support metrics'),
    ('650e8400-e29b-41d4-a716-446655440002', 'Department', 'Operations', null, '550e8400-e29b-41d4-a716-446655440001', 'Requested', 'Need deployment pipeline optimization'),
    ('650e8400-e29b-41d4-a716-446655440003', 'Department', 'IT', null, '550e8400-e29b-41d4-a716-446655440008', 'Approved', 'Digital onboarding platform setup'),
    ('650e8400-e29b-41d4-a716-446655440003', 'Team', 'Support', 'IT', '550e8400-e29b-41d4-a716-446655440008', 'Requested', 'Help with account provisioning automation'),
    ('650e8400-e29b-41d4-a716-446655440004', 'Department', 'Operations', null, '550e8400-e29b-41d4-a716-446655440004', 'Requested', 'Test environment infrastructure'),
    ('650e8400-e29b-41d4-a716-446655440005', 'Department', 'IT', null, '550e8400-e29b-41d4-a716-446655440007', 'Completed', 'CRM integration completed successfully'),
    ('650e8400-e29b-41d4-a716-446655440005', 'Team', 'Analytics', 'Marketing', '550e8400-e29b-41d4-a716-446655440007', 'Requested', 'Sales performance dashboard')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- INSERT SAMPLE DEPARTMENT PERMISSIONS
-- =============================================================================

INSERT INTO public.department_permissions (user_id, department, created_by) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'IT', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440001', 'HR', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440001', 'Sales', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440001', 'Customer Service', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Customer Service', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440008', 'HR', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (user_id, department) DO NOTHING;

-- =============================================================================
-- INSERT SAMPLE FOCUS REQUESTS
-- =============================================================================

INSERT INTO public.two_weeks_focus_requests (user_id, goal_id, focus_date, marked_by) VALUES
    ('550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440002', CURRENT_DATE, '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', CURRENT_DATE, '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440003', CURRENT_DATE + INTERVAL '1 day', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440005', CURRENT_DATE + INTERVAL '2 days', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (user_id, goal_id, focus_date) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

SELECT 
    'Sample data inserted successfully!' as status,
    (SELECT COUNT(*) FROM public.users) as users_count,
    (SELECT COUNT(*) FROM public.department_teams) as department_teams_count,
    (SELECT COUNT(*) FROM public.goals) as goals_count,
    (SELECT COUNT(*) FROM public.goal_assignees) as assignees_count,
    (SELECT COUNT(*) FROM public.goal_comments) as comments_count,
    (SELECT COUNT(*) FROM public.goal_support) as support_count,
    (SELECT COUNT(*) FROM public.department_permissions) as permissions_count,
    (SELECT COUNT(*) FROM public.two_weeks_focus_requests) as focus_count,
    CURRENT_TIMESTAMP as inserted_at;