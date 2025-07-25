-- Reset and Seed Test Data Script
-- This script resets all data and creates comprehensive test scenarios
-- Run this in Supabase SQL Editor AFTER running complete-goal-database-setup.sql and add-goal-tasks-table.sql

-- =============================================================================
-- TRUNCATE ALL DATA (PRESERVE SCHEMA)
-- =============================================================================

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Truncate all tables in dependency order
TRUNCATE TABLE public.notifications RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.two_weeks_focus_requests RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.department_permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.goal_support RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.goal_attachments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.goal_comments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.goal_tasks RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.goal_assignees RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.goals RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.department_teams RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- =============================================================================
-- INSERT TEST USERS (5 USERS FOR COMPREHENSIVE TESTING)
-- =============================================================================

INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@company.com', 'System Administrator', 'admin123', 'Admin', 'IT', 'Infrastructure', ARRAY['System Administration', 'Project Management', 'Strategic Planning'], true),
    ('22222222-2222-2222-2222-222222222222', 'john.smith@company.com', 'John Smith', 'john123', 'User', 'IT', 'Development', ARRAY['React', 'Node.js', 'PostgreSQL', 'Team Leadership'], true),
    ('33333333-3333-3333-3333-333333333333', 'sarah.johnson@company.com', 'Sarah Johnson', 'sarah123', 'User', 'HR', 'Recruitment', ARRAY['Recruitment', 'Employee Relations', 'Training', 'Process Improvement'], true),
    ('44444444-4444-4444-4444-444444444444', 'mike.chen@company.com', 'Mike Chen', 'mike123', 'User', 'IT', 'Development', ARRAY['React', 'TypeScript', 'Testing', 'DevOps'], true),
    ('55555555-5555-5555-5555-555555555555', 'lisa.davis@company.com', 'Lisa Davis', 'lisa123', 'User', 'Sales', 'Inside Sales', ARRAY['CRM', 'Lead Generation', 'Customer Relations', 'Sales Analytics'], true);

-- =============================================================================
-- INSERT DEPARTMENT-TEAM MAPPINGS
-- =============================================================================

INSERT INTO public.department_teams (department, team) VALUES
-- IT Department teams
('IT', 'Development'),
('IT', 'Infrastructure'),
('IT', 'Security'),
('IT', 'DevOps'),
('IT', 'Quality Assurance'),

-- HR Department teams
('HR', 'Recruitment'),
('HR', 'Training'),
('HR', 'Employee Relations'),
('HR', 'Compensation & Benefits'),

-- Sales Department teams
('Sales', 'Inside Sales'),
('Sales', 'Field Sales'),
('Sales', 'Account Management'),
('Sales', 'Business Development'),

-- Marketing Department teams
('Marketing', 'Digital Marketing'),
('Marketing', 'Content'),
('Marketing', 'Analytics'),

-- Operations Department teams
('Operations', 'Production'),
('Operations', 'Supply Chain'),
('Operations', 'Quality Control'),

-- Customer Service teams
('Customer Service', 'Support'),
('Customer Service', 'Success'),
('Customer Service', 'Training'),

-- Finance teams
('Finance', 'Accounting'),
('Finance', 'Budget & Planning'),
('Finance', 'Payroll');

-- =============================================================================
-- INSERT DEPARTMENT PERMISSIONS (MANAGERS CAN VIEW THEIR DEPARTMENTS)
-- =============================================================================

INSERT INTO public.department_permissions (user_id, department, created_by) VALUES
    ('11111111-1111-1111-1111-111111111111', 'IT', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'HR', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Sales', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Marketing', '11111111-1111-1111-1111-111111111111'),
    ('11111111-1111-1111-1111-111111111111', 'Operations', '11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222', 'IT', '11111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333333', 'HR', '11111111-1111-1111-1111-111111111111');

-- =============================================================================
-- INSERT COMPREHENSIVE TEST GOALS (COVERING ALL SCENARIOS)
-- =============================================================================

INSERT INTO public.goals (
    id, subject, description, goal_type, priority, status, department, teams,
    progress_percentage, target_metrics, success_criteria, owner_id, current_assignee_id,
    target_date, adjusted_target_date, workflow_history, previous_status
) VALUES

