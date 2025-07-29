-- Debug Seed Data Script
-- This script creates comprehensive test data for debugging support request functionality
-- Run this AFTER complete-database-init.sql and seed-test-data.sql

-- =============================================================================
-- CLEAR EXISTING DEBUG DATA (OPTIONAL - REMOVE IF YOU WANT TO KEEP EXISTING)
-- =============================================================================

-- Uncomment the following lines if you want to clear existing data first
DELETE FROM public.goal_support;
DELETE FROM public.goal_tasks;
DELETE FROM public.goal_assignees;
DELETE FROM public.goal_comments;
DELETE FROM public.goals WHERE created_at > '2024-01-01';
DELETE FROM public.users WHERE id != '11111111-1111-1111-1111-111111111111';

-- =============================================================================
-- INSERT DEBUG USERS (MATCHING DEBUG_USER_SWITCHER)
-- =============================================================================

INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
-- System Admin (ensure this exists)
('11111111-1111-1111-1111-111111111111', 'admin@company.com', 'System Administrator', 'admin123', 'Admin', 'IT', 'Infrastructure', ARRAY['System Administration', 'Project Management'], true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  team = EXCLUDED.team,
  skills = EXCLUDED.skills,
  is_active = EXCLUDED.is_active;

-- =============================================================================
-- INSERT DEPARTMENT-TEAM MAPPINGS (FROM SEED-TEST-DATA.SQL)
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

INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
-- IT Department
('22222222-2222-2222-2222-222222222222', 'john.smith@company.com', 'John Smith', 'debug123', 'Head', 'IT', 'GSPE', ARRAY['Software Development', 'Team Leadership'], true),
('44444444-4444-4444-4444-444444444444', 'mike.chen@company.com', 'Mike Chen', 'debug123', 'Employee', 'IT', 'IoT', ARRAY['Programming', 'Database Management'], true),

-- HR Department
('33333333-3333-3333-3333-333333333333', 'sarah.johnson@company.com', 'Sarah Johnson', 'debug123', 'Head', 'HR', 'Recruitment', ARRAY['Human Resources', 'Recruitment'], true),
('55555555-5555-5555-5555-555555555555', 'lisa.wang@company.com', 'Lisa Wang', 'debug123', 'Employee', 'HR', 'Training & Development', ARRAY['Training', 'Employee Development'], true),

-- Sales Department
('66666666-6666-6666-6666-666666666666', 'david.brown@company.com', 'David Brown', 'debug123', 'Head', 'Sales', 'ABB', ARRAY['Sales Management', 'Client Relations'], true),
('77777777-7777-7777-7777-777777777777', 'emma.davis@company.com', 'Emma Davis', 'debug123', 'Employee', 'Sales', 'Siemens', ARRAY['Sales', 'Customer Service'], true),

-- Finance Department
('88888888-8888-8888-8888-888888888888', 'robert.wilson@company.com', 'Robert Wilson', 'debug123', 'Head', 'Finance', 'Finance', ARRAY['Financial Management', 'Budgeting'], true),
('99999999-9999-9999-9999-999999999999', 'anna.garcia@company.com', 'Anna Garcia', 'debug123', 'Employee', 'Finance', 'Tax', ARRAY['Tax Preparation', 'Financial Analysis'], true),

-- Engineer Department
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'james.taylor@company.com', 'James Taylor', 'debug123', 'Head', 'Engineer', 'Mechanical Engineering', ARRAY['Mechanical Engineering', 'Project Management'], true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'maria.lopez@company.com', 'Maria Lopez', 'debug123', 'Employee', 'Engineer', 'Electrical Engineering', ARRAY['Electrical Engineering', 'Circuit Design'], true),

-- Operation Department
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'kevin.martinez@company.com', 'Kevin Martinez', 'debug123', 'Head', 'Operation', 'Production', ARRAY['Operations Management', 'Quality Control'], true),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'sophie.anderson@company.com', 'Sophie Anderson', 'debug123', 'Employee', 'Operation', 'QC & QA', ARRAY['Quality Assurance', 'Process Improvement'], true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INSERT DEPARTMENT PERMISSIONS FOR HEAD USERS
-- =============================================================================

