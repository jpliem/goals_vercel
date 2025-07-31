"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { updateGoalDetails, addGoalSupport, removeGoalSupport, removeGoalTeamSupport, getGoalSupportData, getDepartmentTeamMappingsData } from "@/actions/goals"
import { Goal } from "@/lib/goal-database"
import { X, Plus } from "lucide-react"

interface EditGoalModalProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal
  onUpdate: () => void
}

interface SupportRequirement {
  id?: string
  department: string
  teams: string[]
  support_type?: string
  support_name?: string
  support_department?: string
}

export function EditGoalModal({ isOpen, onClose, goal, onUpdate }: EditGoalModalProps) {
  // Helper function to format date for HTML date input
  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return ""
    try {
      // Handle both ISO strings and date strings
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ""
      return date.toISOString().split('T')[0]
    } catch {
      return ""
    }
  }

  const [formData, setFormData] = useState({
    subject: goal.subject,
    description: goal.description,
    priority: goal.priority,
    target_date: formatDateForInput(goal.target_date),
    target_metrics: goal.target_metrics || "",
    success_criteria: goal.success_criteria || "",
  })
  const [supportRequirements, setSupportRequirements] = useState<SupportRequirement[]>([])
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([])
  const [departmentTeamMappings, setDepartmentTeamMappings] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSupport, setIsLoadingSupport] = useState(false)

  // Load support data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSupportData()
      loadDepartmentData()
    }
  }, [isOpen])

  const loadSupportData = async () => {
    setIsLoadingSupport(true)
    try {
      const result = await getGoalSupportData(goal.id)
      
      if (result.success && result.data) {
        // Group support by department
        const supportByDept: Record<string, SupportRequirement> = {}
        
        result.data.forEach((support: any) => {
          if (support.support_type === 'Department') {
            supportByDept[support.support_name] = {
              id: support.id,
              department: support.support_name,
              teams: [],
              support_type: support.support_type,
              support_name: support.support_name
            }
          }
        })
        
        // Add teams to their departments
        result.data.forEach((support: any) => {
          if (support.support_type === 'Team' && support.support_department) {
            if (supportByDept[support.support_department]) {
              supportByDept[support.support_department].teams.push(support.support_name)
            }
          }
        })
        
        setSupportRequirements(Object.values(supportByDept))
      } else {
        setSupportRequirements([])
      }
    } catch (error) {
      console.error('Error loading support data:', error)
      setSupportRequirements([])
    } finally {
      setIsLoadingSupport(false)
    }
  }

  const loadDepartmentData = async () => {
    try {
      const result = await getDepartmentTeamMappingsData()
      
      if (result.success && result.data) {
        setDepartmentTeamMappings(result.data)
        setAvailableDepartments(Object.keys(result.data))
      } else {
        setDepartmentTeamMappings({})
        setAvailableDepartments([])
      }
    } catch (error) {
      console.error('Error loading department data:', error)
      setDepartmentTeamMappings({})
      setAvailableDepartments([])
    }
  }

  const handleSupportDepartmentAdd = async (department: string) => {
    if (!department || 
        department === goal.department || // Can't add own department as support
        supportRequirements.some(req => req.department === department) ||
        isLoadingSupport) return // Prevent multiple clicks
    
    setIsLoadingSupport(true)
    try {
      const result = await addGoalSupport(goal.id, [{ department, teams: [] }])
      if (result.success) {
        await loadSupportData() // Reload to get fresh IDs
      } else {
        console.error('Failed to add support department:', result.error)
      }
    } catch (error) {
      console.error('Error adding support department:', error)
    } finally {
      setIsLoadingSupport(false)
    }
  }

  const handleSupportDepartmentRemove = async (department: string) => {
    // Prevent multiple clicks while processing
    if (isLoadingSupport) return
    
    const requirement = supportRequirements.find(req => req.department === department)
    if (!requirement?.id) {
      console.error(`Cannot remove ${department}: No ID found for requirement`)
      return
    }
    
    // Set loading state to prevent multiple clicks
    setIsLoadingSupport(true) 
    
    try {
      const result = await removeGoalSupport(goal.id, requirement.id)
      if (result.success) {
        // Remove from local state immediately for better UX
        setSupportRequirements(prev => prev.filter(req => req.department !== department))
        // Then reload to ensure consistency
        await loadSupportData()
      } else {
        console.error('Failed to remove support department:', result.error)
        // Could add toast notification here
      }
    } catch (error) {
      console.error('Error removing support department:', error)
    } finally {
      setIsLoadingSupport(false)
    }
  }

  const handleSupportTeamToggle = async (department: string, team: string) => {
    // Prevent multiple clicks while processing
    if (isLoadingSupport) return
    
    const requirement = supportRequirements.find(req => req.department === department)
    if (!requirement) return
    
    const hasTeam = requirement.teams.includes(team)
    setIsLoadingSupport(true)
    
    try {
      if (hasTeam) {
        // Remove team
        const result = await removeGoalTeamSupport(goal.id, department, team)
        if (result.success) {
          // Update local state immediately for better UX
          setSupportRequirements(prev => 
            prev.map(req => 
              req.department === department 
                ? { ...req, teams: req.teams.filter(t => t !== team) }
                : req
            )
          )
          // Then reload to ensure consistency
          await loadSupportData()
        } else {
          console.error('Error removing support team:', result.error)
        }
      } else {
        // Add team
        const result = await addGoalSupport(goal.id, [{ department, teams: [team] }])
        if (result.success) {
          // Update local state immediately for better UX
          setSupportRequirements(prev => 
            prev.map(req => 
              req.department === department 
                ? { ...req, teams: [...req.teams, team] }
                : req
            )
          )
          // Then reload to ensure consistency
          await loadSupportData()
        } else {
          console.error('Error adding support team:', result.error)
        }
      }
    } catch (error) {
      console.error('Error toggling support team:', error)
    } finally {
      setIsLoadingSupport(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Only include fields that have actually changed
      const updates: any = {}
      
      if (formData.subject !== goal.subject) {
        updates.subject = formData.subject
      }
      if (formData.description !== goal.description) {
        updates.description = formData.description
      }
      if (formData.priority !== goal.priority) {
        updates.priority = formData.priority
      }
      
      // Special handling for target_date - normalize for comparison
      const normalizedFormDate = formData.target_date || null
      const normalizedGoalDate = goal.target_date ? formatDateForInput(goal.target_date) : null
      if (normalizedFormDate !== normalizedGoalDate) {
        updates.target_date = formData.target_date || undefined
      }
      
      if (formData.target_metrics !== (goal.target_metrics || "")) {
        updates.target_metrics = formData.target_metrics
      }
      if (formData.success_criteria !== (goal.success_criteria || "")) {
        updates.success_criteria = formData.success_criteria
      }

      // Only call the API if there are actual changes
      if (Object.keys(updates).length === 0) {
        console.log("No changes detected, skipping update")
        onClose()
        return
      }

      const result = await updateGoalDetails(goal.id, updates)
      if (result.error) {
        console.error("Error updating goal:", result.error)
        // Could add toast notification here
      } else {
        onUpdate()
        onClose()
      }
    } catch (error) {
      console.error("Error updating goal:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you want to achieve..."
              rows={4}
              required
              className="mt-2"
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-400">{formData.description.length}/2000</span>
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="target_date">Target Date</Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="target_metrics">Target Metrics</Label>
            <Textarea
              id="target_metrics"
              value={formData.target_metrics}
              onChange={(e) => setFormData({ ...formData, target_metrics: e.target.value })}
              rows={2}
              placeholder="Measurable success criteria..."
            />
          </div>

          <div>
            <Label htmlFor="success_criteria">Success Criteria</Label>
            <Textarea
              id="success_criteria"
              value={formData.success_criteria}
              onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
              rows={2}
              placeholder="What defines success for this goal..."
            />
          </div>

          <Separator />
          
          {/* Support Requirements - Matching Create Form Design */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              🤝 Support Requirements
              {isLoadingSupport && <span className="text-xs text-gray-500">Loading...</span>}
            </h4>
            <p className="text-xs text-gray-500">
              Add departments and their specific teams that you need support from
            </p>
        
            {/* Add Department Support */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Add Department Support</Label>
                <div className="mt-2">
                  <Select onValueChange={handleSupportDepartmentAdd} value="">
                    <SelectTrigger>
                      <SelectValue placeholder="Add department for support" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments
                        .filter(dept => 
                          dept !== goal.department && // Can't add your own department as support
                          !supportRequirements.some(req => req.department === dept)
                        )
                        .map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Display Selected Support Departments and Teams */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {supportRequirements.map((requirement) => (
                <div key={requirement.department} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">{requirement.department}</h5>
                    <button
                      type="button"
                      onClick={() => handleSupportDepartmentRemove(requirement.department)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isLoadingSupport}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Team Selection for this Department */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Select teams from {requirement.department}:</Label>
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {(departmentTeamMappings[requirement.department] || []).map((team) => (
                        <div key={team} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`support-${requirement.department}-${team}`}
                            checked={requirement.teams.includes(team)}
                            onChange={() => handleSupportTeamToggle(requirement.department, team)}
                            className="rounded border-gray-300"
                            disabled={isLoadingSupport}
                          />
                          <Label htmlFor={`support-${requirement.department}-${team}`} className="text-xs cursor-pointer">
                            {team}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {requirement.teams.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {requirement.teams.map((team) => (
                          <Badge key={team} variant="outline" className="text-xs">
                            {team}
                            <button
                              type="button"
                              onClick={() => handleSupportTeamToggle(requirement.department, team)}
                              className="ml-1 hover:text-red-500"
                              disabled={isLoadingSupport}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {supportRequirements.length === 0 && !isLoadingSupport && (
              <p className="text-sm text-gray-500 italic">No supporting departments required yet.</p>
            )}
          </div>
          
          <Separator />

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}