-- 1. PLAN Phase Goal (New Planning)
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Implement New Customer Portal',
    'Design and develop a self-service customer portal to reduce support tickets by 40% and improve customer satisfaction. The portal should allow customers to view orders, track shipments, and access support resources.',
    'Company',
    'High',
    'Plan',
    'IT',
    ARRAY['Development', 'DevOps'],
    10,
    'Reduce support tickets by 40%, increase customer satisfaction by 15%',
    'Portal handles 80% of common customer inquiries, CSAT score increases to 8.5+',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    NOW() + INTERVAL '90 days',
    NULL,
    '[{"timestamp": "2024-01-25T09:00:00Z", "from_status": null, "to_status": "Plan", "changed_by": "22222222-2222-2222-2222-222222222222", "changed_by_name": "John Smith", "comment": "Goal created and entered planning phase"}]'::jsonb,
    NULL
),

-- 2. DO Phase Goal (Active Implementation)
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Optimize Database Performance',
    'Improve database query performance and reduce average response time from 2.5s to under 1s. Implement indexing, query optimization, and caching strategies.',
    'Team',
    'Critical',
    'Do',
    'IT',
    ARRAY['Development', 'Infrastructure'],
    65,
    'Reduce average query response time from 2.5s to <1s',
    'All critical queries execute in <1s, 95th percentile <1.5s',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    NOW() + INTERVAL '30 days',
    NULL,
    '[
        {"timestamp": "2024-01-20T10:00:00Z", "from_status": null, "to_status": "Plan", "changed_by": "22222222-2222-2222-2222-222222222222", "changed_by_name": "John Smith", "comment": "Goal created"},
        {"timestamp": "2024-01-22T14:00:00Z", "from_status": "Plan", "to_status": "Do", "changed_by": "22222222-2222-2222-2222-222222222222", "changed_by_name": "John Smith", "comment": "Planning complete, starting implementation"}
    ]'::jsonb,
    'Plan'
),

-- 3. CHECK Phase Goal (Under Review)
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Employee Feedback System Redesign',
    'Redesign the employee feedback system to increase participation from 45% to 80% and improve feedback quality. Include anonymous options and better reporting.',
    'Department',
    'Medium',
    'Check',
    'HR',
    ARRAY['Employee Relations', 'Training'],
    85,
    'Increase feedback participation from 45% to 80%',
    'Maintain 80%+ participation for 3 consecutive quarters',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    NOW() + INTERVAL '15 days',
    NULL,
    '[
        {"timestamp": "2024-01-10T11:00:00Z", "from_status": null, "to_status": "Plan", "changed_by": "33333333-3333-3333-3333-333333333333", "changed_by_name": "Sarah Johnson", "comment": "Goal created"},
        {"timestamp": "2024-01-12T09:00:00Z", "from_status": "Plan", "to_status": "Do", "changed_by": "33333333-3333-3333-3333-333333333333", "changed_by_name": "Sarah Johnson", "comment": "Implementation started"},
        {"timestamp": "2024-01-24T16:00:00Z", "from_status": "Do", "to_status": "Check", "changed_by": "33333333-3333-3333-3333-333333333333", "changed_by_name": "Sarah Johnson", "comment": "Implementation complete, now reviewing results"}
    ]'::jsonb,
    'Do'
),

-- 4. ACT Phase Goal (Taking Action on Results)
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Sales Process Automation',
    'Automate lead qualification and follow-up processes to increase sales team efficiency by 30% and improve lead response time to under 2 hours.',
    'Department',
    'High',
    'Act',
    'Sales',
    ARRAY['Inside Sales', 'Business Development'],
    92,
    'Increase sales efficiency by 30%, reduce lead response time to <2 hours',
    'Consistent <2 hour response time, 30% increase in qualified leads per rep',
    '55555555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    NOW() + INTERVAL '10 days',
    NULL,
    '[
        {"timestamp": "2024-01-08T13:00:00Z", "from_status": null, "to_status": "Plan", "changed_by": "55555555-5555-5555-5555-555555555555", "changed_by_name": "Lisa Davis", "comment": "Goal created"},
        {"timestamp": "2024-01-10T10:00:00Z", "from_status": "Plan", "to_status": "Do", "changed_by": "55555555-5555-5555-5555-555555555555", "changed_by_name": "Lisa Davis", "comment": "Starting automation implementation"},
        {"timestamp": "2024-01-18T15:00:00Z", "from_status": "Do", "to_status": "Check", "changed_by": "55555555-5555-5555-5555-555555555555", "changed_by_name": "Lisa Davis", "comment": "Automation deployed, reviewing performance"},
        {"timestamp": "2024-01-23T11:00:00Z", "from_status": "Check", "to_status": "Act", "changed_by": "55555555-5555-5555-5555-555555555555", "changed_by_name": "Lisa Davis", "comment": "Results validated, implementing final optimizations"}
    ]'::jsonb,
    'Check'
),

