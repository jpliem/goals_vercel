# 🧪 COMPREHENSIVE WORKFLOW TESTING SCENARIOS

This document provides detailed testing scenarios for all workflow functionality in the Goal Management System. Each scenario includes step-by-step procedures, expected results, and edge cases.

## 🔑 **QUICK LOGIN REFERENCE**
```
🔧 Admin Access:     admin@company.com / admin123
👥 Sales Head:       head.sales@company.com / head123  
👥 Operations Head:  head.operations@company.com / head123
👤 IT Employee:      emp.it1@company.com / emp123
👤 Sales Employee:   emp.sales1@company.com / emp123
```

## 📋 **Test Environment Setup**

### Prerequisites
- ✅ Admin user account with full permissions
- ✅ Database initialized with `complete-database-init.sql`
- ✅ Test data loaded from `seed-test-data.sql`
- ✅ Multiple user roles available (Admin, Head, Employee)
- ✅ Sample departments and teams configured

### Test Data Requirements
**Available Test Data (from debug-seed-data.sql):**

**Test User Accounts:**

| Role | Department | Name | Email | Password |
|------|------------|------|-------|----------|
| **Admin** | IT | Primary Admin | `admin@company.com` | `admin123` |
| **Admin** | IT | Sarah Admin | `admin2@company.com` | `admin123` |
| **Admin** | IT | Michael SuperAdmin | `superadmin@company.com` | `admin123` |
| **Head** | HR | Lisa Thompson | `head.hr@company.com` | `head123` |
| **Head** | Finance | Robert Chen | `head.finance@company.com` | `head123` |
| **Head** | Operations | Maria Rodriguez | `head.operations@company.com` | `head123` |
| **Head** | Engineering | David Kim | `head.engineering@company.com` | `head123` |
| **Head** | Sales | Jennifer Wilson | `head.sales@company.com` | `head123` |
| **Head** | Marketing | Alex Johnson | `head.marketing@company.com` | `head123` |

**Employee Accounts** (Sample - 20+ total available):
- IT: `emp.it1@company.com` (Anna Lee), `emp.it2@company.com` (Chris Martinez)
- Sales: `emp.sales1@company.com` (Amanda White), `emp.sales2@company.com` (Ryan Clark)  
- Operations: `emp.ops1@company.com` (Sophie Zhang), `emp.ops2@company.com` (Daniel Garcia)
- All employee passwords: `emp123`

**Departments & Teams:**
- HR: Recruitment, Training & Development
- IT: IoT, GSPE, Administration, Infrastructure  
- Finance: Finance, Tax
- Operation: Project, PPC, QC & QA, Logistic, Production
- Engineer: Mechanical Engineering, Electrical Engineering, Site Engineering
- Sales: ABB, Siemens, Rockwell, Hitachi
- Marketing: Marketing

**Goals Available for Testing:**
- **Plan Phase**: Q1 Sales Target, IoT Platform Development, HR Digitization (3 goals)
- **Do Phase**: Manufacturing Optimization, Marketing Campaign (2 goals) 
- **Check Phase**: Financial System Upgrade (1 goal)
- **Act Phase**: Quality Management Certification (1 goal)
- **Completed**: Employee Training Program (1 goal)
- **On Hold**: Office Expansion Project (1 goal)

---

## **PHASE 1: PDCA WORKFLOW CORE FUNCTIONALITY**

### **🎯 Scenario WF-001: Basic PDCA Progression**
**Objective**: Verify standard workflow progression through all PDCA phases

