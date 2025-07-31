"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { 
  Target, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  UserCheck
} from "lucide-react"
import { importGoals } from "@/actions/admin-import"
import { getUsers } from "@/lib/goal-database"
import type { UserRecord } from "@/lib/database"
import * as XLSX from 'xlsx'

interface GoalImportManagerProps {
  className?: string
}

const IMPORT_MODES = [
  { value: 'create_only', label: 'Create New Only', description: 'Only create new goals, skip existing ones' },
  { value: 'update_existing', label: 'Update Existing', description: 'Update existing goals by ID or unique identifier' },
  { value: 'create_and_update', label: 'Create & Update', description: 'Create new goals and update existing ones' }
]

const VALIDATION_LEVELS = [
  { value: 'strict', label: 'Strict', description: 'Reject entire import if any validation errors' },
  { value: 'moderate', label: 'Moderate', description: 'Import valid rows, report invalid ones' },
  { value: 'lenient', label: 'Lenient', description: 'Auto-correct minor issues where possible' }
]

interface ImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  warnings: string[]
  errors: string[]
  sampleData: any[]
}

export function GoalImportManager({ className = "" }: GoalImportManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [lastImport, setLastImport] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [importForUserId, setImportForUserId] = useState<string>("current-user") // "current-user" means current user
  
  // Import options
  const [importMode, setImportMode] = useState('create_only')
  const [validationLevel, setValidationLevel] = useState('moderate')
  const [importOptions, setImportOptions] = useState({
    skipDuplicateCheck: false,
    autoAssignOwner: true,
    setDefaultDates: true,
    validateAssignees: true,
    createMissingDepartments: false,
    createMissingTeams: false,
    notifyAssignees: false,
    generateTasks: false
  })

  // Fetch eligible users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const result = await getUsers()
        if (result.data) {
          // Filter to only show users who can create goals (Head and Admin roles)
          const eligibleUsers = result.data.filter(user => 
            user.role === 'Admin' || user.role === 'Head'
          ) as UserRecord[]
          setUsers(eligibleUsers)
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
        toast.error('Failed to load users')
      }
    }
    fetchUsers()
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const fileName = file.name.toLowerCase()
      const isValidType = file.type === 'text/csv' || 
                         file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                         fileName.endsWith('.csv') || 
                         fileName.endsWith('.xlsx')
      
      if (!isValidType) {
        toast.error('Please select a CSV or Excel (.xlsx) file')
        return
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
      setImportPreview(null)
      toast.success(`Selected file: ${file.name}`)
    }
  }

  const generatePreview = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    setIsGeneratingPreview(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('mode', importMode)
      formData.append('validationLevel', validationLevel)
      formData.append('options', JSON.stringify(importOptions))
      formData.append('previewOnly', 'true')
      if (importForUserId && importForUserId !== 'current-user') {
        formData.append('importForUserId', importForUserId)
      }

      const result = await importGoals(formData)
      
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      if ('data' in result && result.data) {
        setImportPreview(result.data as ImportPreview)
        toast.success('Preview generated successfully')
      }
    } catch (error) {
      toast.error('Failed to generate preview')
      console.error('Preview error:', error)
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    if (!importPreview) {
      toast.error('Please generate a preview first')
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 8, 90))
      }, 400)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('mode', importMode)
      formData.append('validationLevel', validationLevel)
      formData.append('options', JSON.stringify(importOptions))
      if (importForUserId && importForUserId !== 'current-user') {
        formData.append('importForUserId', importForUserId)
      }

      const result = await importGoals(formData)
      
      clearInterval(progressInterval)
      setImportProgress(100)

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      if ('data' in result && result.data) {
        const importResult = result.data as any
        setLastImport(new Date().toLocaleString())
        toast.success(
          `Import completed! Created: ${importResult.created || 0}, Updated: ${importResult.updated || 0}, Skipped: ${importResult.skipped || 0}`
        )
        
        // Reset form
        setSelectedFile(null)
        setImportPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      toast.error('Failed to import goals')
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
      setTimeout(() => setImportProgress(0), 2000)
    }
  }

  const downloadTemplate = () => {
    // Create sample data for the template
    const templateData = [
      {
        subject: "Q4 Sales Goals",
        description: "Increase quarterly sales by 15%",
        priority: "High",
        department: "Sales",
        teams: "ABB,Siemens",
        goal_type: "Department",
        owner_email: "john@company.com",
        assignee_emails: "jane@company.com,bob@company.com",
        start_date: "2024-01-01",
        target_date: "2024-03-31",
        target_metrics: "15% revenue increase",
        success_criteria: "Achieve $1M in sales"
      },
      {
        subject: "Website Redesign",
        description: "Modernize company website",
        priority: "Medium",
        department: "Marketing",
        teams: "Marketing",
        goal_type: "Team",
        owner_email: "sarah@company.com",
        assignee_emails: "mike@company.com",
        start_date: "2024-02-01",
        target_date: "2024-05-31",
        target_metrics: "New website launch",
        success_criteria: "User engagement +25%"
      }
    ]

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 20 }, // subject
      { wch: 30 }, // description
      { wch: 10 }, // priority
      { wch: 15 }, // department
      { wch: 20 }, // teams
      { wch: 12 }, // goal_type
      { wch: 25 }, // owner_email
      { wch: 35 }, // assignee_emails
      { wch: 12 }, // start_date
      { wch: 12 }, // target_date
      { wch: 25 }, // target_metrics
      { wch: 25 }  // success_criteria
    ]
    ws['!cols'] = colWidths

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Goal Import Template")
    
    // Generate Excel file
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'goal_import_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Excel template downloaded successfully')
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Import Goals from CSV/Excel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Import goals in bulk from CSV or Excel files with validation and preview capabilities.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Import Progress */}
        {isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Importing goals...</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="w-full" />
          </div>
        )}

        {/* Last Import Info */}
        {lastImport && !isImporting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Last import: {lastImport}
          </div>
        )}

        {/* File Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file_input">Select CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="file_input"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="shrink-0"
              >
                <Download className="w-4 h-4 mr-1" />
                Template
              </Button>
            </div>
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        </div>

        {/* Import Configuration */}
        <div className="space-y-4">
          <h3 className="font-medium">Import Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="import_mode">Import Mode</Label>
              <Select value={importMode} onValueChange={setImportMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select import mode" />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div className="space-y-1">
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validation_level">Validation Level</Label>
              <Select value={validationLevel} onValueChange={setValidationLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select validation level" />
                </SelectTrigger>
                <SelectContent>
                  {VALIDATION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="space-y-1">
                        <div className="font-medium">{level.label}</div>
                        <div className="text-xs text-muted-foreground">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Import For User Selector */}
          <div className="space-y-2">
            <Label htmlFor="import_for_user">
              Import For (Optional)
              <span className="text-xs text-muted-foreground ml-2">
                Only users with goal creation permissions are shown
              </span>
            </Label>
            <Select value={importForUserId} onValueChange={setImportForUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Import as current user (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-user">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Import as current user (default)</span>
                  </div>
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {user.full_name || user.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email} • {user.role} • {user.department || 'No Department'}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {importForUserId && importForUserId !== 'current-user' && (
              <p className="text-xs text-amber-600 flex items-start gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Goals will be imported on behalf of the selected user
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Import Options</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipDuplicateCheck"
                  checked={importOptions.skipDuplicateCheck}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, skipDuplicateCheck: checked as boolean }))
                  }}
                />
                <Label htmlFor="skipDuplicateCheck" className="text-sm">
                  Skip duplicate checking
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoAssignOwner"
                  checked={importOptions.autoAssignOwner}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, autoAssignOwner: checked as boolean }))
                  }}
                />
                <Label htmlFor="autoAssignOwner" className="text-sm">
                  Auto-assign owner from email
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="setDefaultDates"
                  checked={importOptions.setDefaultDates}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, setDefaultDates: checked as boolean }))
                  }}
                />
                <Label htmlFor="setDefaultDates" className="text-sm">
                  Set default dates if missing
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="validateAssignees"
                  checked={importOptions.validateAssignees}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, validateAssignees: checked as boolean }))
                  }}
                />
                <Label htmlFor="validateAssignees" className="text-sm">
                  Validate assignee emails
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createMissingDepartments"
                  checked={importOptions.createMissingDepartments}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, createMissingDepartments: checked as boolean }))
                  }}
                />
                <Label htmlFor="createMissingDepartments" className="text-sm">
                  Create missing departments
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createMissingTeams"
                  checked={importOptions.createMissingTeams}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, createMissingTeams: checked as boolean }))
                  }}
                />
                <Label htmlFor="createMissingTeams" className="text-sm">
                  Create missing teams
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyAssignees"
                  checked={importOptions.notifyAssignees}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, notifyAssignees: checked as boolean }))
                  }}
                />
                <Label htmlFor="notifyAssignees" className="text-sm">
                  Notify assignees via email
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generateTasks"
                  checked={importOptions.generateTasks}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, generateTasks: checked as boolean }))
                  }}
                />
                <Label htmlFor="generateTasks" className="text-sm">
                  Generate default PDCA tasks
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Import Preview</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={generatePreview}
                disabled={isGeneratingPreview}
              >
                {isGeneratingPreview ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Generate Preview
                  </>
                )}
              </Button>
            </div>

            {importPreview && (
              <div className="space-y-4">
                {/* Import For User Notice */}
                {importForUserId && importForUserId !== 'current-user' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <UserCheck className="w-4 h-4" />
                      <span className="font-medium">Import Target:</span>
                      <span>
                        {users.find(u => u.id === importForUserId)?.full_name || 
                         users.find(u => u.id === importForUserId)?.email || 
                         'Selected User'}
                      </span>
                    </div>
                  </div>
                )}
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{importPreview.totalRows}</div>
                    <div className="text-sm text-blue-800">Total Rows</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{importPreview.validRows}</div>
                    <div className="text-sm text-green-800">Valid</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{importPreview.invalidRows}</div>
                    <div className="text-sm text-red-800">Invalid</div>
                  </div>
                </div>

                {/* Warnings and Errors */}
                {importPreview.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 font-medium text-yellow-800 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings ({importPreview.warnings.length})
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {importPreview.warnings.slice(0, 5).map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                      {importPreview.warnings.length > 5 && (
                        <li className="text-xs italic">...and {importPreview.warnings.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {importPreview.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 font-medium text-red-800 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      Errors ({importPreview.errors.length})
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {importPreview.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {importPreview.errors.length > 5 && (
                        <li className="text-xs italic">...and {importPreview.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Sample Data Preview */}
                {importPreview.sampleData.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-3">Sample Valid Data (First 3 Rows)</h4>
                    <div className="overflow-x-auto">
                      <div className="space-y-2 text-xs">
                        {importPreview.sampleData.slice(0, 3).map((row, index) => (
                          <div key={index} className="bg-white p-2 rounded border">
                            <div className="font-medium">{row.subject}</div>
                            <div className="text-muted-foreground">{row.department} • {row.priority}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || !importPreview || isImporting || importPreview.validRows === 0}
            className="flex-1"
            size="lg"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing... ({importProgress}%)
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Goals ({importPreview?.validRows || 0} valid)
              </>
            )}
          </Button>
        </div>

        {/* CSV Format Information */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            File Format Requirements
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <p className="font-medium">Supported formats:</p>
              <p className="ml-2">• CSV (.csv) - Comma-separated values</p>
              <p className="ml-2">• Excel (.xlsx) - Excel 2007+ format</p>
            </div>
            <div>
              <p className="font-medium">Required columns:</p>
              <p className="ml-2">• subject, description, department, owner_email</p>
            </div>
            <div>
              <p className="font-medium">Optional columns:</p>
              <p className="ml-2">• priority, teams, goal_type, assignee_emails, start_date, target_date, target_metrics, success_criteria</p>
            </div>
            <div>
              <p className="font-medium">Notes:</p>
              <ul className="ml-2 space-y-1">
                <li>• Multiple teams separated by commas: "Team1,Team2"</li>
                <li>• Multiple assignees separated by commas: "user1@company.com,user2@company.com"</li>
                <li>• Date format: YYYY-MM-DD</li>
                <li>• Priority values: Low, Medium, High, Critical</li>
                <li>• Goal types: Personal, Team, Department, Company</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}