-- 5. COMPLETED Goal (Success Story)
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Security Audit Compliance',
    'Complete comprehensive security audit and achieve SOC 2 compliance certification. Address all identified vulnerabilities and implement security best practices.',
    'Company',
    'Critical',
    'Completed',
    'IT',
    ARRAY['Security', 'Infrastructure'],
    100,
    'Achieve SOC 2 Type II certification, resolve all critical vulnerabilities',
    'SOC 2 certification obtained, zero critical vulnerabilities, security score >95%',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '5 days',
    NULL,
    '[
        {"timestamp": "2023-12-01T09:00:00Z", "from_status": null, "to_status": "Plan", "changed_by": "11111111-1111-1111-1111-111111111111", "changed_by_name": "System Administrator", "comment": "Goal created for Q1 compliance"},
        {"timestamp": "2023-12-10T10:00:00Z", "from_status": "Plan", "to_status": "Do", "changed_by": "11111111-1111-1111-1111-111111111111", "changed_by_name": "System Administrator", "comment": "Audit preparation started"},
        {"timestamp": "2024-01-15T14:00:00Z", "from_status": "Do", "to_status": "Check", "changed_by": "11111111-1111-1111-1111-111111111111", "changed_by_name": "System Administrator", "comment": "Audit complete, reviewing results"},
        {"timestamp": "2024-01-20T16:00:00Z", "from_status": "Check", "to_status": "Act", "changed_by": "11111111-1111-1111-1111-111111111111", "changed_by_name": "System Administrator", "comment": "Implementing final security measures"},
        {"timestamp": "2024-01-25T12:00:00Z", "from_status": "Act", "to_status": "Completed", "changed_by": "11111111-1111-1111-1111-111111111111", "changed_by_name": "System Administrator", "comment": "SOC 2 certification achieved successfully"}
    ]'::jsonb,
    'Act'
),

-- 6. ON HOLD Goal (Temporary Pause)
(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Mobile App Development',
    'Develop native mobile application for iOS and Android to extend platform reach. Project temporarily paused due to resource reallocation.',
    'Company',
    'Medium',
    'On Hold',
    'IT',
    ARRAY['Development'],
    25,
    'Launch mobile apps on both iOS and Android app stores',
    'Apps achieve 4.5+ star rating, 10K+ downloads in first month',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    NOW() + INTERVAL '120 days',
    NOW() + INTERVAL '150 days',
    '[
        {"timestamp": "2024-01-15T10:00:00Z", "from_status": null, "to_status": "Plan", "changed_by": "22222222-2222-2222-2222-222222222222", "changed_by_name": "John Smith", "comment": "Mobile development project initiated"},
        {"timestamp": "2024-01-20T09:00:00Z", "from_status": "Plan", "to_status": "Do", "changed_by": "22222222-2222-2222-2222-222222222222", "changed_by_name": "John Smith", "comment": "Development started with initial wireframes"},
        {"timestamp": "2024-01-25T14:00:00Z", "from_status": "Do", "to_status": "On Hold", "changed_by": "11111111-1111-1111-1111-111111111111", "changed_by_name": "System Administrator", "comment": "Pausing to focus on customer portal priority"}
    ]'::jsonb,
    'Do'
),

-- 7. Personal Goal (Individual Achievement)
(
    '77777777-7777-7777-7777-777777777777',
    'Professional Development - React Certification',
    'Complete advanced React certification and implement modern React patterns in current projects. Goal includes studying hooks, context, and performance optimization.',
    'Personal',
    'Low',
    'Do',
    'IT',
    ARRAY['Development'],
    40,
    'Complete React certification with 90%+ score',
    'Certification obtained, implement 3 modern React patterns in production',
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    NOW() + INTERVAL '45 days',
    NULL,
    '[
        {"timestamp": "2024-01-22T16:00:00Z", "from_status": null, "to_status": "Plan", "changed_by": "44444444-4444-4444-4444-444444444444", "changed_by_name": "Mike Chen", "comment": "Personal development goal set"},
        {"timestamp": "2024-01-24T10:00:00Z", "from_status": "Plan", "to_status": "Do", "changed_by": "44444444-4444-4444-4444-444444444444", "changed_by_name": "Mike Chen", "comment": "Started online course and practice projects"}
    ]'::jsonb,
    'Plan'
);

