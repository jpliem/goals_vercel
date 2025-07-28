-- Seed Test Data Script
-- This script populates the database with comprehensive test data
-- Run this AFTER complete-database-init.sql to add sample data for testing

-- =============================================================================
-- INSERT TEST USERS (5 USERS FOR COMPREHENSIVE TESTING)
-- =============================================================================

INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@company.com', 'System Administrator', 'admin123', 'Admin', 'IT', 'Infrastructure', ARRAY['System Administration', 'Project Management', 'Strategic Planning'], true),
    ('22222222-2222-2222-2222-222222222222', 'john.smith@company.com', 'John Smith', 'john123', 'Head', 'IT', 'Development', ARRAY['React', 'Node.js', 'PostgreSQL', 'Team Leadership'], true),
    ('33333333-3333-3333-3333-333333333333', 'sarah.johnson@company.com', 'Sarah Johnson', 'sarah123', 'Head', 'HR', 'Recruitment', ARRAY['Recruitment', 'Employee Relations', 'Training', 'Process Improvement'], true),
    ('44444444-4444-4444-4444-444444444444', 'mike.chen@company.com', 'Mike Chen', 'mike123', 'Employee', 'IT', 'Development', ARRAY['React', 'TypeScript', 'Testing', 'DevOps'], true),
    ('55555555-5555-5555-5555-555555555555', 'lisa.davis@company.com', 'Lisa Davis', 'lisa123', 'Employee', 'Sales', 'Inside Sales', ARRAY['CRM', 'Lead Generation', 'Customer Relations', 'Sales Analytics'], true);

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
    id, goal_type, subject, description, priority, status, department, teams, 
    target_date, target_metrics, success_criteria, progress_percentage, 
    owner_id, current_assignee_id, workflow_history
) VALUES
-- Goal 1: IT Department - Plan Phase with tasks
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Department',
    'Implement New Employee Onboarding System',
    'Design and develop a comprehensive digital onboarding system to streamline the new employee experience and reduce manual paperwork.',
    'High',
    'Plan',
    'IT',
    ARRAY['Development', 'Infrastructure'],
    (NOW() + INTERVAL '45 days')::TIMESTAMP WITH TIME ZONE,
    'Reduce onboarding time from 3 days to 4 hours. Process 50+ new employees monthly.',
    'System deployed, HR approves functionality, 90% employee satisfaction score',
    15,
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '[{"id":"history-1","timestamp":"2024-01-15T10:00:00Z","user_id":"22222222-2222-2222-2222-222222222222","user_name":"John Smith","action":"status_change","from_status":null,"to_status":"Plan","comment":"Goal created and entered Plan phase"}]'
),

-- Goal 2: HR Department - Do Phase with tasks
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Team',
    'Improve Employee Retention Program',
    'Develop and implement strategies to improve employee retention rates across all departments through better engagement and career development programs.',
    'Critical',
    'Do',
    'HR',
    ARRAY['Recruitment', 'Training'],
    (NOW() + INTERVAL '30 days')::TIMESTAMP WITH TIME ZONE,
    'Increase retention rate from 85% to 92%. Reduce turnover costs by 40%.',
    'Retention rate above 92% for 6 months, exit interview scores improve by 25%',
    40,
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '[{"id":"history-1","timestamp":"2024-01-10T09:00:00Z","user_id":"33333333-3333-3333-3333-333333333333","user_name":"Sarah Johnson","action":"status_change","from_status":null,"to_status":"Plan","comment":"Goal created and entered Plan phase"},{"id":"history-2","timestamp":"2024-01-20T14:30:00Z","user_id":"33333333-3333-3333-3333-333333333333","user_name":"Sarah Johnson","action":"status_change","from_status":"Plan","to_status":"Do","comment":"Planning completed, moving to execution phase"}]'
),

