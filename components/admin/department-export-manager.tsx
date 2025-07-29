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
  Building2, 
  Download, 
  FileSpreadsheet, 
  Users, 
  Network,
  CheckCircle,
  Layers
} from "lucide-react"
import { exportDepartmentStructure } from "@/actions/admin-export"

interface DepartmentExportManagerProps {
  className?: string
}

const EXPORT_FORMATS = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON', icon: FileSpreadsheet }
]

export function DepartmentExportManager({ className = "" }: DepartmentExportManagerProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [lastExport, setLastExport] = useState<string | null>(null)
  
  // Export options
  const [exportFormat, setExportFormat] = useState('excel')
  const [includeOptions, setIncludeOptions] = useState({
    userCounts: true,
    teamHierarchy: true,
    departmentPermissions: true,
    inactiveEntities: false,
    userDetails: true,
    goalCounts: true
  })

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 15, 90))
      }, 200)

      const result = await exportDepartmentStructure(exportFormat, includeOptions)
      
      clearInterval(progressInterval)
      setExportProgress(100)

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      if ('data' in result && result.data && result.filename) {
        // Create download
        let blob: Blob
        let mimeType: string

        switch (exportFormat) {
          case 'json':
            blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
            mimeType = 'application/json'
            break
          case 'csv':
            blob = new Blob([result.data as string], { type: 'text/csv' })
            mimeType = 'text/csv'
            break
          default: // excel
            blob = new Blob([new Uint8Array(result.data as number[])], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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
        toast.success(`Department structure exported successfully: ${result.filename}`)
      }
    } catch (error) {
      toast.error('Failed to export department structure')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(0), 2000)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Export Department Structure
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Export organizational hierarchy, team structures, user assignments, and department analytics.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Exporting department structure...</span>
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
            <Label>Include in Export</Label>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="userCounts"
                  checked={includeOptions.userCounts}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, userCounts: checked as boolean }))
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="userCounts" className="flex items-center gap-2 text-sm font-medium">
                    <Users className="w-4 h-4" />
                    User Counts per Department/Team
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Include user count statistics for each department and team
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="teamHierarchy"
                  checked={includeOptions.teamHierarchy}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, teamHierarchy: checked as boolean }))
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="teamHierarchy" className="flex items-center gap-2 text-sm font-medium">
                    <Layers className="w-4 h-4" />
                    Team Hierarchy Visualization
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Export hierarchical view of departments and their teams
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="departmentPermissions"
                  checked={includeOptions.departmentPermissions}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, departmentPermissions: checked as boolean }))
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="departmentPermissions" className="flex items-center gap-2 text-sm font-medium">
                    <Network className="w-4 h-4" />
                    Department Permissions Matrix
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cross-department access permissions and user assignments
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="userDetails"
                  checked={includeOptions.userDetails}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, userDetails: checked as boolean }))
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="userDetails" className="flex items-center gap-2 text-sm font-medium">
                    <Users className="w-4 h-4" />
                    Detailed User Information
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Include user details like email, role, and department assignments
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="goalCounts"
                  checked={includeOptions.goalCounts}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, goalCounts: checked as boolean }))
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="goalCounts" className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="w-4 h-4" />
                    Goal Statistics by Department
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Number of goals, completion rates, and status distribution per department
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="inactiveEntities"
                  checked={includeOptions.inactiveEntities}
                  onCheckedChange={(checked) => {
                    setIncludeOptions(prev => ({ ...prev, inactiveEntities: checked as boolean }))
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="inactiveEntities" className="flex items-center gap-2 text-sm font-medium">
                    Inactive Departments/Teams
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Include inactive or archived departments and teams in the export
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Preview */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3">Export Preview</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Format: {EXPORT_FORMATS.find(f => f.value === exportFormat)?.label}</p>
            <div>
              <p className="font-medium">Included sections:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                {includeOptions.userCounts && <li>User count statistics</li>}
                {includeOptions.teamHierarchy && <li>Team hierarchy visualization</li>}
                {includeOptions.departmentPermissions && <li>Department permissions matrix</li>}
                {includeOptions.userDetails && <li>Detailed user information</li>}
                {includeOptions.goalCounts && <li>Goal statistics by department</li>}
                {includeOptions.inactiveEntities && <li>Inactive departments/teams</li>}
              </ul>
            </div>
            
            {exportFormat === 'excel' && (
              <div className="mt-3 p-3 bg-blue-50 rounded border">
                <p className="text-blue-800 text-xs font-medium">Excel Export Includes:</p>
                <ul className="text-blue-700 text-xs mt-1 space-y-1">
                  <li>• Departments Overview sheet</li>
                  <li>• Teams Details sheet</li>
                  <li>• User Assignments sheet</li>
                  {includeOptions.departmentPermissions && <li>• Permissions Matrix sheet</li>}
                  {includeOptions.goalCounts && <li>• Goal Statistics sheet</li>}
                </ul>
              </div>
            )}
          </div>
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
              Exporting Structure... ({exportProgress}%)
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Department Structure
            </>
          )}
        </Button>

        {/* Export Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Export includes organizational chart data suitable for visualization tools</p>
          <p>• User assignments show both primary department and additional permissions</p>
          <p>• Goal statistics provide insights into departmental performance</p>
          <p>• All timestamps are in your local timezone</p>
        </div>
      </CardContent>
    </Card>
  )
}