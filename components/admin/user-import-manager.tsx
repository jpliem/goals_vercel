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
  Users, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  Shield,
  User
} from "lucide-react"
import { importUsers } from "@/actions/admin-import"

interface UserImportManagerProps {
  className?: string
}

const IMPORT_MODES = [
  { value: 'create_only', label: 'Create New Only', description: 'Only create new users, skip existing ones' },
  { value: 'update_existing', label: 'Update Existing', description: 'Update existing users by email' },
  { value: 'create_and_update', label: 'Create & Update', description: 'Create new users and update existing ones' }
]

const VALIDATION_LEVELS = [
  { value: 'strict', label: 'Strict', description: 'Reject entire import if any validation errors' },
  { value: 'moderate', label: 'Moderate', description: 'Import valid rows, report invalid ones' },
  { value: 'lenient', label: 'Lenient', description: 'Auto-correct minor issues where possible' }
]

const ROLE_OPTIONS = [
  { value: 'Employee', label: 'Employee', description: 'Basic user with task assignment capabilities' },
  { value: 'Head', label: 'Head', description: 'Department head with management capabilities' },
  { value: 'Admin', label: 'Admin', description: 'System administrator with full access' }
]

interface ImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  warnings: string[]
  errors: string[]
  sampleData: any[]
  roleDistribution: { [key: string]: number }
  departmentDistribution: { [key: string]: number }
}

export function UserImportManager({ className = "" }: UserImportManagerProps) {
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
    validateEmailFormat: true,
    requireStrongPasswords: false,
    setDefaultPasswords: true,
    activateByDefault: true,
    createMissingDepartments: false,
    createMissingTeams: false,
    assignDefaultSkills: false,
    notifyNewUsers: false,
    updateExistingProfiles: false,
    preserveExistingPasswords: true
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
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

      const result = await importUsers(formData)
      
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
        setImportProgress(prev => Math.min(prev + 7, 90))
      }, 500)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('mode', importMode)
      formData.append('validationLevel', validationLevel)
      formData.append('options', JSON.stringify(importOptions))

      const result = await importUsers(formData)
      
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
      toast.error('Failed to import users')
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
      setTimeout(() => setImportProgress(0), 2000)
    }
  }

  const downloadTemplate = () => {
    const csvContent = `full_name,email,password,role,department,team,skills,is_active
"John Smith","john.smith@company.com","temp123","Employee","Sales","ABB","Sales,Communication","true"
"Sarah Johnson","sarah.johnson@company.com","temp123","Head","Engineering","Mechanical","Engineering,Leadership","true"
"Mike Davis","mike.davis@company.com","temp123","Employee","IT","Infrastructure","System Admin,Networking","true"
"Lisa Brown","lisa.brown@company.com","temp123","Admin","IT","","Administration,Project Management","true"`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user_import_template.csv'
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
          <Users className="w-5 h-5 text-blue-600" />
          Import User Data
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Import user accounts in bulk from CSV files with role assignment and department management.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Import Progress */}
        {isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Importing users...</span>
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
                  id="validateEmailFormat"
                  checked={importOptions.validateEmailFormat}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, validateEmailFormat: checked as boolean }))
                  }}
                />
                <Label htmlFor="validateEmailFormat" className="text-sm">
                  Validate email format
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireStrongPasswords"
                  checked={importOptions.requireStrongPasswords}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, requireStrongPasswords: checked as boolean }))
                  }}
                />
                <Label htmlFor="requireStrongPasswords" className="text-sm">
                  Require strong passwords
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="setDefaultPasswords"
                  checked={importOptions.setDefaultPasswords}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, setDefaultPasswords: checked as boolean }))
                  }}
                />
                <Label htmlFor="setDefaultPasswords" className="text-sm">
                  Set default passwords if missing
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
                  Activate accounts by default
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
                  id="assignDefaultSkills"
                  checked={importOptions.assignDefaultSkills}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, assignDefaultSkills: checked as boolean }))
                  }}
                />
                <Label htmlFor="assignDefaultSkills" className="text-sm">
                  Assign default skills by role
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyNewUsers"
                  checked={importOptions.notifyNewUsers}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, notifyNewUsers: checked as boolean }))
                  }}
                />
                <Label htmlFor="notifyNewUsers" className="text-sm">
                  Notify new users via email
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateExistingProfiles"
                  checked={importOptions.updateExistingProfiles}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, updateExistingProfiles: checked as boolean }))
                  }}
                />
                <Label htmlFor="updateExistingProfiles" className="text-sm">
                  Update existing user profiles
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preserveExistingPasswords"
                  checked={importOptions.preserveExistingPasswords}
                  onCheckedChange={(checked) => {
                    setImportOptions(prev => ({ ...prev, preserveExistingPasswords: checked as boolean }))
                  }}
                />
                <Label htmlFor="preserveExistingPasswords" className="text-sm">
                  Preserve existing passwords
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Security Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 font-medium text-amber-800 mb-2">
            <Shield className="w-4 h-4" />
            Security Notice
          </div>
          <p className="text-sm text-amber-700">
            Importing user data creates system accounts with login capabilities. Ensure that default passwords are changed and proper security measures are in place. Only authorized personnel should perform user imports.
          </p>
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

                {/* Role Distribution */}
                {Object.keys(importPreview.roleDistribution).length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm mb-3 text-purple-800">Role Distribution</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(importPreview.roleDistribution).map(([role, count]) => (
                        <div key={role} className="text-center">
                          <div className="text-lg font-bold text-purple-600">{count}</div>
                          <div className="text-xs text-purple-700">{role}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Department Distribution */}
                {Object.keys(importPreview.departmentDistribution).length > 0 && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm mb-3 text-orange-800">Department Distribution</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(importPreview.departmentDistribution).slice(0, 8).map(([dept, count]) => (
                        <div key={dept} className="text-center">
                          <div className="text-lg font-bold text-orange-600">{count}</div>
                          <div className="text-xs text-orange-700">{dept}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                    <h4 className="font-medium text-sm mb-3">Sample Valid Data (First 3 Users)</h4>
                    <div className="overflow-x-auto">
                      <div className="space-y-2 text-xs">
                        {importPreview.sampleData.slice(0, 3).map((row, index) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{row.full_name}</span>
                              <span className="text-gray-400">({row.email})</span>
                            </div>
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                {row.role}
                              </span>
                              {row.department && (
                                <span>{row.department}{row.team && ` - ${row.team}`}</span>
                              )}
                            </div>
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
                Import Users ({importPreview?.validRows || 0} valid)
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
              <p className="ml-2">• full_name, email, role</p>
            </div>
            <div>
              <p className="font-medium">Optional columns:</p>
              <p className="ml-2">• password, department, team, skills, is_active</p>
            </div>
            <div>
              <p className="font-medium">Notes:</p>
              <ul className="ml-2 space-y-1">
                <li>• Role values: Employee, Head, Admin</li>
                <li>• Skills separated by commas: "Skill1,Skill2,Skill3"</li>
                <li>• Boolean values: true, false, 1, 0, yes, no (case insensitive)</li>
                <li>• Default password format: temp123 (should be changed after import)</li>
                <li>• Email addresses must be unique across the system</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}