```yaml
Preconditions:
  - Use test goal: "Q1 2024 Sales Target Achievement" (ID: a1b2c3d4-e5f6-4789-a012-123456789abc)
  - Login as Jennifer Wilson (Sales Head): head.sales@company.com / head123
  - Goal currently exists in "Plan" status with 25% progress

Test Steps:
  1. Login as Jennifer Wilson (head.sales@company.com / head123)
  2. Navigate to Dashboard → Goals → "Q1 2024 Sales Target Achievement"
  3. Verify current status shows "Plan" with blue indicator
  4. Review existing Plan phase tasks:
     - "Market Analysis and Customer Segmentation" (completed by Amanda White)
     - "Sales Strategy Development" (in progress by Ryan Clark)
     - "Sales Team Training Plan" (pending, assigned to Michelle Lewis)
  5. Complete remaining Plan phase tasks by updating their status
  6. Verify progress bar shows 100% for Plan phase
  7. Click "Start Execution" button
  8. Confirm transition in modal dialog
  9. Verify status changes to "Do" with orange indicator
  10. Create new Do phase tasks:
      - "Execute ABB product sales strategy" (assign to Amanda White)
      - "Launch Siemens customer outreach" (assign to Ryan Clark)
      - "Implement sales training program" (assign to Michelle Lewis)
      - "Track daily sales metrics" (assign to Jennifer Wilson)
  11. Simulate task completion over time
  12. Click "Begin Review" button  
  13. Verify status changes to "Check" with green indicator
  14. Create Check phase tasks:
      - "Review Q1 sales performance vs targets"
      - "Customer satisfaction survey analysis"
  15. Complete all Check phase tasks
  16. Click "Take Action" button
  17. Verify status changes to "Act" with purple indicator
  18. Create Act phase tasks:
      - "Implement improvements for Q2"
      - "Update sales process documentation"
      - "Plan Q2 strategy based on learnings"
  19. Complete all Act phase tasks
  20. Click "Complete" button
  21. Verify final status shows "Completed" with dark green

Expected Results:
  ✅ Each phase transition works smoothly without errors
  ✅ Status indicators change colors appropriately  
  ✅ Progress bars update correctly for each phase
  ✅ Workflow history shows all transitions with timestamps
  ✅ Notifications sent to assignees at each transition
  ✅ Goal completion percentage reaches 100%

Edge Cases to Test:
  ⚠️ Transition with incomplete tasks (should be blocked)
  ⚠️ Transition by user without permissions (should fail)
  ⚠️ Network interruption during transition (should recover)
  ⚠️ Concurrent transitions by multiple users (conflict resolution)
```

### **🎯 Scenario WF-002: Phase Validation Rules**
**Objective**: Test enforcement of phase completion threshold rules

```yaml
Setup:
  - Default workflow rules already configured in debug data
  - Login as Primary Admin (admin@company.com / admin123) to modify rules
  - Use test goal: "IoT Platform Development Phase 1" (ID: b2c3d4e5-f6a7-4890-b123-234567890bcd)

Test Steps:
  1. Login as Primary Admin (admin@company.com / admin123)
  2. Navigate to Admin → Workflow Rules
  3. Verify existing phase completion threshold rules:
     - Plan phase: 100% threshold, enforce=true
     - Do phase: 90% threshold, enforce=true, allow override for Admin/Head
     - Check phase: 100% threshold, enforce=true, no override
  4. Navigate to "IoT Platform Development Phase 1" goal (currently in Plan phase)
  5. Review existing Plan phase tasks:
     - "Architecture Design and Planning" (completed by Chris Martinez)
     - "Database Schema Design" (completed by Anna Lee)  
     - "Security Framework Implementation" (in progress by Chris Martinez)
  6. Leave "Security Framework Implementation" at 70% completion
  7. Login as Michael SuperAdmin (superadmin@company.com / admin123)
  8. Attempt to click "Start Execution" button
  9. Verify transition is blocked with error modal
  10. Read error message: "All Plan phase tasks must be completed before progressing to Do phase"
  11. Complete the "Security Framework Implementation" task (100%)
  12. Retry "Start Execution" transition
  13. Verify transition succeeds to "Do" phase
  14. Test Admin override functionality with partially complete Do phase

Expected Results:
  ✅ Incomplete phases block transitions with clear error messages
  ✅ Threshold calculations are accurate
  ✅ Rule enforcement can be enabled/disabled
  ✅ Different threshold values work correctly
  ✅ Admin users can override rules if configured

Advanced Testing:
  🔧 Test with 0% threshold (always allow)
  🔧 Test with calculated vs. manual completion percentages
  🔧 Test rule inheritance across different goal types
  🔧 Test rule precedence when multiple rules apply
```

### **🎯 Scenario WF-003: Role-Based Workflow Permissions**
**Objective**: Verify user role restrictions on workflow transitions

