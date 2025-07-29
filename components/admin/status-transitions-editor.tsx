"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowRight, 
  Settings, 
  Palette, 
  Shield,
  Play,
  Pause,
  CheckCircle,
  Search,
  ClipboardList,
  XCircle,
  CheckCircle2
} from "lucide-react"
import {
  getWorkflowConfigurations,
  createWorkflowConfiguration,
  updateWorkflowConfiguration,
  activateWorkflowConfiguration,
  deleteWorkflowConfiguration,
  type WorkflowConfiguration
} from "@/actions/workflow-config"

interface StatusTransitionsEditorProps {
  className?: string
}

const DEFAULT_STATUSES = [
  { name: 'Plan', color: '#3b82f6', icon: 'clipboard-list' },
  { name: 'Do', color: '#f59e0b', icon: 'play' },
  { name: 'Check', color: '#10b981', icon: 'search' },
  { name: 'Act', color: '#8b5cf6', icon: 'check-circle' },
  { name: 'On Hold', color: '#6b7280', icon: 'pause' },
  { name: 'Completed', color: '#22c55e', icon: 'check-circle-2' },
  { name: 'Cancelled', color: '#ef4444', icon: 'x-circle' }
]

const ICON_OPTIONS = [
  { value: 'clipboard-list', label: 'Clipboard List', Icon: ClipboardList },
  { value: 'play', label: 'Play', Icon: Play },
  { value: 'search', label: 'Search', Icon: Search },
  { value: 'check-circle', label: 'Check Circle', Icon: CheckCircle },
  { value: 'pause', label: 'Pause', Icon: Pause },
  { value: 'check-circle-2', label: 'Check Circle 2', Icon: CheckCircle2 },
  { value: 'x-circle', label: 'X Circle', Icon: XCircle },
  { value: 'activity', label: 'Activity', Icon: Activity },
  { value: 'settings', label: 'Settings', Icon: Settings }
]

const ROLES = ['Admin', 'Head', 'Employee']

