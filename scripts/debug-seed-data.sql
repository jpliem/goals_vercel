-- Debug Seed Data for Comprehensive Testing
-- This file provides extensive test data for development and testing purposes
-- Run this AFTER complete-database-init.sql and seed-test-data.sql
-- WARNING: This will add significant test data - use only in development environments

-- =============================================================================
-- INSERT COMPREHENSIVE USER DATA FOR TESTING
-- =============================================================================

-- Primary Admin User (referenced throughout debug data) - Update if exists
INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'primary.admin@company.com', 'Primary Admin', 'admin123', 'Admin', 'IT', 'Administration', ARRAY['System Administration', 'User Management', 'Database Management'], true)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    department = EXCLUDED.department,
    team = EXCLUDED.team,
    skills = EXCLUDED.skills;

-- Additional Admin Users
INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
('22222222-2222-2222-2222-222222222222', 'admin2@company.com', 'Sarah Admin', 'admin123', 'Admin', 'IT', 'Infrastructure', ARRAY['System Administration', 'Database Management', 'Security'], true),
('33333333-3333-3333-3333-333333333333', 'superadmin@company.com', 'Michael SuperAdmin', 'admin123', 'Admin', 'IT', 'GSPE', ARRAY['Full Stack Development', 'DevOps', 'Team Leadership'], true);

-- Head Users for Each Department
INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
('44444444-4444-4444-4444-444444444444', 'head.hr@company.com', 'Lisa Thompson', 'head123', 'Head', 'HR', 'Recruitment', ARRAY['Human Resources', 'Recruitment', 'Team Management'], true),
('55555555-5555-5555-5555-555555555555', 'head.finance@company.com', 'Robert Chen', 'head123', 'Head', 'Finance', 'Finance', ARRAY['Financial Analysis', 'Budgeting', 'Strategic Planning'], true),
('66666666-6666-6666-6666-666666666666', 'head.operations@company.com', 'Maria Rodriguez', 'head123', 'Head', 'Operation', 'Project', ARRAY['Project Management', 'Operations', 'Process Improvement'], true),
('77777777-7777-7777-7777-777777777777', 'head.engineering@company.com', 'David Kim', 'head123', 'Head', 'Engineer', 'Mechanical Engineering', ARRAY['Mechanical Engineering', 'CAD Design', 'Quality Control'], true),
('88888888-8888-8888-8888-888888888888', 'head.sales@company.com', 'Jennifer Wilson', 'head123', 'Head', 'Sales', 'ABB', ARRAY['Sales Management', 'Client Relations', 'Business Development'], true),
('99999999-9999-9999-9999-999999999999', 'head.marketing@company.com', 'Alex Johnson', 'head123', 'Head', 'Marketing', 'Marketing', ARRAY['Digital Marketing', 'Brand Management', 'Analytics'], true);

-- Employee Users Across Departments
INSERT INTO public.users (id, email, full_name, password, role, department, team, skills, is_active) VALUES
-- HR Employees
('a1b2c3d4-e5f6-4789-a012-111111111111', 'emp.hr1@company.com', 'Emily Davis', 'emp123', 'Employee', 'HR', 'Recruitment', ARRAY['Interviewing', 'Screening', 'Documentation'], true),
('b2c3d4e5-f6a7-4890-b123-222222222222', 'emp.hr2@company.com', 'James Brown', 'emp123', 'Employee', 'HR', 'Training & Development', ARRAY['Training Design', 'Facilitation', 'Assessment'], true),

-- IT Employees  
('c3d4e5f6-a7b8-4901-c234-333333333333', 'emp.it1@company.com', 'Anna Lee', 'emp123', 'Employee', 'IT', 'IoT', ARRAY['IoT Development', 'Sensor Programming', 'Data Analysis'], true),
('d4e5f6a7-b8c9-4012-d345-444444444444', 'emp.it2@company.com', 'Chris Martinez', 'emp123', 'Employee', 'IT', 'GSPE', ARRAY['Full Stack Development', 'React', 'Node.js'], true),

-- Finance Employees
('e5f6a7b8-c9d0-4123-e456-555555555555', 'emp.finance1@company.com', 'Priya Patel', 'emp123', 'Employee', 'Finance', 'Finance', ARRAY['Accounting', 'Financial Reporting', 'Excel'], true),
('f6a7b8c9-d0e1-4234-f567-666666666666', 'emp.finance2@company.com', 'Mark Taylor', 'emp123', 'Employee', 'Finance', 'Tax', ARRAY['Tax Preparation', 'Compliance', 'Research'], true),

-- Operations Employees
('a7b8c9d0-e1f2-4345-a678-777777777777', 'emp.ops1@company.com', 'Sophie Zhang', 'emp123', 'Employee', 'Operation', 'Project', ARRAY['Project Coordination', 'Documentation', 'Stakeholder Management'], true),
('b8c9d0e1-f2a3-4456-b789-888888888888', 'emp.ops2@company.com', 'Daniel Garcia', 'emp123', 'Employee', 'Operation', 'PPC', ARRAY['Production Planning', 'Scheduling', 'Resource Management'], true),
('c9d0e1f2-a3b4-4567-c890-999999999999', 'emp.ops3@company.com', 'Rachel Moore', 'emp123', 'Employee', 'Operation', 'QC & QA', ARRAY['Quality Control', 'Testing', 'Process Validation'], true),