-- =============================================================================
-- INSERT GOAL ASSIGNEES (MULTI-ASSIGNEE SCENARIOS)
-- =============================================================================

INSERT INTO public.goal_assignees (goal_id, user_id, assigned_by, task_status, completion_notes, completed_at, completed_by) VALUES
    -- Customer Portal (Planning) - Multiple assignees needed
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'pending', NULL, NULL, NULL),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'pending', NULL, NULL, NULL),
    
    -- Database Performance (Active) - One completed, one pending
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'completed', 'Database analysis completed, identified 15 slow queries for optimization', NOW() - INTERVAL '2 days', '22222222-2222-2222-2222-222222222222'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'pending', NULL, NULL, NULL),
    
    -- Employee Feedback (Check phase) - All tasks completed
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'completed', 'New feedback system deployed, initial metrics look promising', NOW() - INTERVAL '3 days', '33333333-3333-3333-3333-333333333333'),
    
    -- Sales Automation (Act phase) - Completed
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'completed', 'Automation rules configured and tested successfully', NOW() - INTERVAL '1 day', '55555555-5555-5555-5555-555555555555'),
    
    -- Security Audit (Completed) - All done
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'completed', 'SOC 2 certification achieved, all security measures implemented', NOW() - INTERVAL '5 days', '11111111-1111-1111-1111-111111111111'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'completed', 'Infrastructure hardening completed successfully', NOW() - INTERVAL '6 days', '22222222-2222-2222-2222-222222222222'),
    
    -- Mobile App (On Hold) - Partial completion
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'pending', NULL, NULL, NULL);

-- =============================================================================
-- INSERT COMPREHENSIVE GOAL TASKS
-- =============================================================================

INSERT INTO public.goal_tasks (
    id, goal_id, title, description, priority, status, assigned_to, assigned_by, 
    department, due_date, estimated_hours, actual_hours, order_index, 
    completion_notes, completed_at, completed_by
) VALUES

-- Tasks for Customer Portal (Plan phase)
('10000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Requirements Gathering', 'Conduct stakeholder interviews and document detailed requirements for customer portal features', 'High', 'in_progress', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '7 days', 16, 8, 1, NULL, NULL, NULL),
('10000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Technical Architecture Design', 'Design system architecture, database schema, and API specifications', 'High', 'pending', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '14 days', 20, 0, 2, NULL, NULL, NULL),
('10000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'UI/UX Mockups', 'Create wireframes and interactive mockups for customer portal interface', 'Medium', 'pending', NULL, '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '10 days', 12, 0, 3, NULL, NULL, NULL),
('10000004-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Security Review', 'Conduct security assessment and define authentication/authorization requirements', 'Critical', 'pending', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '12 days', 8, 0, 4, NULL, NULL, NULL),