export function StatusTransitionsEditor({ className = "" }: StatusTransitionsEditorProps) {
  const [configurations, setConfigurations] = useState<WorkflowConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [editingConfig, setEditingConfig] = useState<WorkflowConfiguration | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const loadConfigurations = async () => {
    setLoading(true)
    try {
      const result = await getWorkflowConfigurations()
      if (result.error) {
        toast.error(result.error)
      } else {
        setConfigurations(result.data || [])
      }
    } catch (error) {
      toast.error('Failed to load workflow configurations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfigurations()
  }, [])

  const handleCreateConfiguration = async (configData: {
    name: string
    description?: string
    transitions: any
    role_permissions?: any
    status_colors?: any
    status_icons?: any
    is_active?: boolean
  }) => {
    try {
      const result = await createWorkflowConfiguration(configData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Workflow configuration created successfully')
        setIsCreateModalOpen(false)
        loadConfigurations()
      }
    } catch (error) {
      toast.error('Failed to create workflow configuration')
    }
  }

  const handleUpdateConfiguration = async (configId: string, updates: Partial<WorkflowConfiguration>) => {
    try {
      const result = await updateWorkflowConfiguration(configId, updates)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Workflow configuration updated successfully')
        setIsEditModalOpen(false)
        setEditingConfig(null)
        loadConfigurations()
      }
    } catch (error) {
      toast.error('Failed to update workflow configuration')
    }
  }

  const handleActivateConfiguration = async (configId: string, configName: string) => {
    if (!confirm(`Are you sure you want to activate "${configName}"? This will deactivate all other configurations.`)) {
      return
    }

    try {
      const result = await activateWorkflowConfiguration(configId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`"${configName}" is now the active workflow configuration`)
        loadConfigurations()
      }
    } catch (error) {
      toast.error('Failed to activate workflow configuration')
    }
  }

  const handleDeleteConfiguration = async (configId: string, configName: string) => {
    if (!confirm(`Are you sure you want to delete "${configName}"?`)) {
      return
    }

    try {
      const result = await deleteWorkflowConfiguration(configId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Workflow configuration deleted successfully')
        loadConfigurations()
      }
    } catch (error) {
      toast.error('Failed to delete workflow configuration')
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-600" />
            Status Transitions Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading workflow configurations...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-600" />
          Status Transitions Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create and manage custom PDCA workflow configurations with status transitions, role permissions, and visual customization.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-muted-foreground">
            {configurations.length} workflow configuration{configurations.length !== 1 ? 's' : ''} available
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Workflow Configuration</DialogTitle>
              </DialogHeader>
              <ConfigurationForm onSubmit={handleCreateConfiguration} onCancel={() => setIsCreateModalOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {configurations.map((config) => (
            <ConfigurationCard
              key={config.id}
              configuration={config}
              onEdit={(config) => {
                setEditingConfig(config)
                setIsEditModalOpen(true)
              }}
              onActivate={(config) => handleActivateConfiguration(config.id, config.name)}
              onDelete={(config) => handleDeleteConfiguration(config.id, config.name)}
            />
          ))}

          {configurations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No workflow configurations created yet</p>
              <p className="text-xs mt-1">Click "New Configuration" to create your first custom workflow</p>
            </div>
          )}
        </div>

        {/* Edit Configuration Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Workflow Configuration</DialogTitle>
            </DialogHeader>
            {editingConfig && (
              <ConfigurationForm
                initialConfiguration={editingConfig}
                onSubmit={(configData) => handleUpdateConfiguration(editingConfig.id, configData)}
                onCancel={() => {
                  setIsEditModalOpen(false)
                  setEditingConfig(null)
                }}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

interface ConfigurationCardProps {
  configuration: WorkflowConfiguration
  onEdit: (config: WorkflowConfiguration) => void
  onActivate: (config: WorkflowConfiguration) => void
  onDelete: (config: WorkflowConfiguration) => void
}

function ConfigurationCard({ configuration, onEdit, onActivate, onDelete }: ConfigurationCardProps) {
  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(option => option.value === iconName)
    return iconOption?.Icon || Activity
  }

  const statuses = Object.keys(configuration.transitions || {})
  const totalTransitions = Object.values(configuration.transitions || {}).reduce(
    (acc: number, transitions: any) => acc + (Array.isArray(transitions) ? transitions.length : 0), 
    0
  )

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{configuration.name}</h3>
            {configuration.is_active && (
              <Badge variant="default" className="bg-green-600">
                Active
              </Badge>
            )}
            {configuration.is_default && (
              <Badge variant="outline">
                Default
              </Badge>
            )}
          </div>
          {configuration.description && (
            <p className="text-sm text-muted-foreground">{configuration.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{statuses.length} statuses</span>
            <span>{totalTransitions} transitions</span>
            <span>Created {new Date(configuration.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!configuration.is_active && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onActivate(configuration)}
            >
              Activate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(configuration)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          {!configuration.is_default && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(configuration)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Status Flow Visualization */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-3 text-sm">Status Flow</h4>
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map((status, index) => {
            const Icon = getIconComponent(configuration.status_icons?.[status] || 'activity')
            const color = configuration.status_colors?.[status] || '#6b7280'
            const transitions = configuration.transitions[status] || []
            
            return (
              <div key={status} className="flex items-center">
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="w-3 h-3" />
                  {status}
                </div>
                {transitions.length > 0 && index < statuses.length - 1 && (
                  <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />
                )}
              </div>
            )
          })}
        </div>

        {/* Transitions Details */}
        <div className="mt-4 space-y-2">
          {Object.entries(configuration.transitions || {}).map(([from, transitions]) => {
            if (!Array.isArray(transitions) || transitions.length === 0) return null
            
            return (
              <div key={from} className="text-xs text-muted-foreground">
                <span className="font-medium">{from}</span> → {transitions.join(', ')}
              </div>
            )
          })}
        </div>
      </div>

      {/* Role Permissions */}
      {configuration.role_permissions && Object.keys(configuration.role_permissions).length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Role Permissions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(configuration.role_permissions).map(([role, permissions]) => (
              <div key={role} className="space-y-1">
                <div className="font-medium text-sm">{role}</div>
                <div className="text-xs text-muted-foreground">
                  {Array.isArray(permissions) 
                    ? (permissions.includes('*') ? 'All transitions' : permissions.join(', '))
                    : 'No permissions'
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ConfigurationFormProps {
  initialConfiguration?: WorkflowConfiguration
  onSubmit: (configData: any) => void
  onCancel: () => void
  isEditing?: boolean
}

function ConfigurationForm({ initialConfiguration, onSubmit, onCancel, isEditing = false }: ConfigurationFormProps) {
  const [name, setName] = useState(initialConfiguration?.name || '')
  const [description, setDescription] = useState(initialConfiguration?.description || '')
  const [transitions, setTransitions] = useState(
    JSON.stringify(initialConfiguration?.transitions || {
      "Plan": ["Do", "On Hold"],
      "Do": ["Check", "On Hold"],
      "Check": ["Act", "Do", "On Hold"],
      "Act": ["Completed", "Plan", "On Hold"],
      "On Hold": ["Plan", "Do", "Check", "Act"],
      "Completed": [],
      "Cancelled": []
    }, null, 2)
  )
  const [rolePermissions, setRolePermissions] = useState(
    JSON.stringify(initialConfiguration?.role_permissions || {
      "Admin": ["*"],
      "Head": ["Plan", "Do", "Check", "Act", "On Hold"],
      "Employee": ["Do", "Check"]
    }, null, 2)
  )
  const [statusColors, setStatusColors] = useState(
    JSON.stringify(initialConfiguration?.status_colors || Object.fromEntries(
      DEFAULT_STATUSES.map(status => [status.name, status.color])
    ), null, 2)
  )
  const [statusIcons, setStatusIcons] = useState(
    JSON.stringify(initialConfiguration?.status_icons || Object.fromEntries(
      DEFAULT_STATUSES.map(status => [status.name, status.icon])
    ), null, 2)
  )
  const [isActive, setIsActive] = useState(initialConfiguration?.is_active ?? false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const parsedTransitions = JSON.parse(transitions)
      const parsedRolePermissions = JSON.parse(rolePermissions)
      const parsedStatusColors = JSON.parse(statusColors)
      const parsedStatusIcons = JSON.parse(statusIcons)

      onSubmit({
        name,
        description: description || undefined,
        transitions: parsedTransitions,
        role_permissions: parsedRolePermissions,
        status_colors: parsedStatusColors,
        status_icons: parsedStatusIcons,
        is_active: isActive
      })
    } catch (error) {
      toast.error('Invalid JSON configuration. Please check your syntax.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Configuration Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Custom PDCA Workflow"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this workflow"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="transitions">Status Transitions (JSON)</Label>
        <Textarea
          id="transitions"
          value={transitions}
          onChange={(e) => setTransitions(e.target.value)}
          placeholder="Define allowed transitions between statuses..."
          className="font-mono text-sm"
          rows={8}
        />
        <p className="text-xs text-muted-foreground">
          Define which status transitions are allowed. Format: {"{"}"StatusName": ["AllowedDestination1", "AllowedDestination2"]{"}"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role_permissions">Role Permissions (JSON)</Label>
          <Textarea
            id="role_permissions"
            value={rolePermissions}
            onChange={(e) => setRolePermissions(e.target.value)}
            placeholder="Define role-based permissions..."
            className="font-mono text-sm"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Define which roles can perform which transitions. Use "*" for all transitions.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status_colors">Status Colors (JSON)</Label>
          <Textarea
            id="status_colors"
            value={statusColors}
            onChange={(e) => setStatusColors(e.target.value)}
            placeholder="Define colors for each status..."
            className="font-mono text-sm"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Define hex colors for each status for visual customization.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status_icons">Status Icons (JSON)</Label>
        <Textarea
          id="status_icons"
          value={statusIcons}
          onChange={(e) => setStatusIcons(e.target.value)}
          placeholder="Define icons for each status..."
          className="font-mono text-sm"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Define Lucide icon names for each status. Available icons: {ICON_OPTIONS.map(icon => icon.value).join(', ')}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="is_active">Configuration is active</Label>
        <p className="text-xs text-muted-foreground ml-2">
          (Only one configuration can be active at a time)
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Update Configuration' : 'Create Configuration'}
        </Button>
      </div>
    </form>
  )
}