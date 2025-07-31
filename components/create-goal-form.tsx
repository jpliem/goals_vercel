"use client"

import type React from "react"

import { useState } from "react"
import { createGoal } from "@/actions/goals"
import type { UserRecord } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { X, User, Users, Building, Globe, Plus, Trash2, Calendar, Clock } from "lucide-react"

interface CreateGoalFormProps {
  users: UserRecord[]
  userProfile: UserRecord
  departmentTeamMappings: Record<string, string[]>
  onSuccess?: () => void
}

// Common department and team options - can be extended
const DEPARTMENTS = [
  "IT", "HR", "Finance", "Operations", "Marketing", "Sales", "Customer Service",
  "Product Development", "Quality Assurance", "Legal", "Administration"
]

const TEAMS = [
  "Development", "Design", "Support", "Management", "Research", "Training",
  "Planning", "Analysis", "Implementation", "Testing"
]

// Goal type configuration with icons and descriptions
const GOAL_TYPES = [
  {
    value: "Personal",
    label: "Personal",
    icon: User,
    description: "Individual goals and tasks",
    color: "text-blue-600"
  },
  {
    value: "Team",
    label: "Team",
    icon: Users,
    description: "Collaborative team objectives",
    color: "text-green-600"
  },
  {
    value: "Department",
    label: "Department",
    icon: Building,
    description: "Department-wide initiatives",
    color: "text-purple-600"
  },
  {
    value: "Company",
    label: "Company",
    icon: Globe,
    description: "Organization-wide strategic goals",
    color: "text-orange-600"
  }
]

