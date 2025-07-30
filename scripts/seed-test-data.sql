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
('Operation', 'Admin Project'),
('Operation', 'Production'),
('Operation', 'Workshop'),
--Workshop

-- Engineer Department teams
('Engineer', 'Mechanical Engineering'),
('Engineer', 'Electrical Engineering'),
('Engineer', 'Site Engineering'),
('Engineer', 'Estimator'),
--Estimator

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
-- CLEAN SEED DATA COMPLETE
-- =============================================================================