INSERT INTO public.department_permissions (user_id, department, created_by) VALUES
-- John Smith (IT Head) permissions
('22222222-2222-2222-2222-222222222222', 'IT', '11111111-1111-1111-1111-111111111111'),

-- Sarah Johnson (HR Head) permissions
('33333333-3333-3333-3333-333333333333', 'HR', '11111111-1111-1111-1111-111111111111'),

-- David Brown (Sales Head) permissions
('66666666-6666-6666-6666-666666666666', 'Sales', '11111111-1111-1111-1111-111111111111'),

-- Robert Wilson (Finance Head) permissions
('88888888-8888-8888-8888-888888888888', 'Finance', '11111111-1111-1111-1111-111111111111'),

-- James Taylor (Engineer Head) permissions
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engineer', '11111111-1111-1111-1111-111111111111'),

-- Kevin Martinez (Operation Head) permissions
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Operation', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (user_id, department) DO NOTHING;

-- =============================================================================
-- INSERT DEBUG GOALS WITH SUPPORT REQUESTS
-- =============================================================================

-- Goal 1: IT Department goal requesting HR support
INSERT INTO public.goals (
    id, subject, description, goal_type, priority, status, 
    department, teams, owner_id, current_assignee_id,
    target_date, created_at, updated_at
) VALUES (
    '10000001-0001-0001-0001-000000000001', 
    'Implement New Employee IT Onboarding System',
    'Create an automated system for setting up IT accounts and equipment for new hires. This will streamline the onboarding process and reduce manual work.',
    'Department',
    'High',
    'Plan',
    'IT',
    ARRAY['GSPE', 'IoT'],
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '2025-03-15',
    NOW(),
    NOW()
);

-- Goal 2: Sales Department goal requesting Finance and Engineer support
INSERT INTO public.goals (
    id, subject, description, goal_type, priority, status,
    department, teams, owner_id, current_assignee_id,
    target_date, created_at, updated_at
) VALUES (
    '20000002-0002-0002-0002-000000000002',
    'Launch New Product Line - Industrial Automation',
    'Develop and launch a new industrial automation product line targeting manufacturing companies. Requires financial analysis and engineering expertise.',
    'Company',
    'Critical',
    'Do',
    'Sales',
    ARRAY['ABB', 'Siemens'],
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '2025-06-30',
    NOW(),
    NOW()
);

-- Goal 3: HR Department goal requesting Operation support
INSERT INTO public.goals (
    id, subject, description, goal_type, priority, status,
    department, teams, owner_id, current_assignee_id,
    target_date, created_at, updated_at
) VALUES (
    '30000003-0003-0003-0003-000000000003',
    'Implement Safety Training Program',
    'Develop comprehensive safety training for all production staff. Need operational input for realistic training scenarios.',
    'Department',
    'High',
    'Plan',
    'HR',
    ARRAY['Training & Development'],
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    '2025-04-20',
    NOW(),
    NOW()
);

-- Goal 4: Finance Department goal (no support needed)
INSERT INTO public.goals (
    id, subject, description, goal_type, priority, status,
    department, teams, owner_id, current_assignee_id,
    target_date, created_at, updated_at
) VALUES (
    '40000004-0004-0004-0004-000000000004',
    'Q1 Budget Analysis and Reporting',
    'Complete comprehensive analysis of Q1 financial performance and prepare detailed reports for management.',
    'Department',
    'Medium',
    'Check',
    'Finance',
    ARRAY['Finance'],
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    '2025-02-28',
    NOW(),
    NOW()
);

-- Goal 5: Engineer Department goal requesting IT support
INSERT INTO public.goals (
    id, subject, description, goal_type, priority, status,
    department, teams, owner_id, current_assignee_id,
    target_date, created_at, updated_at
) VALUES (
    '50000005-0005-0005-0005-000000000005',
    'Upgrade CAD Software Infrastructure',
    'Modernize engineering CAD software and hardware infrastructure to improve design efficiency and collaboration.',
    'Department',
    'High',
    'Plan',
    'Engineer',
    ARRAY['Mechanical Engineering', 'Electrical Engineering'],
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '2025-05-15',
    NOW(),
    NOW()
);