```yaml
Test Matrix Using Specific Users:

Employee Role Test (Anna Lee - IT/IoT):
  Login: emp.it1@company.com / emp123
  Test Goal: "IoT Platform Development Phase 1"
  - ✅ View goal details and assigned tasks
  - ✅ Complete assigned "Database Schema Design" task
  - ✅ Add completion notes to tasks
  - ❌ Cannot transition Plan → Do (should show permission error)
  - ❌ Cannot reassign tasks to other users
  - ❌ Cannot create new tasks in goal

Head Role Test (Maria Rodriguez - Operations):
  Login: head.operations@company.com / head123  
  Test Goal: "Manufacturing Process Optimization" (currently in Do phase)
  - ✅ View all department goals
  - ✅ Transition Do → Check when tasks complete
  - ✅ Assign/reassign tasks to team members (Daniel Garcia, Rachel Moore)
  - ✅ Put goal "On Hold" and resume
  - ✅ Override 90% Do phase threshold (if configured)
  - ❌ Cannot access goals from other departments directly

Admin Role Test (Primary Admin):
  Login: admin@company.com / admin123
  Test Goal: Any goal across all departments
  - ✅ Access all goals regardless of department
  - ✅ Override all workflow rules and thresholds
  - ✅ Force transition goals in any order (Plan → Act directly)
  - ✅ Modify workflow configurations
  - ✅ Create/edit workflow rules
  - ✅ Bulk operations across departments

Test Procedure:
  1. Login as Anna Lee (Employee)
  2. Navigate to "IoT Platform Development Phase 1"
  3. Attempt to click "Start Execution" button
  4. Verify permission error: "You don't have permission to change goal status"
  5. Complete assigned task and verify task completion works
  6. Logout and login as Maria Rodriguez (Head)
  7. Navigate to "Manufacturing Process Optimization" 
  8. Verify Head can transition Do → Check
  9. Test task reassignment within Operations department
  10. Logout and login as Primary Admin
  11. Test Admin override capabilities across all goals

Expected Results:
  ✅ Role restrictions enforced consistently
  ✅ Clear permission error messages displayed
  ✅ No unauthorized actions possible
  ✅ Audit logs track permission denials
```

---

## **PHASE 2: WORKFLOW RULES ENGINE TESTING**

### **🎯 Scenario WF-004: Duration Limit Rules**
**Objective**: Test time-based workflow enforcement and warnings

```yaml
Setup Configuration:
  Rule Type: "duration_limit"
  Phase: "Do"
  Configuration: {
    "max_days": 30,
    "warning_days": 25,
    "enforce": true,
    "escalation_action": "notify_manager"
  }

Test Steps:
  1. Create goal and advance to "Do" phase
  2. Record start timestamp
  3. Simulate 25 days elapsed (modify DB or use test utilities)
  4. Trigger workflow rule evaluation
  5. Verify warning notification sent to:
     - Goal owner
     - Current assignees  
     - Department head
  6. Check notification content includes:
     - Days elapsed (25)
     - Days remaining (5)
     - Goal details
     - Action required
  7. Simulate 30 days elapsed
  8. Verify escalation action triggered:
     - Manager notification sent
     - Goal marked for review
     - Status changed to "On Hold" (if configured)
  9. Test Admin override of duration limits
  10. Test rule modification while goal is active

Expected Results:
  ✅ Warning notifications sent at correct thresholds
  ✅ Escalation actions trigger automatically
  ✅ Accurate day calculations including weekends/holidays
  ✅ Rule changes apply to existing goals appropriately
  ✅ Override functionality works for authorized users

Advanced Scenarios:
  🔧 Test multiple duration rules on same goal
  🔧 Test duration rules with goal dependencies
  🔧 Test rule behavior during On Hold periods
  🔧 Test timezone handling for global teams
```

### **🎯 Scenario WF-005: Custom Validation Rules**
**Objective**: Test JSON-based custom validation logic

