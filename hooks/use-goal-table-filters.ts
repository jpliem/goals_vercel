import { useState, useMemo } from "react"
import type { GoalWithDetails } from "@/lib/goal-database"

export function useGoalTableFilters(goals: GoalWithDetails[]) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [goalTypeFilter, setGoalTypeFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [hideCompleted, setHideCompleted] = useState(false)

  const filteredData = useMemo(() => {
    return goals.filter(goal => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          goal.subject.toLowerCase().includes(searchLower) ||
          goal.description.toLowerCase().includes(searchLower) ||
          goal.department?.toLowerCase().includes(searchLower) ||
          goal.teams?.some(team => team.toLowerCase().includes(searchLower)) ||
          goal.owner?.full_name?.toLowerCase().includes(searchLower) ||
          goal.target_metrics?.toLowerCase().includes(searchLower) ||
          goal.success_criteria?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== "all" && goal.status !== statusFilter) {
        return false
      }

      // Goal type filter
      if (goalTypeFilter !== "all" && goal.goal_type !== goalTypeFilter) {
        return false
      }

      // Department filter
      if (departmentFilter !== "all" && goal.department !== departmentFilter) {
        return false
      }

      // Assignee filter
      if (assigneeFilter !== "all") {
        const hasAssignee = goal.current_assignee_id === assigneeFilter ||
          (goal.assignees && goal.assignees.some(a => a.user_id === assigneeFilter))
        if (!hasAssignee) return false
      }

      // Owner filter
      if (ownerFilter !== "all" && goal.owner_id !== ownerFilter) {
        return false
      }

      // Hide completed filter
      if (hideCompleted && goal.status === "Completed") {
        return false
      }

      return true
    })
  }, [goals, searchTerm, statusFilter, goalTypeFilter, assigneeFilter, ownerFilter, departmentFilter, hideCompleted])

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    goalTypeFilter,
    setGoalTypeFilter,
    assigneeFilter,
    setAssigneeFilter,
    ownerFilter,
    setOwnerFilter,
    departmentFilter,
    setDepartmentFilter,
    hideCompleted,
    setHideCompleted,
    filteredData
  }
}