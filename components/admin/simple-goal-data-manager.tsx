"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Target, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet, UserCheck } from "lucide-react"
import { exportGoals, importGoals, generateGoalTemplate } from "@/actions/simple-data-management"
import { getUsers } from "@/lib/goal-database"
import type { UserRecord } from "@/lib/database"

interface SimpleGoalDataManagerProps {
  className?: string
}

export function SimpleGoalDataManager({ className = "" }: SimpleGoalDataManagerProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [importForUserId, setImportForUserId] = useState<string>("current-user") // "current-user" means current user
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportGoals()
      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.success && result.data) {
        // Create and download file
        const blob = new Blob([new Uint8Array(result.data as number[])], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename || 'goals-export.xlsx'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(`✅ Exported ${result.count} goals successfully`)
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export goals')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true)
    try {
      const result = await generateGoalTemplate()
      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.success && result.data) {
        // Create and download file
        const blob = new Blob([new Uint8Array(result.data as number[])], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename || 'goal-import-template.xlsx'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success('✅ Template downloaded successfully')
      }
    } catch (error) {
      console.error('Template download error:', error)
      toast.error('Failed to download template')
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  // Fetch eligible users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('🔍 Fetching users for import dropdown via API...')
        const response = await fetch('/api/users')
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('📊 Raw user data from API:', result.data)
        console.log('❓ Data type:', typeof result.data, 'Length:', result.data?.length)
        
        if (result.data) {
          // Filter to only show users who can create goals (Head and Admin roles)
          const eligibleUsers = result.data.filter((user: any) => {
            console.log(`👤 User: ${user.full_name || user.email} - Role: ${user.role} - Active: ${user.is_active}`)
            return user.role === 'Admin' || user.role === 'Head'
          }) as UserRecord[]
          console.log('✅ Eligible users (Admin/Head only):', eligibleUsers)
          setUsers(eligibleUsers)
        } else {
          console.log('⚠️ No user data returned from API')
        }
        
        if (result.error) {
          console.error('❌ Error in API result:', result.error)
          toast.error(`Error: ${result.error}`)
        }
      } catch (error) {
        console.error('❌ Failed to fetch users via API:', error)
        toast.error('Failed to load users')
      }
    }
    fetchUsers()
  }, [])

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select an Excel (.xlsx) or CSV file')
      return
    }

    setIsImporting(true)
    setImportProgress(10)

    try {
      // Read file as buffer
      const arrayBuffer = await file.arrayBuffer()
      setImportProgress(30)

      // Import goals (pass importForUserId if not current user)
      const selectedUserId = importForUserId !== 'current-user' ? importForUserId : undefined
      const result = await importGoals(arrayBuffer, selectedUserId)
      setImportProgress(80)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.success) {
        toast.success(`✅ ${result.message || 'Import completed successfully'}`)
        setImportProgress(100)
        
        // Reset progress after a moment
        setTimeout(() => setImportProgress(0), 2000)
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import goals')
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Section */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              className="w-full" 
              onClick={handleExport}
              disabled={isExporting || isImporting || isDownloadingTemplate}
            >
              {isExporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </div>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              className="w-full" 
              onClick={handleDownloadTemplate}
              disabled={isExporting || isImporting || isDownloadingTemplate}
            >
              {isDownloadingTemplate ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Downloading...
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Template
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">Export existing data or download import template</p>
        </div>
        
        {/* Import Section */}
        <div className="border-t pt-4 space-y-3">
          {/* Import For User Selector */}
          <div className="space-y-2">
            <Label htmlFor="import_for_user" className="text-xs font-medium">
              Import For (Optional)
            </Label>
            <Select value={importForUserId} onValueChange={setImportForUserId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Import as current user (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-user">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3 h-3" />
                    <span>Import as current user (default)</span>
                  </div>
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="space-y-1">
                      <div className="font-medium text-xs">
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
              <p className="text-xs text-amber-600 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Goals will be imported on behalf of the selected user
              </p>
            )}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleImportClick}
            disabled={isExporting || isImporting}
          >
            {isImporting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                Importing...
              </div>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Goals
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500">Upload Excel (.xlsx) with duplicate checking</p>
          
          {/* Progress bar */}
          {isImporting && importProgress > 0 && (
            <div className="space-y-1">
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-center text-gray-500">
                {importProgress < 30 ? 'Reading file...' : 
                 importProgress < 80 ? 'Validating data...' : 
                 'Importing goals...'}
              </p>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Help text */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-xs text-green-800">
            <strong>📋 Format:</strong> Excel file with columns: subject, description, status, department, priority, goal_type
          </p>
          <p className="text-xs text-green-700 mt-1">
            <strong>🔍 Validation:</strong> Prevents duplicate subjects and validates required fields
          </p>
        </div>
      </CardContent>
    </Card>
  )
}