-- Tasks for Database Performance (Do phase)
('10000005-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Query Analysis', 'Analyze slow queries and identify optimization opportunities', 'Critical', 'completed', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'IT', NOW() - INTERVAL '3 days', 12, 14, 1, 'Identified 15 queries for optimization, documented performance bottlenecks', NOW() - INTERVAL '2 days', '22222222-2222-2222-2222-222222222222'),
('10000006-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Index Optimization', 'Create and optimize database indexes for improved query performance', 'High', 'in_progress', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '5 days', 16, 6, 2, NULL, NULL, NULL),
('10000007-0000-0000-0000-000000000007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Caching Implementation', 'Implement Redis caching for frequently accessed data', 'High', 'pending', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '10 days', 20, 0, 3, NULL, NULL, NULL),
('10000008-0000-0000-0000-000000000008', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Performance Testing', 'Conduct load testing and validate performance improvements', 'Medium', 'pending', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '15 days', 10, 0, 4, NULL, NULL, NULL),

-- Tasks for Employee Feedback System (Check phase)
('10000009-0000-0000-0000-000000000009', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'System Development', 'Develop new feedback collection and reporting system', 'High', 'completed', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'HR', NOW() - INTERVAL '10 days', 40, 45, 1, 'Feedback system developed with anonymous options and improved UX', NOW() - INTERVAL '7 days', '33333333-3333-3333-3333-333333333333'),
('1000000a-0000-0000-0000-00000000000a', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Pilot Testing', 'Run pilot test with 50 employees and gather initial feedback', 'High', 'completed', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'HR', NOW() - INTERVAL '5 days', 8, 6, 2, 'Pilot successful, 92% participation rate achieved', NOW() - INTERVAL '3 days', '33333333-3333-3333-3333-333333333333'),
('1000000b-0000-0000-0000-00000000000b', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Results Analysis', 'Analyze participation rates and feedback quality metrics', 'Medium', 'in_progress', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'HR', NOW() + INTERVAL '3 days', 6, 2, 3, NULL, NULL, NULL),

-- Tasks for Sales Process Automation (Act phase)
('1000000c-0000-0000-0000-00000000000c', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Automation Rules Setup', 'Configure lead scoring and automated follow-up sequences', 'Critical', 'completed', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Sales', NOW() - INTERVAL '5 days', 16, 18, 1, 'All automation rules configured and thoroughly tested', NOW() - INTERVAL '2 days', '55555555-5555-5555-5555-555555555555'),
('1000000d-0000-0000-0000-00000000000d', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Team Training', 'Train sales team on new automated processes and tools', 'High', 'in_progress', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Sales', NOW() + INTERVAL '2 days', 8, 4, 2, NULL, NULL, NULL),
('1000000e-0000-0000-0000-00000000000e', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Performance Monitoring', 'Monitor automation performance and fine-tune rules', 'Medium', 'pending', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Sales', NOW() + INTERVAL '7 days', 6, 0, 3, NULL, NULL, NULL),

-- Tasks for Security Audit (Completed)
('1000000f-0000-0000-0000-00000000000f', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Vulnerability Assessment', 'Conduct comprehensive security vulnerability assessment', 'Critical', 'completed', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'IT', NOW() - INTERVAL '20 days', 24, 26, 1, 'All vulnerabilities identified and documented', NOW() - INTERVAL '15 days', '11111111-1111-1111-1111-111111111111'),
('10000010-0000-0000-0000-000000000010', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Infrastructure Hardening', 'Implement security controls and harden infrastructure', 'Critical', 'completed', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'IT', NOW() - INTERVAL '12 days', 32, 35, 2, 'All infrastructure security measures implemented successfully', NOW() - INTERVAL '8 days', '22222222-2222-2222-2222-222222222222'),
('10000011-0000-0000-0000-000000000011', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'SOC 2 Documentation', 'Prepare and submit SOC 2 compliance documentation', 'High', 'completed', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'IT', NOW() - INTERVAL '8 days', 16, 18, 3, 'SOC 2 Type II certification successfully obtained', NOW() - INTERVAL '5 days', '11111111-1111-1111-1111-111111111111'),

-- Tasks for Mobile App (On Hold)
('10000012-0000-0000-0000-000000000012', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Market Research', 'Research competitor mobile apps and identify key features', 'Medium', 'completed', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'IT', NOW() - INTERVAL '15 days', 12, 14, 1, 'Market analysis completed, feature requirements documented', NOW() - INTERVAL '12 days', '44444444-4444-4444-4444-444444444444'),
('10000013-0000-0000-0000-000000000013', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Wireframe Design', 'Create wireframes for iOS and Android app interfaces', 'Medium', 'pending', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '30 days', 20, 4, 2, NULL, NULL, NULL),
('10000014-0000-0000-0000-000000000014', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Technical Specification', 'Define technical architecture and development approach', 'High', 'pending', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'IT', NOW() + INTERVAL '35 days', 16, 0, 3, NULL, NULL, NULL),

-- Tasks for Personal Development
('10000015-0000-0000-0000-000000000015', '77777777-7777-7777-7777-777777777777', 'Complete React Course', 'Finish advanced React online course with hands-on projects', 'High', 'in_progress', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'IT', NOW() + INTERVAL '20 days', 30, 12, 1, NULL, NULL, NULL),
('10000016-0000-0000-0000-000000000016', '77777777-7777-7777-7777-777777777777', 'Certification Exam', 'Pass React certification exam with 90%+ score', 'Critical', 'pending', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'IT', NOW() + INTERVAL '35 days', 4, 0, 2, NULL, NULL, NULL),
('10000017-0000-0000-0000-000000000017', '77777777-7777-7777-7777-777777777777', 'Apply in Production', 'Implement modern React patterns in current projects', 'Medium', 'pending', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'IT', NOW() + INTERVAL '40 days', 20, 0, 3, NULL, NULL, NULL);

-- =============================================================================
-- INSERT GOAL COMMENTS (REALISTIC PROGRESS UPDATES)
-- =============================================================================

INSERT INTO public.goal_comments (goal_id, user_id, comment, is_private) VALUES
    -- Customer Portal comments
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Started stakeholder interviews. So far, identified 3 key pain points: account access, order tracking, and support ticket visibility. Planning to interview 5 more stakeholders this week.', false),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Great progress on requirements gathering. Make sure to include mobile responsiveness and accessibility requirements - these are critical for customer satisfaction.', false),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Reviewed the initial requirements. I can start on the technical architecture once the stakeholder interviews are complete. Estimating 2-3 days for architecture design.', false),
    
    -- Database Performance comments
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Query analysis complete! Found 15 problematic queries, with the user dashboard query being the worst offender at 4.2s average. Documented all findings with execution plans.', false),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'Working on index optimization. Created 3 composite indexes already and seeing 60% improvement on the main queries. Will tackle the remaining 12 queries this week.', false),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Excellent progress! The performance improvements are already noticeable. Make sure to monitor memory usage as we add more indexes.', false),
    
    -- Employee Feedback System comments
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Pilot test results are very encouraging! 92% participation rate (vs. 45% with old system). Employees love the anonymous option and the simplified interface.', false),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Analyzing the feedback quality metrics now. Early indicators show 40% more detailed responses and much more actionable feedback. The new rating system is working well.', false),
    
    -- Sales Automation comments
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 'Automation is working beautifully! Lead response time dropped from 4 hours to 45 minutes average. The team is adapting well to the new workflow.', false),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 'Training session went well today. Covered the new lead scoring system and automated follow-up sequences. Team is excited about the time savings!', false),
    
    -- Security Audit comments
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'SOC 2 certification achieved! 🎉 This was a massive effort but we got there. All security controls are now in place and tested.', false),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Infrastructure hardening complete. All servers patched, firewalls configured, and monitoring systems operational. Security score improved from 67% to 96%.', false),
    
    -- Mobile App comments
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'Market research completed. Identified key features that will differentiate us from competitors. Ready to resume when resources become available.', false),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'Project is on hold for now, but we have a solid foundation. The customer portal takes priority, but we can quickly restart this once that''s delivered.', false),
    
    -- Personal Development comments
    ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Making good progress on the React course. The hooks and context sections were particularly valuable. Looking forward to applying these patterns in our codebase.', false),
    ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Great to see your commitment to learning! The new React patterns will definitely help with the customer portal project.', false);