-- Goal 3: Sales Department - Check Phase
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Department',
    'Optimize Sales Process Efficiency',
    'Analyze and optimize the current sales process to reduce deal closure time and improve conversion rates through better lead qualification and follow-up procedures.',
    'High',
    'Check',
    'Sales',
    ARRAY['Inside Sales', 'Account Management'],
    (NOW() + INTERVAL '20 days')::TIMESTAMP WITH TIME ZONE,
    'Reduce average deal closure time from 45 to 30 days. Improve conversion rate from 12% to 18%.',
    'Sustained 30-day closure time for 3 months, conversion rate above 18%',
    75,
    '55555555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    '[{"id":"history-1","timestamp":"2024-01-05T11:00:00Z","user_id":"55555555-5555-5555-5555-555555555555","user_name":"Lisa Davis","action":"status_change","from_status":null,"to_status":"Plan","comment":"Goal created and entered Plan phase"},{"id":"history-2","timestamp":"2024-01-12T10:15:00Z","user_id":"55555555-5555-5555-5555-555555555555","user_name":"Lisa Davis","action":"status_change","from_status":"Plan","to_status":"Do","comment":"Process analysis completed, starting implementation"},{"id":"history-3","timestamp":"2024-01-25T16:45:00Z","user_id":"55555555-5555-5555-5555-555555555555","user_name":"Lisa Davis","action":"status_change","from_status":"Do","to_status":"Check","comment":"Implementation complete, now measuring results"}]'
),

-- Goal 4: IT Department - Act Phase
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Team',
    'Enhance System Security Protocols',
    'Implement advanced security measures including multi-factor authentication, regular security audits, and employee security training to protect company data.',
    'Critical',
    'Act',
    'IT',
    ARRAY['Security', 'Infrastructure'],
    (NOW() + INTERVAL '10 days')::TIMESTAMP WITH TIME ZONE,
    'Zero security incidents for 6 months. 100% employee compliance with new protocols.',
    'Security audit score above 95%, all employees complete training, no incidents',
    90,
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    '[{"id":"history-1","timestamp":"2023-12-20T08:00:00Z","user_id":"22222222-2222-2222-2222-222222222222","user_name":"John Smith","action":"status_change","from_status":null,"to_status":"Plan","comment":"Goal created and entered Plan phase"},{"id":"history-2","timestamp":"2024-01-03T09:30:00Z","user_id":"22222222-2222-2222-2222-222222222222","user_name":"John Smith","action":"status_change","from_status":"Plan","to_status":"Do","comment":"Security assessment completed, implementing measures"},{"id":"history-3","timestamp":"2024-01-18T13:20:00Z","user_id":"22222222-2222-2222-2222-222222222222","user_name":"John Smith","action":"status_change","from_status":"Do","to_status":"Check","comment":"Implementation complete, monitoring effectiveness"},{"id":"history-4","timestamp":"2024-01-28T11:10:00Z","user_id":"22222222-2222-2222-2222-222222222222","user_name":"John Smith","action":"status_change","from_status":"Check","to_status":"Act","comment":"Monitoring shows good results, now taking corrective actions"}]'
),

-- Goal 5: Completed Goal
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Personal',
    'Complete Professional Development Course',
    'Successfully complete the Advanced Project Management certification course to enhance leadership skills and project delivery capabilities.',
    'Medium',
    'Completed',
    'IT',
    ARRAY['Development'],
    (NOW() - INTERVAL '5 days')::TIMESTAMP WITH TIME ZONE,
    'Complete course with score above 85%. Apply learnings to current projects.',
    'Course completed with certification, positive feedback on project management',
    100,
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    '[{"id":"history-1","timestamp":"2023-12-01T10:00:00Z","user_id":"44444444-4444-4444-4444-444444444444","user_name":"Mike Chen","action":"status_change","from_status":null,"to_status":"Plan","comment":"Goal created and entered Plan phase"},{"id":"history-2","timestamp":"2023-12-10T14:00:00Z","user_id":"44444444-4444-4444-4444-444444444444","user_name":"Mike Chen","action":"status_change","from_status":"Plan","to_status":"Do","comment":"Enrolled in course, starting studies"},{"id":"history-3","timestamp":"2024-01-15T16:30:00Z","user_id":"44444444-4444-4444-4444-444444444444","user_name":"Mike Chen","action":"status_change","from_status":"Do","to_status":"Check","comment":"Course material completed, preparing for exam"},{"id":"history-4","timestamp":"2024-01-22T12:00:00Z","user_id":"44444444-4444-4444-4444-444444444444","user_name":"Mike Chen","action":"status_change","from_status":"Check","to_status":"Act","comment":"Exam passed, applying knowledge to current work"},{"id":"history-5","timestamp":"2024-01-30T15:45:00Z","user_id":"44444444-4444-4444-4444-444444444444","user_name":"Mike Chen","action":"status_change","from_status":"Act","to_status":"Completed","comment":"Goal successfully completed with certification achieved"}]'
);