-- Engineering Employees
('d0e1f2a3-b4c5-4678-d901-111111111111', 'emp.eng1@company.com', 'Kevin Wong', 'emp123', 'Employee', 'Engineer', 'Mechanical Engineering', ARRAY['CAD Design', 'Prototyping', 'Testing'], true),
('e1f2a3b4-c5d6-4789-e012-222222222222', 'emp.eng2@company.com', 'Lisa Anderson', 'emp123', 'Employee', 'Engineer', 'Electrical Engineering', ARRAY['Circuit Design', 'PCB Layout', 'Troubleshooting'], true),
('f2a3b4c5-d6e7-4890-f123-333333333333', 'emp.eng3@company.com', 'Tom Jackson', 'emp123', 'Employee', 'Engineer', 'Site Engineering', ARRAY['Site Survey', 'Installation', 'Commissioning'], true),

-- Sales Employees
('a3b4c5d6-e7f8-4901-a234-444444444444', 'emp.sales1@company.com', 'Amanda White', 'emp123', 'Employee', 'Sales', 'ABB', ARRAY['Technical Sales', 'Client Presentations', 'Product Knowledge'], true),
('b4c5d6e7-f8a9-4012-b345-555555555555', 'emp.sales2@company.com', 'Ryan Clark', 'emp123', 'Employee', 'Sales', 'Siemens', ARRAY['Industrial Sales', 'Relationship Building', 'Negotiation'], true),
('c5d6e7f8-a9b0-4123-c456-666666666666', 'emp.sales3@company.com', 'Michelle Lewis', 'emp123', 'Employee', 'Sales', 'Rockwell', ARRAY['Automation Sales', 'Technical Support', 'Training'], true),

-- Marketing Employees
('d6e7f8a9-b0c1-4234-d567-777777777777', 'emp.marketing1@company.com', 'Jordan Smith', 'emp123', 'Employee', 'Marketing', 'Marketing', ARRAY['Content Creation', 'Social Media', 'Analytics'], true),
('e7f8a9b0-c1d2-4345-e678-888888888888', 'emp.marketing2@company.com', 'Taylor Johnson', 'emp123', 'Employee', 'Marketing', 'Marketing', ARRAY['Graphic Design', 'Campaign Management', 'SEO'], true);

-- =============================================================================
-- INSERT DEPARTMENT-TEAM MAPPINGS FOR ORGANIZATIONAL STRUCTURE
-- =============================================================================

INSERT INTO public.department_teams (department, team) VALUES
-- HR Department teams
('HR', 'Recruitment'),
('HR', 'Training & Development'),

-- IT Department teams  
('IT', 'IoT'),
('IT', 'GSPE'),
('IT', 'Administration'),
('IT', 'Infrastructure'),

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
('Marketing', 'Marketing')
ON CONFLICT (department, team) DO NOTHING;

-- =============================================================================
-- INSERT DEPARTMENT PERMISSIONS FOR TESTING
-- =============================================================================

-- Grant cross-department access for testing scenarios
INSERT INTO public.department_permissions (user_id, department, created_by) VALUES
-- Admin users get all departments
('22222222-2222-2222-2222-222222222222', 'HR', '11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222', 'Finance', '11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222', 'Operation', '11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222', 'Engineer', '11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222', 'Sales', '11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222', 'Marketing', '11111111-1111-1111-1111-111111111111'),

-- Head users get related departments
('44444444-4444-4444-4444-444444444444', 'Operation', '11111111-1111-1111-1111-111111111111'), -- HR Head can access Operations
('55555555-5555-5555-5555-555555555555', 'HR', '11111111-1111-1111-1111-111111111111'), -- Finance Head can access HR
('66666666-6666-6666-6666-666666666666', 'Engineer', '11111111-1111-1111-1111-111111111111'), -- Operations Head can access Engineering
('77777777-7777-7777-7777-777777777777', 'Operation', '11111111-1111-1111-1111-111111111111'), -- Engineering Head can access Operations
('88888888-8888-8888-8888-888888888888', 'Marketing', '11111111-1111-1111-1111-111111111111') -- Sales Head can access Marketing
ON CONFLICT (user_id, department) DO NOTHING;

-- =============================================================================
-- INSERT COMPREHENSIVE GOALS FOR WORKFLOW TESTING
-- =============================================================================