```yaml
Sample Validation Rules:
  1. Goal Description Length:
     {"min_length": 50, "max_length": 500}
  
  2. Required Assignees by Phase:
     {"Plan": {"min_assignees": 1}, "Do": {"min_assignees": 2}}
  
  3. Mandatory Goal Metrics:
     {"required_fields": ["target_metrics", "success_criteria"]}

Test Procedure:
  1. Access Workflow Rules Editor
  2. Create "validation_rule" type rule
  3. Configure JSON validation logic
  4. Apply rule to "All" phases
  5. Create test goal with invalid data:
     - Description too short (20 characters)
     - Missing target metrics
     - No assignees in Do phase
  6. Attempt phase transitions
  7. Verify validation blocks transitions
  8. Read validation error messages
  9. Correct validation issues one by one
  10. Verify transitions succeed after fixes
  11. Test rule disable/enable during validation

Expected Results:
  ✅ Custom JSON validation logic executes correctly
  ✅ Validation errors are clear and actionable
  ✅ Rules can be complex with nested conditions
  ✅ Performance remains good with complex validations
  ✅ Rule syntax errors are caught and reported

JSON Validation Examples:
```json
{
  "rules": [
    {
      "field": "description",
      "validator": "length",
      "params": {"min": 50, "max": 500},
      "message": "Goal description must be 50-500 characters"
    },
    {
      "field": "assignees",
      "validator": "count",
      "params": {"min": 1},
      "message": "At least one assignee required"
    }
  ]
}
```

### **🎯 Scenario WF-006: Notification Rules**
**Objective**: Test configurable notification system

```yaml
Notification Rule Configurations:
  1. Status Change Notifications:
     {
       "notify_on_status_change": true,
       "notify_assignees": true,
       "notify_owner": true,
       "notify_manager": false,
       "exclude_transitions": ["Plan->Do"]
     }

  2. Task Assignment Notifications:
     {
       "notify_on_task_assigned": true,
       "notify_on_task_completed": true,
       "include_task_details": true
     }

Test Steps:
  1. Configure notification rule in admin panel
  2. Create test goal with multiple assignees
  3. Perform Plan → Do transition
  4. Verify NO notifications sent (excluded)
  5. Perform Do → Check transition  
  6. Verify notifications sent to:
     - All assignees ✅
     - Goal owner ✅
     - Manager ❌ (disabled)
  7. Check notification content includes:
     - Goal title and description
     - Old and new status
     - Action required
     - Link to goal details
  8. Assign new task to user
  9. Verify task assignment notification sent
  10. Complete task
  11. Verify task completion notification sent
  12. Test notification preferences per user
  13. Test notification delivery methods (email, in-app)

Expected Results:
  ✅ Notifications respect rule configuration exactly
  ✅ Excluded transitions don't trigger notifications
  ✅ Notification content is complete and helpful
  ✅ User preferences override global rules
  ✅ Delivery methods work reliably

Notification Content Validation:
  📧 Email notifications formatted properly
  🔔 In-app notifications appear in notification center
  📱 Mobile push notifications work (if implemented)
  🔗 Links in notifications work correctly
```

---

## **PHASE 3: STATUS TRANSITIONS CONFIGURATION**

### **🎯 Scenario WF-007: Custom Workflow Creation**
**Objective**: Create and test non-standard workflow configurations

```yaml
Test Existing Custom Workflows (Already Available in Debug Data):

1. "Agile Sprint Workflow" (ID from debug data):
   Login: admin@company.com / admin123
   Statuses: Backlog → Sprint Planning → In Development → Code Review → Testing → Done
   Colors: Gray, Blue, Orange, Purple, Yellow, Green
   Role Permissions: Employee (In Development, Code Review), Head (most transitions), Admin (all)

2. "Simple Kanban Workflow" (ID from debug data):
   Statuses: To Do → Doing → Done
   Colors: Slate, Orange, Green
   Role Permissions: Employee (Doing only), Head/Admin (all)

Test Steps:
  1. Login as Primary Admin (admin@company.com / admin123)
  2. Navigate to Admin → System Settings → Workflow Configurations
  3. Verify existing custom workflows are listed:
     - "Default PDCA Workflow" (active, default)
     - "Agile Sprint Workflow" (inactive)
     - "Simple Kanban Workflow" (inactive)
  4. Activate "Agile Sprint Workflow" for testing
  5. Navigate to Create New Goal
  6. Select "Agile Sprint Workflow" from workflow dropdown
  7. Create test goal: "Test Agile Workflow Goal"
  8. Assign to IT department (Michael SuperAdmin as owner)
  9. Verify goal starts in "Backlog" status with gray indicator
  10. Test valid transitions in sequence:
      - Backlog → Sprint Planning (blue) ✅
      - Sprint Planning → In Development (orange) ✅  
      - In Development → Code Review (purple) ✅
      - Code Review → Testing (yellow) ✅
      - Testing → Done (green) ✅
  11. Create second test goal and test invalid transitions:
      - Backlog → Testing ❌ (should be blocked)
      - Code Review → Done ❌ (should be blocked)
  12. Test role permissions:
      - Login as Anna Lee (emp.it1@company.com) 
      - Verify Employee can only do In Development → Code Review
      - Login as Michael SuperAdmin to test Admin permissions
  13. Verify visual styling matches configuration throughout UI