-- =============================================================================
-- INSERT GOAL ASSIGNEES (MULTI-ASSIGNEE SUPPORT)
-- =============================================================================

INSERT INTO public.goal_assignees (goal_id, user_id, assigned_by, task_status, completion_notes) VALUES
-- Onboarding System Goal - Multiple assignees
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'pending', NULL),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'pending', NULL),

-- Employee Retention Goal
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'completed', 'Survey analysis completed, identified key retention factors'),

-- Sales Process Goal  
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'completed', 'Process optimization implemented and showing positive results'),

-- Security Protocols Goal
('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'completed', 'All security measures implemented successfully');

-- =============================================================================
-- INSERT GOAL TASKS WITH PDCA PHASES
-- =============================================================================

-- Tasks for Onboarding System Goal (Plan Phase)
INSERT INTO public.goal_tasks (
    goal_id, title, description, priority, status, pdca_phase, 
    assigned_to, assigned_by, department, due_date, estimated_hours
) VALUES
-- Plan Phase Tasks
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Conduct stakeholder requirements gathering',
    'Meet with HR, IT, and department heads to understand onboarding requirements and pain points',
    'High',
    'completed',
    'Plan',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'IT',
    (NOW() + INTERVAL '5 days')::TIMESTAMP WITH TIME ZONE,
    8
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Design system architecture',
    'Create technical architecture and database design for the onboarding system',
    'High',
    'in_progress',
    'Plan',
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'IT',
    (NOW() + INTERVAL '10 days')::TIMESTAMP WITH TIME ZONE,
    16
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Create project timeline and resource allocation',
    'Develop detailed project plan with milestones and resource requirements',
    'Medium',
    'pending',
    'Plan',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'IT',
    (NOW() + INTERVAL '7 days')::TIMESTAMP WITH TIME ZONE,
    4
),

-- Do Phase Tasks (for future phases)
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Develop frontend user interface',
    'Build React-based interface for new employee onboarding workflows',
    'High',
    'pending',
    'Do',
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'IT',
    (NOW() + INTERVAL '25 days')::TIMESTAMP WITH TIME ZONE,
    40
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Implement backend API services',
    'Create REST APIs for onboarding data management and integrations',
    'High',
    'pending',
    'Do',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'IT',
    (NOW() + INTERVAL '30 days')::TIMESTAMP WITH TIME ZONE,
    32
),

-- Check Phase Tasks
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Conduct user acceptance testing',
    'Test system with HR team and sample new employees',
    'Critical',
    'pending',
    'Check',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'HR',
    (NOW() + INTERVAL '40 days')::TIMESTAMP WITH TIME ZONE,
    16
),

-- Act Phase Tasks
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Deploy to production and train staff',
    'Deploy system to production environment and train HR staff',
    'High',
    'pending',
    'Act',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'IT',
    (NOW() + INTERVAL '45 days')::TIMESTAMP WITH TIME ZONE,
    12
);

-- Tasks for Employee Retention Goal (Do Phase - in progress)
INSERT INTO public.goal_tasks (
    goal_id, title, description, priority, status, pdca_phase, 
    assigned_to, assigned_by, department, due_date, estimated_hours
) VALUES
-- Plan Phase Tasks (completed)
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Analyze current retention data',
    'Review exit interviews and retention statistics from past 2 years',
    'High',
    'completed',
    'Plan',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'HR',
    (NOW() - INTERVAL '15 days')::TIMESTAMP WITH TIME ZONE,
    12
),

