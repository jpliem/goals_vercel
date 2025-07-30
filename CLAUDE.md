# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on localhost:3001
- `npm run build` - Build production version  
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linting

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **UI**: shadcn/ui components, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Authentication**: Supabase Auth with role-based permissions (Admin, Head, Employee)

### Key Architecture Patterns

#### PDCA Workflow System
The system implements Plan-Do-Check-Act methodology:
- Valid transitions defined in `actions/goals.ts:408-416`
- Manual status progression (no automatic advancement)
- Tasks are organized by PDCA phase with validation logic
- Phase progression requires user action via status change buttons

#### Database Layer
- **`lib/goal-database.ts`** - Primary database interface, includes mock data fallback
- **`lib/supabase-client.ts`** - Shared Supabase admin client with connection status
- **Server Actions** in `actions/` - All mutations require authentication via `requireAuth()`
- **Database queries** - Always test in Supabase SQL Editor before implementing

#### Modal Architecture
- **Local state management** - Modals use `localGoal` state to avoid parent refreshes
- **Force re-render pattern** - Status changes trigger `renderKey` increment to ensure UI updates
- **Double refresh pattern** - Status updates include delayed refresh for persistence verification
- **Department-based filtering** - Head users see tasks separated by department

### Permission System
- **Roles**: Admin (full access), Head (department oversight), Employee (assigned items only)
- **Head-specific features**:
  - `getAllUserAssignedTasks()` fetches all tasks across departments
  - Department-based task separation in UI
  - Can oversee all department goals

#### AI Analysis System
- **`actions/ollama-integration.ts`** - Ollama AI integration for goal analysis and meta-summaries
- **Template System** - Configurable prompts with variable substitution (`{goal_data}`, `{analysis_data}`)
- **Analysis Types** - Individual goal analysis and executive meta-summaries across multiple goals
- **One Analysis Per Goal** - UNIQUE constraint ensures only latest analysis is kept per goal
- **Preview System** - Users can preview and edit AI prompts before execution

### Recent Architectural Decisions
1. **AI Analysis Replacement** - Changed from INSERT to UPDATE/INSERT to maintain one analysis per goal
2. **Modal refresh optimization** - Force re-render using `renderKey` when `localGoal.status` changes
3. **Task completion notes** - Added completion_notes display throughout UI components
4. **UI simplification** - Combined department/teams display, removed redundant sections
5. **Task creator visibility** - Added `assigned_by_user` to task queries
6. **Manual progression only** - Removed automatic phase progression based on task completion

## Database Schema

### Core Tables with Key Relationships
- **goals** - PDCA status, multi-assignee support, workflow history
- **goal_tasks** - Tasks with PDCA phase, assigned_to, assigned_by relationships, completion_notes
- **goal_assignees** - Goal-level assignments (separate from task assignments)
- **goal_support** - Simple support department tracking (no approval process)
- **notifications** - Includes task assignment notifications with auto-cleanup
- **ai_configurations** - Ollama connection settings, prompt templates (system_prompt, meta_prompt)
- **goal_ai_analysis** - AI analysis results with UNIQUE constraint on goal_id (one per goal)

### Database Setup
```bash
# For new installations:
1. scripts/simplified-database-init.sql  # Complete schema with AI support
2. scripts/seed-test-data.sql           # Optional test data
```

### Key Query Patterns
```typescript
// Fetch goal with all relationships
tasks:goal_tasks(*, 
  assigned_user:users!goal_tasks_assigned_to_fkey(*), 
  assigned_by_user:users!goal_tasks_assigned_by_fkey(*)
)

// Check user role for conditional logic
const isHead = userProfile.role === 'Head'

// AI analysis replacement pattern (one per goal)
const { data: existingAnalysis } = await supabaseAdmin
  .from('goal_ai_analysis')
  .select('id')
  .eq('goal_id', goalId)
  .maybeSingle()

if (existingAnalysis) {
  // Update existing
  await supabaseAdmin.from('goal_ai_analysis').update(payload).eq('id', existingAnalysis.id)
} else {
  // Insert new
  await supabaseAdmin.from('goal_ai_analysis').insert(payload)
}
```

## Component Patterns

### Modal Data Management with Force Re-render
```typescript
// Local state prevents parent refresh
const [localGoal, setLocalGoal] = useState(goal)
const [renderKey, setRenderKey] = useState(0)

// Force re-render when goal status changes to ensure UI updates
useEffect(() => {
  setRenderKey(prev => prev + 1)
}, [localGoal.status])

const refreshLocalGoal = async () => {
  const result = await getGoalById(goal.id)
  if (result.data) setLocalGoal(result.data)
}
```