Expected Results:
  ✅ Custom workflow appears in goal creation dropdown
  ✅ All defined transitions work correctly
  ✅ Invalid transitions are blocked
  ✅ Visual styling applies properly throughout UI
  ✅ Role permissions enforced per configuration
  ✅ Workflow can be edited/updated after creation

Advanced Testing:
  🔧 Create workflow with circular paths
  🔧 Test workflow with >10 statuses
  🔧 Test workflow inheritance and defaults
  🔧 Test workflow export/import functionality
```

### **🎯 Scenario WF-008: Workflow Conflict Resolution**
**Objective**: Test multiple workflows and switching scenarios

```yaml
Setup:
  - Standard PDCA Workflow (default)
  - Agile Sprint Workflow (custom)
  - Kanban Board Workflow (custom)

Test Scenarios:
  1. Multiple Active Workflows:
     - Create goals with different workflows
     - Verify no interference between workflows
     - Test workflow-specific rules and permissions

  2. Default Workflow Assignment:
     - Set different default workflows per department
     - Create goals and verify correct workflow assigned
     - Test fallback to system default

  3. Workflow Switching:
     - Create goal with PDCA workflow
     - Progress through Plan → Do phases
     - Switch workflow to Agile Sprint
     - Map statuses: Do → In Progress
     - Continue with new workflow
     - Verify data integrity maintained

Test Steps:
  1. Create 3 goals, each with different workflow
  2. Progress each goal through 2-3 status changes
  3. Verify no cross-contamination of rules/permissions
  4. Attempt to switch workflow on existing goal:
     - Access goal settings
     - Select "Change Workflow"
     - Choose new workflow
     - Map current status to new workflow status
     - Confirm switch
  5. Verify switched goal uses new workflow rules
  6. Test workflow deactivation with active goals
  7. Test workflow deletion prevention with dependencies

Expected Results:
  ✅ Multiple workflows coexist without conflicts
  ✅ Workflow switching preserves all goal data
  ✅ Status mapping works correctly during switch
  ✅ Dependencies prevent improper workflow deletion
  ✅ Audit logs track all workflow changes
```

---

## **PHASE 4: ADVANCED WORKFLOW FEATURES**

### **🎯 Scenario WF-009: Workflow History and Audit**
**Objective**: Verify complete workflow activity tracking

```yaml
Test Using Existing Goal with Rich History:
  Goal: "Quality Management System Certification" (ID: a7b8c9d0-e1f2-4345-a678-789012345abc)
  Current Status: Act phase (90% complete)
  Owner: Maria Rodriguez (Operations Head)
  Assignee: Rachel Moore (QC & QA Employee)

Pre-existing Actions to Verify:
  1. Goal creation (2023-09-01 by Maria Rodriguez)
  2. Multiple status transitions with timestamps:
     - Plan → Do (2023-10-15)
     - Do → Check (2023-12-20) 
     - Check → Act (2024-01-15) with comment "Internal audit completed successfully"
  3. Task assignments and completions with completion notes
  4. Comments from various users in workflow_history JSON

Test Steps:
  1. Login as Maria Rodriguez (head.operations@company.com / head123)
  2. Navigate to "Quality Management System Certification" goal
  3. Click "Workflow History" or "Activity Timeline" tab
  4. Verify complete chronological history shows:
     - Goal creation event (Sep 1, 2023)
     - All status transitions with exact timestamps
     - User attributions for each action
     - Comments: "Internal audit completed successfully, implementing final improvements"
     - Task completion records
  5. Verify existing Act phase tasks show in history:
     - "Implement Corrective Actions" (completed by Rachel Moore)
     - "Final Documentation Review" (completed by Rachel Moore)  
     - "Certification Audit Preparation" (in progress by Rachel Moore)
  6. Add new workflow comment: "Final preparations for certification audit next week"
  7. Complete remaining task with notes: "All audit preparations completed successfully"
  8. Transition Act → Completed with comment: "ISO 9001:2015 certification achieved!"
  9. Refresh Workflow History panel
  10. Verify new actions appear in timeline with correct timestamps
  11. Test history export functionality (if available)
  12. Verify complete audit trail from creation to completion (6+ months of activity)