-- =============================================================================
-- INSERT SUPPORT REQUESTS (AUTO-ACCEPTED)
-- =============================================================================

-- Goal 1: IT requesting HR support
INSERT INTO public.goal_support (
    id, goal_id, support_type, support_name, requested_by, status, created_at, updated_at
) VALUES (
    '10000001-1001-1001-1001-100000000001', '10000001-0001-0001-0001-000000000001', 'Department', 'HR', '22222222-2222-2222-2222-222222222222', 'Accepted', NOW(), NOW()
);

-- Goal 2: Sales requesting Finance and Engineer support
INSERT INTO public.goal_support (
    id, goal_id, support_type, support_name, requested_by, status, created_at, updated_at
) VALUES (
    '20000002-2002-2002-2002-200000000002', '20000002-0002-0002-0002-000000000002', 'Department', 'Finance', '66666666-6666-6666-6666-666666666666', 'Accepted', NOW(), NOW()
),
(
    '20000003-2003-2003-2003-200000000003', '20000002-0002-0002-0002-000000000002', 'Department', 'Engineer', '66666666-6666-6666-6666-666666666666', 'Accepted', NOW(), NOW()
);

-- Goal 3: HR requesting Operation support
INSERT INTO public.goal_support (
    id, goal_id, support_type, support_name, requested_by, status, created_at, updated_at
) VALUES (
    '30000004-3004-3004-3004-300000000004', '30000003-0003-0003-0003-000000000003', 'Department', 'Operation', '33333333-3333-3333-3333-333333333333', 'Accepted', NOW(), NOW()
);

-- Goal 5: Engineer requesting IT support
INSERT INTO public.goal_support (
    id, goal_id, support_type, support_name, requested_by, status, created_at, updated_at
) VALUES (
    '50000005-5005-5005-5005-500000000005', '50000005-0005-0005-0005-000000000005', 'Department', 'IT', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Accepted', NOW(), NOW()
);

-- =============================================================================
-- INSERT SAMPLE TASKS FOR GOALS
-- =============================================================================