-- =============================================================================
-- INSERT GOAL SUPPORT REQUESTS
-- =============================================================================

INSERT INTO public.goal_support (goal_id, support_type, support_name, support_department, requested_by, status, notes) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Department', 'Customer Service', NULL, '22222222-2222-2222-2222-222222222222', 'Approved', 'Need input on customer pain points and desired portal features'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Team', 'Support', 'Customer Service', '22222222-2222-2222-2222-222222222222', 'Requested', 'Help with support ticket integration requirements'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Department', 'Operations', NULL, '22222222-2222-2222-2222-222222222222', 'Requested', 'Need production database access for performance monitoring'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Department', 'IT', NULL, '33333333-3333-3333-3333-333333333333', 'Completed', 'Technical support for feedback system development provided'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Department', 'IT', NULL, '55555555-5555-5555-5555-555555555555', 'Completed', 'CRM integration and automation setup completed successfully'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Department', 'Legal', NULL, '11111111-1111-1111-1111-111111111111', 'Completed', 'Legal review of SOC 2 compliance requirements completed');

-- =============================================================================
-- INSERT NOTIFICATIONS
-- =============================================================================

INSERT INTO public.notifications (user_id, goal_id, type, title, description, action_data, is_read) VALUES
    -- Task assignment notifications
    ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'task_assigned', 'New Task Assigned', 'You have been assigned a new task: "Technical Architecture Design"', '{"task_id": "10000002-0000-0000-0000-000000000002", "task_title": "Technical Architecture Design"}', false),
    ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'task_assigned', 'New Task Assigned', 'You have been assigned a new task: "Index Optimization"', '{"task_id": "10000006-0000-0000-0000-000000000006", "task_title": "Index Optimization"}', true),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'task_assigned', 'New Task Assigned', 'You have been assigned a new task: "Security Review"', '{"task_id": "10000004-0000-0000-0000-000000000004", "task_title": "Security Review"}', false),
    
    -- Status change notifications
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'status_change', 'Goal Status Updated', 'Database Performance goal moved from Plan to Do phase', '{"old_status": "Plan", "new_status": "Do"}', true),
    ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'status_change', 'Goal Status Updated', 'Employee Feedback System moved from Do to Check phase', '{"old_status": "Do", "new_status": "Check"}', true),
    ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'status_change', 'Goal Completed', 'Security Audit Compliance has been completed successfully!', '{"old_status": "Act", "new_status": "Completed"}', false),
    
    -- Task completion notifications
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'task_completed', 'Task Completed', 'John Smith completed: "Query Analysis"', '{"task_id": "10000005-0000-0000-0000-000000000005", "task_title": "Query Analysis", "completed_by": "John Smith"}', false),
    ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'task_completed', 'Task Completed', 'Sarah Johnson completed: "Pilot Testing"', '{"task_id": "1000000a-0000-0000-0000-00000000000a", "task_title": "Pilot Testing", "completed_by": "Sarah Johnson"}', true),
    
    -- Comment notifications
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'comment', 'New Comment', 'System Administrator commented on Customer Portal goal', '{"comment_preview": "Great progress on requirements gathering..."}', false),
    ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'comment', 'New Comment', 'System Administrator commented on Database Performance goal', '{"comment_preview": "Excellent progress! The performance improvements..."}', true),
    
    -- Overdue task notifications  
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'task_due_soon', 'Task Due Soon', 'Task "Requirements Gathering" is due in 2 days', '{"task_id": "10000001-0000-0000-0000-000000000001", "task_title": "Requirements Gathering", "days_until_due": 2}', false),
    ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'task_due_soon', 'Task Due Soon', 'Task "Index Optimization" is due in 5 days', '{"task_id": "10000006-0000-0000-0000-000000000006", "task_title": "Index Optimization", "days_until_due": 5}', false);