Expected Results:
  ✅ Every workflow action logged automatically
  ✅ Timestamps accurate to minute precision
  ✅ User attribution correct for all actions
  ✅ Comments and attachments linked to timeline
  ✅ Export functionality works with all data
  ✅ History survives goal status changes
  ✅ Visual timeline displays chronologically

Audit Data Validation:
```json
{
  "action": "status_change",
  "timestamp": "2024-01-15T10:30:00Z",
  "user": "john.doe@company.com",
  "old_status": "Plan",
  "new_status": "Do",
  "comment": "All planning tasks completed",
  "metadata": {
    "tasks_completed": 5,
    "completion_percentage": 100,
    "assigned_users": ["jane@company.com", "bob@company.com"]
  }
}
```
```

### **🎯 Scenario WF-010: Bulk Workflow Operations**
**Objective**: Test managing multiple goals simultaneously

```yaml
Available Goals for Bulk Testing (from debug-seed-data.sql):

Goals by Status:
  - Plan Phase (3 goals):
    * "Q1 2024 Sales Target Achievement" (Sales dept)
    * "IoT Platform Development Phase 1" (IT dept) 
    * "HR Process Digitization Initiative" (HR dept)
  
  - Do Phase (2 goals):
    * "Manufacturing Process Optimization" (Operation dept)
    * "Digital Marketing Campaign Launch" (Marketing dept)
  
  - Check Phase (1 goal):
    * "Financial System Upgrade" (Finance dept)
  
  - Act Phase (1 goal):
    * "Quality Management System Certification" (Operation dept)
  
  - Completed (1 goal):
    * "Employee Training Program Completion" (Engineer dept)
  
  - On Hold (1 goal):
    * "Office Expansion Project" (Operation dept)

Bulk Operations to Test:
  1. Bulk Status Transitions - Plan Phase Goals:
     Login: admin@company.com / admin123
     - Filter by Status = "Plan" (should show 3 goals)
     - Select all Plan phase goals
     - Bulk transition to "Do" phase
     - Verify all 3 goals transition successfully

  2. Bulk Assignment Changes - Operation Department:
     - Filter by Department = "Operation" (3 goals total)
     - Bulk reassign from Maria Rodriguez to new Operations Head
     - Verify notifications sent to affected users

  3. Department-wide Workflow Changes:
     - Select all IT department goals
     - Change workflow from "Default PDCA" to "Agile Sprint"
     - Map statuses: Plan → Backlog, Do → In Development
     - Verify status mapping works correctly

Test Steps:
  1. Login as Primary Admin (admin@company.com / admin123)
  2. Navigate to Admin → Goals → Bulk Operations (or equivalent)
  3. Apply filter: Status = "Plan"
  4. Verify 3 goals listed:
     - Q1 2024 Sales Target Achievement
     - IoT Platform Development Phase 1  
     - HR Process Digitization Initiative
  5. Select all 3 goals using checkboxes
  6. Choose "Bulk Status Transition" action
  7. Select target status: "Do"
  8. Add bulk comment: "Moving all Plan phase goals to execution"
  9. Execute bulk operation
  10. Monitor progress indicator/feedback
  11. Verify results:
      - All 3 goals now show "Do" status
      - Workflow history updated for each goal
      - Assignees notified of status changes
  12. Test bulk operation with mixed departments
  13. Test error handling if some goals cannot transition

Expected Results:
  ✅ Bulk operations complete successfully
  ✅ Progress indicators show real-time status
  ✅ Partial failures handled gracefully
  ✅ Audit logs show bulk operation details
  ✅ Performance acceptable with large datasets
  ✅ Rollback functionality works when needed

Performance Benchmarks:
  - 10 goals: < 2 seconds
  - 50 goals: < 10 seconds  
  - 100 goals: < 30 seconds
  - Memory usage stable throughout
```

---

## **PHASE 5: ERROR HANDLING AND EDGE CASES**

### **🎯 Scenario WF-011: System Resilience Testing**
**Objective**: Test workflow system under adverse conditions

```yaml
Error Conditions to Test:
  1. Database Connection Failures
  2. Network Interruptions
  3. Concurrent User Actions
  4. Invalid Data States
  5. Resource Exhaustion
  6. Malicious Input Attempts

Test Procedures:

A) Database Failure Recovery:
  1. Start goal status transition
  2. Simulate database connection loss
  3. Verify graceful error message displayed
  4. Restore database connection
  5. Retry transition operation
  6. Verify no data corruption occurred
  7. Check audit logs for failure record