export function CreateGoalForm({ users, userProfile, departmentTeamMappings, onSuccess }: CreateGoalFormProps) {
  // Set smart defaults
  const getDefaultStartDate = () => {
    const date = new Date()
    return date.toISOString().split('T')[0] // Today
  }

  const getDefaultTargetDate = () => {
    const date = new Date()
    date.setMonth(date.getMonth() + 3) // 3 months from now
    return date.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    goal_type: "Team",
    subject: "",
    description: "",
    priority: "Medium",
    department: userProfile.department || "",
    teams: [] as string[], // Changed from single team to array
    start_date: getDefaultStartDate(),
    target_date: getDefaultTargetDate(),
    target_metrics: "",
    success_criteria: "",
    support_requirements: [] as { department: string; teams: string[] }[], // New structure for support
    tasks: [] as {
      title: string;
      description: string;
      priority: 'Low' | 'Medium' | 'High' | 'Critical';
      assigned_to: string;
      department: string;
      start_date: string;
      due_date: string;
      estimated_hours: number;
      pdca_phase: 'Plan' | 'Do' | 'Check' | 'Act';
    }[]
  })
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Task management functions
  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, {
        title: "",
        description: "",
        priority: 'Medium' as const,
        assigned_to: "unassigned",
        department: prev.department,
        start_date: "",
        due_date: "",
        estimated_hours: 0,
        pdca_phase: 'Plan' as const
      }]
    }))
  }

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }))
  }

  const updateTask = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate required fields with helpful messages
    if (!formData.subject.trim()) {
      setError("Goal title is required - give your goal a clear, descriptive name")
      setIsLoading(false)
      return
    }

    if (!formData.description.trim()) {
      setError("Goal description is required - explain what you want to achieve")
      setIsLoading(false)
      return
    }

    if (!formData.department) {
      setError("Please select your department")
      setIsLoading(false)
      return
    }

    // Basic validation for optional fields
    if (formData.subject.trim().length < 5) {
      setError("Goal title should be at least 5 characters long")
      setIsLoading(false)
      return
    }

    if (formData.description.trim().length < 10) {
      setError("Goal description should be at least 10 characters long")
      setIsLoading(false)
      return
    }

    // Date validation: start_date <= target_date
    if (formData.start_date && formData.target_date) {
      const start = new Date(formData.start_date)
      const target = new Date(formData.target_date)
      if (start > target) {
        setError("Start date cannot be later than target date")
        setIsLoading(false)
        return
      }
    }

    try {
      const formDataObj = new FormData()
      formDataObj.append("goal_type", formData.goal_type)
      formDataObj.append("subject", formData.subject)
      formDataObj.append("description", formData.description)
      formDataObj.append("priority", formData.priority)
      formDataObj.append("department", formData.department)
      if (formData.teams.length > 0) {
        formDataObj.append("teams", JSON.stringify(formData.teams))
      }
      if (formData.start_date) {
        formDataObj.append("start_date", formData.start_date)
      }
      if (formData.target_date) {
        formDataObj.append("target_date", formData.target_date)
      }
      if (formData.target_metrics) {
        formDataObj.append("target_metrics", formData.target_metrics)
      }
      if (formData.success_criteria) {
        formDataObj.append("success_criteria", formData.success_criteria)
      }
      
      // Add support requirements with new structure
      if (formData.support_requirements.length > 0) {
        formDataObj.append("support_requirements", JSON.stringify(formData.support_requirements))
      }

      // Add tasks if any
      if (formData.tasks.length > 0) {
        formDataObj.append("tasks", JSON.stringify(formData.tasks))
      }

      const result = await createGoal(formDataObj)
      
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      // Form submission successful - open goal in new tab
      if (result?.data?.id) {
        window.open(`/dashboard/goals/${result.data.id}`, '_blank')
      }
      onSuccess?.();
    } catch (err) {
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTeamToggle = (team: string) => {
    setFormData(prev => ({
      ...prev,
      teams: prev.teams.includes(team) 
        ? prev.teams.filter(t => t !== team)
        : [...prev.teams, team]
    }))
  }

  const handleSupportDepartmentAdd = (department: string) => {
    if (!department || 
        department === formData.department || // Can't add own department as support
        formData.support_requirements.some(req => req.department === department)) return
    
    setFormData(prev => ({
      ...prev,
      support_requirements: [
        ...prev.support_requirements,
        { department, teams: [] }
      ]
    }))
  }

  const handleSupportDepartmentRemove = (department: string) => {
    setFormData(prev => ({
      ...prev,
      support_requirements: prev.support_requirements.filter(req => req.department !== department)
    }))
  }

  const handleSupportTeamToggle = (department: string, team: string) => {
    setFormData(prev => ({
      ...prev,
      support_requirements: prev.support_requirements.map(req => {
        if (req.department === department) {
          return {
            ...req,
            teams: req.teams.includes(team)
              ? req.teams.filter(t => t !== team)
              : [...req.teams, team]
          }
        }
        return req
      })
    }))
  }

  // Get available departments from the hierarchical mapping
  const availableDepartments = Object.keys(departmentTeamMappings).sort()

  // Get teams for the selected department
  const availableTeamsForDepartment = formData.department ? departmentTeamMappings[formData.department] || [] : []

  return (
    <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">
                Create New Goal 🎯
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Fill in the required fields to get started
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Goal Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Goal Type</Label>
              <RadioGroup
                value={formData.goal_type}
                onValueChange={(value) => handleInputChange("goal_type", value)}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {GOAL_TYPES.map((goalType) => {
                  const Icon = goalType.icon
                  return (
                    <div key={goalType.value} className="relative">
                      <RadioGroupItem 
                        value={goalType.value} 
                        id={goalType.value}
                        className="peer sr-only" 
                      />
                      <Label 
                        htmlFor={goalType.value}
                        className="flex items-start p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-all peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
                      >
                        <Icon className={`h-5 w-5 mr-3 mt-0.5 ${formData.goal_type === goalType.value ? 'text-blue-600' : goalType.color}`} />
                        <div className="flex-1">
                          <div className={`font-medium text-sm ${formData.goal_type === goalType.value ? 'text-blue-900' : ''}`}>{goalType.label}</div>
                          <div className={`text-xs mt-1 ${formData.goal_type === goalType.value ? 'text-blue-700' : 'text-gray-600'}`}>{goalType.description}</div>
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm font-medium flex items-center gap-2">
                    🎯 Goal Subject *
                  </Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="e.g., Improve customer response time by 50%..."
                    className={`${formData.subject.length > 0 && formData.subject.length < 5 ? 'border-orange-300 focus:border-orange-500' : formData.subject.length >= 5 ? 'border-green-300 focus:border-green-500' : ''}`}
                    required
                  />
                  <div className="flex items-center justify-between">
                    {formData.subject.length > 0 && formData.subject.length < 5 ? (
                      <p className="text-xs text-orange-600">
                        {5 - formData.subject.length} more characters needed
                      </p>
                    ) : formData.subject.length >= 5 ? (
                      <p className="text-xs text-green-600">✓ Good title length</p>
                    ) : (
                      <p className="text-xs text-gray-500">Give your goal a clear, descriptive name</p>
                    )}
                    <span className="text-xs text-gray-400">{formData.subject.length}/100</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                    📝 Goal Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe what you want to achieve and why it matters..."
                    className={`${formData.description.length > 0 && formData.description.length < 10 ? 'border-orange-300 focus:border-orange-500' : formData.description.length >= 10 ? 'border-green-300 focus:border-green-500' : ''}`}
                    rows={4}
                    required
                  />
                  <div className="flex items-center justify-between">
                    {formData.description.length > 0 && formData.description.length < 10 ? (
                      <p className="text-xs text-orange-600">
                        {10 - formData.description.length} more characters needed
                      </p>
                    ) : formData.description.length >= 10 ? (
                      <p className="text-xs text-green-600">✓ Good description length</p>
                    ) : (
                      <p className="text-xs text-gray-500">Explain what you want to achieve</p>
                    )}
                    <span className="text-xs text-gray-400">{formData.description.length}/2000</span>
                  </div>
                </div>
              </div>

              {/* Priority, Start Date, and Target Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium flex items-center gap-2">
                    ⚡ Priority
                  </Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
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

                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-sm font-medium flex items-center gap-2">
                    🚀 Start Date
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange("start_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_date" className="text-sm font-medium flex items-center gap-2">
                    📅 Target Date
                  </Label>
                  <Input
                    id="target_date"
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => handleInputChange("target_date", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Department and Team */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Department & Team Assignment</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department" className="text-sm font-medium">
                    Department *
                  </Label>
                  <Select value={formData.department} onValueChange={(value) => {
                    handleInputChange("department", value)
                    // Clear teams when department changes
                    setFormData(prev => ({ ...prev, teams: [] }))
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Teams (Optional)
                  </Label>
                  {formData.department && availableTeamsForDepartment.length > 0 ? (
                    <div className="mt-1 space-y-2">
                      <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                        {availableTeamsForDepartment.map((team) => (
                          <div key={team} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`team-${team}`}
                              checked={formData.teams.includes(team)}
                              onChange={() => handleTeamToggle(team)}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={`team-${team}`} className="text-sm cursor-pointer">
                              {team}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {formData.teams.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {formData.teams.map((team) => (
                            <Badge key={team} variant="secondary" className="text-xs">
                              {team}
                              <button
                                type="button"
                                onClick={() => handleTeamToggle(team)}
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 p-3 text-sm text-gray-500 border rounded-md bg-gray-50">
                      {formData.department ? "No teams available for this department" : "Select a department first"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Support Requirements */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                🤝 Support Requirements
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
                            dept !== formData.department && // Can't add your own department as support
                            !formData.support_requirements.some(req => req.department === dept)
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
                {formData.support_requirements.map((requirement) => (
                  <div key={requirement.department} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium">{requirement.department}</h5>
                      <button
                        type="button"
                        onClick={() => handleSupportDepartmentRemove(requirement.department)}
                        className="text-red-500 hover:text-red-700"
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
            </div>

            <Separator />

            {/* Target Metrics and Success Criteria (Optional) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_metrics" className="text-sm font-medium flex items-center gap-2">
                  📊 Target Metrics <span className="text-xs text-gray-500">(Optional)</span>
                </Label>
                <Textarea
                  id="target_metrics"
                  value={formData.target_metrics}
                  onChange={(e) => handleInputChange("target_metrics", e.target.value)}
                  placeholder="Define measurable targets (e.g., 'Increase sales by 20%')"
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="success_criteria" className="text-sm font-medium flex items-center gap-2">
                  ✨ Success Criteria <span className="text-xs text-gray-500">(Optional)</span>
                </Label>
                <Textarea
                  id="success_criteria"
                  value={formData.success_criteria}
                  onChange={(e) => handleInputChange("success_criteria", e.target.value)}
                  placeholder="Define what success looks like"
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Task Creation Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Tasks</Label>
                  <p className="text-xs text-gray-500 mt-1">Break down your goal into specific tasks and assign them to team members</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addTask}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </Button>
              </div>

              {formData.tasks.length > 0 && (
                <div className="space-y-3">
                  {formData.tasks.map((task, index) => (
                    <Card key={index} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <Input
                              placeholder="Task title"
                              value={task.title}
                              onChange={(e) => updateTask(index, 'title', e.target.value)}
                              className="font-medium"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTask(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className="text-xs text-gray-600">Priority</Label>
                            <Select 
                              value={task.priority} 
                              onValueChange={(value) => updateTask(index, 'priority', value)}
                            >
                              <SelectTrigger className="h-8">
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
                            <Label className="text-xs text-gray-600">PDCA Phase</Label>
                            <Select 
                              value={task.pdca_phase} 
                              onValueChange={(value) => updateTask(index, 'pdca_phase', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Plan">Plan</SelectItem>
                                <SelectItem value="Do">Do</SelectItem>
                                <SelectItem value="Check">Check</SelectItem>
                                <SelectItem value="Act">Act</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-600">Assign to</Label>
                            <Select 
                              value={task.assigned_to} 
                              onValueChange={(value) => updateTask(index, 'assigned_to', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {users
                                  .filter(user => {
                                    // Include users from task department (primary department)
                                    if (!task.department || user.department === task.department) {
                                      return true
                                    }
                                    // Include users from support departments
                                    const supportDepartments = formData.support_requirements.map(req => req.department)
                                    return supportDepartments.includes(user.department || '')
                                  })
                                  .sort((a, b) => {
                                    // Sort by department first, then by name
                                    const deptA = a.department || 'No Dept'
                                    const deptB = b.department || 'No Dept'
                                    if (deptA !== deptB) {
                                      // Primary department first, then alphabetical
                                      if (deptA === task.department) return -1
                                      if (deptB === task.department) return 1
                                      return deptA.localeCompare(deptB)
                                    }
                                    return a.full_name.localeCompare(b.full_name)
                                  })
                                  .map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.full_name} ({user.department || 'No Dept'})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Start Date
                            </Label>
                            <Input
                              type="date"
                              value={task.start_date}
                              onChange={(e) => updateTask(index, 'start_date', e.target.value)}
                              className="h-8"
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-gray-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due Date
                            </Label>
                            <Input
                              type="date"
                              value={task.due_date}
                              onChange={(e) => updateTask(index, 'due_date', e.target.value)}
                              className="h-8"
                            />
                          </div>

                        </div>

                        <div>
                          <Label className="text-xs text-gray-600">Description</Label>
                          <Textarea
                            placeholder="Task description (optional)"
                            value={task.description}
                            onChange={(e) => updateTask(index, 'description', e.target.value)}
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {formData.tasks.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                  <div className="text-sm">No tasks added yet</div>
                  <div className="text-xs mt-1">Add tasks to break down your goal into actionable items</div>
                </div>
              )}
            </div>

            <Separator />

            {/* Submit */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => window.history.back()}
                disabled={isLoading}
                className="order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.subject.trim() || !formData.description.trim()}
                className="order-1 sm:order-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-8 py-2 relative overflow-hidden"
              >
                <span className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                  🚀 Create Goal
                </span>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-white">Creating...</span>
                  </div>
                )}
              </Button>
            </div>
            
            {!formData.subject.trim() || !formData.description.trim() ? (
              <p className="text-xs text-gray-500 text-center mt-2">
                Fill in the required fields to create your goal
              </p>
            ) : (
              <p className="text-xs text-green-600 text-center mt-2">
                ✓ Ready to create your goal!
              </p>
            )}
          </form>
        </CardContent>
      </Card>
  )
}