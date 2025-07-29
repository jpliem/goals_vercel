"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { 
  Download, 
  Calendar, 
  Building2, 
  Target, 
  Users, 
  FileSpreadsheet,
  Filter,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { exportGoalsToExcel } from "@/actions/admin-export"

interface GoalExportManagerProps {
  className?: string
}

const EXPORT_FORMATS = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet }
]

const STATUS_OPTIONS = [
  'Plan', 'Do', 'Check', 'Act', 'On Hold', 'Completed', 'Cancelled'
]

const PRIORITY_OPTIONS = [
  'Low', 'Medium', 'High', 'Critical'
]

const GOAL_TYPE_OPTIONS = [
  'Personal', 'Team', 'Department', 'Company'
]

export function GoalExportManager({ className = "" }: GoalExportManagerProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [lastExport, setLastExport] = useState<string | null>(null)
  
  // Filter states
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedGoalTypes, setSelectedGoalTypes] = useState<string[]>([])
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  
  // Options
  const [departments, setDepartments] = useState<string[]>([])
  const [assignees, setAssignees] = useState<{id: string, name: string}[]>([])
  
  // Export options
  const [exportFormat, setExportFormat] = useState('excel')
  const [includeOptions, setIncludeOptions] = useState({
    tasks: true,
    assignees: true,
    comments: true,
    attachments: true,
    workflow_history: true,
    support_requests: false
  })

  // Load filter options
  useEffect(() => {
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    try {
      // Load departments and users from your existing data sources
      // This is a simplified version - you might want to create specific endpoints
      const departmentList = ['Sales', 'Marketing', 'Engineering', 'Operations', 'HR', 'Finance']
      const assigneeList = [
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' },
        { id: '3', name: 'Mike Johnson' }
      ]
      
      setDepartments(departmentList)
      setAssignees(assigneeList)
    } catch (error) {
      console.error('Failed to load filter options:', error)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const filters = {
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
        departments: selectedDepartments.length > 0 ? selectedDepartments : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        priorities: selectedPriorities.length > 0 ? selectedPriorities : undefined,
        goalTypes: selectedGoalTypes.length > 0 ? selectedGoalTypes : undefined,
        assignees: selectedAssignees.length > 0 ? selectedAssignees : undefined
      }

      const result = await exportGoalsToExcel(filters, includeOptions)
      
      clearInterval(progressInterval)
      setExportProgress(100)

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      if ('data' in result && result.data && result.filename) {
        // Create download
        const blob = new Blob([new Uint8Array(result.data as number[])], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setLastExport(new Date().toLocaleString())
        toast.success(`Goals exported successfully: ${result.filename}`)
      }
    } catch (error) {
      toast.error('Failed to export goals')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(0), 2000)
    }
  }

  const clearFilters = () => {
    setDateRange({ start: '', end: '' })
    setSelectedDepartments([])
    setSelectedStatuses([])
    setSelectedPriorities([])
    setSelectedGoalTypes([])
    setSelectedAssignees([])
  }

  const getFilterSummary = () => {
    const filters = []
    if (dateRange.start && dateRange.end) filters.push('Date range')
    if (selectedDepartments.length > 0) filters.push(`${selectedDepartments.length} departments`)
    if (selectedStatuses.length > 0) filters.push(`${selectedStatuses.length} statuses`)
    if (selectedPriorities.length > 0) filters.push(`${selectedPriorities.length} priorities`)
    if (selectedGoalTypes.length > 0) filters.push(`${selectedGoalTypes.length} goal types`)
    if (selectedAssignees.length > 0) filters.push(`${selectedAssignees.length} assignees`)
    
    return filters.length > 0 ? filters.join(', ') : 'No filters applied'
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Export All Goals
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Export comprehensive goal data with filtering options. Includes goals, tasks, assignees, and progress tracking.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Exporting goals...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="w-full" />
          </div>
        )}

        {/* Last Export Info */}
        {lastExport && !isExporting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Last export: {lastExport}
          </div>
        )}

        {/* Filters Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Export Filters
            </h3>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date
              </Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                End Date
              </Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Departments
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {departments.map((dept) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept}`}
                    checked={selectedDepartments.includes(dept)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDepartments(prev => [...prev, dept])
                      } else {
                        setSelectedDepartments(prev => prev.filter(d => d !== dept))
                      }
                    }}
                  />
                  <Label htmlFor={`dept-${dept}`} className="text-sm">{dept}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Status
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STATUS_OPTIONS.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStatuses(prev => [...prev, status])
                      } else {
                        setSelectedStatuses(prev => prev.filter(s => s !== status))
                      }
                    }}
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm">{status}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Priority
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((priority) => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={selectedPriorities.includes(priority)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPriorities(prev => [...prev, priority])
                      } else {
                        setSelectedPriorities(prev => prev.filter(p => p !== priority))
                      }
                    }}
                  />
                  <Label htmlFor={`priority-${priority}`} className="text-sm">{priority}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Type Selection */}
          <div className="space-y-2">
            <Label>Goal Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {GOAL_TYPE_OPTIONS.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={selectedGoalTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedGoalTypes(prev => [...prev, type])
                      } else {
                        setSelectedGoalTypes(prev => prev.filter(t => t !== type))
                      }
                    }}
                  />
                  <Label htmlFor={`type-${type}`} className="text-sm">{type}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          <h3 className="font-medium">Export Options</h3>
          
          <div className="space-y-2">
            <Label>Include in Export</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(includeOptions).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`include-${key}`}
                    checked={value}
                    onCheckedChange={(checked) => {
                      setIncludeOptions(prev => ({ ...prev, [key]: checked }))
                    }}
                  />
                  <Label htmlFor={`include-${key}`} className="text-sm capitalize">
                    {key.replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export_format">Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    <div className="flex items-center gap-2">
                      <format.icon className="w-4 h-4" />
                      {format.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">Export Summary</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Filters: {getFilterSummary()}
          </p>
          <p className="text-sm text-muted-foreground">
            Format: {EXPORT_FORMATS.find(f => f.value === exportFormat)?.label}
          </p>
          <p className="text-sm text-muted-foreground">
            Includes: {Object.entries(includeOptions)
              .filter(([_, value]) => value)
              .map(([key, _]) => key.replace('_', ' '))
              .join(', ')
            }
          </p>
        </div>

        {/* Export Button */}
        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Exporting Goals... ({exportProgress}%)
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Goals Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}