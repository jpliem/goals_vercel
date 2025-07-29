"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { 
  Users, 
  Download, 
  FileSpreadsheet, 
  BarChart, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react"
import { exportUserAssignments } from "@/actions/admin-export"

interface AssignmentExportManagerProps {
  className?: string
}

const EXPORT_FORMATS = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet }
]

const REPORT_TYPES = [
  { 
    value: 'workload_summary', 
    label: 'Workload Summary', 
    description: 'Overview of goals and tasks per user with completion rates',
    icon: BarChart 
  },
  { 
    value: 'performance_analysis', 
    label: 'Performance Analysis', 
    description: 'User performance metrics, on-time delivery, and productivity stats',
    icon: TrendingUp 
  },
  { 
    value: 'assignment_distribution', 
    label: 'Assignment Distribution', 
    description: 'How assignments are distributed across departments and teams',
    icon: Users 
  },
  { 
    value: 'overdue_analysis', 
    label: 'Overdue Analysis', 
    description: 'Overdue items analysis by user and department',
    icon: AlertTriangle 
  }
]

export function AssignmentExportManager({ className = "" }: AssignmentExportManagerProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [lastExport, setLastExport] = useState<string | null>(null)
  
  // Export options
  const [exportFormat, setExportFormat] = useState('excel')
  const [selectedReportTypes, setSelectedReportTypes] = useState<string[]>(['workload_summary'])
  const [includeOptions, setIncludeOptions] = useState({
    includeInactiveUsers: false,
    includePDCABreakdown: true,
    includeTimeTracking: true,
    includeCompletionNotes: false,
    includeGoalDetails: true,
    includeTaskDetails: true
  })

  const handleExport = async () => {
    if (selectedReportTypes.length === 0) {
      toast.error('Please select at least one report type')
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 12, 90))
      }, 300)

      const result = await exportUserAssignments(exportFormat, {
        reportTypes: selectedReportTypes,
        ...includeOptions
      })
      
      clearInterval(progressInterval)
      setExportProgress(100)

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      if ('data' in result && result.data && result.filename) {
        // Create download
        let blob: Blob

        if (exportFormat === 'csv') {
          blob = new Blob([result.data as string], { type: 'text/csv' })
        } else {
          blob = new Blob([new Uint8Array(result.data as number[])], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          })
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setLastExport(new Date().toLocaleString())
        toast.success(`User assignments exported successfully: ${result.filename}`)
      }
    } catch (error) {
      toast.error('Failed to export user assignments')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(0), 2000)
    }
  }

  const toggleReportType = (reportType: string) => {
    setSelectedReportTypes(prev => 
      prev.includes(reportType)
        ? prev.filter(t => t !== reportType)
        : [...prev, reportType]
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Export User Assignments
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Export workload analysis, performance metrics, and assignment distribution reports for users across the organization.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Generating assignment reports...</span>
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

        {/* Report Type Selection */}
        <div className="space-y-4">
          <h3 className="font-medium">Report Types</h3>
          <div className="space-y-3">
            {REPORT_TYPES.map((reportType) => (
              <div key={reportType.value} className="flex items-start space-x-3">
                <Checkbox
                  id={reportType.value}
                  checked={selectedReportTypes.includes(reportType.value)}
                  onCheckedChange={() => toggleReportType(reportType.value)}
                />
                <div className="space-y-1 flex-1">
                  <Label htmlFor={reportType.value} className="flex items-center gap-2 text-sm font-medium">
                    <reportType.icon className="w-4 h-4" />
                    {reportType.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {reportType.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          <h3 className="font-medium">Export Configuration</h3>
          
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

          <div className="space-y-3">
            <Label>Additional Data to Include</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeInactiveUsers"
                  checked={includeOptions.includeInactiveUsers}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, includeInactiveUsers: checked as boolean }))
                  }}
                />
                <Label htmlFor="includeInactiveUsers" className="text-sm">
                  Include inactive users
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePDCABreakdown"
                  checked={includeOptions.includePDCABreakdown}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, includePDCABreakdown: checked as boolean }))
                  }}
                />
                <Label htmlFor="includePDCABreakdown" className="text-sm">
                  PDCA phase breakdown
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTimeTracking"
                  checked={includeOptions.includeTimeTracking}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, includeTimeTracking: checked as boolean }))
                  }}
                />
                <Label htmlFor="includeTimeTracking" className="text-sm">
                  Time tracking data
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCompletionNotes"
                  checked={includeOptions.includeCompletionNotes}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, includeCompletionNotes: checked as boolean }))
                  }}
                />
                <Label htmlFor="includeCompletionNotes" className="text-sm">
                  Task completion notes
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeGoalDetails"
                  checked={includeOptions.includeGoalDetails}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, includeGoalDetails: checked as boolean }))
                  }}
                />
                <Label htmlFor="includeGoalDetails" className="text-sm">
                  Goal details and context
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTaskDetails"
                  checked={includeOptions.includeTaskDetails}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, includeTaskDetails: checked as boolean }))
                  }}
                />
                <Label htmlFor="includeTaskDetails" className="text-sm">
                  Detailed task information
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Export Preview */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export Preview
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Format: {EXPORT_FORMATS.find(f => f.value === exportFormat)?.label}</p>
            <div>
              <p className="font-medium">Selected reports ({selectedReportTypes.length}):</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                {selectedReportTypes.map(type => {
                  const reportType = REPORT_TYPES.find(r => r.value === type)
                  return reportType ? <li key={type}>{reportType.label}</li> : null
                })}
              </ul>
            </div>
            
            {exportFormat === 'excel' && selectedReportTypes.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded border">
                <p className="text-blue-800 text-xs font-medium">Excel Export Will Include:</p>
                <ul className="text-blue-700 text-xs mt-1 space-y-1">
                  <li>• Summary Dashboard sheet</li>
                  {selectedReportTypes.includes('workload_summary') && <li>• Workload Summary sheet</li>}
                  {selectedReportTypes.includes('performance_analysis') && <li>• Performance Analysis sheet</li>}
                  {selectedReportTypes.includes('assignment_distribution') && <li>• Assignment Distribution sheet</li>}
                  {selectedReportTypes.includes('overdue_analysis') && <li>• Overdue Analysis sheet</li>}
                  {includeOptions.includeTaskDetails && <li>• Detailed Tasks sheet</li>}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={handleExport} 
          disabled={isExporting || selectedReportTypes.length === 0}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Reports... ({exportProgress}%)
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export User Assignment Reports
            </>
          )}
        </Button>

        {/* Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Workload analysis includes current and historical assignment data</p>
          <p>• Performance metrics calculated based on completion rates and deadlines</p>
          <p>• All reports respect user privacy and role-based access controls</p>
          <p>• Export includes data visualization ready for charts and graphs</p>
        </div>
      </CardContent>
    </Card>
  )
}