B) Network Interruption Handling:
  1. Begin bulk workflow operation
  2. Disconnect network during operation
  3. Verify partial completion tracking
  4. Reconnect network
  5. Resume or retry operation
  6. Verify data consistency maintained

C) Concurrent User Conflicts:
  1. Two users open same goal simultaneously
  2. User A changes status to "Do"
  3. User B attempts status change to "Check"
  4. Verify conflict detection and resolution
  5. Test optimistic vs pessimistic locking
  6. Verify user notifications about conflicts

Expected Results:
  ✅ Graceful error messages (no technical jargon)
  ✅ No partial database updates
  ✅ Automatic retry mechanisms where appropriate
  ✅ Data consistency maintained under all conditions
  ✅ User conflicts resolved fairly
  ✅ Recovery procedures work correctly

Error Message Examples:
  - "Unable to update goal status. Please check your connection and try again."
  - "Another user has modified this goal. Please refresh and try again."
  - "System temporarily unavailable. Your changes will be saved when connection is restored."
```

### **🎯 Scenario WF-012: Security and Input Validation**
**Objective**: Test workflow system against malicious inputs

```yaml
Security Tests:
  1. SQL Injection Attempts
  2. XSS in Workflow Comments
  3. CSRF Token Validation
  4. Role Privilege Escalation
  5. API Endpoint Security
  6. File Upload Validation

Test Cases:

A) Input Sanitization:
  1. Enter malicious script in workflow comment:
     "<script>alert('XSS')</script>"
  2. Verify script is sanitized/encoded
  3. Test SQL injection in goal search:
     "'; DROP TABLE goals; --"
  4. Verify query parameterization prevents injection

B) Authentication/Authorization:
  1. Attempt workflow operations without authentication
  2. Try to access Admin workflows as Employee
  3. Attempt to modify other user's goals
  4. Test API endpoints with invalid tokens
  5. Verify all operations require proper permissions

C) Data Validation:
  1. Submit workflow rule with invalid JSON
  2. Create goal with extremely long descriptions
  3. Upload malicious files as attachments
  4. Test Unicode/special character handling
  5. Verify file type restrictions enforced

Expected Results:
  ✅ All malicious inputs properly sanitized
  ✅ Authentication required for all operations
  ✅ Authorization enforced consistently
  ✅ Invalid data rejected with clear messages
  ✅ File uploads scanned and restricted
  ✅ Audit logs capture security events

Security Validation Checklist:
  - [ ] No XSS vulnerabilities in any input field
  - [ ] No SQL injection possible in any query
  - [ ] CSRF tokens validated on all forms
  - [ ] Role permissions enforced server-side
  - [ ] File uploads restricted and scanned
  - [ ] Rate limiting prevents abuse
```

---

## **🎯 PERFORMANCE AND SCALABILITY TESTING**

### **Scenario WF-013: Load Testing**
**Objective**: Verify workflow performance under load

```yaml
Performance Test Scenarios:
  1. High User Concurrency (50+ simultaneous users)
  2. Large Dataset Operations (1000+ goals)
  3. Complex Workflow Rules (nested validations)
  4. Bulk Operations at Scale
  5. Real-time Notifications Load

Load Test Procedure:
  1. Create test dataset:
     - 1000 goals across 50 departments
     - 500 active users with various roles
     - 20 workflow configurations
     - 100 active workflow rules
  2. Simulate concurrent operations:
     - 50 users performing status transitions
     - 20 users creating new goals
     - 10 admins modifying workflow rules
     - Bulk operations on 100+ goals
  3. Monitor system metrics:
     - Response times for all operations
     - Database query performance
     - Memory usage patterns
     - CPU utilization
     - Network bandwidth
  4. Verify functionality under load:
     - All workflows continue to function
     - Data integrity maintained
     - Error rates remain acceptable
     - User experience stays responsive

Performance Benchmarks:
  - Goal status transition: < 500ms
  - Workflow rule evaluation: < 200ms
  - Bulk operations (100 goals): < 30s
  - Page load times: < 2s
  - Database queries: < 100ms average

Expected Results:
  ✅ System remains responsive under high load
  ✅ No data corruption during concurrent operations
  ✅ Error rates stay below 1%
  ✅ Memory usage remains stable
  ✅ All functional requirements met under load