-- Tasks for Goal 1 (IT Onboarding System)
INSERT INTO public.goal_tasks (
    id, goal_id, title, assigned_to, assigned_by, pdca_phase, priority, status, created_at, updated_at
) VALUES 
('10000001-1001-1001-1001-100000001001', '10000001-0001-0001-0001-000000000001', 'Research current onboarding process bottlenecks', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Plan', 'High', 'completed', NOW(), NOW()),
('10000002-1002-1002-1002-100000001002', '10000001-0001-0001-0001-000000000001', 'Design automated account creation workflow', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Plan', 'High', 'in_progress', NOW(), NOW()),
('10000003-1003-1003-1003-100000001003', '10000001-0001-0001-0001-000000000001', 'Coordinate with HR for onboarding requirements', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Plan', 'Medium', 'pending', NOW(), NOW());

-- Tasks for Goal 2 (Product Launch)
INSERT INTO public.goal_tasks (
    id, goal_id, title, assigned_to, assigned_by, pdca_phase, priority, status, created_at, updated_at
) VALUES 
('20000004-2004-2004-2004-200000002004', '20000002-0002-0002-0002-000000000002', 'Conduct market research and competitive analysis', '77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', 'Do', 'Critical', 'completed', NOW(), NOW()),
('20000005-2005-2005-2005-200000002005', '20000002-0002-0002-0002-000000000002', 'Develop product specifications with engineering', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'Do', 'Critical', 'in_progress', NOW(), NOW()),
('20000006-2006-2006-2006-200000002006', '20000002-0002-0002-0002-000000000002', 'Create financial projections and budget', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'Do', 'High', 'pending', NOW(), NOW());

-- Tasks for Goal 3 (Safety Training)
INSERT INTO public.goal_tasks (
    id, goal_id, title, assigned_to, assigned_by, pdca_phase, priority, status, created_at, updated_at
) VALUES 
('30000007-3007-3007-3007-300000003007', '30000003-0003-0003-0003-000000000003', 'Review current safety procedures', '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Plan', 'High', 'in_progress', NOW(), NOW()),
('30000008-3008-3008-3008-300000003008', '30000003-0003-0003-0003-000000000003', 'Identify training content gaps', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Plan', 'Medium', 'pending', NOW(), NOW());

-- =============================================================================
-- INSERT GOAL ASSIGNEES (MULTI-ASSIGNEE SUPPORT)
-- =============================================================================

-- Goal 1: Multiple IT team members
INSERT INTO public.goal_assignees (goal_id, user_id, assigned_by, created_at) VALUES 
('10000001-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NOW()),
('10000001-0001-0001-0001-000000000001', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', NOW());

-- Goal 2: Sales team
INSERT INTO public.goal_assignees (goal_id, user_id, assigned_by, created_at) VALUES 
('20000002-0002-0002-0002-000000000002', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', NOW()),
('20000002-0002-0002-0002-000000000002', '77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', NOW());

-- Goal 3: HR team
INSERT INTO public.goal_assignees (goal_id, user_id, assigned_by, created_at) VALUES 
('30000003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', NOW()),
('30000003-0003-0003-0003-000000000003', '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', NOW());

-- =============================================================================
-- INSERT SAMPLE COMMENTS
-- =============================================================================

INSERT INTO public.goal_comments (
    id, goal_id, user_id, comment, created_at
) VALUES 
('10000001-1001-1001-1001-100000010001', '10000001-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'Starting research phase. Will coordinate with HR team next week.', NOW()),
('20000002-2002-2002-2002-200000020002', '20000002-0002-0002-0002-000000000002', '66666666-6666-6666-6666-666666666666', 'Market analysis shows strong demand. Moving forward with engineering collaboration.', NOW()),
('30000003-3003-3003-3003-300000030003', '30000003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 'Need to schedule meeting with Operations team to understand current safety protocols.', NOW());

-- =============================================================================
-- DEBUG DATA SUMMARY
-- =============================================================================
-- 
-- USERS CREATED:
-- - 1 Admin: System Administrator (IT)
-- - 6 Heads: John Smith (IT), Sarah Johnson (HR), David Brown (Sales), 
--           Robert Wilson (Finance), James Taylor (Engineer), Kevin Martinez (Operation)
-- - 6 Employees: Mike Chen (IT), Lisa Wang (HR), Emma Davis (Sales), 
--               Anna Garcia (Finance), Maria Lopez (Engineer), Sophie Anderson (Operation)
--
-- GOALS CREATED:
-- - Goal 1: IT → requesting HR support (has tasks, multi-assignee)
-- - Goal 2: Sales → requesting Finance + Engineer support (has tasks, multi-assignee)  
-- - Goal 3: HR → requesting Operation support (has tasks, multi-assignee)
-- - Goal 4: Finance → no support needed (single assignee)
-- - Goal 5: Engineer → requesting IT support (single assignee)
--
-- TESTING SCENARIOS:
-- 1. Login as Head users to see Support Requests section in dashboard
-- 2. Login as different department heads to see cross-department requests
-- 3. Verify badges show correctly (Department Goal vs Supporting vs Support Request)
-- 4. Test goal creation with support requirements
-- 5. Verify auto-accepted status on all support requests
--
-- DEBUG LOGIN CREDENTIALS (all passwords: debug123):
-- admin@company.com - System Administrator (Admin)
-- john.smith@company.com - John Smith (IT Head)
-- sarah.johnson@company.com - Sarah Johnson (HR Head) 
-- david.brown@company.com - David Brown (Sales Head)
-- robert.wilson@company.com - Robert Wilson (Finance Head)
-- james.taylor@company.com - James Taylor (Engineer Head)
-- kevin.martinez@company.com - Kevin Martinez (Operation Head)
-- mike.chen@company.com - Mike Chen (IT Employee)
-- lisa.wang@company.com - Lisa Wang (HR Employee)
-- emma.davis@company.com - Emma Davis (Sales Employee)
-- anna.garcia@company.com - Anna Garcia (Finance Employee)
-- maria.lopez@company.com - Maria Lopez (Engineer Employee)
-- sophie.anderson@company.com - Sophie Anderson (Operation Employee)
--
-- =============================================================================