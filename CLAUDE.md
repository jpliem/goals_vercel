# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server on localhost:3001
- `npm run build` - Build production version  
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linting

### Task Management System
The system includes a comprehensive task management layer:
- `npm run dev` to test task creation, assignment, and completion workflows
- Task database schema in `scripts/add-goal-tasks-table.sql` (run after main schema)
- Personal task dashboard available at `/tasks` route

### Database Testing
Before creating functions that use database queries, test queries first to verify column and table names match the schema in `scripts/complete-goal-database-setup.sql`. For task-related functionality, also run `scripts/add-goal-tasks-table.sql`.

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **UI**: shadcn/ui components with Radix UI primitives, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Authentication**: Supabase Auth with role-based permissions (Admin, User)
- **File Storage**: Supabase Storage for goal attachments

### Key Architecture Patterns

#### PDCA Workflow System
The system implements Plan-Do-Check-Act methodology with strict status transitions:
- **Valid transitions** defined in `actions/goals.ts:313-321`
- **Multi-assignee support** where all assignees must complete tasks before status progression
- **Automatic status progression** when all assignee tasks are completed

#### Database Layer Architecture
- **`lib/goal-database.ts`** - Primary database interface with comprehensive goal and task operations
- **`lib/supabase.ts`** - Supabase client configuration
- **Server Actions** in `actions/` directory handle all database mutations with proper authentication
  - `actions/goals.ts` - Goal CRUD operations and PDCA workflow management
  - `actions/goal-tasks.ts` - Task management operations (create, update, complete, delete)
  - `actions/goal-attachments.ts` - File upload and attachment management
  - `actions/admin.ts` - User and department management operations

#### Component Architecture
- **Server Actions Pattern** - All data mutations go through server actions in `actions/` directory
- **Form Handling** - Uses react-hook-form with Zod validation for complex forms
- **Real-time Updates** - Uses revalidatePath() for optimistic UI updates

### Permission System
Role-based permissions enforced at multiple layers:
- **Server Actions** - Authentication checks with `requireAuth()` from `lib/auth.ts`
- **UI Components** - Conditional rendering based on user role
- **Database** - Row Level Security (RLS) policies in Supabase

### Key Data Models
- **goals** - Main goal entity with PDCA status, department, teams
- **goal_tasks** - Individual tasks within goals with assignment, priority, due dates, and progress tracking
- **goal_assignees** - Multi-assignee support with individual task completion
- **goal_comments** - Progress updates and collaboration
- **goal_attachments** - File uploads linked to goals/comments
- **goal_support** - Department/team support request system
- **notifications** - Real-time notification system
- **users** - User accounts with role-based permissions and department/team assignments
- **department_teams** - Hierarchical organizational structure

## Important Implementation Notes

### Database Query Testing
Always test database queries against the actual schema before implementing. The schema is defined in `scripts/complete-goal-database-setup.sql`. For task-related queries, reference the `goal_tasks` table structure in `scripts/add-goal-tasks-table.sql`.

### Task Management Integration
Tasks are fully integrated into the goal workflow:
- Tasks can be created during goal creation or added later from goal details
- Task completion affects goal progress calculations
- Task assignments generate automatic notifications
- Task status transitions: `pending` → `in_progress` → `completed`
- Tasks support priority levels: `Low`, `Medium`, `High`, `Critical`

### Status Transition Validation
Goal status changes must follow PDCA methodology. Reference the validTransitions object in `actions/goals.ts:313-321` for allowed transitions.

### File Upload Handling
Goal attachments use Supabase Storage with validation:
- **Max file size**: 5MB
- **Allowed types**: Images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX, TXT)
- **Storage path**: `goal-attachments/{goalId}/`

### Authentication Flow
All server actions require authentication via `requireAuth()` from `lib/auth.ts`. Users are created from session data if they don't exist in the database.

### Notification System
Notifications are handled through `lib/goal-notifications.ts` with automatic cleanup (auto-delete on read) and role-based targeting.

## Database Schema Overview

### Core Tables
- **users** - User accounts with roles (Admin, User), departments, and teams
- **goals** - Main goals with PDCA status, progress tracking, and workflow history
- **goal_tasks** - Individual tasks within goals with assignment, priority, status, and due dates
- **goal_assignees** - Multi-assignee relationships with individual task completion
- **goal_comments** - Comments and progress updates on goals
- **goal_attachments** - File uploads associated with goals
- **department_teams** - Hierarchical organization structure
- **department_permissions** - Cross-department access permissions
- **notifications** - Real-time notification system (includes task assignment notifications)
- **goal_support** - Inter-department support requests

### Key Relationships
- Goals belong to owners (users) and can have multiple assignees
- Goals contain multiple tasks that can be assigned to specific users
- Goals are organized by department and can span multiple teams
- Tasks are linked to goals and can be assigned to any user in the system
- Comments and attachments are linked to specific goals
- Notifications are user-specific and goal-specific (includes task assignments)