```

---

## **📊 TEST EXECUTION MATRIX**

| Scenario | Priority | Duration | Prerequisites | Pass Criteria |
|----------|----------|----------|---------------|---------------|
| WF-001 | Critical | 30 min | Basic setup | All PDCA transitions work |
| WF-002 | High | 20 min | Workflow rules | Validation enforced |
| WF-003 | Critical | 45 min | Multi-role users | Permissions work |
| WF-004 | Medium | 30 min | Duration rules | Time limits enforced |
| WF-005 | Medium | 25 min | Custom rules | JSON validation works |
| WF-006 | High | 35 min | Notification setup | Notifications sent correctly |
| WF-007 | High | 40 min | Admin access | Custom workflows function |
| WF-008 | Medium | 30 min | Multiple workflows | No conflicts occur |
| WF-009 | Medium | 25 min | Active goals | Complete audit trail |
| WF-010 | Low | 35 min | Bulk data | Bulk operations succeed |
| WF-011 | High | 45 min | Error simulation | Graceful error handling |
| WF-012 | Critical | 60 min | Security tools | No vulnerabilities |
| WF-013 | Low | 120 min | Load test tools | Performance benchmarks met |

**Total Estimated Testing Time: 8.5 hours**

---

## **✅ TEST COMPLETION CHECKLIST**

### Pre-Testing Setup
- [ ] Test environment configured with all prerequisites
- [ ] Test data loaded and verified
- [ ] Multiple user accounts with different roles created
- [ ] Backup of test database taken before testing begins

### Core Functionality Tests
- [ ] WF-001: Basic PDCA progression ✅
- [ ] WF-002: Phase validation rules ✅
- [ ] WF-003: Role-based permissions ✅

### Advanced Features Tests  
- [ ] WF-004: Duration limit rules ✅
- [ ] WF-005: Custom validation rules ✅
- [ ] WF-006: Notification rules ✅
- [ ] WF-007: Custom workflow creation ✅
- [ ] WF-008: Workflow conflict resolution ✅

### System Quality Tests
- [ ] WF-009: Workflow history and audit ✅
- [ ] WF-010: Bulk workflow operations ✅
- [ ] WF-011: Error handling and resilience ✅
- [ ] WF-012: Security and input validation ✅
- [ ] WF-013: Performance and scalability ✅

### Post-Testing Activities
- [ ] All test results documented with screenshots
- [ ] Issues logged with severity and priority
- [ ] Performance metrics recorded and analyzed
- [ ] Security scan results reviewed
- [ ] Test environment cleaned up
- [ ] Production deployment readiness assessed

---

## **🐛 COMMON ISSUES AND TROUBLESHOOTING**

### Issue: Status Transition Buttons Not Appearing
**Symptoms**: User cannot see workflow transition buttons
**Causes**: 
- User lacks proper role permissions
- Workflow rule blocking transition
- Goal in invalid state for transition
**Debugging**:
1. Check user role and permissions
2. Review workflow rules for current phase
3. Verify goal has required data (tasks, assignees)
4. Check browser console for JavaScript errors

### Issue: Workflow Rules Not Enforcing
**Symptoms**: Rules configured but not preventing invalid transitions
**Causes**:
- Rule marked as inactive
- JSON configuration syntax error
- Rule precedence/conflict issues
**Debugging**:
1. Verify rule is active in admin panel
2. Validate JSON configuration syntax
3. Check audit logs for rule evaluation results
4. Test rule logic with simple scenarios first

### Issue: Notifications Not Sending
**Symptoms**: Expected notifications not received by users
**Causes**:
- Notification rule misconfigured
- Email service not working
- User notification preferences disabled
**Debugging**:
1. Check notification rule configuration
2. Verify email service status
3. Review user notification preferences
4. Check notification queue/logs

---

## **📈 CONTINUOUS TESTING STRATEGY**

### Automated Testing Integration
- Unit tests for all workflow rule functions
- Integration tests for PDCA phase transitions
- End-to-end tests for complete workflow scenarios
- Performance regression tests for bulk operations

### Monitoring and Alerting
- Real-time monitoring of workflow operation success rates
- Alerts for workflow rule violations or errors
- Performance metric tracking and trending
- User experience monitoring for workflow operations

### Regular Testing Schedule
- **Daily**: Automated test suite execution
- **Weekly**: Manual testing of new features
- **Monthly**: Full regression testing of all scenarios
- **Quarterly**: Load testing and security scanning

This comprehensive testing framework ensures the workflow system maintains high quality and reliability in production environments.