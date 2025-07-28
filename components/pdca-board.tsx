"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  TrendingUp,
  Eye,
  Users,
  Target,
  ExternalLink,
  AlertCircle,
  Filter,
  Calendar,
  UserCheck,
  Pause,
  Building,
  HandHeart
} from "lucide-react"
import { FocusIndicator } from "@/components/ui/focus-indicator"
import { GoalDetailModal } from "@/components/modals/goal-detail-modal"
import type { GoalWithDetails, UserRecord } from "@/lib/goal-database"

interface PDCABoardProps {
  goals: GoalWithDetails[]
  userProfile: UserRecord
  className?: string
  userDepartmentPermissions?: string[]
  users?: UserRecord[]
}

interface StageData {
  id: string
  label: string
  description: string
  icon: any
  count: number
  goals: GoalWithDetails[]
  overdueCount: number
  hasOverdue: boolean
  personalCount: number
  personalGoals: GoalWithDetails[]
  color: {
    bg: string
    border: string
    text: string
    badge: string
  }
  position: {
    row: number
    col: number
  }
}

// Helper function to check if user was ever assigned to a goal
const hasHistoricalInvolvement = (goal: GoalWithDetails, userId: string): boolean => {
  if (!goal.assignment_history) return false
  
  return goal.assignment_history.some(assignment => 
    assignment.user_id === userId
  )
}

// Utility function to get user-relevant goals consistently  
const getUserRelevantGoals = (
  goals: GoalWithDetails[], 
  userProfile: UserRecord, 
  assigneeFilter?: string, 
  ownerFilter?: string,
  departmentFilter?: string,
  userDepartmentPermissions?: string[],
  viewMode?: string
) => {
  const userId = userProfile.id
  
  let filteredGoals = goals.filter(g => {
    // Check multi-assignee assignment
    const singleAssigneeMatch = g.current_assignee_id === userId
    const multiAssigneeMatch = g.assignees && g.assignees.some((assignee: any) => assignee.user_id === userId)

    // Check current assignments
    const isCurrentlyAssigned = 
      g.current_assignee_id === userId || 
      singleAssigneeMatch ||
      multiAssigneeMatch ||
      g.owner_id === userId
    
    // Check historical assignments
    const wasHistoricallyAssigned = hasHistoricalInvolvement(g, userId)
    
    // Check department permissions
    const hasDepartmentAccess = userDepartmentPermissions && 
      userDepartmentPermissions.length > 0 && 
      g.department &&
      userDepartmentPermissions.includes(g.department)
    
    
    // Role-specific filtering
    switch (userProfile.role) {
      case "Admin": 
        // Admins see ALL goals (system-wide oversight)
        return true
      case "Head": 
        // Heads see all goals system-wide (like Admin) for management oversight
        return true
      case "Employee": 
        // Employees see: their goals + any assigned roles they might have + department permissions
        return g.owner_id === userId || isCurrentlyAssigned || wasHistoricallyAssigned || hasDepartmentAccess
      default: 
        return false
    }
  })
  
  
  // Apply filters based on user role
  if (userProfile.role === "Admin") {
    // Admin-only filters
    if (assigneeFilter && assigneeFilter !== "all") {
      filteredGoals = filteredGoals.filter(g => 
        g.current_assignee_id === assigneeFilter || 
        (g.assignees && g.assignees.some((assignee: any) => assignee.user_id === assigneeFilter))
      )
    }
    
    if (ownerFilter && ownerFilter !== "all") {
      filteredGoals = filteredGoals.filter(g => g.owner_id === ownerFilter)
    }

    if (departmentFilter && departmentFilter !== "all") {
      if (departmentFilter === "no-department") {
        filteredGoals = filteredGoals.filter(g => !g.department)
      } else {
        filteredGoals = filteredGoals.filter(g => g.department === departmentFilter)
      }
    }
  } else {
    // Non-admin view mode filtering
    if (viewMode && viewMode !== "all") {
      if (viewMode === "my-goals") {
        // For Users: Show only user's own goals
        filteredGoals = filteredGoals.filter(g => g.owner_id === userId)
      } else if (viewMode === "no-department") {
        // Show goals from users with no department
        filteredGoals = filteredGoals.filter(g => !g.department)
      } else {
        // Show only goals from specific department
        filteredGoals = filteredGoals.filter(g => g.department === viewMode)
      }
    }
  }

  
  return filteredGoals
}