### Status Change with Persistence Check
```typescript
// Updated pattern for reliable status changes
const result = await updateGoalStatus(localGoal.id, newStatus)
if (!result.error) {
  await refreshLocalGoal()
  // Additional check for persistence
  setTimeout(async () => {
    await refreshLocalGoal()
  }, 500)
}
```

### Department Task Separation (Head Users)
```typescript
const separateTasksByDepartment = (tasks) => {
  if (!isHead) return { myDepartmentTasks: tasks, otherDepartmentTasks: [] }
  
  const myDeptTasks = tasks.filter(task => 
    task.department === userProfile.department || !task.department
  )
  const otherDeptTasks = tasks.filter(task => 
    task.department && task.department !== userProfile.department
  )
  
  return { myDepartmentTasks, otherDepartmentTasks }
}
```

### Task Completion Notes Display
```typescript
// Pattern for showing completion information
{task.status === 'completed' && (
  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
    <div className="text-xs text-green-800 font-medium">
      ✓ Completed {task.completed_at && formatDate(task.completed_at)}
      {task.completed_by && (
        <span className="ml-1">by {getUserName(task.completed_by)}</span>
      )}
    </div>
    {task.completion_notes && (
      <div className="text-xs text-gray-700 mt-1">
        <strong>Notes:</strong> {task.completion_notes}
      </div>
    )}
  </div>
)}
```

### AI Prompt Template System
```typescript
// Template variable substitution
const buildCompletePrompt = (template: string, data: any) => {
  if (template.includes('{goal_data}')) {
    const goalData = buildPureGoalData(data)
    return template.replace('{goal_data}', goalData)
  }
  // Backward compatibility
  return `${template}\n\nUser Request: ${buildAnalysisPrompt(data)}`
}

// Prompt preview with editing
const [editedPrompt, setEditedPrompt] = useState(originalPrompt)
const [isEditMode, setIsEditMode] = useState(false)

// Generate with custom or template prompt
const customPrompt = isEditMode && editedPrompt !== originalPrompt ? editedPrompt : undefined
await generateAIAnalysis(goalId, 'custom', customPrompt)
```

## Common Implementation Patterns

### Server Actions
- Always start with `const user = await requireAuth()`
- Return `{ success: boolean, error?: string, data?: any }`
- Use `revalidatePath()` for cache invalidation

### Date Handling
- Wrap date operations in try-catch
- Check for null/invalid dates before formatting
- Use `isOverdue()` helper for consistency

### File Uploads
- Max 5MB, stored in `goal-attachments/{goalId}/`
- Validate on both client and server
- Supported: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT

### AI Integration
- **Configuration**: Admin-only AI configuration management in `/admin/ai-config`
- **Analysis**: Individual goal analysis with configurable prompts
- **Meta-summaries**: Executive summaries across multiple goal analyses
- **Template Variables**: `{goal_data}` for individual, `{analysis_data}` for meta-summaries
- **Preview System**: Users can preview and edit prompts before AI execution

## Current UI/UX Patterns

### Goal Detail Modal
- Shows "Department and Teams" in format: "Sales (Primary), Sales - Inside Sales (Supporting)"
- Task creator shown as "Created by: [Name]"
- Progress bar shows current PDCA phase progress only
- Goal-level assignees show names, not count
- Completion notes displayed in green highlighted sections

### Task Management
- Tasks created during goal creation or from goal details
- No estimated hours field displayed in UI
- Automatic notifications on assignment
- Priority levels: Critical, High, Medium, Low
- Completion notes captured and displayed throughout system

### PDCA Phase Progression
- Manual progression only via status change buttons
- Button labels: "Start Execution" (Plan→Do), "Begin Review" (Do→Check), "Take Action" (Check→Act), "Complete" (Act→Completed)
- Phase validation checks incomplete tasks but allows manual override
- Use `key` props for reliable UI updates: `key={phase-buttons-${localGoal.status}}`

## Environment Variables

Required:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Development Tips

1. **Mock Data**: System includes comprehensive mock data when Supabase is unavailable
2. **Type Safety**: All database operations have TypeScript interfaces
3. **Error Handling**: Database functions return `{ data, error }` pattern
4. **Performance**: Use Server Components by default, Client Components only for interactivity
5. **Modal Refresh**: When updating status in modals, use force re-render pattern with `renderKey`
6. **Task Completion**: Always include completion_notes in task interfaces and display components
7. **AI Analysis**: Use UPDATE/INSERT pattern to maintain one analysis per goal
8. **Template Testing**: Test AI prompts in preview mode before configuring templates

## Testing AI Integration

- **Ollama Setup**: Configure Ollama URL and model in AI Settings
- **Template Testing**: Use preview functionality to test prompt templates
- **Analysis Validation**: Verify only one analysis exists per goal after generation
- **Meta-summaries**: Test with multiple goal analyses for comprehensive summaries