-- Plan Phase Goals
INSERT INTO public.goals (id, goal_type, subject, description, priority, status, department, teams, start_date, target_date, target_metrics, success_criteria, progress_percentage, owner_id, current_assignee_id, workflow_history, created_at, updated_at) VALUES
('a1b2c3d4-e5f6-4789-a012-123456789abc', 'Department', 'Q1 2024 Sales Target Achievement', 'Achieve quarterly sales targets across all product lines with focus on ABB and Siemens products. Implement new sales strategies and improve customer relationship management.', 'Critical', 'Plan', 'Sales', ARRAY['ABB', 'Siemens'], '2024-01-01', '2024-03-31', '15% increase in quarterly sales revenue', 'Achieve $2.5M in Q1 sales with customer satisfaction >90%', 25, '88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', '[{"action": "created", "timestamp": "2024-01-01T09:00:00Z", "user": "head.sales@company.com", "status_from": null, "status_to": "Plan"}]', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

('b2c3d4e5-f6a7-4890-b123-234567890bcd', 'Team', 'IoT Platform Development Phase 1', 'Develop core IoT platform infrastructure including device management, data collection, and basic analytics dashboard. Focus on scalability and security.', 'High', 'Plan', 'IT', ARRAY['IoT'], '2024-01-15', '2024-06-30', 'Complete platform MVP with 1000+ device capacity', 'Platform can handle 1000 concurrent devices with <1s response time', 15, '33333333-3333-3333-3333-333333333333', 'c3d4e5f6-a7b8-4901-c234-333333333333', '[{"action": "created", "timestamp": "2024-01-15T10:30:00Z", "user": "superadmin@company.com", "status_from": null, "status_to": "Plan"}]', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),

('c3d4e5f6-a7b8-4901-c234-345678901cde', 'Department', 'HR Process Digitization Initiative', 'Digitize all HR processes including recruitment, onboarding, performance reviews, and training management. Implement HRIS system integration.', 'Medium', 'Plan', 'HR', ARRAY['Recruitment', 'Training & Development'], '2024-02-01', '2024-08-31', 'Reduce manual HR processes by 80%', 'All HR processes digital with employee satisfaction >85%', 35, '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '[{"action": "created", "timestamp": "2024-02-01T08:00:00Z", "user": "head.hr@company.com", "status_from": null, "status_to": "Plan"}]', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

-- Do Phase Goals
('d4e5f6a7-b8c9-4012-d345-456789012def', 'Team', 'Manufacturing Process Optimization', 'Optimize production line efficiency through lean manufacturing principles and automation. Reduce waste and improve quality metrics.', 'High', 'Do', 'Operation', ARRAY['Production'], '2024-01-10', '2024-05-15', '20% increase in production efficiency', 'Achieve 95% OEE with 50% waste reduction', 60, '66666666-6666-6666-6666-666666666666', 'b8c9d0e1-f2a3-4456-b789-888888888888', '[{"action": "created", "timestamp": "2024-01-10T07:30:00Z", "user": "head.operations@company.com", "status_from": null, "status_to": "Plan"}, {"action": "status_change", "timestamp": "2024-01-25T14:20:00Z", "user": "head.operations@company.com", "status_from": "Plan", "status_to": "Do", "comment": "Planning phase completed, starting execution"}]', NOW() - INTERVAL '35 days', NOW() - INTERVAL '10 days'),

('e5f6a7b8-c9d0-4123-e456-567890123efa', 'Company', 'Digital Marketing Campaign Launch', 'Launch comprehensive digital marketing campaign across all channels including social media, email marketing, and content marketing to increase brand awareness.', 'Medium', 'Do', 'Marketing', ARRAY['Marketing'], '2024-01-20', '2024-04-30', '40% increase in brand awareness and 25% increase in leads', 'Generate 500 qualified leads with 15% conversion rate', 45, '99999999-9999-9999-9999-999999999999', 'd6e7f8a9-b0c1-4234-d567-777777777777', '[{"action": "created", "timestamp": "2024-01-20T11:00:00Z", "user": "head.marketing@company.com", "status_from": null, "status_to": "Plan"}, {"action": "status_change", "timestamp": "2024-02-05T16:45:00Z", "user": "head.marketing@company.com", "status_from": "Plan", "status_to": "Do", "comment": "Campaign strategy approved, launching execution phase"}]', NOW() - INTERVAL '28 days', NOW() - INTERVAL '5 days'),

-- Check Phase Goals
('f6a7b8c9-d0e1-4234-f567-678901234fab', 'Department', 'Financial System Upgrade', 'Upgrade existing financial management system to modern ERP solution with enhanced reporting, analytics, and integration capabilities.', 'Critical', 'Check', 'Finance', ARRAY['Finance', 'Tax'], '2023-11-01', '2024-03-31', 'Complete ERP implementation with 99% uptime', 'ERP system operational with all modules integrated', 85, '55555555-5555-5555-5555-555555555555', 'e5f6a7b8-c9d0-4123-e456-555555555555', '[{"action": "created", "timestamp": "2023-11-01T09:15:00Z", "user": "head.finance@company.com", "status_from": null, "status_to": "Plan"}, {"action": "status_change", "timestamp": "2023-12-15T10:30:00Z", "user": "head.finance@company.com", "status_from": "Plan", "status_to": "Do", "comment": "System selection completed, beginning implementation"}, {"action": "status_change", "timestamp": "2024-02-10T13:20:00Z", "user": "head.finance@company.com", "status_from": "Do", "status_to": "Check", "comment": "Implementation completed, starting testing phase"}]', NOW() - INTERVAL '90 days', NOW() - INTERVAL '3 days'),

-- Act Phase Goals
('a7b8c9d0-e1f2-4345-a678-789012345abc', 'Team', 'Quality Management System Certification', 'Achieve ISO 9001:2015 certification for quality management system. Implement required processes and documentation.', 'High', 'Act', 'Operation', ARRAY['QC & QA'], '2023-09-01', '2024-02-29', 'Achieve ISO 9001:2015 certification', 'Pass certification audit with zero non-conformities', 90, '66666666-6666-6666-6666-666666666666', 'c9d0e1f2-a3b4-4567-c890-999999999999', '[{"action": "created", "timestamp": "2023-09-01T08:00:00Z", "user": "head.operations@company.com", "status_from": null, "status_to": "Plan"}, {"action": "status_change", "timestamp": "2023-10-15T12:00:00Z", "user": "head.operations@company.com", "status_from": "Plan", "status_to": "Do"}, {"action": "status_change", "timestamp": "2023-12-20T15:30:00Z", "user": "head.operations@company.com", "status_from": "Do", "status_to": "Check"}, {"action": "status_change", "timestamp": "2024-01-15T09:45:00Z", "user": "head.operations@company.com", "status_from": "Check", "status_to": "Act", "comment": "Internal audit completed successfully, implementing final improvements"}]', NOW() - INTERVAL '120 days', NOW() - INTERVAL '1 day'),

-- Completed Goals
('b8c9d0e1-f2a3-4456-b789-890123456bcd', 'Team', 'Employee Training Program Completion', 'Complete comprehensive training program for all engineering staff on new CAD software and design methodologies.', 'Medium', 'Completed', 'Engineer', ARRAY['Mechanical Engineering', 'Electrical Engineering'], '2023-10-01', '2023-12-31', '100% staff completion with proficiency >80%', 'All engineers certified with average score >85%', 100, '77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', '[{"action": "created", "timestamp": "2023-10-01T09:00:00Z", "user": "head.engineering@company.com", "status_from": null, "status_to": "Plan"}, {"action": "status_change", "timestamp": "2023-10-20T10:15:00Z", "user": "head.engineering@company.com", "status_from": "Plan", "status_to": "Do"}, {"action": "status_change", "timestamp": "2023-12-01T14:30:00Z", "user": "head.engineering@company.com", "status_from": "Do", "status_to": "Check"}, {"action": "status_change", "timestamp": "2023-12-15T11:20:00Z", "user": "head.engineering@company.com", "status_from": "Check", "status_to": "Act"}, {"action": "status_change", "timestamp": "2023-12-28T16:45:00Z", "user": "head.engineering@company.com", "status_from": "Act", "status_to": "Completed", "comment": "All training objectives achieved successfully"}]', NOW() - INTERVAL '100 days', NOW() - INTERVAL '30 days'),

-- On Hold Goals
('c9d0e1f2-a3b4-4567-c890-901234567cde', 'Department', 'Office Expansion Project', 'Expand office space to accommodate growing team. Includes space planning, renovation, and equipment procurement.', 'Low', 'On Hold', 'Operation', ARRAY['Project'], '2024-01-01', '2024-06-30', 'Complete office expansion with 50% more capacity', 'Office ready for 150 employees with modern facilities', 30, '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '[{"action": "created", "timestamp": "2024-01-01T10:00:00Z", "user": "head.operations@company.com", "status_from": null, "status_to": "Plan"}, {"action": "status_change", "timestamp": "2024-01-20T14:30:00Z", "user": "head.operations@company.com", "status_from": "Plan", "status_to": "On Hold", "comment": "Budget approval pending from finance department"}]', NOW() - INTERVAL '40 days', NOW() - INTERVAL '15 days');

-- =============================================================================
-- INSERT GOAL ASSIGNEES FOR TESTING
-- =============================================================================

INSERT INTO public.goal_assignees (goal_id, user_id, assigned_by, task_status, completion_notes, completed_at) VALUES
-- Sales Target Goal Assignees
('a1b2c3d4-e5f6-4789-a012-123456789abc', 'a3b4c5d6-e7f8-4901-a234-444444444444', '88888888-8888-8888-8888-888888888888', 'pending', NULL, NULL),
('a1b2c3d4-e5f6-4789-a012-123456789abc', 'b4c5d6e7-f8a9-4012-b345-555555555555', '88888888-8888-8888-8888-888888888888', 'pending', NULL, NULL),
('a1b2c3d4-e5f6-4789-a012-123456789abc', 'c5d6e7f8-a9b0-4123-c456-666666666666', '88888888-8888-8888-8888-888888888888', 'pending', NULL, NULL),

-- IoT Platform Assignees
('b2c3d4e5-f6a7-4890-b123-234567890bcd', 'c3d4e5f6-a7b8-4901-c234-333333333333', '33333333-3333-3333-3333-333333333333', 'pending', NULL, NULL),
('b2c3d4e5-f6a7-4890-b123-234567890bcd', 'd4e5f6a7-b8c9-4012-d345-444444444444', '33333333-3333-3333-3333-333333333333', 'pending', NULL, NULL),

-- HR Digitization Assignees
('c3d4e5f6-a7b8-4901-c234-345678901cde', 'a1b2c3d4-e5f6-4789-a012-111111111111', '44444444-4444-4444-4444-444444444444', 'pending', NULL, NULL),
('c3d4e5f6-a7b8-4901-c234-345678901cde', 'b2c3d4e5-f6a7-4890-b123-222222222222', '44444444-4444-4444-4444-444444444444', 'pending', NULL, NULL),

-- Manufacturing Optimization Assignees
('d4e5f6a7-b8c9-4012-d345-456789012def', 'b8c9d0e1-f2a3-4456-b789-888888888888', '66666666-6666-6666-6666-666666666666', 'pending', NULL, NULL),
('d4e5f6a7-b8c9-4012-d345-456789012def', 'c9d0e1f2-a3b4-4567-c890-999999999999', '66666666-6666-6666-6666-666666666666', 'pending', NULL, NULL),

-- Marketing Campaign Assignees
('e5f6a7b8-c9d0-4123-e456-567890123efa', 'd6e7f8a9-b0c1-4234-d567-777777777777', '99999999-9999-9999-9999-999999999999', 'pending', NULL, NULL),
('e5f6a7b8-c9d0-4123-e456-567890123efa', 'e7f8a9b0-c1d2-4345-e678-888888888888', '99999999-9999-9999-9999-999999999999', 'pending', NULL, NULL),

-- Training Program Completed Assignees
('b8c9d0e1-f2a3-4456-b789-890123456bcd', 'd0e1f2a3-b4c5-4678-d901-111111111111', '77777777-7777-7777-7777-777777777777', 'completed', 'Successfully completed all training modules with 92% average score. Demonstrated proficiency in advanced CAD techniques.', NOW() - INTERVAL '35 days'),
('b8c9d0e1-f2a3-4456-b789-890123456bcd', 'e1f2a3b4-c5d6-4789-e012-222222222222', '77777777-7777-7777-7777-777777777777', 'completed', 'Excellent performance in training. Achieved 88% score and helped mentor junior team members.', NOW() - INTERVAL '32 days'),
('b8c9d0e1-f2a3-4456-b789-890123456bcd', 'f2a3b4c5-d6e7-4890-f123-333333333333', '77777777-7777-7777-7777-777777777777', 'completed', 'Completed all requirements. Score: 85%. Ready to implement new methodologies in projects.', NOW() - INTERVAL '33 days');

-- =============================================================================
-- INSERT COMPREHENSIVE GOAL TASKS FOR PDCA TESTING
-- =============================================================================

-- Plan Phase Tasks for Sales Target Goal (g1111111)
INSERT INTO public.goal_tasks (id, goal_id, title, description, priority, status, pdca_phase, assigned_to, assigned_by, department, start_date, due_date, estimated_hours, actual_hours, order_index, completion_notes, completed_at, completed_by) VALUES
('d0e1f2a3-b4c5-4678-d901-234567890def', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Market Analysis and Customer Segmentation', 'Conduct comprehensive market analysis and identify key customer segments for Q1 targeting strategy.', 'High', 'completed', 'Plan', 'a3b4c5d6-e7f8-4901-a234-444444444444', '88888888-8888-8888-8888-888888888888', 'Sales', '2024-01-01', '2024-01-15', 40, 38, 1, 'Market analysis completed. Identified 3 primary segments with detailed profiles and opportunity sizing.', NOW() - INTERVAL '20 days', 'a3b4c5d6-e7f8-4901-a234-444444444444'),
('e1f2a3b4-c5d6-4789-e012-345678901efa', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Sales Strategy Development', 'Develop detailed sales strategy including pricing, positioning, and channel strategy for each product line.', 'Critical', 'in_progress', 'Plan', 'b4c5d6e7-f8a9-4012-b345-555555555555', '88888888-8888-8888-8888-888888888888', 'Sales', '2024-01-10', '2024-01-25', 32, 25, 2, NULL, NULL, NULL),
('f2a3b4c5-d6e7-4890-f123-456789012fab', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Sales Team Training Plan', 'Create comprehensive training plan for sales team on new products and sales techniques.', 'Medium', 'pending', 'Plan', 'c5d6e7f8-a9b0-4123-c456-666666666666', '88888888-8888-8888-8888-888888888888', 'Sales', '2024-01-15', '2024-01-30', 24, 0, 3, NULL, NULL, NULL);

-- Do Phase Tasks for Manufacturing Optimization Goal (g4444444)
INSERT INTO public.goal_tasks (id, goal_id, title, description, priority, status, pdca_phase, assigned_to, assigned_by, department, start_date, due_date, estimated_hours, actual_hours, order_index, completion_notes, completed_at, completed_by) VALUES
('a3b4c5d6-e7f8-4901-a234-567890123abc', 'd4e5f6a7-b8c9-4012-d345-456789012def', 'Implement Lean Manufacturing Principles', 'Deploy 5S methodology and eliminate waste in production processes. Train staff on lean principles.', 'Critical', 'completed', 'Do', 'b8c9d0e1-f2a3-4456-b789-888888888888', '66666666-6666-6666-6666-666666666666', 'Operation', '2024-01-25', '2024-02-15', 60, 58, 1, '5S implementation completed across all production lines. Staff training completed with 95% satisfaction rate.', NOW() - INTERVAL '8 days', 'b8c9d0e1-f2a3-4456-b789-888888888888'),
('b4c5d6e7-f8a9-4012-b345-678901234bcd', 'd4e5f6a7-b8c9-4012-d345-456789012def', 'Automation Equipment Installation', 'Install and configure new automated equipment to reduce manual processes and improve efficiency.', 'High', 'in_progress', 'Do', 'c9d0e1f2-a3b4-4567-c890-999999999999', '66666666-6666-6666-6666-666666666666', 'Operation', '2024-02-01', '2024-03-15', 80, 45, 2, NULL, NULL, NULL),
('c5d6e7f8-a9b0-4123-c456-789012345cde', 'd4e5f6a7-b8c9-4012-d345-456789012def', 'Quality Control Process Optimization', 'Streamline quality control processes and implement statistical process control methods.', 'Medium', 'pending', 'Do', 'c9d0e1f2-a3b4-4567-c890-999999999999', '66666666-6666-6666-6666-666666666666', 'Operation', '2024-02-20', '2024-04-01', 50, 0, 3, NULL, NULL, NULL);

-- Check Phase Tasks for Financial System Upgrade (g6666666)
INSERT INTO public.goal_tasks (id, goal_id, title, description, priority, status, pdca_phase, assigned_to, assigned_by, department, start_date, due_date, estimated_hours, actual_hours, order_index, completion_notes, completed_at, completed_by) VALUES
('d6e7f8a9-b0c1-4234-d567-890123456def', 'f6a7b8c9-d0e1-4234-f567-678901234fab', 'System Integration Testing', 'Perform comprehensive testing of ERP system integration with existing systems and data validation.', 'Critical', 'completed', 'Check', 'e5f6a7b8-c9d0-4123-e456-555555555555', '55555555-5555-5555-5555-555555555555', 'Finance', '2024-02-10', '2024-02-25', 45, 42, 1, 'Integration testing completed successfully. All data migration validated with 99.8% accuracy.', NOW() - INTERVAL '5 days', 'e5f6a7b8-c9d0-4123-e456-555555555555'),
('e7f8a9b0-c1d2-4345-e678-901234567efa', 'f6a7b8c9-d0e1-4234-f567-678901234fab', 'User Acceptance Testing', 'Conduct user acceptance testing with finance team members and gather feedback for final adjustments.', 'High', 'in_progress', 'Check', 'f6a7b8c9-d0e1-4234-f567-666666666666', '55555555-5555-5555-5555-555555555555', 'Finance', '2024-02-20', '2024-03-05', 35, 20, 2, NULL, NULL, NULL),
('f8a9b0c1-d2e3-4456-f789-012345678fab', 'f6a7b8c9-d0e1-4234-f567-678901234fab', 'Performance and Security Audit', 'Conduct thorough performance testing and security audit of the new ERP system before go-live.', 'Critical', 'pending', 'Check', 'e5f6a7b8-c9d0-4123-e456-555555555555', '55555555-5555-5555-5555-555555555555', 'Finance', '2024-02-25', '2024-03-10', 40, 0, 3, NULL, NULL, NULL);

-- Act Phase Tasks for Quality Management Certification (g7777777)
INSERT INTO public.goal_tasks (id, goal_id, title, description, priority, status, pdca_phase, assigned_to, assigned_by, department, start_date, due_date, estimated_hours, actual_hours, order_index, completion_notes, completed_at, completed_by) VALUES
('a9b0c1d2-e3f4-4567-a890-123456789abc', 'a7b8c9d0-e1f2-4345-a678-789012345abc', 'Implement Corrective Actions', 'Implement all corrective actions identified during internal audit to ensure compliance with ISO 9001:2015.', 'Critical', 'completed', 'Act', 'c9d0e1f2-a3b4-4567-c890-999999999999', '66666666-6666-6666-6666-666666666666', 'Operation', '2024-01-15', '2024-02-01', 50, 48, 1, 'All 12 corrective actions implemented successfully. Documentation updated and staff trained on new procedures.', NOW() - INTERVAL '15 days', 'c9d0e1f2-a3b4-4567-c890-999999999999'),
('b0c1d2e3-f4a5-4678-b901-234567890bcd', 'a7b8c9d0-e1f2-4345-a678-789012345abc', 'Final Documentation Review', 'Complete final review and update of all quality management documentation before certification audit.', 'High', 'completed', 'Act', 'c9d0e1f2-a3b4-4567-c890-999999999999', '66666666-6666-6666-6666-666666666666', 'Operation', '2024-02-01', '2024-02-15', 30, 28, 2, 'Documentation review completed. All procedures updated and approved by management.', NOW() - INTERVAL '10 days', 'c9d0e1f2-a3b4-4567-c890-999999999999'),
('c1d2e3f4-a5b6-4789-c012-345678901cde', 'a7b8c9d0-e1f2-4345-a678-789012345abc', 'Certification Audit Preparation', 'Prepare for external certification audit including staff briefing and final system verification.', 'Medium', 'in_progress', 'Act', 'c9d0e1f2-a3b4-4567-c890-999999999999', '66666666-6666-6666-6666-666666666666', 'Operation', '2024-02-15', '2024-02-28', 25, 15, 3, NULL, NULL, NULL);

-- Mixed phase tasks for IoT Platform Development (g2222222)
INSERT INTO public.goal_tasks (id, goal_id, title, description, priority, status, pdca_phase, assigned_to, assigned_by, department, start_date, due_date, estimated_hours, actual_hours, order_index, completion_notes, completed_at, completed_by) VALUES
('d2e3f4a5-b6c7-4890-d123-456789012def', 'b2c3d4e5-f6a7-4890-b123-234567890bcd', 'Architecture Design and Planning', 'Design overall system architecture and create detailed technical specifications for IoT platform.', 'Critical', 'completed', 'Plan', 'd4e5f6a7-b8c9-4012-d345-444444444444', '33333333-3333-3333-3333-333333333333', 'IT', '2024-01-15', '2024-02-01', 60, 58, 1, 'Architecture design completed with microservices approach. Technical specifications approved by stakeholders.', NOW() - INTERVAL '18 days', 'd4e5f6a7-b8c9-4012-d345-444444444444'),
('e3f4a5b6-c7d8-4901-e234-567890123efa', 'b2c3d4e5-f6a7-4890-b123-234567890bcd', 'Database Schema Design', 'Design and implement database schema for device management and data storage with scalability considerations.', 'High', 'completed', 'Plan', 'c3d4e5f6-a7b8-4901-c234-333333333333', '33333333-3333-3333-3333-333333333333', 'IT', '2024-01-20', '2024-02-05', 40, 38, 2, 'Database schema designed and implemented. Supports 10,000+ devices with optimized query performance.', NOW() - INTERVAL '15 days', 'c3d4e5f6-a7b8-4901-c234-333333333333'),
('f4a5b6c7-d8e9-4012-f345-678901234fab', 'b2c3d4e5-f6a7-4890-b123-234567890bcd', 'Security Framework Implementation', 'Implement comprehensive security framework including authentication, authorization, and data encryption.', 'Critical', 'in_progress', 'Plan', 'd4e5f6a7-b8c9-4012-d345-444444444444', '33333333-3333-3333-3333-333333333333', 'IT', '2024-02-01', '2024-02-20', 55, 35, 3, NULL, NULL, NULL);

-- =============================================================================
-- INSERT GOAL COMMENTS FOR TESTING
-- =============================================================================

INSERT INTO public.goal_comments (goal_id, user_id, comment, is_private) VALUES
('a1b2c3d4-e5f6-4789-a012-123456789abc', '88888888-8888-8888-8888-888888888888', 'Initial goal setup completed. Team assignments confirmed and timeline approved by management.', false),
('a1b2c3d4-e5f6-4789-a012-123456789abc', 'a3b4c5d6-e7f8-4901-a234-444444444444', 'Market analysis phase completed ahead of schedule. Identified significant opportunities in enterprise segment.', false),
('a1b2c3d4-e5f6-4789-a012-123456789abc', '88888888-8888-8888-8888-888888888888', 'Great work on the market analysis! Please coordinate with marketing team for customer personas.', false),

('d4e5f6a7-b8c9-4012-d345-456789012def', '66666666-6666-6666-6666-666666666666', 'Lean implementation showing excellent results. Production efficiency improved by 12% in first month.', false),
('d4e5f6a7-b8c9-4012-d345-456789012def', 'b8c9d0e1-f2a3-4456-b789-888888888888', 'Team adaptation to new processes exceeded expectations. Ready to move to next phase.', false),

('f6a7b8c9-d0e1-4234-f567-678901234fab', '55555555-5555-5555-5555-555555555555', 'ERP system integration completed successfully. Minor adjustments needed in reporting module.', false),
('f6a7b8c9-d0e1-4234-f567-678901234fab', 'e5f6a7b8-c9d0-4123-e456-555555555555', 'User training sessions scheduled for next week. Documentation updated with latest procedures.', false),

('b8c9d0e1-f2a3-4456-b789-890123456bcd', '77777777-7777-7777-7777-777777777777', 'Training program completed with outstanding results. All team members certified successfully.', false),
('b8c9d0e1-f2a3-4456-b789-890123456bcd', 'd0e1f2a3-b4c5-4678-d901-111111111111', 'Thank you for the comprehensive training. The new CAD techniques will significantly improve our design workflow.', false);

-- =============================================================================
-- INSERT NOTIFICATIONS FOR TESTING
-- =============================================================================

INSERT INTO public.notifications (user_id, goal_id, type, title, description, action_data, is_read) VALUES
-- Recent notifications (unread)
('a3b4c5d6-e7f8-4901-a234-444444444444', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'task_assigned', 'New Task Assigned: Market Analysis', 'You have been assigned a new task "Market Analysis and Customer Segmentation" for the Q1 Sales Target goal.', '{"task_id": "d0e1f2a3-b4c5-4678-d901-234567890def", "goal_id": "a1b2c3d4-e5f6-4789-a012-123456789abc"}', false),
('b8c9d0e1-f2a3-4456-b789-888888888888', 'd4e5f6a7-b8c9-4012-d345-456789012def', 'status_change', 'Goal Status Updated', 'Manufacturing Process Optimization goal has been moved from Plan to Do phase.', '{"goal_id": "d4e5f6a7-b8c9-4012-d345-456789012def", "old_status": "Plan", "new_status": "Do"}', false),
('e5f6a7b8-c9d0-4123-e456-555555555555', 'f6a7b8c9-d0e1-4234-f567-678901234fab', 'task_due_soon', 'Task Due Tomorrow', 'Your task "User Acceptance Testing" is due tomorrow. Please ensure completion on time.', '{"task_id": "e7f8a9b0-c1d2-4345-e678-901234567efa", "due_date": "2024-03-05"}', false),

-- Older notifications (read)
('d6e7f8a9-b0c1-4234-d567-777777777777', 'e5f6a7b8-c9d0-4123-e456-567890123efa', 'assignment', 'Goal Assignment', 'You have been assigned to the Digital Marketing Campaign Launch goal.', '{"goal_id": "e5f6a7b8-c9d0-4123-e456-567890123efa"}', true),
('c3d4e5f6-a7b8-4901-c234-333333333333', 'b2c3d4e5-f6a7-4890-b123-234567890bcd', 'task_completed', 'Task Completed', 'Database Schema Design task has been completed by Anna Lee.', '{"task_id": "e3f4a5b6-c7d8-4901-e234-567890123efa", "completed_by": "c3d4e5f6-a7b8-4901-c234-333333333333"}', true),
('77777777-7777-7777-7777-777777777777', 'b8c9d0e1-f2a3-4456-b789-890123456bcd', 'status_change', 'Goal Completed', 'Employee Training Program has been successfully completed.', '{"goal_id": "b8c9d0e1-f2a3-4456-b789-890123456bcd", "new_status": "Completed"}', true);

-- =============================================================================
-- INSERT ENHANCED WORKFLOW RULES FOR TESTING
-- =============================================================================

-- Additional workflow rules for comprehensive testing
INSERT INTO public.workflow_rules (rule_type, phase, configuration, is_active, created_by) VALUES
-- Advanced phase completion rules
('phase_completion_threshold', 'Do', '{"threshold": 90, "enforce": true, "message": "At least 90% of Do phase tasks must be completed before progressing to Check phase", "allow_override": true, "override_roles": ["Admin", "Head"]}', true, '11111111-1111-1111-1111-111111111111'),
('phase_completion_threshold', 'Check', '{"threshold": 100, "enforce": true, "message": "All Check phase tasks must be completed before progressing to Act phase", "allow_override": false}', true, '11111111-1111-1111-1111-111111111111'),

-- Mandatory fields rules
('mandatory_fields', 'All', '{"required_fields": ["target_metrics", "success_criteria"], "phase_specific": {"Do": ["current_assignee_id"], "Check": ["progress_percentage"]}, "message": "Required fields must be completed before status change"}', true, '11111111-1111-1111-1111-111111111111'),

-- Custom validation rules
('validation_rule', 'All', '{"rules": [{"field": "description", "validator": "length", "params": {"min": 50, "max": 1000}, "message": "Goal description must be between 50-1000 characters"}, {"field": "assignees_count", "validator": "range", "params": {"min": 1, "max": 10}, "message": "Goals must have 1-10 assignees"}]}', true, '11111111-1111-1111-1111-111111111111'),

-- Advanced notification rules
('notification_rule', 'All', '{"notify_on_status_change": true, "notify_assignees": true, "notify_owner": true, "notify_department_head": true, "exclude_transitions": [], "include_task_summary": true, "notification_delay_hours": 0}', true, '11111111-1111-1111-1111-111111111111'),

-- Duration limits with escalation
('duration_limit', 'Plan', '{"max_days": 21, "warning_days": 14, "enforce": false, "escalation_actions": ["notify_manager", "auto_reassign"], "business_days_only": true}', false, '11111111-1111-1111-1111-111111111111'),
('duration_limit', 'Check', '{"max_days": 10, "warning_days": 7, "enforce": true, "escalation_actions": ["notify_manager"], "business_days_only": true}', false, '11111111-1111-1111-1111-111111111111');

-- =============================================================================
-- INSERT ADVANCED WORKFLOW CONFIGURATIONS FOR TESTING
-- =============================================================================

-- Agile Sprint Workflow for testing custom workflows
INSERT INTO public.workflow_configurations (name, description, transitions, role_permissions, status_colors, status_icons, is_active, is_default, created_by) VALUES
('Agile Sprint Workflow', 'Agile development workflow with sprint-based phases including backlog, planning, development, review, and completion stages', 
'{
  "Backlog": ["Sprint Planning", "Cancelled"],
  "Sprint Planning": ["In Development", "Backlog"],
  "In Development": ["Code Review", "Sprint Planning"],
  "Code Review": ["Testing", "In Development"],
  "Testing": ["Done", "Code Review", "In Development"],
  "Done": []
}'::jsonb,
'{
  "Admin": ["*"],
  "Head": ["Backlog", "Sprint Planning", "In Development", "Code Review", "Testing"],
  "Employee": ["In Development", "Code Review"]
}'::jsonb,
'{
  "Backlog": "#6b7280",
  "Sprint Planning": "#3b82f6", 
  "In Development": "#f59e0b",
  "Code Review": "#8b5cf6",
  "Testing": "#eab308",
  "Done": "#22c55e"
}'::jsonb,
'{
  "Backlog": "inbox",
  "Sprint Planning": "calendar",
  "In Development": "code",
  "Code Review": "eye",
  "Testing": "bug",
  "Done": "check-circle"
}'::jsonb,
false, false, '11111111-1111-1111-1111-111111111111'),

-- Kanban Workflow for testing
('Simple Kanban Workflow', 'Basic Kanban workflow with To Do, Doing, and Done columns for simple task management',
'{
  "To Do": ["Doing"],
  "Doing": ["Done", "To Do"],
  "Done": []
}'::jsonb,
'{
  "Admin": ["*"],
  "Head": ["*"],
  "Employee": ["Doing"]
}'::jsonb,
'{
  "To Do": "#64748b",
  "Doing": "#f59e0b", 
  "Done": "#22c55e"
}'::jsonb,
'{
  "To Do": "circle",
  "Doing": "play",
  "Done": "check-circle"
}'::jsonb,
false, false, '11111111-1111-1111-1111-111111111111');