-- =============================================================================
-- VERIFICATION AND SUMMARY
-- =============================================================================

SELECT 
    'Test data created successfully!' as status,
    'Ready for comprehensive testing of all features' as message,
    (SELECT COUNT(*) FROM public.users) as users_count,
    (SELECT COUNT(*) FROM public.department_teams) as department_teams_count,
    (SELECT COUNT(*) FROM public.goals) as goals_count,
    (SELECT COUNT(*) FROM public.goal_assignees) as assignees_count,
    (SELECT COUNT(*) FROM public.goal_tasks) as tasks_count,
    (SELECT COUNT(*) FROM public.goal_comments) as comments_count,
    (SELECT COUNT(*) FROM public.goal_support) as support_requests_count,
    (SELECT COUNT(*) FROM public.department_permissions) as permissions_count,
    (SELECT COUNT(*) FROM public.notifications) as notifications_count,
    CURRENT_TIMESTAMP as created_at;

-- =============================================================================
-- TEST USER CREDENTIALS SUMMARY
-- =============================================================================

SELECT 
    'TEST USER CREDENTIALS' as info,
    '' as separator,
    'admin@company.com / admin123 (Admin)' as admin_user,
    'john.smith@company.com / john123 (IT Manager)' as it_manager,
    'sarah.johnson@company.com / sarah123 (HR Manager)' as hr_manager,
    'mike.chen@company.com / mike123 (Developer)' as developer,
    'lisa.davis@company.com / lisa123 (Sales Rep)' as sales_rep,
    '' as separator2,
    'All users can test different scenarios:' as testing_note,
    '- Goals in all PDCA phases' as scenario1,
    '- Task management and assignments' as scenario2,
    '- Multi-user collaboration' as scenario3,
    '- Department permissions' as scenario4,
    '- Personal task dashboards' as scenario5,
    '- Comments and notifications' as scenario6;