### PDCA Status Flow
```
Plan → Do → Check → Act → Completed
  ↑     ↑     ↑      ↑
  └─────┴─────┴──────┘ (can cycle back)
  
Special statuses: On Hold, Cancelled
```

## Component Architecture

### Directory Structure
```
components/
├── ui/                    # shadcn/ui primitives
├── modals/               # Modal components
├── [feature].tsx         # Business logic components
```

### Key Components
- **PDCABoard** - Kanban-style board for goal workflow visualization
- **CreateGoalForm** - Multi-step goal creation with integrated task creation interface
- **GoalDetails** - Comprehensive goal detail page with integrated task management
- **GoalTasksCard** - Task management interface within goal details
- **MyTasksDashboard** - Personal task dashboard for assigned task management
- **GoalDetailModal** - Quick goal overview in modal format
- **DashboardHeader** - Navigation with "My Tasks" tab and user management
- **NotificationBell** - Real-time notification system

### State Management
- **Server Components** for data fetching with props drilling
- **Local State** with useState for UI interactions
- **Server Actions** for mutations with manual revalidation
- **No Global State** - Deliberately simple state management

### Form Patterns
```typescript
// Standard server action form pattern
const handleSubmit = async (formData: FormData) => {
  const result = await serverAction(formData)
  if (result.error) {
    setError(result.error)
  } else {
    onSuccess?.()
  }
}
```

## File Organization Patterns

### Server Actions (`actions/`)
- `goals.ts` - All goal-related mutations, PDCA workflow, and task creation during goal creation
- `goal-tasks.ts` - Task CRUD operations, status transitions, and completion workflows
- `goal-attachments.ts` - File upload and attachment management
- `admin.ts` - User role management and department/team assignments
- `department-management.ts` - Department and team structure management
- Authentication required for all actions using `requireAuth()` pattern

### Database Layer (`lib/`)
- `goal-database.ts` - Primary database interface with goal and task operations
- `supabase.ts` - Database client configuration
- `auth.ts` - Authentication utilities and user session management
- `goal-notifications.ts` - Notification creation and management

### Components
- **Feature-based organization** - Components named by functionality
- **Modal separation** - All modals in `/modals/` subdirectory
- **UI primitives** - All shadcn/ui components in `/ui/` subdirectory

## Development Best Practices

### Authentication Patterns
```typescript
// Always check authentication in server actions
export async function updateGoal(goalId: string, data: any) {
  const { user } = await requireAuth()
  // Business logic...
}

// Role-based component rendering
{userProfile.role === "Admin" && <AdminComponent />}
```

### Error Handling
- Server actions return `{ success: boolean, error?: string, data?: any }`
- Client components display errors in user-friendly format
- Database errors are sanitized before showing to users

### Performance Considerations
- **Server Components** for initial data loading
- **Selective Client Components** only when interactivity is needed
- **useMemo** for expensive computations (filtering, sorting)
- **Manual Revalidation** instead of aggressive caching

### File Upload Best Practices
1. Validate file types and sizes on client and server
2. Use FormData for file submissions
3. Store files in Supabase Storage with organized paths
4. Provide upload progress and error feedback

## Common Debugging Areas

### Date Handling
- Always validate dates before formatting to prevent RangeError
- Use try-catch blocks around date operations
- Fallback to alternative date fields if primary is invalid

### Status Transitions
- Check `validTransitions` object before allowing status changes
- Ensure all assignees have completed tasks before auto-progression
- Handle special statuses (On Hold, Cancelled) appropriately

### Permission Issues
- Verify user role and department permissions
- Check RLS policies in Supabase if queries return unexpected results
- Ensure proper authentication context in all server actions

## Testing Database Queries

Before implementing new database functionality:

1. Test queries directly in Supabase SQL Editor
2. Verify table and column names match the schema
3. Check relationship constraints and foreign keys
4. Test with different user roles and permissions

## Deployment Notes

### Environment Variables
Required environment variables for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database Setup
1. Run `scripts/complete-goal-database-setup.sql` in Supabase SQL Editor
2. Run `scripts/add-goal-tasks-table.sql` for task management functionality
3. Optionally run `scripts/goal-seed-data.sql` for sample data
4. Configure storage bucket policies for file uploads
5. Set up RLS policies as defined in the schema scripts

### Navigation Structure
- `/dashboard` - Main goal management with PDCA board
- `/tasks` - Personal task dashboard for assigned tasks
- `/admin` - User management (Admin only)
- `/admin/system-config` - Department and team management (Admin only)
- `/admin/workflow` - PDCA workflow documentation (Admin only)

This documentation should help future Claude instances understand the codebase structure and make appropriate changes while following established patterns.