-- Do Phase Tasks (current)
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Implement mentorship program',
    'Launch company-wide mentorship program for career development',
    'High',
    'in_progress',
    'Do',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'HR',
    (NOW() + INTERVAL '15 days')::TIMESTAMP WITH TIME ZONE,
    24
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Enhance benefits package',
    'Review and improve employee benefits based on feedback',
    'Medium',
    'pending',
    'Do',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'HR',
    (NOW() + INTERVAL '20 days')::TIMESTAMP WITH TIME ZONE,
    16
);

-- Tasks for Sales Process Goal (Check Phase - measuring results)
INSERT INTO public.goal_tasks (
    goal_id, title, description, priority, status, pdca_phase, 
    assigned_to, assigned_by, department, due_date, estimated_hours
) VALUES
-- Check Phase Tasks (current)
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Analyze process improvement metrics',
    'Measure deal closure times and conversion rates after process changes',
    'Critical',
    'in_progress',
    'Check',
    '55555555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    'Sales',
    (NOW() + INTERVAL '10 days')::TIMESTAMP WITH TIME ZONE,
    8
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Collect sales team feedback',
    'Gather feedback from sales team on new process effectiveness',
    'High',
    'pending',
    'Check',
    '55555555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    'Sales',
    (NOW() + INTERVAL '15 days')::TIMESTAMP WITH TIME ZONE,
    4
);

-- =============================================================================
-- INSERT GOAL COMMENTS
-- =============================================================================

INSERT INTO public.goal_comments (goal_id, user_id, comment) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Started requirements gathering with HR team. Initial feedback is very positive about automating the current manual process.'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Working on the technical architecture. Planning to use React frontend with Node.js backend and PostgreSQL database.'),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Completed analysis of exit interview data. Key findings: lack of career development opportunities and limited mentorship.'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Mentorship program design is complete. Starting pilot with 20 mentor-mentee pairs next week.'),

('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'Initial data shows 15% improvement in deal closure time. Conversion rate is trending upward.'),

('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'All security protocols implemented. Zero incidents recorded. Employee training completion at 98%.'),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444', 'Successfully completed PMP certification with a score of 92%. Already applying new methodologies to current projects.');

-- =============================================================================
-- INSERT NOTIFICATIONS (SAMPLE TASK AND GOAL NOTIFICATIONS)
-- =============================================================================

INSERT INTO public.notifications (user_id, goal_id, type, title, description, action_data) VALUES
-- Task assignment notifications
('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'task_assigned', 'New Task Assigned', 'You have been assigned a new task in goal "Implement New Employee Onboarding System": "Design system architecture"', '{"task_title": "Design system architecture"}'),
('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'task_assigned', 'New Task Assigned', 'You have been assigned a new task in goal "Implement New Employee Onboarding System": "Conduct user acceptance testing"', '{"task_title": "Conduct user acceptance testing"}'),

-- Goal status change notifications
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'status_change', 'Goal Status Updated', 'Goal "Improve Employee Retention Program" has moved to Do phase', '{"from_status": "Plan", "to_status": "Do"}'),
('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'status_change', 'Goal Status Updated', 'Goal "Optimize Sales Process Efficiency" has moved to Check phase', '{"from_status": "Do", "to_status": "Check"}');

-- =============================================================================
-- SEED DATA COMPLETE
-- =============================================================================

-- Sample data insertion completed successfully
-- The database now contains:
-- - 5 test users with different roles and departments
-- - Department-team mappings for organizational structure  
-- - 5 goals covering all PDCA phases (Plan, Do, Check, Act, Completed)
-- - Multiple tasks for each goal assigned to different PDCA phases
-- - Goal assignees with completion tracking
-- - Sample comments showing goal progress
-- - Notification examples for task assignments and status changes
--
-- You can now test the complete PDCA workflow and task management system!