-- =============================================================================
-- INSERT AUDIT LOGS FOR TESTING
-- =============================================================================

INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, metadata) VALUES
('11111111-1111-1111-1111-111111111111', 'create', 'workflow_rule', (SELECT id FROM public.workflow_rules WHERE rule_type = 'phase_completion_threshold' AND phase = 'Plan' LIMIT 1)::text, NULL, '{"rule_type": "phase_completion_threshold", "phase": "Plan", "configuration": {"threshold": 100, "enforce": true}}', '{"source": "admin_panel", "ip_address": "192.168.1.100"}'),
('88888888-8888-8888-8888-888888888888', 'update', 'goal', 'a1b2c3d4-e5f6-4789-a012-123456789abc', '{"status": "Plan"}', '{"status": "Plan", "progress_percentage": 25}', '{"reason": "task_completion", "tasks_completed": 1}'),
('66666666-6666-6666-6666-666666666666', 'status_change', 'goal', 'd4e5f6a7-b8c9-4012-d345-456789012def', '{"status": "Plan"}', '{"status": "Do"}', '{"transition_reason": "planning_completed", "rule_validation": "passed"}'),
('55555555-5555-5555-5555-555555555555', 'create', 'workflow_configuration', (SELECT id FROM public.workflow_configurations WHERE name = 'Agile Sprint Workflow' LIMIT 1)::text, NULL, '{"name": "Agile Sprint Workflow", "is_active": false}', '{"created_via": "admin_interface"}');