export function PDCABoard({ goals, userProfile, className = "", userDepartmentPermissions = [], users = [] }: PDCABoardProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [ownerFilter, setOwnerFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<string>("all") // For non-admin users
  const [selectedGoal, setSelectedGoal] = useState<GoalWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  

  // Helper function to check if goal is overdue
  const isGoalOverdue = (goal: GoalWithDetails): boolean => {
    if (!goal.target_date) return false
    const targetDate = new Date(goal.target_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return targetDate < today && goal.status !== "Completed"
  }

  // Helper function to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true }
    } else if (diffDays === 0) {
      return { text: 'Due today', isOverdue: false, isToday: true }
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} days`, isOverdue: false, isUrgent: true }
    } else {
      return { text: date.toLocaleDateString(), isOverdue: false }
    }
  }

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500 text-white'
      case 'High': return 'bg-orange-500 text-white'
      case 'Medium': return 'bg-yellow-500 text-white'
      case 'Low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Modal handlers
  const handleGoalClick = (goal: GoalWithDetails) => {
    setSelectedGoal(goal)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedGoal(null)
  }

  const handleRefresh = () => {
    // Trigger a page refresh to reload data
    window.location.reload()
  }


  // Extract unique assignees, owners, and departments from goals visible to the user
  const { uniqueAssignees, uniqueOwners, uniqueDepartments } = useMemo(() => {
    // For non-admins, only show filters based on their visible goals
    const relevantGoals = userProfile.role === "Admin" ? goals : getUserRelevantGoals(goals, userProfile, undefined, undefined, undefined, userDepartmentPermissions, undefined)
    
    const assigneeMap = new Map()
    const ownerMap = new Map()
    const departments = new Set<string>()
    
    relevantGoals.forEach(goal => {
      // Collect assignees
      if (goal.current_assignee) {
        assigneeMap.set(goal.current_assignee.id, {
          id: goal.current_assignee.id,
          name: goal.current_assignee.full_name
        })
      }
      if (goal.assignees) {
        goal.assignees.forEach((assignee: any) => {
          const user = assignee.users || assignee
          if (user?.id) {
            assigneeMap.set(user.id, {
              id: user.id,
              name: user.full_name || user.email
            })
          }
        })
      }
      
      // Collect owners
      if (goal.owner) {
        ownerMap.set(goal.owner.id, {
          id: goal.owner.id,
          name: goal.owner.full_name
        })
      }
      
      // Collect departments
      if (goal.department) {
        departments.add(goal.department)
      }
    })
    
    return {
      uniqueAssignees: userProfile.role === "Admin" ? Array.from(assigneeMap.values()).sort((a, b) => a.name.localeCompare(b.name)) : [],
      uniqueOwners: userProfile.role === "Admin" ? Array.from(ownerMap.values()).sort((a, b) => a.name.localeCompare(b.name)) : [],
      uniqueDepartments: userProfile.role === "Admin" ? Array.from(departments).sort() : []
    }
  }, [goals, userProfile, userDepartmentPermissions])

  // For non-admin users, get their accessible departments
  const userAccessibleDepartments = useMemo(() => {
    if (userProfile.role === "Admin") return []
    
    const departments = new Set<string>()
    
    // Add user's own department if exists
    if (userProfile.department) {
      departments.add(userProfile.department)
    }
    
    // Add departments from permissions
    userDepartmentPermissions.forEach(dept => departments.add(dept))
    
    return Array.from(departments).sort()
  }, [userProfile, userDepartmentPermissions])

  // Filter goals to user-relevant ones for consistent counting
  const userRelevantGoals = getUserRelevantGoals(goals, userProfile, assigneeFilter, ownerFilter, departmentFilter, userDepartmentPermissions, viewMode)

  // Helper function to check if a goal belongs to the current user personally
  const isPersonalGoal = (goal: GoalWithDetails, userId: string): boolean => {
    return (
      goal.owner_id === userId ||
      goal.current_assignee_id === userId ||
      !!(goal.assignees && goal.assignees.some((assignee: any) => assignee.user_id === userId))
    )
  }

  // Helper function to check if user should see personal badges
  const shouldShowPersonalBadges = (userProfile: UserRecord, userDepartmentPermissions?: string[]): boolean => {
    // Always show personal badges for Admins (they see all goals)
    if (userProfile.role === "Admin") {
      return true
    }
    
    // Show personal badges if user has department permissions (sees multiple departments)
    const hasDeptPermissions = Boolean(userDepartmentPermissions && userDepartmentPermissions.length > 0)
    if (hasDeptPermissions) {
      return true
    }
    
    // Show personal badges for all users to provide personal workload visibility
    return true
  }

  // Smart sorting function for goals within each stage
  const sortGoalsByPriority = (goals: GoalWithDetails[], userId: string): GoalWithDetails[] => {
    return goals.sort((a, b) => {
      // 1. Personal goals first (my goals)
      const aIsPersonal = isPersonalGoal(a, userId)
      const bIsPersonal = isPersonalGoal(b, userId)
      if (aIsPersonal && !bIsPersonal) return -1
      if (!aIsPersonal && bIsPersonal) return 1
      
      // 2. On hold goals second
      const aIsOnHold = a.status === "On Hold"
      const bIsOnHold = b.status === "On Hold"
      if (aIsOnHold && !bIsOnHold) return -1
      if (!aIsOnHold && bIsOnHold) return 1
      
      // 3. Overdue goals third
      const aIsOverdue = isGoalOverdue(a)
      const bIsOverdue = isGoalOverdue(b)
      if (aIsOverdue && !bIsOverdue) return -1
      if (!aIsOverdue && bIsOverdue) return 1
      
      // 4. Priority level fourth (Critical > High > Medium > Low)
      const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4
      if (aPriority !== bPriority) return aPriority - bPriority
      
      // 5. Target date urgency fifth (closest target date first)
      const aTargetDate = a.adjusted_target_date || a.target_date
      const bTargetDate = b.adjusted_target_date || b.target_date
      if (aTargetDate && bTargetDate) {
        const aDate = new Date(aTargetDate).getTime()
        const bDate = new Date(bTargetDate).getTime()
        if (aDate !== bDate) return aDate - bDate
      }
      if (aTargetDate && !bTargetDate) return -1
      if (!aTargetDate && bTargetDate) return 1
      
      // 6. Creation date as fallback (newer first)
      const aCreated = new Date(a.created_at).getTime()
      const bCreated = new Date(b.created_at).getTime()
      return bCreated - aCreated
    })
  }

  // Define the PDCA stages in circular flow layout
  const stageDefinitions = [
    // PDCA cycle
    { id: "Plan", label: "Plan", description: "Define & strategize", icon: Target, row: 0, col: 0 },
    { id: "Do", label: "Do", description: "Execute & implement", icon: Clock, row: 0, col: 1 },
    { id: "Check", label: "Check", description: "Review & evaluate", icon: Eye, row: 1, col: 1 },
    { id: "Act", label: "Act", description: "Adjust & improve", icon: TrendingUp, row: 1, col: 0 },
    
    // Final states
    { id: "Completed", label: "Completed", description: "Goal achieved", icon: CheckCircle, row: 0, col: 2 },
    { id: "On Hold", label: "On Hold", description: "Temporarily paused", icon: Pause, row: 1, col: 2 }
  ]

  // Calculate stage data using user-relevant goals
  const stageData: StageData[] = stageDefinitions.map(stage => {
    const filteredGoals = userRelevantGoals.filter(goal => goal.status === stage.id)
    const stageGoals = sortGoalsByPriority(filteredGoals, userProfile.id)
    const count = stageGoals.length
    const overdueCount = stageGoals.filter(isGoalOverdue).length
    const hasOverdue = overdueCount > 0
    
    // Calculate personal goals (only for users who can see multiple goals)
    const personalGoals = stageGoals.filter(goal => isPersonalGoal(goal, userProfile.id))
    const personalCount = personalGoals.length
    
    // Simplified color system - only 3 states
    let color = {
      bg: "bg-gray-50",
      border: "border-gray-200", 
      text: "text-gray-700",
      badge: "bg-gray-100 text-gray-700"
    }

    if (hasOverdue && overdueCount > 0) {
      // Critical: Overdue goals need attention
      color = {
        bg: "bg-red-50",
        border: "border-red-300",
        text: "text-red-700", 
        badge: "bg-red-100 text-red-800"
      }
    } else if (count === 0) {
      // Good: No goals in this stage
      color = {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        badge: "bg-green-100 text-green-700"
      }
    } else {
      // Normal: Goals are present and progressing
      color = {
        bg: "bg-blue-50",
        border: "border-blue-200", 
        text: "text-blue-700",
        badge: "bg-blue-100 text-blue-700"
      }
    }

    return {
      id: stage.id,
      label: stage.label,
      description: stage.description,
      icon: stage.icon,
      count,
      goals: stageGoals,
      overdueCount,
      hasOverdue,
      personalCount,
      personalGoals,
      color,
      position: { row: stage.row, col: stage.col }
    }
  })

  // Calculate overall progress using user-relevant goals
  const activeGoals = userRelevantGoals.filter(goal => !["Completed", "Cancelled"].includes(goal.status))
  const completedGoals = userRelevantGoals.filter(goal => goal.status === "Completed").length
  const totalGoals = userRelevantGoals.length
  const progressPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0
  
  // Calculate overdue goals
  const overdueGoals = userRelevantGoals.filter(goal => isGoalOverdue(goal)).length
  

  // Get bottleneck stage (highest count excluding completed)
  const bottleneckStage = stageData
    .filter(stage => !["Completed", "On Hold", "Cancelled"].includes(stage.id))
    .reduce((max, stage) => stage.count > max.count ? stage : max, { count: 0, label: "None" })

  const StageCard = ({ stage }: { stage: StageData }) => {
    const Icon = stage.icon
    const isSelected = selectedStage === stage.id

    return (
      <Card 
        className={`
          cursor-pointer transition-all duration-150
          ${stage.color.bg} ${stage.color.border} border
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          hover:shadow-md
        `}
        onClick={() => setSelectedStage(isSelected ? null : stage.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${stage.color.text}`} />
              <span className={`font-medium text-sm ${stage.color.text}`}>
                {stage.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${stage.color.badge} border-0`}>
                {stage.count}
              </Badge>
              {stage.overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stage.overdueCount}
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-xs text-gray-600 mb-2">{stage.description}</p>
          
          {shouldShowPersonalBadges(userProfile, userDepartmentPermissions) && stage.personalCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              My Goals: {stage.personalCount}
            </Badge>
          )}
        </CardContent>
      </Card>
    )
  }


  return (
    <div className={`space-y-2 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              PDCA Progress Board
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </CardTitle>
            
            {/* Filters */}
            {userProfile.role === "Admin" ? (
              // Admin filters
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {uniqueAssignees.map(assignee => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    {uniqueOwners.map(owner => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="no-department">No Department</SelectItem>
                    {uniqueDepartments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              // Non-admin filter (show if user has department access OR there are departments in the system)
              (userAccessibleDepartments.length > 0 || uniqueDepartments.length > 0) && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accessible</SelectItem>
                      <SelectItem value="my-goals">My Goals Only</SelectItem>
                      <SelectItem value="no-department">No Department</SelectItem>
                      {userAccessibleDepartments.map((dept: string) => (
                        <SelectItem key={dept} value={dept}>
                          {dept} Department
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>No Goals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>Active Goals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>Has Overdue</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="text-center p-2 bg-blue-50 rounded-lg" title="Active goals (excluding completed goals)">
              <div className="text-2xl font-bold text-blue-600">{activeGoals.length}</div>
              <div className="text-sm text-gray-600">Active Goals</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg" title="Goals that have been completed">
              <div className="text-2xl font-bold text-green-600">{completedGoals}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg" title="Goals past their target date that are still active">
              <div className="text-2xl font-bold text-red-600">{overdueGoals}</div>
              <div className="text-sm text-gray-600">Overdue Goals</div>
            </div>
          </div>


          {/* PDCA Cycle Board */}
          <div className="space-y-4">
            {/* Clean PDCA Flow */}
            <div className="text-center text-sm text-gray-600 mb-4">
              <span className="bg-gray-100 px-3 py-1 rounded-full">Plan → Do → Check → Act → Completed</span>
            </div>
            
            {/* Main PDCA Stages */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stageData.filter(s => ["Plan", "Do", "Check", "Act"].includes(s.id)).map(stage => (
                <StageCard key={stage.id} stage={stage} />
              ))}
            </div>
            
            {/* Final States */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {stageData.filter(s => ["Completed", "On Hold"].includes(s.id)).map(stage => (
                <StageCard key={stage.id} stage={stage} />
              ))}
            </div>
          </div>


          {/* Bottleneck Alert */}
          {bottleneckStage.count > 3 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Bottleneck Detected</span>
              </div>
              <div className="text-sm text-red-600 mt-1">
                {bottleneckStage.label} stage has {bottleneckStage.count} goals - consider reviewing capacity
              </div>
            </div>
          )}

          {/* Selected Stage Details */}
          {selectedStage && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {stageData.find(s => s.id === selectedStage)?.label} Details
                  <Badge className="text-xs">
                    {stageData.find(s => s.id === selectedStage)?.goals.length || 0} goals
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stageData.find(s => s.id === selectedStage)?.goals.map(goal => {
                    const targetDateInfo = formatDate(goal.adjusted_target_date || goal.target_date)
                    const isMyGoal = isPersonalGoal(goal, userProfile.id)
                    const isOverdue = isGoalOverdue(goal)
                    const isOnHold = goal.status === "On Hold"
                    
                    return (
                      <Card 
                        key={goal.id} 
                        className={`bg-white border-l-4 hover:shadow-md transition-all duration-200 cursor-pointer group ${
                          isMyGoal && !isOverdue
                            ? 'border-l-green-500 bg-green-50 ring-1 ring-green-200' 
                            : isOverdue 
                              ? 'border-l-red-500 bg-red-50' 
                              : isOnHold
                                ? 'border-l-yellow-500 bg-yellow-50'
                                : 'border-l-blue-500'
                        }`}
                        onClick={() => handleGoalClick(goal)}
                      >
                        <CardContent className="p-6">
                          {/* Header with subject and status */}
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-2">
                                <h4 className={`font-semibold text-base leading-tight transition-colors ${
                                  isMyGoal ? 'text-green-800 group-hover:text-green-600' : 'text-gray-900 group-hover:text-blue-600'
                                }`}>
                                  {goal.subject}
                                </h4>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(`/dashboard/goals/${goal.id}`, '_blank')
                                  }}
                                >
                                  View Full Details
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Status and Priority Badges */}
                            <div className="flex flex-wrap gap-2">
                              <FocusIndicator isFocused={goal.isFocused || false} showBadge />
                              {isMyGoal && (
                                <Badge className="text-xs bg-green-100 text-green-800 border-green-200 font-medium">
                                  👤 MY GOAL
                                </Badge>
                              )}
                              {isOnHold && (
                                <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200 font-medium">
                                  ⏸️ ON HOLD
                                </Badge>
                              )}
                              {isOverdue && (
                                <Badge className="text-xs bg-red-100 text-red-800 border-red-200 font-medium">
                                  ⚠️ OVERDUE
                                </Badge>
                              )}
                              <Badge className={`text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                                {goal.priority}
                              </Badge>
                              {goal.support && goal.support.length > 0 && (
                                <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200 font-medium">
                                  🤝 {goal.support.length} Support
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Goal Content */}
                          <div className="space-y-6">
                            {/* Description */}
                            {goal.description && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Description</h5>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {goal.description}
                                </p>
                              </div>
                            )}
                            
                            {/* Target Metrics */}
                            {goal.target_metrics && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Target Metrics</h5>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {goal.target_metrics}
                                </p>
                              </div>
                            )}
                            
                            {/* Success Criteria */}
                            {goal.success_criteria && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Success Criteria</h5>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {goal.success_criteria}
                                </p>
                              </div>
                            )}
                            
                            {/* Metadata in Two-Column Layout */}
                            <div className="border-t pt-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                                    <Building className="h-4 w-4" />
                                    <span className="font-medium">Department</span>
                                  </div>
                                  <div className="text-gray-900">{goal.department || 'No Department'}</div>
                                  {goal.teams && goal.teams.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Teams: {goal.teams.join(', ')}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">PIC</span>
                                  </div>
                                  <div className="text-gray-900">{goal.owner?.full_name || 'Unknown'}</div>
                                </div>
                              </div>
                              
                              {/* Support Status */}
                              {goal.support && goal.support.length > 0 && (
                                <div className="mt-4 pt-3 border-t">
                                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                                    <HandHeart className="h-4 w-4" />
                                    <span className="font-medium">Support Status</span>
                                  </div>
                                  <div className="space-y-1">
                                    {goal.support.slice(0, 3).map((support: any) => (
                                      <div key={support.id} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-700">{support.support_name}</span>
                                        <Badge 
                                          variant={
                                            support.status === 'Completed' ? 'default' :
                                            support.status === 'Approved' ? 'secondary' :
                                            support.status === 'Declined' ? 'destructive' : 'outline'
                                          }
                                          className="text-xs"
                                        >
                                          {support.status || 'Requested'}
                                        </Badge>
                                      </div>
                                    ))}
                                    {goal.support.length > 3 && (
                                      <div className="text-xs text-gray-500">
                                        +{goal.support.length - 3} more...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Assignee Information with Avatars */}
                          {goal.assignees && goal.assignees.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1 text-xs">
                                <Users className="h-3 w-3 text-gray-500" />
                                <span className="font-medium text-gray-600">
                                  Team ({goal.assignees.length})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {goal.assignees.slice(0, 4).map((assignee: any) => {
                                  const assigneeName = assignee.users?.full_name || assignee.full_name || 'Unknown'
                                  const initials = assigneeName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                                  const isCompleted = assignee.task_status === 'completed'
                                  
                                  return (
                                    <div key={assignee.user_id} className="flex items-center gap-1">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                        isCompleted 
                                          ? 'bg-green-100 text-green-700 border border-green-300' 
                                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                                      }`}>
                                        {isCompleted ? '✓' : initials}
                                      </div>
                                      <span className="text-xs text-gray-600 hidden sm:inline">
                                        {assigneeName.split(' ')[0]}
                                      </span>
                                    </div>
                                  )
                                })}
                                {goal.assignees.length > 4 && (
                                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-medium">
                                    +{goal.assignees.length - 4}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Target Date and Timeline */}
                          {goal.target_date && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {formatDate(goal.target_date)?.text || new Date(goal.target_date).toLocaleDateString()}</span>
                              {formatDate(goal.target_date)?.isOverdue && (
                                <Badge className="text-xs bg-red-100 text-red-800 border-red-200">
                                  OVERDUE
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                  
                  {stageData.find(s => s.id === selectedStage)?.goals.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No goals in this stage</p>
                      <p className="text-xs mt-1">This stage is currently empty</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <GoalDetailModal
        goal={selectedGoal}
        userProfile={userProfile}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onRefresh={handleRefresh}
        users={users}
      />
    </div>
  )
}