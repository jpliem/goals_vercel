"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { 
  Building2, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  Users
} from "lucide-react"
import { importDepartmentStructure } from "@/actions/admin-import"

interface DepartmentImportManagerProps {
  className?: string
}

const IMPORT_MODES = [
  { value: 'create_only', label: 'Create New Only', description: 'Only create new departments/teams, skip existing ones' },
  { value: 'update_existing', label: 'Update Existing', description: 'Update existing department/team descriptions and settings' },
  { value: 'create_and_update', label: 'Create & Update', description: 'Create new and update existing departments/teams' }
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
  departmentCount: number
  teamCount: number
}

export function DepartmentImportManager({ className = "" }: DepartmentImportManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [lastImport, setLastImport] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  
  // Import options
  const [importMode, setImportMode] = useState('create_only')
  const [validationLevel, setValidationLevel] = useState('moderate')
  const [importOptions, setImportOptions] = useState({
    createMissingParents: true,  // Create parent departments if referenced by teams
    allowDuplicateTeamNames: false, // Allow same team name in different departments
    setDefaultDescriptions: true, // Set default descriptions if missing
    activateByDefault: true, // Set new departments/teams as active
    preserveHierarchy: true, // Maintain parent-child relationships
    updateDescriptions: false, // Update descriptions on existing items
    syncActiveStatus: false // Sync active/inactive status for existing items
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB')
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

      const result = await importDepartmentStructure(formData)
      
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
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 300)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('mode', importMode)
      formData.append('validationLevel', validationLevel)
      formData.append('options', JSON.stringify(importOptions))

      const result = await importDepartmentStructure(formData)
      
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
          `Import completed! Departments: ${importResult.departmentsCreated || 0} created, Teams: ${importResult.teamsCreated || 0} created, Skipped: ${importResult.skipped || 0}`
        )
        
        // Reset form
        setSelectedFile(null)
        setImportPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      toast.error('Failed to import department structure')
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
      setTimeout(() => setImportProgress(0), 2000)
    }
  }

  const downloadTemplate = () => {
    const csvContent = `department,team,description,is_active
"Sales","ABB","ABB product sales team",true
"Sales","Siemens","Siemens product sales team",true
"Engineering","Mechanical","Mechanical design and analysis",true
"Engineering","Electrical","Electrical systems and controls",true
"HR","Recruitment","Talent acquisition and hiring",true
"HR","Training","Employee development and training",true
"IT","Infrastructure","System administration and infrastructure",true
"IT","Development","Software development team",true`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'department_structure_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Template downloaded successfully')
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Import Department Structure
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Import organizational structure from CSV files including departments, teams, and hierarchical relationships.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Import Progress */}
        {isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Importing department structure...</span>
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
                accept=".csv"
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

          <div className="space-y-3">
            <Label>Import Options</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createMissingParents"
                  checked={importOptions.createMissingParents}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, createMissingParents: checked as boolean }))
                  }}
                />
                <Label htmlFor="createMissingParents" className="text-sm">
                  Create missing parent departments
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowDuplicateTeamNames"
                  checked={importOptions.allowDuplicateTeamNames}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, allowDuplicateTeamNames: checked as boolean }))
                  }}
                />
                <Label htmlFor="allowDuplicateTeamNames" className="text-sm">
                  Allow duplicate team names
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="setDefaultDescriptions"
                  checked={importOptions.setDefaultDescriptions}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, setDefaultDescriptions: checked as boolean }))
                  }}
                />
                <Label htmlFor="setDefaultDescriptions" className="text-sm">
                  Set default descriptions
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activateByDefault"
                  checked={importOptions.activateByDefault}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, activateByDefault: checked as boolean }))
                  }}
                />
                <Label htmlFor="activateByDefault" className="text-sm">
                  Activate new items by default
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preserveHierarchy"
                  checked={importOptions.preserveHierarchy}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, preserveHierarchy: checked as boolean }))
                  }}
                />
                <Label htmlFor="preserveHierarchy" className="text-sm">
                  Preserve hierarchical relationships
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateDescriptions"
                  checked={importOptions.updateDescriptions}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, updateDescriptions: checked as boolean }))
                  }}
                />
                <Label htmlFor="updateDescriptions" className="text-sm">
                  Update existing descriptions
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="syncActiveStatus"
                  checked={importOptions.syncActiveStatus}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, syncActiveStatus: checked as boolean }))
                  }}
                />
                <Label htmlFor="syncActiveStatus" className="text-sm">
                  Sync active/inactive status
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
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{importPreview.totalRows}</div>
                    <div className="text-sm text-blue-800">Total Rows</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{importPreview.validRows}</div>
                    <div className="text-sm text-green-800">Valid</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{importPreview.departmentCount}</div>
                    <div className="text-sm text-purple-800">Departments</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{importPreview.teamCount}</div>
                    <div className="text-sm text-orange-800">Teams</div>
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
                    <h4 className="font-medium text-sm mb-3">Sample Valid Data (First 5 Rows)</h4>
                    <div className="overflow-x-auto">
                      <div className="space-y-2 text-xs">
                        {importPreview.sampleData.slice(0, 5).map((row, index) => (
                          <div key={index} className="bg-white p-2 rounded border">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{row.department}</span>
                              {row.team && (
                                <>
                                  <span className="text-gray-400">→</span>
                                  <Users className="w-4 h-4 text-green-500" />
                                  <span>{row.team}</span>
                                </>
                              )}
                            </div>
                            {row.description && (
                              <div className="text-muted-foreground mt-1">{row.description}</div>
                            )}
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
                Import Structure ({importPreview?.validRows || 0} valid)
              </>
            )}
          </Button>
        </div>

        {/* CSV Format Information */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            CSV Format Requirements
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <p className="font-medium">Required columns:</p>
              <p className="ml-2">• department (Department name)</p>
            </div>
            <div>
              <p className="font-medium">Optional columns:</p>
              <p className="ml-2">• team (Team name within the department)</p>
              <p className="ml-2">• description (Description of department/team)</p>
              <p className="ml-2">• is_active (true/false, defaults to true)</p>
            </div>
            <div>
              <p className="font-medium">Notes:</p>
              <ul className="ml-2 space-y-1">
                <li>• Each row can represent either a department or a team within a department</li>
                <li>• If 'team' is provided, it will be associated with the 'department'</li>
                <li>• Departments are created automatically when teams reference them</li>
                <li>• Use quotes for values containing commas or special characters</li>
                <li>• Boolean values: true, false, 1, 0, yes, no (case insensitive)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}