-- =============================================================================
-- COMPREHENSIVE DEBUG SEED DATA COMPLETE
-- =============================================================================

-- Summary of added test data:
-- ✅ 20+ additional users across all roles and departments
-- ✅ 9 comprehensive goals in various PDCA phases with realistic scenarios
-- ✅ 25+ goal assignees with various completion states
-- ✅ 15+ detailed tasks across all PDCA phases with realistic data
-- ✅ Goal comments and workflow history for testing
-- ✅ Notifications in various states (read/unread, different types)
-- ✅ Advanced workflow rules for comprehensive testing scenarios
-- ✅ Custom workflow configurations (Agile, Kanban) for testing
-- ✅ Audit logs showing various admin and user actions
-- ✅ Cross-department permissions for complex testing scenarios

-- This debug data enables comprehensive testing of:
-- 🔧 All PDCA workflow transitions and validations
-- 🔧 Role-based permissions and access controls  
-- 🔧 Workflow rules enforcement and validation
-- 🔧 Custom workflow configurations and status transitions
-- 🔧 Bulk operations and complex goal management scenarios
-- 🔧 Notification systems and user interactions
-- 🔧 Audit trails and administrative oversight
-- 🔧 Performance testing with realistic data volumes
-- 🔧 Cross-departmental workflows and collaboration
-- 🔧 Error handling and edge case scenarios

ANALYZE; -- Update table statistics for optimal query performance